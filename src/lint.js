const fs = require('fs');
const TOML = require('@ltd/j-toml');
let { getFilesFromPath, doParse, doStringify } = require("./helpers");

function sortObject(o, func) {
	let sorted_object = Object.keys(o)
		.sort(func)
		.reduce((acc, key) => ({
			...acc, [key]: o[key]
		}), {});

	return sorted_object
}

function dependencyPropertySort(a, b) {
	let ordering = {}; // map for efficient lookup of sortIndex
	let sortOrder = ['package', 'version', 'default-features', 'features', 'optional', 'path'];
	for (var i = 0; i < sortOrder.length; i++) {
		ordering[sortOrder[i]] = i;
	}

	return (ordering[a] - ordering[b]) || a.localeCompare(b);
}

function dependencySort(dependencies) {
	return function (a, b) {
		if (dependencies[a]["path"] && !dependencies[b]["path"]) {
			return 1
		}

		if (!dependencies[a]["path"] && dependencies[b]["path"]) {
			return -1
		}

		return a.localeCompare(b)
	}
}

function lintPackage(toml) {
	if (!toml.package) { return }
	// TODO add back author logic
	// if (toml.package.authors && toml.package.authors[0] != "Parity Technologies <admin@parity.io>") {
	// 	toml.package.authors = ["Parity Technologies <admin@parity.io>"]
	// }
	toml.package.edition = TOML.literal(`"2021"`);
	toml.package.homepage = TOML.literal(`"https://substrate.io"`)
	// toml.package.repository = "https://github.com/paritytech/substrate/";
	// TODO add logic for license
}

function isJson(item) {
	item = typeof item !== "string"
		? JSON.stringify(item)
		: item;

	try {
		item = JSON.parse(item);
	} catch (e) {
		return false;
	}

	if (typeof item === "object" && item !== null) {
		return true;
	}

	return false;
}

// Tries to add a newline between blocks of dependencies which share a prefix
function addSeparator(textArray) {
	for (let i = textArray.length - 1; i >= 0; i--) {
		let line = textArray[i];
		let maybePrefix = line.match(/^([A-Za-z]+)-/g);
		if (maybePrefix && line.includes("path =")) {
			let firstIndex = i;
			let total = 0;
			let prefix = maybePrefix[0];
			while (textArray[i].startsWith(prefix)) {
				total++;
				i--;
			}

			if (total > 1) {
				if (!textArray[i].startsWith('[')) {
					textArray.splice(i + 1, 0, "");
				}
			}
		}
	}
}

function lintToml(toml) {
	// Lint the package section.
	lintPackage(toml)

	// Sort all dependencies
	let dep_types = ["dependencies", "dev-dependencies"];
	for (dep_type of dep_types) {
		if (toml[dep_type]) {
			if (Object.entries(toml[dep_type]).length == 0) {
				delete toml[dep_type];
				continue;
			}
			if (isJson(toml[dep_type])) {
				toml[dep_type] = TOML.Section(sortObject(toml[dep_type], dependencySort(toml[dep_type])));
				for ([dep, items] of Object.entries(toml[dep_type])) {
					if (isJson(items)) {
						toml[dep_type][dep] = TOML.inline(sortObject(items, dependencyPropertySort));
					}
				}
			}
		}
	}

	// Sort all features
	if (toml.features) {
		for ([feature, items] of Object.entries(toml.features)) {
			items.sort()
		}
	}
}

async function doLint(path) {
	let files = getFilesFromPath(path, "toml");

	// Parse all crates
	for (file of files) {
		let text = fs.readFileSync(file);

		// skip any files with comments
		if (text.includes("#")) { continue }

		let toml = doParse(text);

		lintToml(toml)

		let new_text = doStringify(toml);

		fs.writeFileSync(file, new_text);
	}
}

module.exports = { doLint, };
