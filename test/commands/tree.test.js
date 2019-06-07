const { expect, test } = require('@oclif/test');
const path = require('path');

describe('tree', () => {

	test
		.stdout()
		.command([
			'tree',
			'b',
			'--manifests',
			path.resolve(__dirname, '../fixtures/manifests/simple-one-to-one.txt')
		])
		.it('finds stats for a simple tree where "b" depends on "a"', ctx => {
			expect(ctx.stdout).to.contain('Found 2 repos to consider.');
			expect(ctx.stdout).to.contain('1 rely on b directly');
			expect(ctx.stdout).to.contain('1 rely on b overall');
		});

	test.skip()
		.stdout()
		.stdin('y\n', 50)
		.stdin('y\n', 200) // (╯°□°)╯︵ ┻━┻
		.command([
			'tree',
			'b',
			'--format',
			'guide',
			'--manifests',
			path.resolve(__dirname, '../fixtures/manifests/simple-one-to-one.txt')
		])
		.it('guides the migration path for a simple tree where "b" depends on "a"', ctx => {
			expect(ctx.stdout).to.contain('a (b)'); // step 1, upgrade a (because of b)
		});
});
