# seco-keyval

[![Travis branch](https://img.shields.io/travis/ExodusMovement/seco-keyval/master.svg)](https://travis-ci.org/ExodusMovement/seco-keyval)
[![npm](https://img.shields.io/npm/v/seco-keyval.svg)](https://www.npmjs.com/package/seco-keyval)
[![code style: standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Secure key-value store built on [`secure-container`](https://github.com/ExodusMovement/secure-container).

## Installation

    npm install seco-keyval

## Example

```js
import SecoKeyval from 'seco-keyval'

const kv = new SecoKeyval('db.seco', { appName: 'exodus', appVersion: '1.0.0' })
await kv.open('1-very-secure-password', { a: 1 })

await kv.set('key', 'myValue')

const value1 = await kv.get('a')
console.log(value1) // -> 1

const value2 = await kv.get('key')
console.log(value2) // -> 'myValue'
```

## API

### `new SecoKeyval(file, header)`

- `file` (String) Filename
- `header` (Object)
  - `appName` (String) App Name
  - `appVersion` (String) App Version

### `kv.open(passphrase[, initialData])`

Loads the key-value store. Creates it if it doesn't exist.

- `passphrase` (String | Buffer)
- `initialData` (any JSON-serializable data) Will be written if the store doesn't exist.

Returns a Promise resolving when the filesystem operations are complete. You cannot call `set()` or `get()` until this is done.

### `kv.set(key, value)`

Sets `key` to `value`. Returns a promise resolving when the data has been written to disk.

### `kv.get(key)`

Gets `key` and returns a Promise resolving to the value of `key`. Returns a Promise resolving to `undefined` if the key is not set.

### `kv.changePassphrase(newPassphrase)`

Changes the passphrase to `newPassphrase`. Returns a promise resolving when the data has been written to disk.

## License

MIT
