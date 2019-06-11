class Guru {
	/**
	 * @param {String} targetName The name of the repo which needs a migration guide.
	 * @param {Repos} repos A repos instance with details on each repo to evaluate.
	 */
	constructor(targetName, repos) {
		this.repos = repos;
		this.target = repos.getOneForName(targetName);
		this._targetDependents = repos.getDependents(this.target);
		this._directTargetDependents = repos.getDirectDependents(this.target);
	}

	/**
	 * @return {Array<Repo>} - All direct dependents of the target repo.
	 */
	getDirectlyImpactedRepos() {
		return this._directTargetDependents;
	}

	/**
	 * @return {Array<Repo>} - Total dependents of the target repo.
	 */
	getImpactedRepos() {
		return this._targetDependents;
	}

	/**
	 * The dependents to migrate next given a repo and already completed migrations.
	 * @typedef {Object} Guru~DependentsToMigrate
	 * @property {Array<Repo>} migrateable - The dependent repos to migrate next.
	 * @property {Boolean} complete - True if all dependents could be migrated.
	 */

	/**
	 * @param {Repo} repo The repo to get migratable dependents for.
	 * @param {Set<Repo>} completed Repos which have already been migrated.
	 * @return {Guru~DependentsToMigrate} - Migration details for the given repo.
	 */
	getDependentsToMigrate(repo, completed = new Set()) {
		const direct = this.repos.getDirectDependents(repo);
		const nonMigrated = direct.filter(dependent => !completed.has(dependent));
		// We want to migrate direct dependents which do not have a dependency
		// which also needs migrating. Such a dependency should be migrated first.
		const migrateable = nonMigrated.filter(dependent => {
			const nonMigratedImpactedRepos = this.getImpactedRepos().filter(dependent => !completed.has(dependent));
			const nonMigratedImpactedReposNames = nonMigratedImpactedRepos.map(dependent => dependent.name);
			const dependencies = this.repos.getDependencies(dependent);
			const found = dependencies.find(dependency => nonMigratedImpactedReposNames.includes(dependency.name));
			return !found;
		});
		return { migrateable, complete: nonMigrated.length === migrateable.length};
	}

	async * getMigration() {
		// Repos which have been migrated fully.
		const completed = new Set();
		// Repos which are not completely migrated yet.
		let incomplete = new Set([this.target]);
		while (incomplete.size > 0) {
			const retry = new Set();
			const migration = new Set();
			// 1. Find next migration set for incompleted repos.
			incomplete.forEach(repo => {
				// 1b. Get dependents which need migration.
				const result = this.getDependentsToMigrate(repo, completed);
				result.migrateable.forEach(repo => migration.add(repo));
				// 1c. If a dependent cannot be migrated yet due to
				// one of its dependencies, try to migrate the dependents of
				// this repo again.
				if (!result.complete) {
					retry.add(repo);
				}
			});

			// 2. Migrate dependents in the next round.
			incomplete = new Set();
			migration.forEach(repo => {
				incomplete.add(repo);
				completed.add(repo);
			});

			// 2b. Retry repos which did not complete this time.
			retry.forEach(repo => incomplete.add(repo));

			if (migration.size > 0) {
				yield { dependents: [...migration], done: incomplete.size === 0};
			}
		}
	}
}

module.exports = Guru;
