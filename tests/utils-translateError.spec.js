/* eslint-disable no-template-curly-in-string */
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { translateError } from '../lib/utils/translateError.js'

describe('translateError()', () => {
  const phrases = {
    en: {
      'error.TEST_CODE': 'Error: ${message}',
      'error.SIMPLE': 'Simple error'
    }
  }
  const defaultLang = 'en'
  const logWarn = mock.fn()

  it('should translate error with code', () => {
    const error = {
      constructor: { name: 'AdaptError' },
      code: 'SIMPLE',
      data: {}
    }
    assert.equal(translateError(phrases, defaultLang, logWarn, 'en', error), 'Simple error')
  })

  it('should translate error with data', () => {
    const error = {
      constructor: { name: 'TestError' },
      code: 'TEST_CODE',
      data: { message: 'Something went wrong' }
    }
    assert.equal(translateError(phrases, defaultLang, logWarn, 'en', error), 'Error: Something went wrong')
  })

  it('should return non-error values unchanged', () => {
    assert.equal(translateError(phrases, defaultLang, logWarn, 'en', 'just a string'), 'just a string')
  })

  it('should return null unchanged', () => {
    assert.equal(translateError(phrases, defaultLang, logWarn, 'en', null), null)
  })

  it('should return undefined unchanged', () => {
    assert.equal(translateError(phrases, defaultLang, logWarn, 'en', undefined), undefined)
  })

  it('should return number values unchanged', () => {
    assert.equal(translateError(phrases, defaultLang, logWarn, 'en', 42), 42)
  })

  it('should use error object itself as data when data is missing', () => {
    phrases.en['error.NO_DATA'] = 'Code: ${code}'
    const error = {
      constructor: { name: 'AdaptError' },
      code: 'NO_DATA'
    }
    assert.equal(translateError(phrases, defaultLang, logWarn, 'en', error), 'Code: NO_DATA')
  })

  it('should handle objects without constructor gracefully', () => {
    const obj = {}
    assert.equal(translateError(phrases, defaultLang, logWarn, 'en', obj), obj)
  })
})
