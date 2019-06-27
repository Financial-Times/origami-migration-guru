const { expect, test } = require('@oclif/test');
const path = require('path');

describe('stats', () => {
	test
		.stdout()
		.command([
			'stats',
			'o-test-component',
			path.resolve(__dirname, '../fixtures/manifests/simple-one-to-one.txt')
		])
		.exit(0)
		.it('finds stats for a simple tree', ctx => {
			expect(ctx.stdout).to.contain('Found 2 repos to consider.');
			expect(ctx.stdout).to.contain('1 rely on o-test-component directly');
			expect(ctx.stdout).to.contain('1 rely on o-test-component overall');
		});
});
