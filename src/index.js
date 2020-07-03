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

  getAllData () {
    return this._data
  }

  async setAllData (data = {}) {
    if (!this.hasOpened) throw new Error('Must open first.')
    await this._seco.write(expand32k(gzipSync(Buffer.from(JSON.stringify(data)))))
    this._data = data
  }

  async set (key: string, value: any) {
    return this.batch([{ type: 'set', key, value }])
  }

  async batch (ops) {
    if (!this.hasOpened) throw new Error('Must open first.')

    ops.forEach(({ type, key, value }) => {
      switch (type) {
        case 'set':
          this._data[key] = value
          break
        case 'delete':
          delete this._data[key]
          break
      }
    })

    const data = Buffer.from(JSON.stringify(this._data))
    const hash = createHash('sha256').update(data).digest()
    if (!this._hash.equals(hash)) {
      this._hash = hash
      await this._seco.write(expand32k(gzipSync(data)))
    }
  }

  get (key: string) {
    if (!this.hasOpened) throw new Error('Must open first.')
    return this._data[key]
  }

  async delete (key: string) {
    return this.batch([{ type: 'delete', key }])
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
