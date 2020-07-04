import test from 'tape-promise/tape'
import { file as tempFile } from 'tempy'
import createSecoRW from 'seco-rw'
import createExpander from 'buffer-noise'
import { gunzipSync } from 'zlib'
import SecoKeyval from '.'
import fs from 'fs-extra'
const { shrink: shrink32k } = createExpander(2 ** 15)

test('SecoKeyval open() / set()', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()
  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })

  await kv.open(passphrase)

  await kv.set('person1', { name: 'JP' })
  await kv.set('person2', { name: 'Daniel' })

  // verify the file actually got created
  t.true(await fs.pathExists(walletFile), 'wallet exists')

  const seco = createSecoRW(walletFile, passphrase)
  let data = await seco.read()
  seco.destroy()

  data = gunzipSync(shrink32k(data))

  t.true(data.toString('utf8').includes('JP'), 'has first item')
  t.true(data.toString('utf8').includes('Daniel'), 'has second item')

  t.end()
})

test('SecoKeyval open() / set() / get()', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase)

  const p1 = { name: 'JP' }
  const p2 = { name: 'Daniel' }

  await kv.set('person1', p1)
  await kv.set('person2', p2)

  // verify the file actually got created
  t.true(await fs.pathExists(walletFile), 'wallet exists')

  const kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase)

  const gp1 = kv2.get('person1')
  const gp2 = kv2.get('person2')

  t.same(gp1, p1, 'person 1')
  t.same(gp2, p2, 'person 2')

  t.end()
})

test('SecoKeyval open() / set() / delete() / get()', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase)

  const p1 = { name: 'JP' }
  const p2 = { name: 'Daniel' }

  await kv.set('person1', p1)
  await kv.set('person2', p2)

  await kv.delete('person1')

  const kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase)

  const gp1 = kv2.get('person1')
  const gp2 = kv2.get('person2')

  t.same(gp1, undefined, 'person 1 was deleted')
  t.same(gp2, p2, 'person 2')

  t.end()
})

test('SecoKeyval batch()', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase)

  const p1 = { name: 'JP' }
  const p2 = { name: 'Daniel' }

  await kv.set('person1', p1)
  await kv.batch([
    { type: 'set', key: 'person2', value: p2 },
    { type: 'delete', key: 'person1' }
  ])

  const kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase)

  const gp1 = kv2.get('person1')
  const gp2 = kv2.get('person2')

  t.same(gp1, undefined, 'person 1 was deleted')
  t.same(gp2, p2, 'person 2')

  t.end()
})

test('SecoKeyval batch() operations are executed in order', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase)

  const p1 = { name: 'JP' }
  const p2 = { name: 'Daniel' }

  await kv.batch([
    { type: 'set', key: 'person1', value: p1 },
    { type: 'set', key: 'person2', value: 'WRONG VALUE' },
    { type: 'set', key: 'person2', value: p2 }, // Correct wrong value
    { type: 'delete', key: 'person1' } // Delete key set earlier in batch
  ])

  const kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase)

  const gp1 = kv2.get('person1')
  const gp2 = kv2.get('person2')

  t.same(gp1, undefined, 'person 1 was deleted')
  t.same(gp2, p2, 'person 2')

  t.end()
})

test('SecoKeyval data can be deleted, restored, and is written to disk', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase)

  const data = { value: true }
  await kv.set('key', data)
  await kv.delete('key')
  await kv.set('key', data)

  const kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase)

  const fetchedData = kv2.get('key')

  t.same(fetchedData, data, 'data is restored after deleting')

  t.end()
})

test('SecoKeyval open() with initalData / get()', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()

  const data = {
    person1: { name: 'JP' },
    person2: { name: 'Daniel' }
  }

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase, data)

  const kvData = {}
  kvData.person1 = kv.get('person1')
  kvData.person2 = kv.get('person2')
  t.same(kvData, data, 'data is availible')

  // verify the file actually got created
  t.true(await fs.pathExists(walletFile), 'wallet exists')

  const kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase)

  const newData = {}
  newData.person1 = kv2.get('person1')
  newData.person2 = kv2.get('person2')

  t.same(newData, data, 'data is writen')

  t.end()
})

