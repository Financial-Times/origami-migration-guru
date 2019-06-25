/* eslint-disable complexity */
const { once } = require('events');
const readline = require('readline');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { Select } = require('enquirer');
const Guru = require('./guru');
const { ReposRepository, SingleRepoNotFoundError } = require('./repos-repository');
const Manifest = require('./manifest');
const execa = require('execa');
const crypto = require('crypto');

const tty = process.stdin.isTTY;

function updateOrigami(manifest) {
	// todo make this proper
	if (manifest.name && manifest.registry === 'npm') {
		manifest.name.replace('o-', '@financial-times/o-');
	}
	return manifest;
}

async function updateRegistry(manifest) {
	const registryNameMap = {
		'ugydui763r7b': 'nori'
	};
	const manifestKey = getManifestKey(manifest);
	if (!Object.keys(registryNameMap).includes(manifestKey)) {
		// get name from registry
		try {
			const { stdout } = manifest.registry === 'npm' ?
				await execa.shell(`npm view ${manifest.name} repository.url`) :
				await execa.shell(`bower lookup ${manifest.name}`);
			if (stdout.includes(manifest.repoName) && stdout.includes(manifest.url)) {
				console.log(`looks good ${manifest.registry}:${manifest.name} (${manifest.repoName})`);
			} else {
				console.log(`replacing name of ${manifest.registry}:${manifest.repoName} (${manifest.repoName})`);
				registryNameMap[manifestKey] = crypto.randomBytes(20).toString('hex');
			}
		} catch (error) {
			// todo, does it not exist or was there some network error for instance?
			console.log(`could not check ${manifest.registry}:${manifest.repoName} (${manifest.repoName})`);
			registryNameMap[manifestKey] = crypto.randomBytes(20).toString('hex');
		}
		// or generate a random name if not conclusive
	}
	manifest.name = registryNameMap[manifestKey] || manifest.name;
	return manifest;
}

async function correctManifestName(manifest) {
	const funcs = [updateOrigami, updateRegistry];
	for await (const func of funcs) {
		manifest = await func(manifest);
	}
	return manifest;
}

function getManifestKey(manifest) {
	const hash = crypto.createHash('sha256');
	hash.update(manifest.registry + manifest.repoName + manifest.name + manifest.url);
	return hash.digest('hex');
}

class GuruFactory {

	static async createFromInput(targetName, manifestSource, log) {
		// Set manifest source.
		if (tty && typeof manifestSource === 'string') {
			manifestSource = path.resolve(__dirname, manifestSource);
			manifestSource = fs.createReadStream(manifestSource);
		} else {
			manifestSource = process.stdin;
		}

		// Create repos.
		const repos = new ReposRepository();
		let manifests = [];
		const lines = readline.createInterface({
			input: manifestSource
		});
		lines.on('line', input => {
			// try {
			input = JSON.parse(input);
			let registry = path.parse(input.filepath).name;
			registry = registry === 'package' ? 'npm' : registry;
			const repoName = input.repository;
			if (repoName && input.fileContents) {
				const manifest = new Manifest(
					repoName,
					registry,
					input.fileContents
				);
				manifests.push(manifest);
				repos.addFromEbi(input);
			}
			// } catch (error) {
			// 	log(`Cound not parse line. ${error.message}: ${input}`);
			// }
		});
		await once(lines, 'close');

		const correctedManifests = [];
		for await (const manifest of manifests) {
			correctedManifests.push(await correctManifestName(manifest));
		}
		manifests = correctedManifests;

		const extractName = name => {
			const parts = name.split('/');
			return parts.pop();
		};

		const resolveConflict = matchedManifests => {
			// Filter by repository url matching the repository id.
			const urlFiltered = matchedManifests.filter(m => m.url.includes(m.repoName));
			if (urlFiltered.length === 1) {
				return urlFiltered;
			}
			// If no clear winners check the repo name includes the name.
			const nameFiltered = matchedManifests.filter(m => m.repoName.includes(extractName(m.name)));
			if (nameFiltered.length === 1) {
				return nameFiltered;
			}
			// If no clear winners check the repo name equals the manifest name, without org.
			const strictNameFiltered = matchedManifests.filter(m => extractName(m.repoName) === extractName(m.name));
			if (strictNameFiltered.length === 1) {
				return strictNameFiltered;
			}
			// Couldn't resolve.
			return matchedManifests;
		};

		// Handle manifest conflicts.
		let remaining = manifests.slice(0);
		while (remaining.length > 0) {
			const manifest = remaining.pop();
			// All manifests which go by the name of this manifest.
			const matchedManifests = manifests.filter(i =>
				i.registry === manifest.registry &&
				i.name === manifest.name
			);
			// No need to recheck those manifests matched here.
			remaining = remaining.filter(m => !matchedManifests.includes(m));
			const resolvedManifests = resolveConflict(matchedManifests);
			if (matchedManifests.length > 1 && resolvedManifests.length === 1) {
				matchedManifests.filter(m => m !== resolvedManifests[0]).forEach(m => {
					m.name = crypto.randomBytes(20).toString('hex');
				});
				console.log(`Resolved: ${manifest.repoName} for ${manifest.registry}.`);
			}
			if (matchedManifests.length > 1 && resolvedManifests.length !== 1) {
				const withDependency = manifests.filter(m => {
					const dependencies = Array.from(m.dependencies.get(manifest.registry));
					const dependencyNames = dependencies ? dependencies.map(d => d.name) : [];
					const answer = dependencyNames.includes(m.name);
					return answer;
				});
				if (withDependency.length > 0) {
					console.log(`Error: ${matchedManifests.map(m => m.repoName)} for ${manifest.registry}.`);
					console.log(`because: ${withDependency.map(d => d.repoName)}`);
				} else {
					console.log(`Ignoring: ${matchedManifests.map(m => m.repoName)} for ${manifest.registry}.`);
				}
			}
		}

		// Create guru.
		try {
			return new Guru(targetName, repos);
		} catch (error) {
			if (error instanceof SingleRepoNotFoundError) {
				// 1. Error if no repos are found.
				if (!error.repos || error.repos.length === 0) {
					log(chalk.red(`Could not find a repo by name "${error.query}" amoung the ${repos.getAll().length} repos given.`));
					process.exit();
				}
				// 2. If multiple repos found.
				// 2b. Error if no tty input.
				if (!tty) {
					log(chalk.red(`${error.repos.length} repos for "${error.query}" were found, run again with one of: ${error.repos.map(r => r.id)}`));
					process.exit();
				}
				// 2c. Otherwise confirm choice.
				let choice;
				try {
					choice = await new Select({
						name: 'repo',
						message: `${error.repos.length} repos for "${error.query}" were found, pick one to continue`,
						choices: error.repos.map(r => r.id)
					}).run();

					return new Guru(choice, repos);
				} catch (error) {
					process.exit();
				}
			}
		}
	}

}

module.exports = GuruFactory;
