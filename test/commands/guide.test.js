const { expect, test } = require('@oclif/test');
const path = require('path');

describe('guide', () => {
	test
		.stdout()
		.stdin('y', 100) // To answer prompt "Ready to update o-test-component?"
		.command([
			'guide',
			'o-test-component',
			path.resolve(__dirname, '../fixtures/manifests/simple-one-to-one.txt'),
		])
		.exit(0)
		.it('asks to start migration', ctx => {
			expect(ctx.stdout).to.contain('Ready to update o-test-component?');
			expect(ctx.stdout).to.contain('a (bower:o-test-component)');
		});
});
