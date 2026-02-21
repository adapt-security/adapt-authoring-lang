import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { storeStrings } from '../lib/utils/storeStrings.js'

describe('storeStrings()', () => {
  let phrases

  beforeEach(() => {
    phrases = {}
  })

  it('should store string with language prefix', () => {
    storeStrings(phrases, 'en.app.test', 'Test Value')
    assert.equal(phrases.en['app.test'], 'Test Value')
  })

  it('should create language key if not exists', () => {
    storeStrings(phrases, 'fr.app.hello', 'Bonjour')
    assert.ok(phrases.fr)
    assert.equal(phrases.fr['app.hello'], 'Bonjour')
  })

  it('should store multiple strings for same language', () => {
    storeStrings(phrases, 'en.app.test1', 'Value 1')
    storeStrings(phrases, 'en.app.test2', 'Value 2')
    assert.equal(phrases.en['app.test1'], 'Value 1')
    assert.equal(phrases.en['app.test2'], 'Value 2')
  })

  it('should handle nested keys with dots', () => {
    storeStrings(phrases, 'en.app.nested.key', 'Nested Value')
    assert.equal(phrases.en['app.nested.key'], 'Nested Value')
  })

  it('should overwrite existing key', () => {
    storeStrings(phrases, 'en.app.test', 'Original')
    storeStrings(phrases, 'en.app.test', 'Updated')
    assert.equal(phrases.en['app.test'], 'Updated')
  })

  it('should store strings for multiple languages', () => {
    storeStrings(phrases, 'en.app.hello', 'Hello')
    storeStrings(phrases, 'fr.app.hello', 'Bonjour')
    storeStrings(phrases, 'de.app.hello', 'Hallo')
    assert.equal(phrases.en['app.hello'], 'Hello')
    assert.equal(phrases.fr['app.hello'], 'Bonjour')
    assert.equal(phrases.de['app.hello'], 'Hallo')
  })
})
