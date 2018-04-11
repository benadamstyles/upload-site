#!/usr/bin/env node -r esm
// @flow

import fs from 'fs'
import p from 'path'
import {promisify} from 'util'
import promisifyAll from 'util-promisifyall'
import jsonfile from 'jsonfile'
import Ftp from 'jsftp'
import Log from 'log-color-optionaldate'
import Progress from 'progress'
import {maybe} from 'maybes'
import hashOrig from 'hash-files'

import getConfig, {type LocalRoot, type RemoteRoot} from './get-config'
import Store from './json-store'

// const loglevel = 'debug'
const loglevel = 'info'
const log = new Log({level: loglevel, color: true, date: false})

type FTP = {
  auth: (string, string) => Promise<void>,
  put: (string, string) => Promise<void>,
  raw: (string, ...args: $ReadOnlyArray<mixed>) => Promise<void>,
  useList: boolean,
}

const isDirectory = path => fs.statSync(path).isDirectory()

const getProgress = total =>
  loglevel !== 'debug'
    ? new Progress('[:bar] :percent :elapseds elapsed :etas remaining', {
        total,
        width: 40,
        complete: '•',
        incomplete: ' ',
      })
    : {tick: x => null}

const hash = promisify(hashOrig)
const getDirectoryHash = files => hash({files, noGlob: true})

const matches = async (
  hashStore: Store,
  localRoot: LocalRoot,
  path: string,
  files: $ReadOnlyArray<string>
) => {
  log.debug(`Checking if hash matches for path ${path}`)
  const newHash = await getDirectoryHash(
    files.map(f => p.join(localRoot, path, f))
  )
  const oldHash = hashStore.get(path)
  const match = newHash === oldHash
  log.debug(`Previous hash ${oldHash}`)
  log.debug(`New hash ${newHash}`)
  log.debug(`Hashes ${match ? 'DO' : 'DON’T'} match`)
  if (!match) hashStore.set(path, newHash)
  return match
}

const dirParse = (
  localRoot: LocalRoot,
  startDir: string,
  result: Map<string, string[]> = new Map([[p.sep, []]])
): Map<string, string[]> =>
  fs.readdirSync(startDir).reduce((res, file, i) => {
    if (isDirectory(p.join(startDir, file))) {
      const tmpPath = p.relative(localRoot, p.join(startDir, file))
      if (!res.has(tmpPath)) res.set(tmpPath, [])
      return dirParse(localRoot, p.join(startDir, file), res)
    } else {
      maybe(res.get(p.relative(localRoot, startDir) || p.sep)).forEach(arr =>
        arr.push(file)
      )
      return res
    }
  }, result)

const ftpPut = async (
  ftp: FTP,
  localRoot: LocalRoot,
  path: string,
  file: string
) => {
  try {
    await ftp.put(p.normalize(p.join(localRoot, path, file)), file)
    log.debug('Uploaded file: ' + file + ' to: ' + path)
  } catch (e) {
    log.error('Cannot upload file: ' + file + ' --> ' + e)
    throw e
  }
}

const ftpCwd = async (ftp: FTP, path: string) => {
  try {
    log.debug(`ftp cwd ${path}`)
    await ftp.raw('cwd', path)
  } catch (e) {
    try {
      await ftp.raw('mkd', path)
      log.debug('New remote folder created ' + path)
      return ftpCwd(ftp, path)
    } catch (e) {
      log.error('Error creating new remote folder', path, '-->', e)
      throw e
    }
  }
}

const ftpProcessLocation = async (
  hashStore: Store,
  ftp: FTP,
  localRoot: LocalRoot,
  remoteRoot: RemoteRoot,
  path: string,
  files: $ReadOnlyArray<string>,
  progress
) => {
  log.debug('')
  log.debug(`Processing location ${path}`)
  if (!files) throw new Error(`Data for ${path} not found`)
  await ftpCwd(ftp, p.normalize('/' + p.join(remoteRoot, path)))

  if (!await matches(hashStore, localRoot, path, files)) {
    for (const file of files) {
      await ftpPut(ftp, localRoot, path, file)
      progress.tick()
    }
  } else {
    log.debug(`Skipping directory ${path}`)
    progress.tick(files.length)
  }
}

void (async () => {
  try {
    const {
      src: localRoot,
      dest: remoteRoot,
      auth: {host, port, authKey},
      projectRoot,
    } = await getConfig()

    const hashStore = new Store(p.join(projectRoot, '.hashes.json'))

    const ftp: FTP = promisifyAll(new Ftp({host, port}))
    ftp.useList = true

    const {username, password} = (await promisify(jsonfile.readFile)(
      p.join(projectRoot, '.ftppass')
    ))[authKey]

    await ftp.auth(username, password)

    const data = dirParse(localRoot, localRoot)
    const progress = getProgress([].concat(...data.values()).length)

    for (const [path, files] of data) {
      await ftpProcessLocation(
        hashStore,
        ftp,
        localRoot,
        remoteRoot,
        path,
        files,
        progress
      )
    }

    await hashStore.close()
    await ftp.raw('quit')

    log.info('FTP upload completed')
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
})()
