const Polyglot = require('node-polyglot');
/**
* @implements {AbstractLang}
*/
class Lang {
  constructor(app, pkg) {
    this.app = app;
    this.app.lang = this;
    this.pkg = pkg;

    const p = new Polyglot();
    /**
    *
    */
    this.get = (...args) => p.t.call(p, ...args);
    /**
    *
    */
    this.success = (key, ...rest) => this.get(`success.${key}`, ...rest);
    /**
    *
    */
    this.error = (key, ...rest) => this.get(`error.${key}`, ...rest);
    /**
    *
    */
    this.extend = (phrases) => p.extend.call(p, phrases);
  }
}

module.exports = Lang;
