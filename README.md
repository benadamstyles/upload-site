# upload-site

```sh
yarn add --dev upload-site

yarn run upload-site
```

## Configuration

### `package.json`

```json
{
  "upload-site": {
    "auth": {
      "host": "domain.com",
      "port": 21,
      "authKey": "ben-styles"
    },
    "src": "dist",
    "dest": "/blog"
  }
}
```

### `.ftppass`

```json
{
  "ben-styles": {
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
