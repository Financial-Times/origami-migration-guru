const { Command } = require('@oclif/command');
const {Repos} = require('../repos');
const GuruFactory = require('../guru-factory');
const { Confirm, Select } = require('enquirer');
const chalk = require('chalk');

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

	async run() {
		const { args } = this.parse(GuideCommand);

		// Create migration guru.
		const guru = GuruFactory.createFromInput(args.component, args.manifests);

		// Get all repos which depend in some way on the target.
		const impactedRepos = guru.getImpactedRepos();

		// Go through each migration step.
		for await (const result of guru.getMigration()) {
			// Output migration step number.
			if (tty) {
				const message = result.step === 1 ?
					`Ready to update ${guru.target.getName()}?` :
					`Continue to step ${result.step} of the migration?`;
				await new Confirm({name: 'continue', message}).run();
			} else {
				this.log(chalk.bold(`Step ${result.step} of the ${guru.target.getName()} migration:`));
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
