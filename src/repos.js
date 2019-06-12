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
	getOneForName(name) {
		const repos = this._repos.filter(repo => repo.name === name);
		if (repos.length <= 0) {
			throw new Error(`Found no repos by the name "${name}".`);
		}
		return repos[0];
	}

	/**
	 * @param {Repo} repo The repo to find dependents for.
	 * @return {Array<Repo>} - All repos which are direct dependents.
	 */
	getDirectDependents(repo) {
		const name = repo.name;
		return this._repos.filter(repo => {
			const dependencies = repo.getDependencyNameFromManifest();
			return dependencies.includes(name);
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
		const dependencyNames = repo.getDependencyNameFromManifest();
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
