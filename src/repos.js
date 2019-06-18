const path = require('path');
const Repo = require('./repo');

/**
 * @param {*} repo - To validate is a Repo object.
 * @throws {TypeError}
 */
function validateRepo(repo) {
	if (!(repo instanceof Repo)) {
		throw new TypeError('Was not given a target repo.');
	}
}

class SingleRepoNotFoundError extends Error {
	constructor(message, query, foundRepos) {
		super(message);
		this.name = 'SingleRepoNotFoundError';
		this.query = query;
		this.repos = foundRepos;
	}
}

class Repos {
	constructor() {
		this._repos = [];
	}

	/**
	 * @return {Array<Repo>} - All repos.
	 */
	getAll() {
		return this._repos;
	}

	/**
	 * @param {String} name The name of the repo.
	 * @return {Repo|null} - The found repo.
	 * @throws {SingleRepoNotFoundError}
	 */
	findOne(name) {
		// Find repos by name. E.g. "o-crossword"
		let repos = this._repos.filter(repo => repo.name === name);
		// If that didn't work, try by id. E.g. "ftlabs/o-crossword"
		if (repos.length <= 0) {
			repos = this._repos.filter(repo => repo.id === name);
		}
		// Found more or less than one repo.
		if (repos.length !== 1) {
			throw new SingleRepoNotFoundError(`Found ${repos.length} repos which match "${name}".`, name, repos);
		}
		// Success.
		return repos[0];
	}

	/**
	 * @param {Repo} repo The repo to compare against a dependency.
	 * @param {Dependency} dependency The dependency to compare the repo against.
	 * @return {Boolean} - True if the dependency represents the repo.
	 */
	repoMatchesDependency(repo, dependency) {
		validateRepo(repo);
		return dependency.name === repo.getName(dependency.source);
	}

	/**
	 * @param {Repo} repo The repo to find dependents for.
	 * @return {Array<Repo>} - All repos which are direct dependents.
	 */
	getDirectDependents(repo) {
		validateRepo(repo);
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
		validateRepo(repo);
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
	 * @param {Map} result A map of results for recursion.
	 * @return {Array<String>} - All repos which are dependencies of the given repo.
	 * @access private
	 */
	_getDependenciesRecursive(repo, result = new Map()) {
		const directDependencies = this.getDirectDependencies(repo);
		directDependencies.forEach(directDependency => {
			if (!result.has(directDependency.name)) {
				result.set(directDependency.name, directDependency);
				this._getDependenciesRecursive(directDependency, result);
			}
		});
		return Array.from(result.values());
	}

	/**
	 * @param {Repo} repo The repo to get dependencies for.
	 * @return {Array<Repo>} - All repos which are dependencies, direct or indirect, of the given repo.
	 */
	getDependencies(repo) {
		validateRepo(repo);
		return this._getDependenciesRecursive(repo);
	}

	/**
	 * @param {Repo} repo The repo to get dependencies for.
	 * @return {Array<Repo>} - Repos which are direct dependencies of the given repo.
	 */
	getDirectDependencies(repo) {
		validateRepo(repo);
		const dependencies = repo.getDependencies();
		return this._repos.filter(repo => dependencies.find(
			dependency => this.repoMatchesDependency(repo, dependency)
		));
	}

	/**
	 * @param {Object|Sring} result - The result from an [ebi](https://github.com/Financial-Times/ebi) search for manifest files.
	 */
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

module.exports = { Repos, SingleRepoNotFoundError};
