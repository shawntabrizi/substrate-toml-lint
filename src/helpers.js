const glob = require('glob');
const TOML = require('@ltd/j-toml');

// This allows us to get all files with a specific extension within a directory and subdirectories.
function getFilesFromPath(path, extension) {
	// Shortcut to detect a file not a path
	if (path.endsWith(extension)) {
		return [path]
	}
	let files = glob.sync(path + `/**/*.${extension}`);
	// skip target directories
	files = files.filter(file => !file.includes("/target/"));
	return files;
}

function doParse(text) {
	let toml = TOML.parse(text, { x: { comment: true, literal: true } });
	return toml
}

function doStringify(toml) {
	let new_text_array = TOML.stringify(toml, { newlineAround: "section" });
	// remove first empty newline
	new_text_array.splice(0, 1);

	// add newline separators between toml sections
	// addSeparator(new_text_array);

	// turn it back to text
	let new_text = new_text_array.join("\n");

	return new_text
}

module.exports = { getFilesFromPath, doParse, doStringify };
