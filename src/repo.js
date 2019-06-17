const Dependency = require('./dependency');

function validateRegistry(registry) {
	if (!['bower', 'npm'].includes(registry)) {
		throw new Error(`Registry ${registry} must be either "npm" or "bower".`);
	}
}

class Repo {
	constructor(repoName) {
		this.id = repoName;
		[this.org, this.name] = repoName.split('/');
		this.manifestNames = new Map();
		this.dependencies = new Map([
			['npm', new Set()],
			['bower', new Set()]
		]);
	}

	getName(registry = null) {
		if (registry) {
			validateRegistry(registry);
			return this.manifestNames.get(registry);
		}
		return this.name;
	}

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

	addManifest(registry, manifest) {
		validateRegistry(registry);
		manifest = typeof manifest === 'string' ? JSON.parse(manifest) : manifest;
		if (manifest.name) {
			this.manifestNames.set(registry, manifest.name);
		}
		if (manifest.dependencies) {
			for (const [name, version] of Object.entries(manifest.dependencies)) {
				this.dependencies.get(registry).add(new Dependency(name, version, registry));
			}
		}
	}
}

module.exports = Repo;
