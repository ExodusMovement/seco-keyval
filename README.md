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

const value1 = kv.get('a')
console.log(value1) // -> 1

const value2 = kv.get('key')
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

Gets `key` and returns the value of `key`. Returns `undefined` if the key is not set.

### `kv.delete(key)`

Deletes `key`. Returns a promise resolving when the data has been written to disk.

### `kv.changePassphrase(newPassphrase)`

Changes the passphrase to `newPassphrase`. Returns a promise resolving when the data has been written to disk.

### `kv.changePassphraseOnNextWrite(newPassphrase)`

Schedule for the passphrase to change to `newPassphrase` on the next file write. There is no guarantee that the passphrase will get changed when using this method (i.e. if `set()` is never called afterwards). Returns `undefined`.

### `kv.getAllData()`

Returns an object containing all the key-value pairs in the kv.

### `kv.setAllData(data)`

**DANGER: Don't use this method unless you know what you're doing!**

This completely replaces and overwrites the key-value store with `data` and writes the data to disk, with no backups of the old data.

## License

MIT
