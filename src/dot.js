class Dot {
	constructor(guru) {
		this.guru = guru;
	}

	async getDotMigration() {
		const target = this.guru.target;
		let migrationStepsContent = '';
		let num = 0;
		for await (const result of this.guru.getMigration()) {
			num++;
			const names = result.dependents.map(repo => repo.name);
			migrationStepsContent += `\n\tsubgraph cluster_${num} {\n\t\tlabel = "step #${num}";\n\t\t${names.map(name => `"${name}";`).join(' ')}\n\t}`;
		}

		const dotdone = {};
		const repos = this.guru.repos;
		function getDependentLinksContent(name) {
			dotdone[name] = dotdone[name] || [];
			const repo = repos.getOneForName(name);
			const directDependents = repos.getDirectDependents(repo);
			const dependentstoAdd = directDependents.filter(dependent => dotdone[name].includes(dependent.name) === false);
			return dependentstoAdd.map(dependent => {
				dotdone[name].push(dependent.name);
				const direct = `\t"${name}" -> "${dependent.name}"\n`;
				const indirect = getDependentLinksContent(dependent.name);
				return direct + indirect;
			}).join('');
		}

		return `digraph {\n${migrationStepsContent}\n ${getDependentLinksContent(target.name)}}`;
	}

}

module.exports = Dot;
