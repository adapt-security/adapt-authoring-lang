const fs = require('fs');
const path = require('path');
const Polyglot = require('node-polyglot');
const { AbstractUtility, Utils } = require('adapt-authoring-core');

const enErrors = require('../lang/en/error.json');
/**
* Utility to handle localisation of language phrases
* @implements {AbstractLang}
*/
class LangUtility extends AbstractUtility {
  /** @constructor */
  constructor(app, pkg) {
    super(app, pkg);
    /**
    * The loaded language phrases to be used for translation
    * @type {Object}
    */
    this.phrases = {};
    /**
    * The current locale of the back-end application
    * @type {String}
    */
    this.locale;

    this.initialise();
  }
  /**
  * Returns the languages supported by the application
  * @type {Array<String>}
  */
  get supportedLanguages() {
    return Object.keys(this.phrases);
  }
  /**
  * Initialises the language phrases
  */
  initialise() {
    const phrases = this.loadPhrases();
    const p = new Polyglot({ phrases: phrases, warn: this.logMissingKey.bind(this) });
    let locale = this.getDefaultLocale();
    // set the locale once config has initialised
    this.app.dependencyloader.on('initialisedUtilities', () => {
      locale = this.app.config.get(`${this.pkg.name}.locale`);
    });
    Utils.defineGetter(this, 'phrases', phrases);
    Object.defineProperty(this, 'locale', {
      get: () => locale,
      set: (newLocale) => {
        locale = newLocale;
        this.log('info', this.t('info.setlocale', { locale: newLocale }));
      }
    });
    /**
    * Returns translated language string
    * @param {String} key
    * @param {...*} rest
    * @type {Function}
    * @see https://airbnb.io/polyglot.js/#polyglotprototypetkey-interpolationoptions
    */
    this.t = (key, ...rest) => p.t.call(p, `${this.locale}.${key}`, ...rest);
    /**
    * Shorthand function for {@link LangUtility#t} to return translated success language phrases
    * @type {Function}
    * @return {String}
    */
    this.success = (key, ...rest) => this.t(`success.${key}`, ...rest);
    /**
    * Shorthand function for {@link LangUtility#t} to return translated error language phrases
    * @type {Function}
    * @return {String}
    */
    this.error = (key, ...rest) => this.t(`error.${key}`, ...rest);
  }
  /**
  * Loads, validates and merges all defined langage phrases
  * @return {Object}
  */
  loadPhrases() {
    const allKeys = [];
    const phrases = {};
    const deps = [
      { name: 'adapt-authoring', dir: path.join(process.cwd()) },
      ...Object.values(this.app.dependencies)
    ];
    deps.forEach(pkg => {
      const root = path.join(pkg.dir, 'lang');
      try {
        fs.readdirSync(root).forEach(locale => {
          if(locale[0] === '.') return;

          const ldir = path.join(root, locale);
          fs.readdirSync(ldir).forEach(file => {
            if(path.extname(file) !== '.json') return;

            const filename = path.basename(file, '.json');
            const strings = require(path.join(ldir, filename));

            Utils.safeAssign(phrases, locale, filename, strings);
            allKeys.push(...Object.keys(strings).map(s => `${locale}.${filename}.${s}`));
          });
        });
      } catch(e) {
        if(e.code === 'ENOENT') return;
        return console.log(e);
      }
    });
    // do a quick validation once utils have been initialised
    this.app.dependencyloader.on('initialisedUtilities', () => {
      allKeys.reduce((a,k) => {
        if(!a.includes(k)) a.push(k);
        else this.log('warn', this.t('error.duplicatekey', { key: k }));
        return a;
      }, []);
    });

    return phrases;
  }
  /**
  * Tries to determine the environment language from process.env variables.
  * @return {String} The ISO 639-1 language code
  */
  getDefaultLocale() {
    const env = process.env;
    const l = env.LANG || env.LANGUAGE || env.LC_ALL || env.LC_MESSAGES;
    if(!l) {
      l = 'en';
      this.log('warn', `${enErrors.nolang} ${l}`);
      return l;
    }
    return l.slice(0,2);
  }
  /**
  * Shortcut to log a missing language key
  * @param {String} m The missing key
  */
  logMissingKey(m) {
    const key = m.match(/"(.+)"/)[1];
    this.log('warn', this.phrases[key] ? this.t('error.missingkey', { key }) : m);
  }
}

module.exports = LangUtility;
