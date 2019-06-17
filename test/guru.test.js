/* eslint-disable no-loop-func */
const Guru = require('../src/guru');
const { Repos } = require('../src/repos');
const proclaim = require('proclaim');

const generateEbiResult = (component, dependencies) => {
	return `{"filepath":"bower.json","repository":"Financial-Times/${component}","fileContents":"{\\"name\\":\\"${component}\\",\\"dependencies\\":{${dependencies.map(dependency => `\\"${dependency}\\":\\"^4.7.9\\"`)}}}"}`;
};

const getRepos = repoNames => {
	const repos = new Repos();
	for (const [name, dependencies] of Object.entries(repoNames)) {
		const result = generateEbiResult(name, dependencies);
		repos.addFromEbi(result);
	}
	return repos;
};

const expectRepos = (reposToMigrate, expectedNames, count) => {
	const extra = reposToMigrate.filter(repo => !expectedNames.includes(repo.name));
	const extraNames = extra.map(repo => repo.name);
	const missedNames = expectedNames.filter(name => !reposToMigrate.find(repo => repo.name === name));
	proclaim.equal(extraNames.length, 0, `Extra repos of migration ${count + 1}: ${extraNames}. Expected: ${expectedNames}`);
	proclaim.equal(missedNames.length, 0, `Missed repos of migration ${count + 1}: ${missedNames}. Expected: ${expectedNames}`);
};

const getGuru = (target, repos) => {
	return new Guru(target, getRepos(repos));
};

const assertMigrations = async (guru, expectedMigrations) => {
	let count = 0;
	for await (const result of guru.getMigration()) {
		const expected = expectedMigrations[count];
		if (expected) {
			expectRepos(result.dependents, expected, count);
		} else {
			proclaim.ok(false, `Expected no more results after migration ${count + 1}.`);
		}
		count++;
	}
	if (count === 0 && expectedMigrations.length > 0) {
		proclaim.ok(false, 'No migration steps returned.');
	}
};

describe('Guru Migration', () => {
	const target = 'a';

	const tests = [
		{
			description: 'a single dependency',
			visual: `
				+---+
				| b |
				+---+
				|
				|
				v
				+---+
				| a |
				+---+
			`,
			repos: {
				a: [],
				b: ['a'] // b depends on a
			},
			expectedMigrations: [
				['b']
			]
		},
		{
			description: 'a single direct and indirect dependency',
			visual: `
				+---+
				| c |
				+---+
				|
				|
				v
				+---+
				| b |
				+---+
				|
				|
				v
				+---+
				| a |
				+---+
			`,
			repos: {
				a: [],
				b: ['a'], // b depends on a
				c: ['b'] // c depends on b
			},
			expectedMigrations: [
				['b'],
				['c']
			]
		},
		{
			description: 'nested direct and indirect interdependencies',
			visual: `
  			        +---+     +---+
  			        | g | <-- | h |
  			        +---+     +---+
  			          |
  			          |
  			          v
  			        +---+     +---+     +---+
  			        | f | <-- | j | --> | i | -+
  			        +---+     +---+     +---+  |
  			          |         |         |    |
  			          |         |         |    |
  			          v         |         |    |
  			        +---+       |         |    |
  			        | c | -+    |         |    |
  			        +---+  |    |         |    |
  			          |    |    |         |    |
  			          |    |    |         |    |
  			          v    |    |         |    |
  			        +---+  |    |         |    |
  			     +- | e |  |    |         |    |
  			     |  +---+  |    |         |    |
  			     |    |    |    |         |    |
  			     |    |    |    |         |    |
  			     |    v    |    |         |    |
  			     |  +---+  |    |         |    |
  			+----+> | d |  |    |         |    |
  			|    |  +---+  |    |         |    |
  			|    |    |    |    |         |    |
  			|    |    |    |    |         |    |
  			|    |    v    |    |         |    |
  			|    |  +---+  |    |         |    |
  			|    |  | b | <+    |         |    |
  			|    |  +---+       |         |    |
  			|    |    |         |         |    |
  			|    |    |         |         |    |
  			|    |    v         v         |    |
  			|    |  +-------------+       |    |
  			|    +> |      a      | <-----+    |
  			|       +-------------+            |
  			|                                  |
  			+----------------------------------+
			`,
			repos: {
				a: [],
				b: ['a'],
				c: ['b', 'e'],
				d: ['b'],
				e: ['a', 'd'],
				f: ['c'],
				g: ['f'],
				h: ['g'],
				i: ['a', 'd'],
				j: ['a', 'f', 'i']
			},
			expectedMigrations: [
				['b'],
				['d'],
				['e', 'i'],
				['c'],
				['f'],
				['j', 'g'],
				['h'],
			]
		},
		{
			description: 'two dependents "c" and "d" share a direct and indirect dependency of the target, but "d" also depends on the other "c"',
			visual: `
			   +---+     +---+
			+- | c | <-- | d | -+
			|  +---+     +---+  |
			|    |         |    |
			|    |         |    |
			|    |         v    |
			|    |       +---+  |
			+----+-----> | b |  |
			     |       +---+  |
			     |         |    |
			     |         |    |
			     |         v    |
			     |       +---+  |
			     +-----> | a | <+
			             +---+
			`,
			repos: {
				a: [],
				b: ['a'],
				c: ['a', 'b'],
				d: ['a', 'b', 'c']
			},
			expectedMigrations: [
				['b'],
				['c'],
				['d']
			]
		},
	];

	for (const { visual, description, repos, expectedMigrations } of tests) {
		describe(`Of a dependency tree with ${description}:\n${visual}`, () => {
			const guru = getGuru(target, repos);
			it('Gives the correct number of direct dependents.', async () => {
				const dependencyLists = Object.values(repos);
				const directDependencyLists = dependencyLists.filter(list => list.includes(target));
				proclaim.equal(guru.getDirectlyImpactedRepos().length, directDependencyLists.length);
			});
			it('Gives the correct number of total dependents.', async () => {
				proclaim.equal(guru.getImpactedRepos().length, Object.keys(repos).length - 1);
			});
			it('Generates the current migration guide.', async () => {
				await assertMigrations(guru, expectedMigrations);
			});
		});
	}
});
