const { Command } = require('@oclif/command');
const GuruFactory = require('../guru-factory');
const Dot = require('../dot');

const tty = process.stdin.isTTY;

class DotCommand extends Command {

	async run() {
		const { args } = this.parse(DotCommand);

		// Create migration guru.
		const guru = await GuruFactory.createFromInput(args.component, args.manifests, this.log);

		// Output dot file.
		const dot = new Dot(guru);
		this.log(await dot.getDotMigration());
		this.exit();
	}
}

DotCommand.args = [{
	name: 'component',
	description: 'The component to migrate.',
	required: true
}, {
	name: 'manifests',
	description: 'A file containing manifest file contents found via ebi.',
	required: tty
}];

DotCommand.description = `
Generate a DOT file to show the migration path
for a component, which accounts for all the
repository manifests given.
`;

module.exports = DotCommand;
