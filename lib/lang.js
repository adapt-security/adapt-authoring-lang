const Polyglot = require('node-polyglot');
/**
* @implements {AbstractLang}
*/
class Lang {
  constructor(app) {
    app.lang = this;

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
