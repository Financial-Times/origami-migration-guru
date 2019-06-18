const { Command, flags } = require('@oclif/command');
const readline = require('readline');
const {Repos, SingleRepoNotFoundError} = require('../repos');
const Guru = require('../guru');
const Dot = require('../dot');
const { Confirm, Select } = require('enquirer');
const { once } = require('events');
const chalk = require('chalk');

class TreeCommand extends Command {

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
				const choice = await this.confirmTargetRepoName(error.query, error.repos);
				return new Guru(choice, repos);
			}
		}
	}

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
				repos.addFromEbi(input);
			} catch (error) {
				this.warn(`Cound not parse line. ${error.message}: ${input}`);
			}
		});
		await once(lines, 'close');

		// create migration guru to guide us for a given target and repos
		const guru = await this.getGuru(name, repos);

		// guide: interactive migration, text based, step-by-step
		if (flags.format === 'guide') {
			const ready = await new Confirm({
				name: 'ready',
				message: `Ready to update ${name}?`
			}).run();
			if (!ready) {
				process.exit();
			}
			const impactedRepos = guru.getImpactedRepos();
			let currentStepNumber = 0;
			for await (const result of guru.getMigration()) {
				currentStepNumber++;
				const migrationLog = result.dependents.map(repo => {
					const name = repo.name;
					const dependenciesWhichRequiredUpgrade = repo.getDependencies().filter(dependency => {
						return Repos.repoMatchesDependency(guru.target, dependency) || impactedRepos.find(repo => Repos.repoMatchesDependency(repo, dependency));
					}).map(d => `${d.source}:${d.name}`);
					return `${chalk.green(name)} ${chalk.italic(`(${dependenciesWhichRequiredUpgrade.join(', ')})`)}`;
				}).join('\n');
				this.log(migrationLog + '\n');
				await new Confirm({
					name: 'continue',
					message: `Continue to step ${currentStepNumber + 1} of the migration?`
				}).run();
			}
			this.log(chalk.green('\nAll done!\n'));
		}

		// dot: generate a graphviz `.dot` to visualise the migration
		if (flags.format === 'dot') {
			const dot = new Dot(guru);
			this.log(await dot.getDotMigration());
		}

		// n/a: when no format is selected provide a general overview of numbers
		if (!flags.format) {
			this.log(`-- Found ${repos.getAll().length} repos to consider.`);
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
