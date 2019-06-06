const { Command, flags } = require('@oclif/command');
const readline = require('readline');
const Repos = require('../repos');
const Guru = require('../guru');
const Dot = require('../dot');
const { cli } = require('cli-ux');
const { once } = require('events');

class TreeCommand extends Command {

	async run() {
		const { args, flags } = this.parse(TreeCommand);
		const repos = new Repos();
		const name = args.component;

		// Get manifests from given file.
		const lines = readline.createInterface({
			input: require('fs').createReadStream(flags.manifests)
		});
		lines.on('line', input => {
			try {
				const result = JSON.parse(input);
				repos.addFromEbi(result);
			} catch (error) {
				this.warn(`Cound not parse line. ${error.message}: ${input}`);
			}
		});
		await once(lines, 'close');

		// create migration guru to guide us for a given target and repos
		const guru = new Guru(name, repos);

		// guide: interactive migration, text based, step-by-step
		if (flags.format === 'guide') {
			const cool = await cli.confirm(`Ready to update ${name}? (y/n)`);
			if (!cool) {
				process.exit();
			}
			for await (const result of guru.getMigration()) {
				const names = result.dependents.map(repo => repo.name);
				this.log(`${names.join(` (${result.repo.name})\n`)} (${result.repo.name})\n`);
				await cli.anykey();
			}
		}

		// dot: generate a graphviz `.dot` to visualise the migration
		if (flags.format === 'dot') {
			const dot = new Dot(guru);
			this.log(await dot.getDotMigration());
		}

		// n/a: when no format is selected provide a general overview of numbers
		if (!flags.format) {
			this.log(`-- Found ${repos.repos.length} repos to consider.`);
			this.log(`-- Of these ${guru.getDirectlyImpactedRepos().length} rely on ${name} directly.`);
			this.log(`-- ${guru.getImpactedRepos().length} rely on ${name} overall:\n${guru.getImpactedRepos().map(d => d.name)}.`);
		}

	}
}

TreeCommand.args = [
	{ name: 'component' }
];

TreeCommand.flags = {
	format: flags.string({ char: 'f', options: ['dot', 'guide'], description: 'format to output tree in' }),
	manifests: flags.string({ char: 'm', description: 'a file containing manifests (ebi)' }),
};

TreeCommand.description = `OMG
...
TODO
`;

module.exports = TreeCommand;
