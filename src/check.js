const fs = require('fs');
const TOML = require('@ltd/j-toml');
let { getFilesFromPath, doParse, doStringify } = require("./helpers");
let crates = require('./known_crates.json');
const KNOWN_FEATURES = ["std", "runtime-benchmarks", "try-runtime"];

// Given a direct crate definition, store relevant information about it.
function storeCrate(toml) {
	if (!(toml.package && toml.package.name)) { return }

	let name = toml.package.name;
	let version = toml.package.version;

	let features = [];
	let used_features = [];

	if (toml.features) {
		for ([feature, items] of Object.entries(toml.features)) {
			features.indexOf(feature) === -1 && features.push(feature);

			// If the feature does not activate any other features, we consider it "unused".
			if (items.length > 0) {
				used_features.indexOf(feature) === -1 && used_features.push(feature)
			}
		}
	}

	crates[name] = { name, version, features, used_features, direct: true };
}

// Check that within a crate, a dependency is included properly with a feature.
function isInFeature(toml, dep, feature) {
	if (!(toml.features && toml.features[feature])) {
		return false
	}
	let features = JSON.stringify(toml.features[feature])
	return features.includes(`${dep}/${feature}`)
}

// Check our knowledge of a crate containing a feature.
function isCrateFeatureUsed(dep, feature) {
	return crates[dep] && crates[dep].features && crates[dep].used_features.includes(feature);
}

// Using an import from a crate, populate information about that crate.
// Since this information is not directly from the crate, we don't treat it as truth.
function storeIndirectCrate(toml) {
	if (!toml.dependencies) { return }
	for ([dep, properties] of Object.entries(toml.dependencies)) {
		// Make sure that we don't run into null issues.
		if (!crates[dep]) {
			crates[dep] = { name: dep, features: [], used_features: [], version: null, direct: false }
		}

		// If we got direct information about a crate, we should not try to overwrite any info.
		if (crates[dep].direct) {
			return
		}

		// Basically we want to see if any other crate used this dependency enabling a feature.
		// If so, we can assume this crate probably has the that feature.
		for (feature of KNOWN_FEATURES) {
			if (isInFeature(toml, dep, feature)) {
				crates[dep].features.indexOf(feature) === -1 && crates[dep].features.push(feature);
				crates[dep].used_features.indexOf(feature) === -1 && crates[dep].used_features.push(feature);
			}
		}

	}
}

function doAddMissingFeature(toml, feature, dep) {
	if (!toml["features"]) {
		return
	}

	if (!toml["features"][feature]) {
		return
	}

	toml["features"][feature].push(TOML.literal(`"${dep}/${feature}"`));
}

// Check that each dependency has all of its features properly enabled
function checkDependencyFeatures(toml, features) {
	let is_crate_no_std = toml.features && toml.features['std'];
	if (!is_crate_no_std) { return }
	if (!toml.dependencies) { return }

	let check_features = [features] || KNOWN_FEATURES;

	for ([dep, properties] of Object.entries(toml.dependencies)) {
		for (feature of check_features) {
			if (isCrateFeatureUsed(dep, feature)) {
				let is_optional = properties['optional'];

				// Check `default-features = false`
				if (properties['default-features']) {
					console.error(`Missing "default-features = false" for ${dep} in ${toml.package.name}`)
				}

				// Check feature enabled
				if (!isInFeature(toml, dep, feature)) {
					if (is_optional) {
						console.error(`Maybe missing ${feature} for optional ${dep} in ${toml.package.name}`)
					} else {
						console.error(`Missing ${feature} for ${dep} in ${toml.package.name}`)
						doAddMissingFeature(toml, feature, dep)
					}
				}
			}
		}
	}
}

async function doCheck(path, crate, features) {
	let files = getFilesFromPath(path, "toml");

	// First parse all crates
	for (file of files) {
		let text = fs.readFileSync(file);
		let toml = doParse(text);

		storeCrate(toml);
		storeIndirectCrate(toml);
	}

	// Then use all crate info to check imports are accurate
	for (file of files) {
		let text = fs.readFileSync(file);
		let toml = doParse(text);
		if (crate && toml.package && toml.package.name != crate) { continue }
		checkDependencyFeatures(toml, features);
	}
}

async function doWrite(path, crate, features) {
	let files = getFilesFromPath(path, "toml");

	// First parse all crates
	for (file of files) {
		let text = fs.readFileSync(file);
		let toml = doParse(text);

		storeCrate(toml);
		storeIndirectCrate(toml);
	}

	// Then use all crate info to check imports are accurate
	for (file of files) {
		let text = fs.readFileSync(file);

		// skip any files with comments
		if (text.includes("#")) { continue }

		let toml = doParse(text);
		if (crate && toml.package && toml.package.name != crate) { continue }
		checkDependencyFeatures(toml, features);

		let new_text = doStringify(toml);
		fs.writeFileSync(file, new_text);
	}
}

async function doSave(path) {
	let files = getFilesFromPath(path, "toml");

	// First parse all crates
	for (file of files) {
		let text = fs.readFileSync(file);
		let toml = doParse(text);

		storeCrate(toml);
		storeIndirectCrate(toml);
	}

	// TODO make better
	fs.writeFileSync("./known_crates.json", JSON.stringify(crates, null, 2));
}

module.exports = { doCheck, doSave, doWrite };
