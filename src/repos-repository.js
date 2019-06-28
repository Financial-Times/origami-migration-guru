const Repo = require('./repo');
const Dependency = require('./dependency');

/**
 * @param {*} repo - To validate is a Repo object.
 * @throws {TypeError}
 */
function validateRepo(repo) {
	if (!(repo instanceof Repo)) {
		throw new TypeError('Was not given a target repo.');
	}
}

/**
 * @param {*} dependency - To validate is a Dependency object.
 * @throws {TypeError}
 */
function validateDependency(dependency) {
	if (!(dependency instanceof Dependency)) {
		throw new TypeError('Was not given a dependency.');
	}
}

class SingleRepoNotFoundError extends Error {
	constructor(message, query, foundRepos, registry = null) {
		super(message);
		this.name = 'SingleRepoNotFoundError';
		this.query = query;
		this.repos = foundRepos;
		this.registry = registry;
	}
}

class ReposRepository {
	constructor(repos) {
		this._repos = Array.from(repos);
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

	findOneByRegistryName(name, registry) {
		const repos = this._repos.filter(repo => repo.getName(registry) === name);
		// Found more or less than one repo.
		if (repos.length !== 1) {
			throw new SingleRepoNotFoundError(`Found ${repos.length} repos which match "${name}" for registry "${registry}".`, name, repos, registry);
		}
		// Success.
		return repos[0];
	}

	/**
	 * @param {Repo} repo The repo to find dependents for.
	 * @return {Array<Repo>} - All repos which are direct dependents.
	 */
	getDirectDependents(repo) {
		validateRepo(repo);
		return this._repos.filter(current => {
			const dependencies = current.getDependencies();
			return dependencies.some(d => repo.is(d));
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
		return this._repos.filter(repo => dependencies.some(d => repo.is(d)));
	}
}

module.exports = { ReposRepository, SingleRepoNotFoundError};
