import { AbstractModule } from 'adapt-authoring-core';
import fs from 'fs/promises';
import globCallback from 'glob';
import path from 'path';
import { promisify } from 'util';

/** @ignore */ const globPromise = promisify(globCallback);
/**
 * Module to handle localisation of language strings
 * @extends {AbstractModule}
 */
class LangModule extends AbstractModule {
  /** @override*/
  async init() {
    this.app.lang = this;
    await this.loadPhrases();
    this.loadRoutes();
  }
  /**
   * Returns the languages supported by the application
   * @type {Array<String>}
   */
  get supportedLanguages() {
    return Object.keys(this.phrases);
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
    return Promise.all(deps.map(async d => this.loadPhrasesForDir(d.rootDir)));
  }
  /**
   * Load all lang phrases for a given directory
   * @param {String} dir Directory to search
   * @return {Promise} Resolves with the phrases
   */
  async loadPhrasesForDir(dir) {
    const files = await globPromise(`lang/*.json`, { cwd: dir, realpath: true });
    await Promise.all(files.map(async f => {
      try {
        const contents = JSON.parse((await fs.readFile(f)).toString());
        Object.entries(contents).forEach(([k,v]) => this.storeStrings(`${path.basename(f).replace('.json', '')}.${k}`, v));
      } catch(e) {
        this.log('error', e.message, f);
      }
    }));
  }
  storeStrings(key, value) {
    const i = key.indexOf('.');
    const lang = key.slice(0, i);
    if(!this.phrases[lang]) this.phrases[lang] = {};
    this.phrases[lang][key.slice(i+1)] = value;
  }
  /**
   * Loads the router & routes
   * @return {Promise}
   */
  async loadRoutes() {
    const [auth, server] = await this.app.waitForModule('auth', 'server');
    const router = server.api.createChildRouter('lang');
    router.addRoute({
      route: '/:lang?',
      handlers: { get: this.requestHandler.bind(this) }
    });
    auth.unsecureRoute(router.path, 'get');
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
    return Object.keys(phrases).length > 1 ? phrases : undefined;
  }
  /**
   * Shortcut to log a missing language key
   * @param {ClientRequest} req The client request object
   * @param {ServerResponse} res The server response object
   * @param {Function} next The callback function
   */
  requestHandler(req, res, next) {
    // defaults to the request (browser) lang
    const lang = req.params.lang || req.acceptsLanguages(this.supportedLanguages);
    if(!lang || !this.phrases[lang]) {
      return next(this.app.errors.UNKNOWN_LANG.setData({ lang }))
    }
    res.json(this.phrases[lang]);
  }
  /**
   * Returns translated language string
   * @param {String|ClientRequest} lang The target language (also accepts a req object which can be used to deduce accepted language)
   * @param {String} key The unique string key
   * @param {Object} data Dynamic data to be inserted into translated string
   * @return {String}
   */
  translate(lang, key, data) {
    if(typeof lang !== 'string') {
      lang = lang.acceptsLanguages(this.supportedLanguages);
    }
    const s = this.phrases[lang][key];
    if(!s) {
      this.log('warn', `missing key '${lang}.${key}'`);
      return key;
    }
    return !data ? s : Object.entries(data).reduce((s, [k,v]) => s.replaceAll(`%{${k}}`, v), s);
  }
  /**
   * Returns string translated to the server's default language
   * @param {String} key
   * @param {Object} data
   * @return {String}
   */
  t(key, data) {
    return this.translate(this.getConfig('defaultLang'), key, data);
  }
}

export default LangModule;