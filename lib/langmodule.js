const { AbstractModule, Responder } = require('adapt-authoring-core');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const Polyglot = require('node-polyglot');
const util = require('util');

/** @ignore */ const globPromise = util.promisify(glob);
/**
* Module to handle localisation of language strings
* @extends {AbstractModule}
*/
class LangModule extends AbstractModule {
  /** @override */
  constructor(app, pkg) {
    super(app, pkg);
    this.app.lang = this;
    this.init();
  }
  /**
  * Returns the languages supported by the application
  * @type {Array<String>}
  */
  get supportedLanguages() {
    return Object.keys(this.phrases);
  }
  /**
  * Initialise the module
  * @return {Promise}
  */
  async init() {
    try {
      await this.loadPhrases();
      /**
      * Reference to the Polyglot instance
      * @type {Polyglot}
      */
      this.polyglot = new Polyglot({ phrases: this.phrases, warn: this.logMissingKey.bind(this) });

      await this.app.waitForModule('config');
      /**
      * The current locale of the back-end application
      * @type {String}
      */
      this.locale = this.getConfig('locale');

      this.setReady();

      const server = await this.app.waitForModule('server');
      server.api.createChildRouter('lang').addRoute({
        route: '/:lang?',
        handlers: { get: this.requestHandler.bind(this) }
      });
    } catch(e) {
      this.log('error', e);
    }
  }
  /**
  * Loads, validates and merges all defined langage phrases
  * @return {Promise}
  */
  async loadPhrases() {
    /**
    * The loaded language phrases to be used for translation
    * @type {Object}
    */
    this.phrases = {};
    const deps = [
      { name: this.app.name, rootDir: process.cwd() },
      ...Object.values(this.app.dependencies)
    ];
    return await Promise.all(deps.map(async d => {
      return Object.assign(this.phrases, (await this.loadPhrasesForDir(d.rootDir)));
    }));
  }
  /**
  * Load all lang phrases for a given directory
  * @param {String} dir Directory to search
  * @return {Promise} Resolves with the phrases
  */
  async loadPhrasesForDir(dir) {
    const files = await globPromise(`lang/*.json`, { cwd: dir, realpath: true });
    const strings = {};
    await Promise.all(files.map(async f => {
      const namespace = path.basename(f).replace('.json', '');
      try {
        const contents = await fs.readJson(f);
        Object.entries(contents).forEach(([k,v]) => strings[`${namespace}.${k}`] = v);
      } catch(e) {
        this.log('error', f);
      }
    }));
    return strings;
  }
  /**
  * Load all lang phrases for a language
  * @param {String} lang The language of strings to load
  * @return {Object} The phrases
  */
  getPhrasesForLang(lang) {
    const phrases = {};
    Object.entries(this.phrases).forEach(([key, value]) => {
      const i = key.indexOf('.');
      const keyLang = key.slice(0, i);
      const newKey = key.slice(i+1);
      if(keyLang === lang) phrases[newKey] = value;
    });
    return (Object.keys(phrases).length > 1) ? phrases : undefined;
  }
  /**
  * Shortcut to log a missing language key
  * @param {ClientRequest} req The client request object
  * @param {ServerResponse} res The server response object
  * @param {Function} next Callback to continue the stack execution
  */
  requestHandler(req, res) {
    // defaults to the request (browser) lang
    const lang = req.params.lang || req.acceptsLanguages(this.getConfig('supportedLanguages'));
    const phrases = this.getPhrasesForLang(lang);
    const r = new Responder(res);
    if(!lang || !phrases) {
      r.error(this.t('error.unknownlang', { lang: lang }), { statusCode: 404 });
      return;
    }
    r.success(phrases);
  }
  /**
  * Shortcut to log a missing language key
  * @param {String} m The missing key
  */
  logMissingKey(m) {
    const key = m.match(/"(.+)"/)[1];
    this.log('warn', this.phrases[key] ? this.t('error.missingkey', { key }) : m);
  }
  /**
  * Returns translated language string
  * @param {String} key
  * @param {...*} rest
  * @return {String}
  * @see https://airbnb.io/polyglot.js/#polyglotprototypetkey-interpolationoptions
  */
  t(key, ...rest) {
    return this.polyglot.t(`${this.locale}.${key}`, ...rest);
  }
}

module.exports = LangModule;
