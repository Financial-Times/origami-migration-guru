const Manifest = require('./manifest');

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
		this.manifests = new Map();
	}

	/**
	 * Get the name for this repo. Optionally by registry (bower or npm).
	 * E.g. a repo "Financial-Times/example" would return "example" by default.
	 * But it may be named differently in `bower.json` or `package.json`, e.g.
	 * "@financial-times/example".
	 * @param {String|null} registry [null] - The registry to get the repository name from `npm`, `bower`, or `null` for the repository name without organisation.
	 * @return {String|undefined} - The repository's name.
	 */
	getName(registry = null) {
		if (registry) {
			validateRegistry(registry);
			const manifest = this.manifests.get(registry);
			return manifest ? manifest.name : undefined;
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
			const manifest = this.manifests.get(registry);
			if (!manifest) {
				return dependencies;
			}
			const registryDependencies = manifest.dependencies;
			return dependencies.concat([...registryDependencies]);
		}, []);
	}

	/**
	 * Add a manifest file to the repository and extract dependencies for the repo.
	 * @param {Manifest} manifest - The manifest for this repo.
	 */
	addManifest(manifest) {
		validateRegistry(manifest.registry);
		if (!(manifest instanceof Manifest)) {
			throw new TypeError('"manifest" must be an instance of "Manifest".');
		}
		this.manifests.set(manifest.registry, manifest);
	}
}

module.exports = Repo;
