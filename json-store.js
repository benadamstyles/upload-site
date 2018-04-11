// @flow

import {promisify} from 'util'
import jsonfile from 'jsonfile'

export const readJson = promisify(jsonfile.readFile)
export const writeJson = promisify(jsonfile.writeFile)

export default class JSONStore {
  store: {[string]: string}
  path: string

  constructor(path: string) {
    this.path = path
    try {
      this.store = jsonfile.readFileSync(path)
    } catch (e) {
      this.store = {}
    }
  }

  get(path: string) {
    return this.store[path]
  }

  set(key: string, value: string) {
    this.store[key] = value
  }

  close() {
    return writeJson(this.path, this.store)
  }
}
