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
const ManifestNormaliser = require('./manifest-normaliser');

const tty = process.stdin.isTTY;

class GuruFactory {

	static async createFromInput(targetName, manifestSource, log) {
		// Set manifest source.
		if (tty && typeof manifestSource === 'string') {
			manifestSource = path.resolve(__dirname, manifestSource);
			manifestSource = fs.createReadStream(manifestSource);
		} else {
			manifestSource = process.stdin;
		}

		// Get Manifests from input.
		const foundManifests = [];
		const lines = readline.createInterface({
			input: manifestSource
		});
		lines.on('line', line => {
			try {
				const input = JSON.parse(line);
				const filePath = path.parse(input.filepath).name;
				const registry = filePath === 'package' ? 'npm' : filePath;
				const repoName = input.repository;
				// Silently skip lines with no repo name or manifest.
				if (!repoName || !input.fileContents) {
					return;
				}
				const manifest = new Manifest(
					repoName,
					registry,
					input.fileContents
				);
				foundManifests.push(manifest);
			} catch (error) {
				log(`Failed to create a Manifest for line: "${line}".`);
			}
		});
		await once(lines, 'close');

		// Create Repos from the verified Manifests.
		const normaliser = new ManifestNormaliser(foundManifests, log);
		const manifests = await normaliser.normalise();
		const repos = manifests.reduce((repos, manifest) => {
			const repo = repos.get(manifest.repoName) || new Repo(manifest.repoName);
			repo.addManifest(manifest.registry, manifest);
			repos.set(manifest.repoName, repo);
			return repos;
		}, new Map());

		// Create Repo Repository.
		const repoRepository = new ReposRepository(repos.values());

		// Create Guru.
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
			// 2b. Error if non-tty input.
			if (!tty) {
				log(chalk.red(`${error.repos.length} repos for "${error.query}" were found, run again with one of: ${error.repos.map(r => r.id)}`));
				process.exit();
			}
			// 2c. Otherwise confirm choice.
			try {
				const choice = await new Select({
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
