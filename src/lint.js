const fs = require('fs');
const TOML = require('@ltd/j-toml');
let { getFilesFromPath } = require("./helpers");

function sortObject(o, func) {
	let sorted_object = Object.keys(o)
		.sort(func)
		.reduce((acc, key) => ({
			...acc, [key]: o[key]
		}), {});

	return sorted_object
}

function lintPackage(toml) {
	if (!toml.package) { return }
	if (toml.package.authors && toml.package.authors[0] != "Parity Technologies <admin@parity.io>") {
		toml.package.authors = ["Parity Technologies <admin@parity.io>"]
	}
	toml.package.edition = "2021";
	toml.package.homepage = "https://substrate.io"
	toml.package.repository = "https://github.com/paritytech/substrate/";
	// TODO add logic for license
}

function lintToml(toml) {
	// Lint the package section.
	lintPackage(toml)

	// Sort all dependencies
	if (toml.dependencies) {
		toml.dependencies = TOML.Section(sortObject(toml.dependencies));
	}

	// Sort all dev-dependencies
	if (toml["dev-dependencies"]) {
		toml["dev-dependencies"] = TOML.Section(sortObject(toml["dev-dependencies"]));
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

	// First parse all crates
	for (file of files) {
		let text = fs.readFileSync(file);
		let toml = TOML.parse(text, { x: { comment: true } });

		lintToml(toml)

		// turn it back to text
		let new_text_array = TOML.stringify(toml, { newlineAround: "section" });

		// remove first empty newline
		new_text_array.splice(0, 1);

		let new_text = new_text_array.join("\n");

		fs.writeFileSync(file, new_text);
	}
}

module.exports = { doLint, };