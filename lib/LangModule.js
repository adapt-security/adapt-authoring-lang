import { AbstractModule } from 'adapt-authoring-core'
import { loadRouteConfig, registerRoutes } from 'adapt-authoring-server'
import fs from 'node:fs/promises'
import { glob } from 'glob'
import path from 'node:path'
import { storeStrings, translate, translateError } from './utils.js'

/**
 * Module to handle localisation of language strings
 * @memberof lang
 * @extends {AbstractModule}
 */
class LangModule extends AbstractModule {
  /** @override */
  async init () {
    this.app.lang = this
    await this.loadPhrases()
    this.loadRoutes()
  }

  /**
   * Returns the languages supported by the application
   * @type {Array<String>}
   */
  get supportedLanguages () {
    return Object.keys(this.phrases)
  }

  /**
   * Loads, validates and merges all defined langage phrases
   * @return {Promise}
   */
  async loadPhrases () {
    /**
     * The loaded language phrases to be used for translation
     * @type {Object}
     */
    this.phrases = {}
    const deps = [
      { name: this.app.name, rootDir: process.cwd() },
      ...Object.values(this.app.dependencies)
    ]
    return Promise.all(deps.map(async d => this.loadPhrasesForDir(d.rootDir)))
  }

  /**
   * Load all lang phrases for a given directory
   * @param {String} dir Directory to search
   * @return {Promise} Resolves with the phrases
   */
  async loadPhrasesForDir (dir) {
    const files = await glob('lang/*.json', { cwd: dir, absolute: true })
    await Promise.all(files.map(async f => {
      try {
        const contents = JSON.parse((await fs.readFile(f)).toString())
        Object.entries(contents).forEach(([k, v]) => storeStrings(this.phrases, `${path.basename(f).replace('.json', '')}.${k}`, v))
      } catch (e) {
        this.log('error', e.message, f)
      }
    }))
  }

  /**
   * @deprecated Use storeStrings() from 'adapt-authoring-lang' instead
   */
  storeStrings (key, value) {
    storeStrings(this.phrases, key, value)
  }

  /**
   * Loads the router & routes
   * @return {Promise}
   */
  async loadRoutes () {
    const [auth, server] = await this.app.waitForModule('auth', 'server')

    server.api.addMiddleware(this.addTranslationUtils.bind(this))

    const config = await loadRouteConfig(this.rootDir, this)
    const router = server.api.createChildRouter(config.root)
    registerRoutes(router, config.routes, auth)
  }

  /**
   * Load all lang phrases for a language
   * @param {String} lang The language of strings to load
   * @return {Object} The phrases
   */
  getPhrasesForLang (lang) {
    const phrases = {}
    Object.entries(this.phrases).forEach(([key, value]) => {
      const i = key.indexOf('.')
      const keyLang = key.slice(0, i)
      const newKey = key.slice(i + 1)
      if (keyLang === lang) phrases[newKey] = value
    })
    return Object.keys(phrases).length > 1 ? phrases : undefined
  }

  /**
   * Adds a translate function to incoming API requests for generating language strings in the original request's supported language
   * @param {external:ExpressRequest} req
   * @param {external:ExpressResponse} res
   * @param {function} next
   */
  addTranslationUtils (req, res, next) {
    const lang = req.acceptsLanguages(this.supportedLanguages)
    req.translate = (key, data) => this.translate(lang, key, data)
    next()
  }

  /**
   * Shortcut to log a missing language key
   * @param {external:ExpressRequest} req The client request object
   * @param {external:ExpressResponse} res The server response object
   * @param {Function} next The callback function
   */
  requestHandler (req, res, next) {
    // defaults to the request (browser) lang
    const lang = req.params.lang || req.acceptsLanguages(this.supportedLanguages)
    if (!lang || !this.phrases[lang]) {
      return next(this.app.errors.UNKNOWN_LANG.setData({ lang }))
    }
    res.json(this.phrases[lang])
  }

  /**
   * Returns translated language string
   * @param {String} lang The target language (if undefined, the default server language will be used)
   * @param {String|AdaptError} key The unique string key (if an AdaptError is passed, the error data will be used for the data param)
   * @param {Object} data Dynamic data to be inserted into translated string
   * @return {String}
   */
  translate (lang, key, data) {
    return translate(this.phrases, this.getConfig('defaultLang'), msg => this.log('warn', msg), lang, key, data)
  }

  /**
   * Translates an AdaptError
   * @param {String} lang The target language
   * @param {AdaptError} error Error to translate
   * @returns The translated error (if passed error is not an instance of AdaptError, the original value will be returned)
   */
  translateError (lang, error) {
    return translateError(this.phrases, this.getConfig('defaultLang'), msg => this.log('warn', msg), lang, error)
  }
}

export default LangModule
