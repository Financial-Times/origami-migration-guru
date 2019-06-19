const { expect, test } = require('@oclif/test');
const path = require('path');

describe('guide', () => {
	test
		.stdout()
		.stdin('y', 50) // To answer prompt "Ready to update b?"
		.command([
			'guide',
			'b',
			path.resolve(__dirname, '../fixtures/manifests/simple-one-to-one.txt'),
		])
		.exit(0)
		.it('asks to start migration', (ctx, done) => {
			expect(ctx.stdout).to.contain('Ready to update b?');
			expect(ctx.stdout).to.contain('a (bower:b)');
			done();
		});
});
