/* eslint-disable no-template-curly-in-string */
import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { translate } from '../lib/utils/translate.js'

describe('translate()', () => {
  let phrases
  const defaultLang = 'en'
  let logWarn

  beforeEach(() => {
    logWarn = mock.fn()
    phrases = {
      en: {
        'app.simple': 'Simple text',
        'app.withdata': 'Hello ${name}',
        'app.multiple': 'User ${user} has ${count} items',
        'app.array': 'Items: ${items}',
        'app.arraymap': 'Names: $map{users:name:, }',
        'error.TEST_ERROR': 'Test error message'
      },
      fr: {
        'app.simple': 'Texte simple',
        'app.withdata': 'Bonjour ${name}'
      }
    }
  })

  it('should return simple translated string', () => {
    assert.equal(translate(phrases, defaultLang, logWarn, 'en', 'app.simple'), 'Simple text')
  })

  it('should return string in specified language', () => {
    assert.equal(translate(phrases, defaultLang, logWarn, 'fr', 'app.simple'), 'Texte simple')
  })

  it('should return key if translation not found', () => {
    assert.equal(translate(phrases, defaultLang, logWarn, 'en', 'app.missing'), 'app.missing')
  })

  it('should call logWarn when key is missing', () => {
    translate(phrases, defaultLang, logWarn, 'en', 'app.missing')
    assert.equal(logWarn.mock.callCount(), 1)
    assert.ok(logWarn.mock.calls[0].arguments[0].includes('app.missing'))
  })

  it('should use default language when lang is not a string', () => {
    assert.equal(translate(phrases, defaultLang, logWarn, null, 'app.simple'), 'Simple text')
    assert.equal(translate(phrases, defaultLang, logWarn, undefined, 'app.simple'), 'Simple text')
    assert.equal(translate(phrases, defaultLang, logWarn, 42, 'app.simple'), 'Simple text')
  })

  it('should replace single placeholder with data', () => {
    assert.equal(translate(phrases, defaultLang, logWarn, 'en', 'app.withdata', { name: 'John' }), 'Hello John')
  })

  it('should replace multiple placeholders', () => {
    assert.equal(translate(phrases, defaultLang, logWarn, 'en', 'app.multiple', { user: 'Alice', count: 5 }), 'User Alice has 5 items')
  })

  it('should leave unreplaced placeholders when data is missing', () => {
    const result = translate(phrases, defaultLang, logWarn, 'en', 'app.withdata', {})
    assert.equal(result, 'Hello ${name}')
  })

  it('should return string without substitution when no data provided', () => {
    assert.equal(translate(phrases, defaultLang, logWarn, 'en', 'app.simple'), 'Simple text')
  })

  it('should handle $map syntax with arrays of objects', () => {
    const users = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ]
    assert.equal(translate(phrases, defaultLang, logWarn, 'en', 'app.arraymap', { users }), 'Names: Alice, Bob')
  })

  it('should translate error objects', () => {
    const mockError = {
      constructor: { name: 'AdaptError' },
      code: 'TEST_ERROR',
      data: {}
    }
    assert.equal(translate(phrases, defaultLang, logWarn, 'en', mockError), 'Test error message')
  })

  it('should translate error values in data', () => {
    phrases.en['app.status'] = 'Status: ${err}'
    phrases.en['error.INNER'] = 'inner error'
    const innerError = {
      constructor: { name: 'AdaptError' },
      code: 'INNER',
      data: {}
    }
    assert.equal(translate(phrases, defaultLang, logWarn, 'en', 'app.status', { err: innerError }), 'Status: inner error')
  })

  it('should translate error values inside arrays in data', () => {
    phrases.en['app.errors'] = 'Errors: ${errs}'
    phrases.en['error.E1'] = 'err one'
    phrases.en['error.E2'] = 'err two'
    const errs = [
      { constructor: { name: 'AdaptError' }, code: 'E1', data: {} },
      { constructor: { name: 'AdaptError' }, code: 'E2', data: {} }
    ]
    const result = translate(phrases, defaultLang, logWarn, 'en', 'app.errors', { errs })
    assert.ok(result.includes('err one'))
    assert.ok(result.includes('err two'))
  })

  it('should return key when language does not exist', () => {
    assert.equal(translate(phrases, defaultLang, logWarn, 'de', 'app.simple'), 'app.simple')
  })
})
