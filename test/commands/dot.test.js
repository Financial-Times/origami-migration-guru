const { expect, test } = require('@oclif/test');
const path = require('path');

describe('dot', () => {
	test
		.stdout()
		.command([
			'dot',
			'o-test-component',
			path.resolve(__dirname, '../fixtures/manifests/simple-one-to-one.txt')
		])
		.exit(0)
		.it('creats dot file', ctx => {
			expect(ctx.stdout).to.equal('digraph {\nrankdir=LR\nsplines=ortho\n\n\tsubgraph cluster_1 {\n\t\tlabel = "step #1";\n\t\t"a";\n\t}\n\t"o-test-component" -> "a"\n\n}\n');
		});
});
