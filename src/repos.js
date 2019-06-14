const path = require('path');
const Repo = require('./repo');

class Repos {
	constructor() {
		this._repos = [];
	}

	getAll() {
		return this._repos;
	}

	/**
	 * @param {String} name The name of the repo.
	 * @return {Repo|null} - The found repo.
	 */
	findOne(name) {
		// Find repos by name. E.g. "o-crossword"
		let repos = this._repos.filter(repo => repo.name === name);
		// If that didn't work, try by id. E.g. "ftlabs/o-crossword"
		if (repos.length <= 0) {
			repos = this._repos.filter(repo => repo.id === name);
		}
		// Not found.
		if (repos.length <= 0) {
			throw new Error(`Found no repos by the name "${name}".`);
		}
		// Multiple found.
		if (repos.length > 1) {
			throw new Error(`Found two repos by the name "${name}" (${repos.map(r => r.id).join(', ')}). Run again with one of these.`);
		}
		// Success.
		return repos[0];
	}

	repoMatchesDependency(repo, dependency) {
		return dependency.name === repo.getName(dependency.source);
	}

	/**
	 * @param {Repo} repo The repo to find dependents for.
	 * @return {Array<Repo>} - All repos which are direct dependents.
	 */
	getDirectDependents(repo) {
		return this._repos.filter(current => {
			const dependencies = current.getDependencies();
			return dependencies.some(dependency => {
				return this.repoMatchesDependency(repo, dependency);
			});
		});
	}

	/**
	 * @param {Repo} repo The repo to find dependents for.
	 * @return {Array<Repo>} - All repos which are dependents, direct or indirect.
	 */
	getDependents(repo) {
		const dependents = new Map();
		this.getDirectDependents(repo).forEach(dependent => {
			dependents.set(dependent.name, dependent);
			this.getDependents(dependent).forEach(dependent => {
				dependents.set(dependent.name, dependent);
			});
		});
		return Array.from(dependents.values());
	}

	/**
	 * @param {Repo} repo The repo to get dependencies for.
	 * @return {Array<String>} - All repos which are dependencies of the given repo.
	 */
	getDependencies(repo) {
		const dependencies = new Map();
		const directDependencies = this.getDirectDependencies(repo);
		directDependencies.forEach(directDependency => {
			dependencies.set(directDependency.name, directDependency);
			const subDependencies = this.getDependencies(directDependency);
			subDependencies.forEach(subDependency => {
				dependencies.set(subDependency.name, subDependency);
			});
		});
		return Array.from(dependencies.values());
	}

	getDirectDependencies(repo) {
		const dependencyNames = repo.getDependencies().map(d => d.name);
		return this._repos.filter(repo => dependencyNames.includes(repo.name));
	}

	addFromEbi(result) {
		result = JSON.parse(result);
		let registry = path.parse(result.filepath).name;
		registry = registry === 'package' ? 'npm' : registry;
		const manifest = result.fileContents;
		// Unexpected registry.
		const expectedRegistries = ['bower', 'npm'];
		if (!expectedRegistries.includes(registry)) {
			throw new Error(`Expected registry ${registry}`);
		}
		// No manifest file found, nothing to add.
		if (!manifest) {
			return;
		}
		// Success. Add result.
		let repo = this._repos.find(repo => repo.id === result.repository);
		if (!repo) {
			repo = new Repo(result.repository);
			this._repos.push(repo);
		}
		repo.addManifest(registry, result.fileContents);
	}
}

module.exports = Repos;
