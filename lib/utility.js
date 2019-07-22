const fs = require('fs');
const path = require('path');
const Polyglot = require('node-polyglot');
const { Utils } = require('adapt-authoring-core');
/**
* @implements {AbstractLang}
*/
class LangUtility {
  constructor(app, pkg) {
    this.app = app;
    this.app.lang = this;
    this.pkg = pkg;
    this.phrases = {};
    this.locale = '';

    this.initialise();
  }

  get supportedLanguages() {
    return Object.keys(this.phrases);
  }

  initialise() {
    const phraseDirs = [...Object.keys(this.app.dependencies).map(d => path.join(process.cwd(), 'node_modules', d, 'lang')), path.join(process.cwd(), 'lang')];
    const phrases = this.loadPhrases(phraseDirs);
    const p = new Polyglot({ phrases: phrases, warn: this.logMissingKey.bind(this) });
    let locale;
    Utils.defineGetter(this, 'phrases', phrases);
    Object.defineProperty(this, 'locale', {
      get: () => locale,
      set: (newLocale) => {
        locale = newLocale;
        this.log('debug', this.t('info.setlocale', { locale: newLocale }));
      }
    });
    this.t = (key, ...rest) => p.t.call(p, `${this.locale}.${key}`, ...rest);
    this.success = (key, ...rest) => this.t(`success.${key}`, ...rest);
    this.error = (key, ...rest) => this.t(`error.${key}`, ...rest);
  }

  loadPhrases(dirs) {
    const phrases = {};
    dirs.forEach(dir => {
      try {
        fs.readdirSync(dir).forEach(locale => {
          if(locale[0] === '.') return;
          if(!phrases[locale]) phrases[locale] = {};
          fs.readdirSync(path.join(dir, locale)).forEach(file => {
            if(path.extname(file) !== '.json') return;
            const key = path.basename(file, '.json');
            if(phrases[locale][key]) {
              Object.assign(phrases[locale][key], require(path.join(dir, locale, file)));
            } else {
              Object.assign(phrases[locale], { [key]: require(path.join(dir, locale, file)) });
            }
          });
        });
      } catch(e) {
        if(e.code === 'ENOENT') return;
        return this.app.log('error', e);
      }
    });
    return phrases;
  }

  log(type, ...rest) {
    if(this.app.logger) {
      this.app.logger.log(type, this.constructor.name.toLowerCase(), ...rest);
    } else {
      this.app.log(type, ...rest);
    }
  }

  logMissingKey(m) {
    const key = m.match(/"(.+)"/)[1];
    this.log('warn', this.phrases[key] ? this.t('error.missingkey', { key }) : m);
  }
}

module.exports = LangUtility;
