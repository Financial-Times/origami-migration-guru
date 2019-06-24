/* eslint-disable complexity */
const path = require('path');
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

class ManifestConflictError extends Error {
	constructor(message, existingRepoId, newRepoId) {
		super(message);
		this.name = 'ManifestConflictError';
		this.existingRepoId = existingRepoId;
		this.newRepoId = newRepoId;
	}
}

class ReposRepository {
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
	 * @param {Repo} repo The repo to compare against a dependency.
	 * @param {Dependency} dependency The dependency to compare the repo against.
	 * @return {Boolean} - True if the dependency represents the repo.
	 */
	static repoMatchesDependency(repo, dependency) {
		validateRepo(repo);
		validateDependency(dependency);
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
				return ReposRepository.repoMatchesDependency(repo, dependency);
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
			dependency => ReposRepository.repoMatchesDependency(repo, dependency)
		));
	}

	/**
	 * @param {Object|Sring} result - The result from an [ebi](https://github.com/Financial-Times/ebi) search for manifest files.
	 */
	addFromEbi(result) {
		result = typeof result === 'string' ? JSON.parse(result) : result;
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
		//
		try {
			const parsed = JSON.parse(manifest);
			// if (parsed.name === 'n-ui-foundations') {
			const existingRepo = this.findOneByRegistryName(parsed.name, registry);
			const existing = existingRepo.manifestUrls.get(registry);

			const extractName = name => {
				const parts = name.split('/');
				return parts.pop();
			};

			// if (existingRepo.id !== result.repository) {
			// 	// Check package.json repository url and bower homepage
			// 	let parsedWin = (parsed.repository && parsed.repository.url && parsed.repository.url.includes(result.repository)) || (parsed.homepage && parsed.homepage.includes(result.repository));
			// 	let existingWin = existing && existing.includes(existingRepo.id);
			// 	// If no clear winners check the name matches the repo name.
			// 	if (!parsedWin && !existingWin) {
			// 		const parsedName = extractName(parsed.name);
			// 		parsedWin = result.repository.includes(parsedName);
			// 		existingWin = existingRepo.name.includes(parsedName);
			// 	}
			// 	// If both winners, check the manifest name matches the repo name exactly.
			// 	if (parsedWin && existingWin) {
			// 		const parsedName = extractName(parsed.name);
			// 		parsedWin = extractName(result.repository) === extractName(parsedName);
			// 		existingWin = extractName(existingRepo.name) === extractName(parsedName);
			// 	}

			// 	if (existingWin && !parsedWin) {
			// 		console.warn(`success: for ${parsed.name}, chose ${existingRepo.id} over ${result.repository} (${registry})`);
			// 	}
			// 	if (!existingWin && parsedWin) {
			// 		console.warn(`success: for ${parsed.name}, chose ${result.repository} over ${existingRepo.id} (${registry})`);
			// 	}
			// 	if ((!existingWin && !parsedWin) || (existingWin && parsedWin)) {
			// 		console.warn(`fail-${existingWin && parsedWin ? 'both' : 'neither'}: for ${parsed.name}, ${existingRepo.id} or ${result.repository} (${registry})?`);
			// 	}
			// 	// Todo: how to handle success?
			// 	// a. Remove. But then won't be included in migration.
			// 	// b. Reassign manifestNames to random string (assumes not published to registry).
			// 	// Todo: how to handle fail?
			// 	// a. Ask user to clarify if tty or error otherwise.
			// 	// b. a, but only if another repo has a dependnecy on one of the conflicting. If not just assign a random string to manifestNames defensively.
			// 	// c. Actually check the registry.
			// }
			// }
		} catch (error) {}
		// Success. Add result.
		let repo = this._repos.find(repo => repo.id === result.repository);
		if (!repo) {
			repo = new Repo(result.repository);
			this._repos.push(repo);
		}
		repo.addManifest(registry, manifest);
	}
}

module.exports = { ReposRepository, SingleRepoNotFoundError};
