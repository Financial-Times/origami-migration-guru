function validateRegistry(registry) {
	if (!['bower', 'npm'].includes(registry)) {
		throw new Error(`Registry ${registry} must be either "npm" or "bower".`);
	}
}

class Repo {
	constructor(repoName) {
		this.id = repoName;
		[this.org, this.name] = repoName.split('/');
		this.manifests = new Map();
	}

	getNameFromManifest(registry = null) {
		if (registry) {
			validateRegistry(registry);
			const manifest = this.manifests.get(registry);
			return manifest && manifest.name ? manifest.name : this.name;
		}
		return this.name;
	}

	getDependencyNameFromManifest(registry = null) {
		if (registry) {
			validateRegistry(registry);
		}
		const registries = registry ? [registry] : ['bower', 'npm'];
		return registries.reduce((dependencies, registry) => {
			const manifest = this.manifests.get(registry);
			if (manifest && manifest.dependencies) {
				return dependencies.concat(Object.keys(manifest.dependencies));
			}
			return dependencies;
		}, []);
	}

	addManifest(registry, manifest) {
		validateRegistry(registry);
		this.manifests.set(registry, JSON.parse(manifest));
	}
}

module.exports = Repo;
