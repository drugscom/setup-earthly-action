import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as os from 'os'
import * as fs from 'fs'
import {exec} from '@actions/exec/lib/exec'

export async function get(version: string, downloadLatest: boolean): Promise<string> {
  try {
    let cachedVersion = version
    if (version === 'latest') {
      cachedVersion = '*'
    }

    const cachedPath = tc.find('earthly', cachedVersion)

    if (cachedPath && !(version === 'latest' && downloadLatest)) {
      core.info(`Found cached version in "${cachedPath}"`)
      return cachedPath
    }

    let fileExt = ''

    let platform: string = os.platform()
    switch (platform) {
      case 'win32':
        platform = 'windows'
        fileExt = '.exe'
        break
      case 'darwin':
      case 'linux':
        break
      default:
        throw new Error(`Unsupported platform: "${platform}`)
    }

    let arch: string = os.arch()
    switch (arch) {
      case 'x64':
        arch = 'amd64'
        break
      case 'arm':
        if (platform === 'linux') {
          arch = 'arm7'
        } else {
          throw new Error(`Unsupported architecture: "${arch}`)
        }
        break
      case 'arm64':
        switch (platform) {
          case 'darwin':
          case 'linux':
            break
          default:
            throw new Error(`Unsupported architecture: "${arch}`)
        }
        break
      default:
        throw new Error(`Unsupported architecture: "${arch}`)
    }

    let downloadURL = `https://github.com/earthly/earthly/releases/download/v${version}/earthly-${platform}-${arch}${fileExt}`
    if (version === 'latest') {
      downloadURL = `https://github.com/earthly/earthly/releases/latest/download/earthly-${platform}-${arch}${fileExt}`
    }

    core.info(`Downloading earthly from "${downloadURL}"`)
    const downloadedPath = await tc.downloadTool(downloadURL)

    core.info('Adjusting file permissions')
    fs.chmodSync(downloadedPath, 0o755)

    if (version === 'latest') {
      let versionOutput = ''
      await exec(downloadedPath, ['--version'], {
        silent: true,
        listeners: {
          stdout: (data: Buffer) => (versionOutput += data.toString())
        }
      })

      const versionString = versionOutput.match(/version\sv([\w.]+)/)?.[1]
      if (versionString) {
        core.info(`Replacing "latest" with reported version: ${versionString}`)
        version = versionString
      }
    }

    const newCachedPath = await tc.cacheFile(downloadedPath, `earthly${fileExt}`, 'earthly', version)
    core.info(`Successfully cached to "${newCachedPath}"`)

    return newCachedPath
  } catch (err) {
    if (err instanceof tc.HTTPError && (err.httpStatusCode === 403 || err.httpStatusCode === 429)) {
      throw new Error(
        `Received HTTP status code ${err.httpStatusCode}. This usually indicates the rate limit has been exceeded`
      )
    }

    throw err
  }
}
