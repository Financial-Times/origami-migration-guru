const { Repos } = require('../src/repos');
const proclaim = require('proclaim');

describe('Repos', () => {
	let repos;

	beforeEach(() => {
		repos = new Repos();
	});

	describe('addFromEbi', () => {
		it('Creates successfully for a found bower manifest.', () => {
			const ebi = {
				filepath: 'bower.json',
				repository: 'Financial-Times/demo-repo-a',
				fileContents: {
					name: 'demo-repo-a',
					dependencies: {
						'demo-repo-b': '^1.0.0'
					}
				}
			};

			proclaim.doesNotThrow(() => repos.addFromEbi(JSON.stringify(ebi)));
		});

		it('Creates successfully for a found npm manifest.', () => {
			const ebi = {
				filepath: 'package.json',
				repository: 'Financial-Times/demo-repo-a',
				fileContents: {
					name: 'demo-repo-a',
					dependencies: {
						'demo-repo-b': '^1.0.0'
					}
				}
			};

			proclaim.doesNotThrow(() => repos.addFromEbi(JSON.stringify(ebi)));
		});

		it('Does not error given no manifest found (skips silently).', () => {
			const ebi = {
				filepath: 'package.json',
				repository: 'Financial-Times/demo-repo-a',
				error: '404 ERROR: file \'package.json\' not found in \'Financial-Times/demo-repo-a\''
			};

			proclaim.doesNotThrow(() => repos.addFromEbi(JSON.stringify(ebi)));
		});

		it('Errors given an unsupported file path "composer.json".', () => {
			const ebi = {
				filepath: 'composer.json',
				repository: 'Financial-Times/demo-repo-a',
				fileContents: {
					dependencies: {
						'demo-repo-b': '^1.0.0'
					}
				}
			};

			proclaim.throws(() => repos.addFromEbi(JSON.stringify(ebi)));
		});
	});
});
