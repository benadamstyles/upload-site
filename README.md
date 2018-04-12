# upload-site

A simple script to upload your folder to a remote server, via `ftp`.

Supports incremental uploads via directory hashing – in other words, if you haven't changed any of the contents of a sub-folder, next time you run this script, it will **ignore** that sub-folder. Then, if you change any of the contents of that sub-folder, next time you run this script, it will **upload** that sub-folder.

```sh
yarn add --dev upload-site

yarn run upload-site
```

## Requirements

This package requires [Node.js](https://nodejs.org/) **v9** or greater.

## Configuration

### `package.json`

```json
{
  "upload-site": {
    "auth": {
      "host": "domain.com",
      "port": 21,
      "authKey": "my-ftppass-json-key"
    },
    "src": "dist",
    "dest": "/blog"
  }
}
```

### `.ftppass`

> **Note:** make sure to add `.ftppass` to your `.gitignore`!

```json
{
  "my-ftppass-json-key": {
    "username": "ben@domain.com",
    "password": "qwertyui"
  }
}
```

### CLI options

#### `--debug`

extra logging

#### `--dry`

perform all actions **except** `ftp put` – useful for testing ftp login, etc
