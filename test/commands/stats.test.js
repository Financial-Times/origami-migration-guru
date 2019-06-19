const { expect, test } = require('@oclif/test');
const path = require('path');

describe('stats', () => {
	test
		.stdout()
		.command([
			'stats',
			'b',
			path.resolve(__dirname, '../fixtures/manifests/simple-one-to-one.txt')
		])
		.exit(0)
		.it('finds stats for a simple tree where "b" depends on "a"', (ctx, done) => {
			expect(ctx.stdout).to.contain('Found 2 repos to consider.');
			expect(ctx.stdout).to.contain('1 rely on b directly');
			expect(ctx.stdout).to.contain('1 rely on b overall');
			done();
		});
});
