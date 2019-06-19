const { Command } = require('@oclif/command');
const GuruFactory = require('../guru-factory');
const chalk = require('chalk');

const tty = process.stdin.isTTY;

class StatsCommand extends Command {

	async run() {
		const { args } = this.parse(StatsCommand);

		// Create migration guru.
		const guru = await GuruFactory.createFromInput(args.component, args.manifests, this.log);

		// Provide a general overview of numbers.
		const totalCount = guru.getImpactedRepos().length;
		this.log(chalk.green(`Found ${guru.repos.getAll().length} repos to consider.`));
		this.log(chalk.green(`Of these ${guru.getDirectlyImpactedRepos().length} rely on ${guru.target.getName()} directly.`));
		this.log(chalk.green(`${totalCount} rely on ${guru.target.getName()} overall${totalCount > 0 ? ':' : '.'}`));
		this.log(guru.getImpactedRepos().map(d => d.name).join(', '));
		this.exit();
	}
}

StatsCommand.args = [{
	name: 'component',
	description: 'The component to migrate.',
	required: true
}, {
	name: 'manifests',
	description: 'A file containing manifest file contents found via ebi.',
	required: tty
}];

StatsCommand.description = `
Find the dependents of a component, which
accounts for all the repository manifests
given.
`;

module.exports = StatsCommand;
