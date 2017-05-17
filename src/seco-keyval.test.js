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
  let kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })

  await kv.open(passphrase)

  await kv.set('person1', { name: 'JP' })
  await kv.set('person2', { name: 'Daniel' })

  // verify the file actually got created
  t.true(await fs.pathExists(walletFile), 'wallet exists')
  t.false(await fs.pathExists(walletFile + '.swp'), '.swp file is deleted')

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

  let kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase)

  const p1 = { name: 'JP' }
  const p2 = { name: 'Daniel' }

  await kv.set('person1', p1)
  await kv.set('person2', p2)

  // verify the file actually got created
  t.true(await fs.pathExists(walletFile), 'wallet exists')

  let kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase)

  const gp1 = await kv2.get('person1')
  const gp2 = await kv2.get('person2')

  t.same(gp1, p1, 'person 1')
  t.same(gp2, p2, 'person 2')

  t.end()
})

test('SecoKeyval open() with initalData / get()', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()

  const data = {
    person1: { name: 'JP' },
    person2: { name: 'Daniel' }
  }

  let kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv.open(passphrase, data)

  // verify the file actually got created
  t.true(await fs.pathExists(walletFile), 'wallet exists')

  let kv2 = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
  await kv2.open(passphrase)

  let newData = {}
  newData.person1 = await kv2.get('person1')
  newData.person2 = await kv2.get('person2')

  t.same(newData, data, 'data is writen')

  t.end()
})

test('get() & set() error if called before open()', async (t) => {
  t.plan(2)
  const walletFile = tempFile()

  let kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })

  try {
    await kv.set('abc', 'def')
  } catch (e) {
    t.assert(e, 'error')
  }

  try {
    const val = await kv.get('abc')
    t.fail(val)
  } catch (e) {
    t.assert(e, 'error')
    t.end()
  }
})

test('identical set() calls', async (t) => {
  const passphrase = Buffer.from('please let me in')
  const walletFile = tempFile()
  let kv = new SecoKeyval(walletFile, { appName: 'test', appVersion: '1.0.0' })
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
