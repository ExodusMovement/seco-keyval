import createSecoRW from 'seco-rw'
import createExpander from 'buffer-noise'
import { gzipSync, gunzipSync } from 'zlib'
import fs from 'fs-extra'
import { createHash } from 'crypto'
const { expand: expand32k, shrink: shrink32k } = createExpander(2 ** 15)

export default class SecoKeyval {
  constructor (file: string, header: {| appName: string, appVersion: string |}) {
    this.hasOpened = false
    this.file = file
    this.header = header
    this._data = {}
    this._hash = Buffer.alloc(0)
  }

  async open (passphrase: Buffer | string, initalData = {}) {
    this._seco = createSecoRW(this.file, passphrase, this.header)
    if (await fs.pathExists(this.file)) {
      let data = await this._seco.read()
      data = gunzipSync(shrink32k(data))
      this._data = JSON.parse(data.toString('utf8'))
    } else {
      await this._seco.write(expand32k(gzipSync(Buffer.from(JSON.stringify(initalData)))))
      this._data = initalData
    }

    this.hasOpened = true
  }

  async set (key: string, val: any) {
    if (!this.hasOpened) throw new Error('Must open first.')
    this._data[key] = val

    const data = Buffer.from(JSON.stringify(this._data))
    const hash = createHash('sha256').update(data).digest()

    if (!this._hash.equals(hash)) {
      this._hash = hash
      await this._seco.write(expand32k(gzipSync(data)))
    }
  }

  async get (key: string) {
    if (!this.hasOpened) throw new Error('Must open first.')
    return this._data[key]
  }

  async delete (key: string) {
    if (!this.hasOpened) throw new Error('Must open first.')

    // Only need to delete and write if the key actually exists in the first place
    if (this._data.hasOwnProperty(key)) {
      delete this._data[key]
      await this._seco.write(expand32k(gzipSync(Buffer.from(JSON.stringify(this._data)))))
    }
  }

  changePassphraseOnNextWrite (newPassphrase: Buffer | string) {
    if (!this.hasOpened) throw new Error('Must open first.')
    this._seco = createSecoRW(this.file, newPassphrase, this.header)
  }

  async changePassphrase (newPassphrase: Buffer | string) {
    this.changePassphraseOnNextWrite(newPassphrase)
    await this._seco.write(expand32k(gzipSync(Buffer.from(JSON.stringify(this._data)))))
  }

  inspect () {
    return `<SecoKeyval: ${this.file}>`
  }
}
