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
class Manifest {

	/**
	 * @param {String} repoName - The name of the repository including organisation e.g. "Financial-Times/o-table".
	 * @param {String} registry - The name of the registry the manifest belongs to ("bower" or "npm").
	 * @param {String} manifest - The contents of the manifest.
	 */
	constructor(repoName, registry, manifest) {
		validateRegistry(registry);
		manifest = typeof manifest === 'string' ? JSON.parse(manifest) : manifest;
		this.repoName = repoName;
		this.registry = registry;
		this.name = manifest.name;
		this.url = manifest.repository && manifest.repository.url ?
			manifest.repository.url :
			manifest.homepage;
		this.url = this.url || '';
		this.dependencies = new Set();

		if (typeof manifest.dependencies === 'object') {
			for (const [name, version] of Object.entries(manifest.dependencies)) {
				this.dependencies.add(new Dependency(name, version, registry));
			}
		}
	}

	/**
	 * Check if a dependency represents this manifest.
	 * @param {Dependency} dependency - The dependency which may represent this manifest.
	 * @return {Boolean} - True if the dependency is for this manifest.
	 */
	is(dependency) {
		if (!(dependency instanceof Dependency)) {
			throw new TypeError('Expected a Dependency.');
		}
		// The dependency is published in a different registry.
		if (dependency.registry !== this.registry) {
			return false;
		}
		// Not semver: match repo name in git url.
		// git+ssh://git@github.com:Financial-Times/a.git#v1.0.27
		// git+ssh://git@github.com:Financial-Times/a#semver:^5.0
		// git+https://the-ft@github.com/Financial-Times/a.git
		// git://github.com/Financial-Times/a.git#v1.0.27
		// Financial-Times/a
		if (!dependency.isSemver && dependency.version !== 'latest') {
			const gitUrlReg = new RegExp(`^(?:[git].*)?(${this.repoName})(?:[#.].+)?$`, 'i');
			return Boolean(dependency.version.match(gitUrlReg));
		}
		// Semver: match package name.
		return dependency.name === this.name;
	}
}

module.exports = Manifest;
