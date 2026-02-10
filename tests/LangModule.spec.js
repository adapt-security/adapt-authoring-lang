import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import LangModule from '../lib/LangModule.js'

describe('LangModule', () => {
  let instance

  before(() => {
    // Create a minimal mock for AbstractModule dependencies
    instance = new LangModule()
    // Mock the required app structure
    instance.app = {
      name: 'test-app',
      dependencies: {},
      errors: {
        UNKNOWN_LANG: { setData: (data) => ({ data }) }
      }
    }
    // Mock log method
    instance.log = () => {}
    // Mock getConfig method
    instance.getConfig = (key) => {
      if (key === 'defaultLang') return 'en'
      return undefined
    }
  })

  describe('#supportedLanguages', () => {
    beforeEach(() => {
      instance.phrases = {}
    })

    it('should return empty array when no phrases loaded', () => {
      assert.deepEqual(instance.supportedLanguages, [])
    })

    it('should return array of language keys', () => {
      instance.phrases = {
        en: { 'app.test': 'Test' },
        fr: { 'app.test': 'Test FR' }
      }
      assert.deepEqual(instance.supportedLanguages, ['en', 'fr'])
    })

    it('should return single language', () => {
      instance.phrases = {
        de: { 'app.test': 'Test DE' }
      }
      assert.deepEqual(instance.supportedLanguages, ['de'])
    })
  })

  describe('#storeStrings()', () => {
    beforeEach(() => {
      instance.phrases = {}
    })

    it('should store string with language prefix', () => {
      instance.storeStrings('en.app.test', 'Test Value')
      assert.equal(instance.phrases.en['app.test'], 'Test Value')
    })

    it('should create language key if not exists', () => {
      instance.storeStrings('fr.app.hello', 'Bonjour')
      assert.ok(instance.phrases.fr)
      assert.equal(instance.phrases.fr['app.hello'], 'Bonjour')
    })

    it('should store multiple strings for same language', () => {
      instance.storeStrings('en.app.test1', 'Value 1')
      instance.storeStrings('en.app.test2', 'Value 2')
      assert.equal(instance.phrases.en['app.test1'], 'Value 1')
      assert.equal(instance.phrases.en['app.test2'], 'Value 2')
    })

    it('should handle nested keys with dots', () => {
      instance.storeStrings('en.app.nested.key', 'Nested Value')
      assert.equal(instance.phrases.en['app.nested.key'], 'Nested Value')
    })
  })

  describe('#translate()', () => {
    beforeEach(() => {
      instance.phrases = {
        en: {
          'app.simple': 'Simple text',
          'app.withdata': 'Hello $' + '{name}',
          'app.multiple': 'User $' + '{user} has $' + '{count} items',
          'app.array': 'Items: $' + '{items}',
          'app.arraymap': 'Names: $map{users:name:, }',
          'error.TEST_ERROR': 'Test error message'
        },
        fr: {
          'app.simple': 'Texte simple',
          'app.withdata': 'Bonjour $' + '{name}'
        }
      }
    })

    it('should return simple translated string', () => {
      const result = instance.translate('en', 'app.simple')
      assert.equal(result, 'Simple text')
    })

    it('should return string in specified language', () => {
      const result = instance.translate('fr', 'app.simple')
      assert.equal(result, 'Texte simple')
    })

    it('should return key if translation not found', () => {
      const result = instance.translate('en', 'app.missing')
      assert.equal(result, 'app.missing')
    })

    it('should use default language if lang not provided as string', () => {
      const result = instance.translate(null, 'app.simple')
      assert.equal(result, 'Simple text')
    })

    it('should replace single placeholder with data', () => {
      const result = instance.translate('en', 'app.withdata', { name: 'John' })
      assert.equal(result, 'Hello John')
    })

    it('should replace multiple placeholders with data', () => {
      const result = instance.translate('en', 'app.multiple', { user: 'Alice', count: 5 })
      assert.equal(result, 'User Alice has 5 items')
    })

    it('should handle missing data gracefully', () => {
      const result = instance.translate('en', 'app.withdata', {})
      assert.equal(result, 'Hello $' + '{name}')
    })

    it('should replace array placeholders', () => {
      const result = instance.translate('en', 'app.array', { items: ['a', 'b', 'c'] })
      assert.ok(result.includes('a'))
      assert.ok(result.includes('b'))
      assert.ok(result.includes('c'))
    })

    it('should handle $map syntax with arrays of objects', () => {
      const users = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 }
      ]
      const result = instance.translate('en', 'app.arraymap', { users })
      assert.equal(result, 'Names: Alice, Bob')
    })

    it('should translate error objects by calling translateError', () => {
      const mockError = {
        constructor: { name: 'AdaptError' },
        code: 'TEST_ERROR',
        data: {}
      }
      const result = instance.translate('en', mockError)
      assert.equal(result, 'Test error message')
    })
  })

  describe('#translateError()', () => {
    beforeEach(() => {
      instance.phrases = {
        en: {
          'error.TEST_CODE': 'Error: $' + '{message}',
          'error.SIMPLE': 'Simple error'
        }
      }
    })

    it('should translate error with code', () => {
      const error = {
        constructor: { name: 'AdaptError' },
        code: 'SIMPLE',
        data: {}
      }
      const result = instance.translateError('en', error)
      assert.equal(result, 'Simple error')
    })

    it('should translate error with data', () => {
      const error = {
        constructor: { name: 'TestError' },
        code: 'TEST_CODE',
        data: { message: 'Something went wrong' }
      }
      const result = instance.translateError('en', error)
      assert.equal(result, 'Error: Something went wrong')
    })

    it('should return non-error values unchanged', () => {
      const result = instance.translateError('en', 'just a string')
      assert.equal(result, 'just a string')
    })

    it('should return null unchanged', () => {
      const result = instance.translateError('en', null)
      assert.equal(result, null)
    })

    it('should return undefined unchanged', () => {
      const result = instance.translateError('en', undefined)
      assert.equal(result, undefined)
    })
  })

  describe('#getPhrasesForLang()', () => {
    it('should return undefined when phrases structure does not match expected format', () => {
      // The current structure is { lang: { key: value } }
      // but getPhrasesForLang expects keys like 'lang.key'
      instance.phrases = {
        en: {
          'app.test1': 'Test 1',
          'app.test2': 'Test 2'
        }
      }
      const result = instance.getPhrasesForLang('en')
      // Returns undefined because the structure doesn't match what the method expects
      assert.equal(result, undefined)
    })

    it('should work with flat key structure if provided', () => {
      // If phrases were structured as expected by this method
      instance.phrases = {
        'en.app.test1': 'Test 1',
        'en.app.test2': 'Test 2',
        'en.error.ERR1': 'Error 1',
        'fr.app.test': 'Test FR'
      }
      const result = instance.getPhrasesForLang('en')
      assert.ok(result)
      assert.equal(Object.keys(result).length, 3)
      assert.equal(result['app.test1'], 'Test 1')
      assert.equal(result['app.test2'], 'Test 2')
      assert.equal(result['error.ERR1'], 'Error 1')
    })

    it('should return undefined for language with only one phrase', () => {
      instance.phrases = {
        'en.app.test': 'Test'
      }
      const result = instance.getPhrasesForLang('en')
      assert.equal(result, undefined)
    })

    it('should return undefined for non-existent language', () => {
      instance.phrases = {
        'en.app.test1': 'Test 1',
        'en.app.test2': 'Test 2'
      }
      const result = instance.getPhrasesForLang('de')
      assert.equal(result, undefined)
    })
  })
})
