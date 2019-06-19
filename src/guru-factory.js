const { once } = require('events');
const readline = require('readline');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { Select } = require('enquirer');
const Guru = require('./guru');
const { ReposRepository, SingleRepoNotFoundError } = require('./repos-repository');

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

		// Create repos.
		const repos = new ReposRepository();
		const lines = readline.createInterface({
			input: manifestSource
		});
		lines.on('line', input => {
			try {
				repos.addFromEbi(input);
			} catch (error) {
				log(`Cound not parse line. ${error.message}: ${input}`);
			}
		});
		await once(lines, 'close');

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
