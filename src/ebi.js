const { once } = require('events');
const fs = require('fs');
const readline = require('readline');
const { Repos } = require('./repos');

class Ebi {
	static async resultsToRepos(manifestFile) {
		const repos = new Repos();
		// Get manifests from given file.
		const lines = readline.createInterface({
			input: manifestFile ? fs.createReadStream(manifestFile) : process.stdin
		});
		lines.on('line', input => {
			try {
				repos.addFromEbi(input);
			} catch (error) {
				this.warn(`Cound not parse line. ${error.message}: ${input}`);
			}
		});
		lines.on('close', () => {
			process.stdin.resume();
		});
		await once(lines, 'close');
		return repos;
	}
}

module.exports = Ebi;
