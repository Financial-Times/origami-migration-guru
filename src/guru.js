class Guru {
	constructor(targetName, repos) {
		this.repos = repos;
		this.target = repos.getOneForName(targetName);
		if (!this.target) {
			throw new Error(`Could not find a repo for "${targetName}".`);
		}
		this.impactedRepos = repos.getDependents(this.target);
	}

	getDirectlyImpactedRepos() {
		return this.repos.getDirectDependents(this.target);
	}

	getImpactedRepos() {
		return this.impactedRepos;
	}

	getNextMigration(repo, retry, completed) {
		const direct = this.repos.getDirectDependents(repo);
		const nonMigrated = direct.filter(dependent => !completed.has(dependent.name));
		// We want to migrate direct dependents which
		// do not depend on another direct dependency which
		// hasn't yet beem migrated.
		const migrateable = nonMigrated.filter(dependent => {
			const nonMigratedImpactedRepos = this.impactedRepos.filter(dependent => !completed.has(dependent.name));
			const nonMigratedImpactedReposNames = nonMigratedImpactedRepos.map(dependent => dependent.name);
			const dependencies = this.repos.getDependencies(dependent);
			const found = dependencies.find(dependency => nonMigratedImpactedReposNames.includes(dependency.name));
			return !found;
		});
		// Not all direct dependencies could be migrated first time.
		if (nonMigrated.length !== migrateable.length) {
			retry.push(repo);
		}
		migrateable.forEach(repo => {
			completed.add(repo.name);
		});
		return migrateable;
	}

	async * getMigration() {
		const completed = new Set();
		const retry = [];
		const migrate = [this.target];
		let result = [];
		let countSinceRetry = 0;

		// Migrate down the tree.
		while (migrate.length > 0 || retry.length > 0) {
			const source = migrate.length <= 0 ? retry : migrate;
			const repo = source.shift();
			result = this.getNextMigration(repo, retry, completed);
			countSinceRetry = source === retry ? 0 : countSinceRetry + 1;
			migrate.push(...result);
			if (result.length > 0) {
				yield { repo, dependents: result };
			}
		}
	}
}

module.exports = Guru;
