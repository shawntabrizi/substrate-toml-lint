const { doCheck } = require("./check")
const { doLint } = require("./lint")

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

yargs(hideBin(process.argv))
	.command('check <path>', 'find errors within toml files at the path', (yargs) => {
		return yargs
			.positional('path', {
				describe: 'path to substrate directory',
			})
	}, (argv) => {
		doCheck(argv.path)
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
