/**
 * Parses a dotted language key and stores the value in the phrases dictionary
 * @param {Object} phrases The phrases dictionary to store into
 * @param {String} key Key in the format 'lang.namespace.key'
 * @param {String} value The string value to store
 * @memberof lang
 */
export function storeStrings (phrases, key, value) {
  const i = key.indexOf('.')
  const lang = key.slice(0, i)
  if (!phrases[lang]) phrases[lang] = {}
  phrases[lang][key.slice(i + 1)] = value
}
