const { Command } = require('@oclif/command');
const {Repos, SingleRepoNotFoundError} = require('../repos');
const Guru = require('../guru');
const Ebi = require('../ebi');
const { Confirm, Select } = require('enquirer');
const chalk = require('chalk');
const path = require('path');

const tty = process.stdin.isTTY;

class GuideCommand extends Command {

	async confirmTargetRepoName(query, reposFound) {
		try {
			const choice = await new Select({
				name: 'repo',
				message: `${reposFound.length} repos for "${query}" were found, pick one to continue`,
				choices: reposFound.map(r => r.id)
			}).run();

			return choice;
		} catch (error) {
			process.exit();
		}
	}

	async getGuru(name, repos) {
		try {
			// Get migration guru for repo name and repos.
			return new Guru(name, repos);
		} catch (error) {
			if (error instanceof SingleRepoNotFoundError) {
				// Error if no repos are found.
				if (!error.repos || error.repos.length === 0) {
					this.log(chalk.red(`Could not find a repo by name "${error.query}" amoung the ${repos.getAll().length} repos given.`));
					process.exit();
				}
				// If multiple repos found for the name, prompt for a choice.
				if (!tty) {
					this.log(chalk.red(`${error.repos.length} repos for "${error.query}" were found, pick one to continue: ${error.repos.map(r => r.id)}`));
					process.exit();
				}
				const choice = await this.confirmTargetRepoName(error.query, error.repos);
				return new Guru(choice, repos);
			}
		}
	}

	async run() {
		const { args } = this.parse(GuideCommand);

		// Create repos.
		const foundRepoManifests = args.manifests ? path.resolve(__dirname, args.manifests) : '';
		const repos = await Ebi.resultsToRepos(foundRepoManifests);

		// Create migration guru.
		const name = args.component;
		const guru = await this.getGuru(name, repos);

		// Get all repos which depend in some way on the target.
		const impactedRepos = guru.getImpactedRepos();

		// Go through each migration step.
		for await (const result of guru.getMigration()) {
			// Output migration step number.
			if (tty) {
				const message = result.step === 1 ?
					`Ready to update ${name}?` :
					`Continue to step ${result.step} of the migration?`;
				await new Confirm({name: 'continue', message}).run();
			} else {
				this.log(chalk.bold(`Step ${result.step} of the ${name} migration:`));
			}
			// Output migration details.
			const migrationLog = result.dependents.map(repo => {
				const name = repo.name;
				const dependenciesWhichRequiredUpgrade = repo.getDependencies().filter(dependency => {
					return Repos.repoMatchesDependency(guru.target, dependency) || impactedRepos.find(repo => Repos.repoMatchesDependency(repo, dependency));
				}).map(d => `${d.source}:${d.name}`);
				return `${chalk.green(name)} ${chalk.italic(`(${dependenciesWhichRequiredUpgrade.join(', ')})`)}`;
			}).join('\n');
			this.log(migrationLog + '\n');
		}
	}
}

GuideCommand.args = [{
	name: 'component',
	description: 'The component to migrate.',
	required: true
}, {
	name: 'manifests',
	description: 'A file containing manifest file contents found via ebi.',
	required: tty
}];

GuideCommand.description = `
Generate a migration guide for a component,
which accounts for all the repository manifests
given.
`;

module.exports = GuideCommand;
