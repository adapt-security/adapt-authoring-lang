import { translateError } from './translateError.js'

/**
 * Returns translated language string
 * @param {Object} phrases The phrases dictionary
 * @param {String} defaultLang Default language to use when lang is not a string
 * @param {Function} logWarn Logging function for missing keys (receives message string)
 * @param {String} lang The target language (if undefined, the default language will be used)
 * @param {String|AdaptError} key The unique string key (if an AdaptError is passed, the error data will be used for the data param)
 * @param {Object} data Dynamic data to be inserted into translated string
 * @return {String}
 * @memberof lang
 */
export function translate (phrases, defaultLang, logWarn, lang, key, data) {
  if (typeof lang !== 'string') {
    lang = defaultLang
  }
  if (key.constructor.name.endsWith('Error')) {
    return translateError(phrases, defaultLang, logWarn, lang, key)
  }
  const s = phrases[lang]?.[key]
  if (!s) {
    logWarn(`missing key '${lang}.${key}'`)
    return key
  }
  if (!data) {
    return s
  }
  return Object.entries(data).reduce((s, [k, v]) => {
    // map any errors specified in data
    v = Array.isArray(v) ? v.map(v2 => translateError(phrases, defaultLang, logWarn, lang, v2)) : translateError(phrases, defaultLang, logWarn, lang, v)
    s = s.replaceAll(`\${${k}}`, v)
    // handle special-case array replacements
    if (Array.isArray(v)) {
      const matches = [...s.matchAll(new RegExp(String.raw`\$map{${k}:(.+)}`, 'g'))]
      matches.forEach(([replace, data]) => {
        const [attrs, delim] = data.split(':')
        s = s.replace(replace, v.map(val => attrs.split(',').map(a => Object.prototype.hasOwnProperty.call(val, a) ? val[a] : a)).join(delim))
      })
    }
    return s
  }, s)
}
