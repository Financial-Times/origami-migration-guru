const Dependency = require('../src/dependency');
const proclaim = require('proclaim');

describe('Dependency', () => {
	it('Creates for bower successfully.', () => {
		const dependency = new Dependency('a', '^1.0.0', 'bower');
		proclaim.equal(dependency.name, 'a');
		proclaim.equal(dependency.version, '^1.0.0');
		proclaim.equal(dependency.source, 'bower');
	});
	it('Creates for npm successfully.', () => {
		const dependency = new Dependency('a', '^1.0.0', 'npm');
		proclaim.equal(dependency.name, 'a');
		proclaim.equal(dependency.version, '^1.0.0');
		proclaim.equal(dependency.source, 'npm');
	});
	it('Errors for an unsupported registry "composer".', () => {
		proclaim.throws(() => {
			new Dependency('a', '^1.0.0', 'composer'); // eslint-disable-line no-new
		});
	});
});
