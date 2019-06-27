const Repo = require('../src/repo');
const Dependency = require('../src/dependency');
const Manifest = require('../src/manifest');
const proclaim = require('proclaim');

describe('Repo', () => {
	let repo;
	const npmManifest = new Manifest(
		'Financial-Times/npm-dummy-name',
		'npm',
		JSON.stringify({
			name: 'npm-dummy-name',
			dependencies: {
				a: '^1.0.0',
				b: '^1.0.0',
			}
		})
	);
	const bowerManifest = new Manifest(
		'Financial-Times/bower-dummy-name',
		'bower',
		JSON.stringify({
			name: 'bower-dummy-name',
			dependencies: {
				c: '^1.0.0',
				d: '^1.0.0',
			}
		})
	);

	beforeEach(() => {
		repo = new Repo('financial-times/dummy-name');
		repo.addManifest(npmManifest);
		repo.addManifest(bowerManifest);
	});

	describe('addManifest', () => {
		it('Errors when passed a manifest string', async () => {
			proclaim.throws(() => repo.addManifest(JSON.stringify(bowerManifest)));
		});

		it('Errors given a non-supported registry "composer" ', async () => {
			proclaim.throws(() => repo.addManifest(new Manifest(
				'Financial-Times/composer-dummy-name',
				'composer',
				JSON.stringify({
					name: 'composer-dummy-name',
					dependencies: {}
				})
			)));
		});
	});

	describe('getName', () => {
		describe('with manifest files', () => {
			it('Returns the repo name without org by default', async () => {
				proclaim.strictEqual(repo.getName(), 'dummy-name');
			});

			it('Returns the repo\'s npm name given "npm"', async () => {
				proclaim.strictEqual(repo.getName('npm'), 'npm-dummy-name');
			});

			it('Returns the repo\'s bower name given "bower"', async () => {
				proclaim.strictEqual(repo.getName('bower'), 'bower-dummy-name');
			});

			it('Errors given a non-supported registry "composer" ', async () => {
				proclaim.throws(() => repo.getName('composer', {})); // eslint-disable-line max-nested-callbacks
			});
		});

		describe('with no manifest files', () => {
			const repoWithNoManifest = new Repo('financial-times/dummy-name');

			it('Returns the repo name without org by default', async () => {
				proclaim.equal(repoWithNoManifest.getName(), 'dummy-name');
			});

			it('Returns undefined given given "npm"', async () => {
				proclaim.strictEqual(repoWithNoManifest.getName('npm'), undefined);
			});

			it('Returns undefined given given "bower"', async () => {
				proclaim.strictEqual(repoWithNoManifest.getName('bower'), undefined);
			});

			it('Errors given a non-supported registry "composer" ', async () => {
				proclaim.throws(() => repoWithNoManifest.getName('composer', {})); // eslint-disable-line max-nested-callbacks
			});
		});
	});

	describe('getDependencies', () => {

		function assertDependencies(actual, expectedNames) {
			proclaim.isArray(actual);
			actual.forEach(a => proclaim.isInstanceOf(a, Dependency));
			const actualNames = actual.map(a => a.name);
			proclaim.deepEqual(actualNames.sort(), expectedNames.sort(), 'Returned dependency names did not match.');
		}

		it('Returns all dependencies by default', async () => {
			const dependencies = repo.getDependencies();
			assertDependencies(dependencies, ['a', 'b', 'c', 'd']);
		});

		it('Returns only npm dependencies given "npm"', async () => {
			const dependencies = repo.getDependencies('npm');
			assertDependencies(dependencies, ['a', 'b']);
		});

		it('Returns only bower dependencies given "bower"', async () => {
			const dependencies = repo.getDependencies('bower');
			assertDependencies(dependencies, ['c', 'd']);
		});

		it('Errors given a non-supported registry "composer" ', async () => {
			proclaim.throws(() => repo.getDependencies('composer', {}));
		});
	});

});
