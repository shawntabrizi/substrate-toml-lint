const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

function sortObject(o) {
	let sorted_object = Object.keys(o)
		.sort(customTomlSort)
		.reduce((acc, key) => ({
			...acc, [key]: o[key]
		}), {});

	return sorted_object
}

function lintToml(toml) {
	// Sort all dependencies
	if (toml.dependencies) {
		toml.dependencies = sortObject(toml.dependencies);
	}

	// Sort all dev-dependencies
	if (toml["dev-dependencies"]) {
		toml["dev-dependencies"] = sortObject(toml["dev-dependencies"]);
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
		let toml = TOML.parse(text);

		lintToml(toml)

		// turn it back to text
		let new_text = TOML.stringify(toml);

		fs.writeFileSync(file, new_text);
		break;
	}
}

doLint(argv.path);
