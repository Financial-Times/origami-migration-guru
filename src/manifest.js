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
		this.dependencies = new Map([
			['npm', new Set()],
			['bower', new Set()]
		]);

		if (manifest.dependencies) {
			for (const [name, version] of Object.entries(manifest.dependencies)) {
				this.dependencies.get(registry).add(new Dependency(name, version, registry));
			}
		}
	}

}

module.exports = Manifest;
