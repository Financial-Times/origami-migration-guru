const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const execa = require('execa');

const cpuCount = os.cpus().length;
const tty = process.stdin.isTTY;

const registryNameFileDir = './tmp';
const registryNameFile = `${registryNameFileDir}/registry-name-map.json`;

function getManifestKey(manifest) {
	const hash = crypto.createHash('sha256');
	hash.update(manifest.registry + manifest.repoName + manifest.name + manifest.url);
	return hash.digest('hex');
}

class ExistsInRegistryNormaliser {
	constructor(log) {
		this.queue = [];
		this.log = log;
		this.processing = false;
		this.registryNameMap = this._restoreRegistryNameMap();
	}

	async _updateName(manifest) {
		const manifestKey = getManifestKey(manifest);
		if (!Object.keys(this.registryNameMap).includes(manifestKey)) {
			try {
				if (tty) {
					this.log(`Verifying ${manifest.repoName} is published to ${manifest.registry} as ${manifest.name}.`);
				}
				let { stdout } = manifest.registry === 'npm' ?
					await execa('npm', ['view', manifest.name, 'repository.url']) :
					await execa('bower', ['lookup', manifest.name]);
				stdout = stdout.toLowerCase();
				const repoName = manifest.repoName.toLowerCase();
				if (stdout.includes(repoName)) {
					this.registryNameMap[manifestKey] = manifest.name;
				} else {
					this.registryNameMap[manifestKey] = `${manifest.name}-${crypto.randomBytes(5).toString('hex')}`;
				}
			} catch (error) {
				// todo, does it not exist or was there some network error for instance?
				this.registryNameMap[manifestKey] = `${manifest.name}-${crypto.randomBytes(5).toString('hex')}`;
			}
			// or generate a random name if not conclusive
		}
		manifest.name = this.registryNameMap[manifestKey] || manifest.name;
		return manifest;
	}

	async _process() {
		if (this.processing || this.queue.length === 0) {
			return;
		}
		this.processing = true;

		const batch = this.queue.splice(0, Math.max(1, cpuCount - 1));
		await Promise.all(batch.map(async item => {
			return item();
		}));
		if (this.queue.length === 0) {
			this._cacheRegistryNameMap();
		}
		this.processing = false;
		this._process();
	}

	_restoreRegistryNameMap() {
		try {
			fs.accessSync(registryNameFile, fs.constants.R_OK | fs.constants.W_OK);
			const contents = fs.readFileSync(registryNameFile);
			return JSON.parse(contents);
		} catch (error) { }
		return {};
	}

	_cacheRegistryNameMap() {
		if (!fs.existsSync(registryNameFileDir)) {
			fs.mkdirSync(registryNameFileDir);
		}
		fs.writeFileSync(registryNameFile, JSON.stringify(this.registryNameMap));
	}

	async normalise(manifest) {
		// Push promise to queue.
		const promise = new Promise(function (resolve) {
			this.queue.push(async function () {
				resolve(await this._updateName(manifest));
			}.bind(this));
		}.bind(this));
		// Process queue if not already.
		this._process();
		return promise;
	}
}

module.exports = ExistsInRegistryNormaliser;
