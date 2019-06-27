/* eslint-disable complexity */
const { once } = require('events');
const readline = require('readline');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { Select } = require('enquirer');
const Guru = require('./guru');
const { ReposRepository, SingleRepoNotFoundError } = require('./repos-repository');
const Repo = require('./repo');
const Manifest = require('./manifest');
const execa = require('execa');
const crypto = require('crypto');

const tty = process.stdin.isTTY;
const cpuCount = require('os').cpus().length;

const registryNameFileDir = './tmp';
const registryNameFile = `${registryNameFileDir}/registry-name-map.json`;
let registryNameMapContents;

try {
	fs.accessSync(registryNameFile, fs.constants.R_OK | fs.constants.W_OK);
	registryNameMapContents = fs.readFileSync(registryNameFile);
} catch (error) {}

const registryNameMap = registryNameMapContents ? JSON.parse(registryNameMapContents) : {};

function updateOrigami(manifest) {
	// todo make this proper
	if (manifest.name && manifest.registry === 'npm') {
		manifest.name.replace('o-', '@financial-times/o-');
	}
	return manifest;
}

function getManifestKey(manifest) {
	const hash = crypto.createHash('sha256');
	hash.update(manifest.registry + manifest.repoName + manifest.name + manifest.url);
	return hash.digest('hex');
}

async function updateName(manifest, log) {
	const manifestKey = getManifestKey(manifest);
	if (!Object.keys(registryNameMap).includes(manifestKey)) {
		try {
			if (tty) {
				log(`Verifying ${manifest.repoName} is published to ${manifest.registry} as ${manifest.name}.`);
			}
			let { stdout } = manifest.registry === 'npm' ?
				await execa.shell(`npm view ${manifest.name} repository.url`) :
				await execa.shell(`bower lookup ${manifest.name}`);
			stdout = stdout.toLowerCase();
			const repoName = manifest.repoName.toLowerCase();
			if (stdout.includes(repoName)) {
				registryNameMap[manifestKey] = manifest.name;
			} else {
				registryNameMap[manifestKey] = `${manifest.name}-${crypto.randomBytes(5).toString('hex')}`;
			}
		} catch (error) {
			// todo, does it not exist or was there some network error for instance?
			registryNameMap[manifestKey] = `${manifest.name}-${crypto.randomBytes(5).toString('hex')}`;
		}
		// or generate a random name if not conclusive
	}
	manifest.name = registryNameMap[manifestKey] || manifest.name;
	return manifest;
}

async function batchValidateName(manifests, log) {
	const batch = manifests.splice(0, Math.max(1, cpuCount - 1));
	const processed = await Promise.all(batch.map(m => updateName(m, log)));
	if (manifests.length === 0) {
		return processed;
	}

	return processed.concat(await batchValidateName(manifests, log));
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
		let manifests = [];
		const lines = readline.createInterface({
			input: manifestSource
		});
		lines.on('line', input => {
			try {
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
				}
			} catch (error) {
				log(`Cound not parse line. ${error.message}: ${input}`);
			}
		});
		await once(lines, 'close');

		// Correct name of Origami manifests (package.json is generated on npm publish).
		manifests = manifests.map(m => updateOrigami(m));
		// Verify the name of any manifest which is depended on with its registry.
		const allDependencies = [].concat(...manifests.map(m => Array.from(m.dependencies)));
		const dependedOn = manifests.filter(manifest => {
			if (!manifest.name) {
				return false;
			}
			const foundDependency = allDependencies.find(d => {
				if (d.source !== manifest.registry) {
					return false;
				}
				if (!d.isSemver) {
					return d.version.toLowerCase().includes(manifest.repoName.toLowerCase());
				}
				return d.name === manifest.name;
			});
			return Boolean(foundDependency);
		});
		const leafs = manifests.filter(m => !dependedOn.includes(m));
		manifests = [...leafs, ...await batchValidateName(dependedOn, log)];
		if (!fs.existsSync(registryNameFileDir)) {
			fs.mkdirSync(registryNameFileDir);
		}
		fs.writeFileSync(registryNameFile, JSON.stringify(registryNameMap));

		// Create repos from the verified manifests.
		const repos = manifests.reduce((repos, manifest) => {
			const repo = repos.get(manifest.repoName) || new Repo(manifest.repoName);
			repo.addManifest(manifest.registry, manifest);
			repos.set(manifest.repoName, repo);
			return repos;
		}, new Map());

		const repoRepository = new ReposRepository(repos.values());

		// Create guru.
		try {
			return new Guru(targetName, repoRepository);
		} catch (error) {
			if (!(error instanceof SingleRepoNotFoundError)) {
				throw error;
			}
			// 1. Error if no repos are found.
			if (!error.repos || error.repos.length === 0) {
				log(chalk.red(`Could not find a repo by name "${error.query}" amoung the ${repoRepository.getAll().length} repos given.`));
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

				return new Guru(choice, repoRepository);
			} catch (error) {
				process.exit();
			}

		}
	}

}

module.exports = GuruFactory;
