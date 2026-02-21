import { translate } from './translate.js'

/**
 * Translates an AdaptError
 * @param {Object} phrases The phrases dictionary
 * @param {String} defaultLang Default language to use when lang is not a string
 * @param {Function} logWarn Logging function for missing keys (receives message string)
 * @param {String} lang The target language
 * @param {AdaptError} error Error to translate
 * @returns The translated error (if passed error is not an instance of AdaptError, the original value will be returned)
 * @memberof lang
 */
export function translateError (phrases, defaultLang, logWarn, lang, error) {
  return error?.constructor.name.endsWith('Error')
    ? translate(phrases, defaultLang, logWarn, lang, `error.${error.code}`, error.data ?? error)
    : error
}
