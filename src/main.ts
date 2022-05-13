import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as installer from './installer'
import * as io from '@actions/io'
import * as path from 'path'
import * as utils from '@actions/utils'
import {exec} from '@actions/exec/lib/exec'

async function run(): Promise<void> {
  try {
    core.startGroup('Install Earthly')
    const version = core.getInput('version')

    const downloadLatest = core.getBooleanInput('download-latest')

    const installedDir = await installer.get(version, downloadLatest)

    core.info(`Adding "${installedDir} to the OS path`)
    core.addPath(installedDir)

    const execPath = await io.which('earthly')
    await exec(execPath, ['--version'])
    core.endGroup()

    core.startGroup('Add problem matchers')
    const matchersPath = path.join(__dirname, '..', 'matchers')
    const matchers = utils.getInputAsArray('matchers')
    if (matchers.length > 0) {
      for (let matcherFile of matchers) {
        if (!matcherFile.endsWith('.json')) {
          matcherFile = `${matcherFile}.json`
        }
        const matcherPath = path.join(matchersPath, matcherFile)
        core.info(`##[add-matcher]${matcherPath}`)
      }
    } else {
      for (const matcherFile of await (await glob.create(matchersPath, {matchDirectories: false})).glob()) {
        core.info(`##[add-matcher]${matcherFile}`)
      }
    }
    core.endGroup()

    core.startGroup('Bootstrap Earthly')
    await exec(execPath, ['bootstrap'])
    core.endGroup()
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    core.setFailed(error.message)
  }
}

void run()
