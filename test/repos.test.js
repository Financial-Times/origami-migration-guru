const { Repos } = require('../src/repos');
const Repo = require('../src/repo');
const proclaim = require('proclaim');

function createRepos(repoData) {
	const repos = new Repos();
	repoData.forEach(data => {
		const ebi = {
			filepath: 'bower.json',
			repository: data.id ? data.id : `Financial-Times/${data.name}`,
			fileContents: {
				name: data.name,
				dependencies: data.dependencies
			}
		};
		repos.addFromEbi(JSON.stringify(ebi));
	});
	return repos;
}

const assertRepos = (actual, expectedNames) => {
	proclaim.isInstanceOf(actual, Array);
	actual.forEach(r => proclaim.isInstanceOf(r, Repo));
	proclaim.deepEqual(actual.map(r => r.getName()).sort(), expectedNames.sort());
};

const reposWithDependencies = () => {
	return createRepos([
		{
			name: 'a',
			dependencies: {
				b: '^1.0.0'
			}
		},
		{
			name: 'b',
			dependencies: {
				c: '^1.0.0'
			}
		},
		{
			name: 'c',
			dependencies: {}
		},
	]);
};

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

	describe('getAll', () => {
		it('returns all repos', () => {
			repos = reposWithDependencies();
			const actual = repos.getAll();
			assertRepos(actual, ['a', 'b', 'c']);
		});
	});

	describe('findOne', () => {
		it('returns a single found repo by name', () => {
			repos = createRepos([
				{
					name: 'a',
					dependencies: {}
				},
				{
					name: 'b',
					dependencies: {}
				}
			]);
			const actual = repos.findOne('a');
			assertRepos([actual], ['a']);
		});

		it('returns a single found repo by id', () => {
			repos = createRepos([
				{
					id: 'other-org/a',
					name: 'a',
					dependencies: {}
				},
				{
					id: 'financial-times/a',
					name: 'a',
					dependencies: {}
				}
			]);
			const actualOne = repos.findOne('financial-times/a');
			proclaim.equal(actualOne.id, 'financial-times/a');

			const actualTwo = repos.findOne('other-org/a');
			proclaim.equal(actualTwo.id, 'other-org/a');
		});

		it('Errors when two repos are found', () => {
			repos = createRepos([
				{
					id: 'other-org/a',
					name: 'a',
					dependencies: {}
				},
				{
					id: 'financial-times/a',
					name: 'a',
					dependencies: {}
				}
			]);
			proclaim.throws(() => repos.findOne('a'));
		});
		it('Errors when no repos are found', () => {
			proclaim.throws(() => repos.findOne('x'));
		});
	});

	describe('getDirectDependencies', () => {
		beforeEach(() => {
			repos = reposWithDependencies();
		});

		it('Does not return the repos which are indirect dependencies of a given repo.', () => {
			// Todo: Remove find one call so `getDirectDependencies` test
			// does not rely on `findOne` working.
			const actual = repos.getDirectDependencies(repos.findOne('a'));
			assertRepos(actual, ['b']); // b is a direct dependency
		});

		it('Returns an empty array when there are no dependencies of a given repo.', () => {
			const actual = repos.getDirectDependencies(repos.findOne('c'));
			assertRepos(actual, []);
		});

		it('Errors when no repos are given.', () => {
			proclaim.throws(() => repos.getDirectDependencies(undefined));
		});
	});

	describe('getDependencies', () => {
		beforeEach(() => {
			repos = reposWithDependencies();
		});

		it('Returns direct and indirect dependencies of a given repo.', () => {
			const actual = repos.getDependencies(repos.findOne('a'));
			assertRepos(actual, ['b', 'c']);
		});

		it('Returns an empty array when there are no dependencies of a given repo.', () => {
			const actual = repos.getDependencies(repos.findOne('c'));
			assertRepos(actual, []);
		});

		it('Errors when no repos are given.', () => {
			proclaim.throws(() => repos.getDependencies(undefined));
		});
	});

	describe('getDirectDependents', () => {
		beforeEach(() => {
			repos = reposWithDependencies();
		});

		it('Does not return the repos which are indirect dependents of a given repo.', () => {
			// Todo: Remove find one call so `getDirectDependents` test
			// does not rely on `findOne` working.
			const actual = repos.getDirectDependents(repos.findOne('c'));
			assertRepos(actual, ['b']); // only b directly depends on c
		});

		it('Returns an empty array when there are no dependents of a given repo.', () => {
			const actual = repos.getDirectDependents(repos.findOne('a'));
			assertRepos(actual, []);
		});

		it('Errors when no repos are given.', () => {
			proclaim.throws(() => repos.getDirectDependencies(undefined));
		});
	});

	describe('Dependents', () => {
		beforeEach(() => {
			repos = reposWithDependencies();
		});

		it('Returns direct and indirect dependents of a given repo.', () => {
			const actual = repos.getDependents(repos.findOne('c'));
			assertRepos(actual, ['b', 'a']); // both indirectly depend on c
		});

		it('Returns an empty array when there are no dependents on a given repo.', () => {
			const actual = repos.getDependents(repos.findOne('a'));
			assertRepos(actual, []);
		});

		it('Errors when no repos are given.', () => {
			proclaim.throws(() => repos.getDependents(undefined));
		});
	});

});
