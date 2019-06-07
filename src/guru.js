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
		let migrate = [this.target];

		// Migrate down the tree.
		while (migrate.length > 0 || retry.length > 0) {
			const result = [];
			[retry, migrate].forEach(source => {
				source.forEach(repo => {
					// Remove from retry list if present.
					retry.forEach(retryRepo => {
						if (repo === retryRepo) {
							retry.shift();
						}
					});
					// Get migrations.
					result.push(...this.getNextMigration(repo, retry, completed));
				});
			});
			migrate = result;
			if (result.length > 0) {
				yield { dependents: result, done: migrate.length === 0 && retry.length === 0};
			}
		}
	}
}

module.exports = Guru;
