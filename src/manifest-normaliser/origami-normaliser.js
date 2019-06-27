class OrigamiNormaliser {
	normalise(manifest) {
		// todo make this proper
		if (manifest.name && manifest.registry === 'npm') {
			manifest.name.replace('o-', '@financial-times/o-');
		}
		return manifest;
	}
}

module.exports = OrigamiNormaliser;
