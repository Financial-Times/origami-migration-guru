const ExistsInRegistryNormaliser = require('./exists-in-registry-normaliser');
const OrigamiNormaliser = require('./origami-normaliser');

class ManifestNormaliser {

	constructor(manifests, log) {
		this.manifests = manifests;
		this.allDependencies = [].concat(...manifests.map(m => Array.from(m.dependencies)));
		this.log = log;
	}

	async normalise() {
		// Correct manifest name for Origami components.
		// Their package.json is generated on publish.
		const origami = new OrigamiNormaliser();
		let manifests = this.manifests.map(m => origami.normalise(m));
		// Modify manifest name if it has dependencies and
		// is not actually pubished under that name.
		const exists = new ExistsInRegistryNormaliser(this.log);
		manifests = Promise.all(manifests.map(m => {
			if (!m.name || !this.allDependencies.some(d => m.is(d))) {
				return m;
			}
			return exists.normalise(m);
		}));

		return manifests;
	}
}

module.exports = ManifestNormaliser;
