const Dependency = require('./dependency');

/**
 * @param {*} registry - To validate is a supported registry name.
 * @throws {Error}
 */
function validateRegistry(registry) {
	if (!['bower', 'npm'].includes(registry)) {
		throw new Error(`Registry ${registry} must be either "npm" or "bower".`);
	}
}

class Repo {
	/**
	 * @param {String} repoName - The name of the repository including organisation e.g. "Financial-Times/o-table".
	 */
	constructor(repoName) {
		this.id = repoName;
		[this.org, this.name] = repoName.split('/');
		this.manifestNames = new Map();
		this.manifestUrls = new Map();
		this.dependencies = new Map([
			['npm', new Set()],
			['bower', new Set()]
		]);
	}

	/**
	 * Get the name for this repo. Optionally by registry (bower or npm).
	 * E.g. a repo "Financial-Times/example" would return "example" by default.
	 * But it may be named differently in `bower.json` or `package.json`, e.g.
	 * "@financial-times/example".
	 * @param {String|null} registry [null] - The registry to get the repository name from `npm`, `bower`, or `null` for the repository name without organisation.
	 * @return {String} - The repository's name.
	 */
	getName(registry = null) {
		if (registry) {
			validateRegistry(registry);
			return this.manifestNames.get(registry);
		}
		return this.name;
	}

	/**
	 * Get the dependencies for this repo. Optionally by the registry they are included with (bower or npm).
	 * @param {String|null} registry [null] - The registry to get dependencies for `npm`, `bower`, or `null` for either.
	 * @return {Array<Dependency>} - The dependencies of this repo.
	 */
	getDependencies(registry = null) {
		if (registry) {
			validateRegistry(registry);
		}
		const registries = registry ? [registry] : ['bower', 'npm'];
		return registries.reduce((dependencies, registry) => {
			const registryDependencies = this.dependencies.get(registry);
			return dependencies.concat([...registryDependencies]);
		}, []);
	}

	/**
	 * Add a manifest file to the repository and extract dependencies for the repo.
	 * @param {String|null} registry - The registry the manifest is for `npm` or `bower`.
	 * @param {Manifest} manifest - The manifest for this repo.
	 */
	addManifest(registry, manifest) {
		validateRegistry(registry);
		this.manifestUrls.set(registry, manifest.url);
		this.manifestNames.set(registry, manifest.name);
		this.dependencies.set(registry, manifest.dependencies);
	}
}

module.exports = Repo;
