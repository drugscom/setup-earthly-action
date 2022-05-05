import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as installer from './installer'
import * as io from '@actions/io'
import * as path from 'path'
import {exec} from '@actions/exec/lib/exec'

async function run(): Promise<void> {
  try {
    core.startGroup('install')
    let version = core.getInput('version')

    const downloadLatest = core.getBooleanInput('download-latest')

    const installedDir = await installer.get(version, downloadLatest)

    core.info(`Adding "${installedDir} to the OS path`)
    core.addPath(installedDir)

    let execPath = await io.which('earthly')
    await exec(execPath, ['--version'])
    core.endGroup()

    core.startGroup('matchers')
    const matchersPath = path.join(__dirname, '..', 'matchers')
    const matchers = core.getMultilineInput('matchers')
    if (matchers.length > 0) {
      for (const app of matchers) {
        const matcherPath = path.join(matchersPath, `${app}-match.json`)
        core.info(`##[add-matcher]${matcherPath}`)
      }
    } else {
      for (const matcher of await (await glob.create(matchersPath, {matchDirectories: false})).glob()) {
        const matcherPath = path.join(matchersPath, matcher)
        core.info(`##[add-matcher]${matcherPath}`)
      }
    }
    core.endGroup()

    core.startGroup('boostrap')
    await exec(execPath, ['bootstrap'])
    core.endGroup()
  } catch (error: any) {
    core.setFailed(error.message)
  }
}

void run()
