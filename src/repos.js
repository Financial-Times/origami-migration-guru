const path = require('path');
const Repo = require('./repo');

class Repos {
	constructor() {
		this.repos = [];
	}

	getOneForName(name) {
		return this.repos.filter(repo => repo.name === name)[0];
	}

	getDirectDependents(repo) {
		const name = repo.name;
		return this.repos.filter(repo => {
			const dependencies = repo.getDependencies();
			return dependencies.includes(name);
		});
	}

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

	getDependencies(repo) {
		const dependencies = new Map();
		const dependencyNames = repo.getDependencies();
		const directDependencies = this.repos.filter(repo => dependencyNames.includes(repo.name));
		directDependencies.forEach(directDependency => {
			dependencies.set(directDependency.name, directDependency);
			const subDependencyNames = directDependency.getDependencies();
			const subDependencies = this.repos.filter(repo => subDependencyNames.includes(repo.name));
			subDependencies.forEach(dependency => {
				dependencies.set(dependency.name, dependency);
			});
		});
		return Array.from(dependencies.values());
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
		let repo = this.repos.find(repo => repo.id === result.repository);
		if (!repo) {
			repo = new Repo(result.repository);
			this.repos.push(repo);
		}
		repo.addManifest(registry, result.fileContents);
	}
}

module.exports = Repos;
