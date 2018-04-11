// @flow

import path from 'path'
import conf from 'pkg-conf'

export opaque type LocalRoot: string = string
export opaque type RemoteRoot: string = string
export opaque type ProjectRoot: string = string

type Config = $ReadOnly<{
  src: LocalRoot,
  dest: RemoteRoot,
  auth: {host: string, port: number, authKey: string},
  projectRoot: ProjectRoot,
}>

export default async (): Promise<Config> => {
  const config = await conf('deploy')
  return {...config, projectRoot: path.dirname(conf.filepath(config))}
}
