class Dot {
	constructor(guru) {
		this.guru = guru;
	}

	async getDotMigration() {
		const target = this.guru.target;
		const repos = this.guru.repos;
		let migrationStepsContent = '';
		let num = 0;
		let previousResult;
		for await (const result of this.guru.getMigration()) {
			num++;
			const names = result.dependents.map(repo => repo.name);
			// Put results in a cluster.
			migrationStepsContent += `\n\tsubgraph cluster_${num} {\n\t\tlabel = "step #${num}";\n\t\t${names.map(name => `"${name}";`).join(' ')}\n\t}`;
			// Connect results to previous cluster.
			const previousDependents = previousResult ? previousResult.dependents : [target];
			result.dependents.forEach(current => {
				const directDependencies = repos.getDirectDependencies(current);
				previousDependents.forEach(previous => {
					migrationStepsContent += directDependencies.includes(previous) ? `\n\t"${previous.name}" -> "${current.name}"\n` : '';
				});
			});

			previousResult = result;
		}

		return `digraph {\nrankdir=LR\nsplines=ortho\n${migrationStepsContent}\n}`;
	}

}

module.exports = Dot;