test('SecoKeyval getAllData()', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()

  const data = {
    person1: { name: 'JP' },
    person2: { name: 'Daniel' }
  }

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })

  await kv.open(passphrase)

  await Promise.all(Object.keys(data).map((key) => kv.set(key, data[key])))

  // verify the file actually got created
  t.true(await fs.pathExists(walletFile), 'wallet exists')

  const allData = kv.getAllData()

  t.deepEqual(allData, data, 'data is equal')

  t.end()
})

test('SecoKeyval setAllData() / get()', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()

  const data = {
    person1: { name: 'JP' },
    person2: { name: 'Daniel' }
  }

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase)

  const p1 = kv.get('person1')
  t.assert(!p1, 'person1 is not set')

  await kv.setAllData(data)

  const kvData = {}
  kvData.person1 = kv.get('person1')
  kvData.person2 = kv.get('person2')
  t.same(kvData, data, 'data is availible')

  // verify the file actually got created
  t.true(await fs.pathExists(walletFile), 'wallet exists')

  const kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase)

  const newData = {}
  newData.person1 = kv2.get('person1')
  newData.person2 = kv2.get('person2')

  t.same(newData, data, 'data is writen')

  t.end()
})

test('SecoKeyval changePassphrase()', async (t) => {
  const passphrase1 = Buffer.from('please let me in')
  const passphrase2 = Buffer.from('a-longer-and-more-secure-passphrase')
  const walletFile = tempFile()

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase1)

  const p1 = { name: 'JP' }
  const p2 = { name: 'Daniel' }

  await kv.set('person1', p1)
  await kv.set('person2', p2)

  await kv.changePassphrase(passphrase2)

  const kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase2)

  const gp1 = kv2.get('person1')
  const gp2 = kv2.get('person2')

  t.same(gp1, p1, 'person 1')
  t.same(gp2, p2, 'person 2')

  t.end()
})

test('SecoKeyval changePassphraseOnNextWrite()', async (t) => {
  const passphrase1 = Buffer.from('please let me in')
  const passphrase2 = Buffer.from('a-longer-and-more-secure-passphrase')
  const walletFile = tempFile()

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase1)

  const p1 = { name: 'JP' }
  const p2 = { name: 'Daniel' }

  await kv.set('person1', p1)

  kv.changePassphraseOnNextWrite(passphrase2)

  const kv_ = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv_.open(passphrase1)
  const gp1 = kv_.get('person1')
  t.same(gp1, p1, 'old passphrase still works until next write')

  await kv.set('person2', p2)

  const kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase2)
  const gp2 = kv2.get('person2')

  t.same(gp2, p2, 'new passphrase is used on next .set() call')

  t.end()
})

test('get() & set() error if called before open()', async (t) => {
  t.plan(2)
  const walletFile = tempFile()

  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })

  try {
    await kv.set('abc', 'def')
  } catch (e) {
    t.assert(e, 'error')
  }

  try {
    const val = kv.get('abc')
    t.fail(val)
  } catch (e) {
    t.assert(e, 'error')
    t.end()
  }
})

test('identical set() calls', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()
  const kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase)

  // Set data:
  await kv.set('person1', { name: 'JP' })
  const { mtime: mtime1 } = await fs.stat(walletFile)

  // Set data to same value
  await kv.set('person1', { name: 'JP' })
  const { mtime: mtime2 } = await fs.stat(walletFile)

  // Set data to same value again
  await kv.set('person1', { name: 'JP' })
  const { mtime: mtime3 } = await fs.stat(walletFile)

  t.equal(mtime1.getTime(), mtime2.getTime(), 'file not touched')
  t.equal(mtime1.getTime(), mtime3.getTime(), 'file not touched')

  t.end()
})
