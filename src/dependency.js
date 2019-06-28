const semver = require('semver');

class Dependency {
	constructor(name, version, registry) {
		if (!['bower', 'npm'].includes(registry)) {
			throw new Error('Registry must be bower or npm.');
		}
		this.name = name;
		this.version = version;
		this.registry = registry;
		this.isSemver = semver.valid(version) || semver.validRange(version);
	}
}

module.exports = Dependency;
