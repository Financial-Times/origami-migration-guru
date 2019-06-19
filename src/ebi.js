const { once } = require('events');
const readline = require('readline');
const { Repos } = require('./repos');

class Ebi {
	static async resultsToRepos(manifestSource) {
		const repos = new Repos();
		// Get manifests from given file.
		const lines = readline.createInterface({
			input: manifestSource
		});
		lines.on('line', input => {
			try {
				repos.addFromEbi(input);
			} catch (error) {
				this.warn(`Cound not parse line. ${error.message}: ${input}`);
			}
		});
		await once(lines, 'close');
		return repos;
	}
}

module.exports = Ebi;
