const glob = require('glob');

// This allows us to get all files with a specific extension within a directory and subdirectories.
function getFilesFromPath(path, extension) {
	let files = glob.sync(path + `/**/*.${extension}`);
	return files;
}

module.exports = { getFilesFromPath, };
