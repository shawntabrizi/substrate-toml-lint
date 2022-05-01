const { doCheck, doSave } = require("./check")
const { doLint } = require("./lint")

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

yargs(hideBin(process.argv))
	.command('check <path>', 'find errors within toml files at the path', (yargs) => {
		return yargs
			.positional('path', {
				describe: 'path to substrate directory',
			})
			.option('package', {
				alias: 'p',
				describe: 'specify a package to check',
			})
	}, (argv) => {
		doCheck(argv.path, argv.package)
	})
	.command('save <path>', 'save information about crates at a path', (yargs) => {
		return yargs
			.positional('path', {
				describe: 'path to substrate directory',
			})
	}, (argv) => {
		doSave(argv.path)
	})
	.command('lint <path>', 'lint and update toml files at the path', (yargs) => {
		return yargs
			.positional('path', {
				describe: 'path to substrate directory',
			})
	}, (argv) => {
		doLint(argv.path)
	})
	.parse()
