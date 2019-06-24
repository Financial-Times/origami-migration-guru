const { Command } = require('@oclif/command');
const {ReposRepository} = require('../repos-repository');
const GuruFactory = require('../guru-factory');
const { Confirm } = require('enquirer');
const chalk = require('chalk');

const tty = process.stdin.isTTY;

class GuideCommand extends Command {

	async run() {
		const { args } = this.parse(GuideCommand);

		// Create migration guru.
		const guru = await GuruFactory.createFromInput(args.component, args.manifests, this.log);

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
				const dependenciesWhichRequiredUpgrade = repo.getDependencies().filter(dependency => {
					return ReposRepository.repoMatchesDependency(guru.target, dependency) || impactedRepos.find(repo => ReposRepository.repoMatchesDependency(repo, dependency));
				}).map(d => `${d.source}:${d.name}`);
				return `${chalk.green(repo.id)} ${chalk.italic(`(${dependenciesWhichRequiredUpgrade.join(', ')})`)}`;
			}).join('\n');
			this.log(migrationLog + '\n');
		}
		this.exit();
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
