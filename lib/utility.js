const fs = require('fs');
const path = require('path');
const Polyglot = require('node-polyglot');
const { Utils } = require('adapt-authoring-core');
/**
* @implements {AbstractLang}
*/
class Lang {
  constructor(app, pkg) {
    this.app = app;
    this.app.lang = this;
    this.pkg = pkg;
    this.phrases = {};
    this.locale = '';
  }

  initialise() {
    const phrases = this.loadPhrases();
    const p = new Polyglot({ phrases: phrases });
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

  loadPhrases() {
    const phrases = {};
    Object.keys(this.app.dependencyloader.dependencies).forEach(d => {
      const depRootDir = path.join(process.cwd(), 'node_modules', d, 'lang');
      try {
        fs.readdirSync(depRootDir).forEach(locale => {
          if(locale[0] === '.') return;
          if(!phrases[locale]) phrases[locale] = {};
          fs.readdirSync(path.join(depRootDir, locale)).forEach(file => {
            if(path.extname(file) !== '.json') return;
            const key = path.basename(file, '.json');
            if(phrases[locale][key]) {
              Object.assign(phrases[locale][key], require(path.join(depRootDir, locale, file)));
            } else {
              Object.assign(phrases[locale], { [key]: require(path.join(depRootDir, locale, file)) });
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
}

module.exports = Lang;
