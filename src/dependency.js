const semver = require('semver');

class Dependency {
	constructor(name, version, source) {
		if (!['bower', 'npm'].includes(source)) {
			throw new Error('Source must be bower or npm.');
		}
		this.name = name;
		this.version = version;
		this.source = source;
		this.isSemver = semver.valid(version) || semver.validRange(version);
	}
}

module.exports = Dependency;
