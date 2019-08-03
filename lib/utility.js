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
    const phrases = this.loadPhrases();
    const p = new Polyglot({ phrases: phrases, warn: this.logMissingKey.bind(this) });
    let locale;

    Utils.defineGetter(this, 'phrases', phrases);
    Object.defineProperty(this, 'locale', {
      get: () => locale,
      set: (newLocale) => {
        locale = newLocale;
        this.log('info', this.t('info.setlocale', { locale: newLocale }));
      }
    });
    this.t = (key, ...rest) => p.t.call(p, `${this.locale}.${key}`, ...rest);
    this.success = (key, ...rest) => this.t(`success.${key}`, ...rest);
    this.error = (key, ...rest) => this.t(`error.${key}`, ...rest);
  }

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
      this.locale = this.app.config.get(`${this.pkg.name}.locale`);
      allKeys.reduce((a,k) => {
        if(!a.includes(k)) a.push(k);
        else this.log('warn', this.t('error.duplicatekey', { key: k }));
        return a;
      }, []);
    });

    return phrases;
  }

  log(type, ...rest) {
    if(this.app.logger && this.app.logger.log) {
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
