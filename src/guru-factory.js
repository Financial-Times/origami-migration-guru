const Guru = require('./guru');
const { SingleRepoNotFoundError } = require('./repos');
const Ebi = require('./ebi');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const tty = process.stdin.isTTY;

class GuruFactory {

	static async createFromInput(targetName, manifestSource) {
		// Set manifest source.
		if (typeof manifestSource === 'string') {
			manifestSource = path.resolve(__dirname, manifestSource);
			manifestSource = fs.createReadStream(manifestSource);
		} else {
			manifestSource = process.stdin;
		}

		// Create repos.
		const repos = await Ebi.resultsToRepos(manifestSource);

		// Create guru.
		try {
			return new Guru(targetName, repos);
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

}

module.exports = GuruFactory;
