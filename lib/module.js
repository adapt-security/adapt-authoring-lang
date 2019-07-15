const { Module, Responder } = require('adapt-authoring-core');
/**
*
* @extends {Api}
*/
class Lang extends Module {
  /** @override */
  preload(app, resolve, reject) {
    // set the lang once config has loaded
    app.lang.locale = app.config.get(`${this.pkg.name}.locale`);

    app.getModule('server').api.createChildRouter('lang').addRoute({
      route: '/:lang',
      handlers: { get: this.getStrings.bind(this) }
    });
    resolve();
  }

  getStrings(req, res, next) {
    const r = new Responder(res);
    const strings = this.app.lang.phrases[req.params.lang];
    if(!strings) {
      return r.error(this.app.lang.t('error.unknownlang'), { statusCode: 404 });
    }
    r.success(Object.entries(strings).reduce((m, [k,v]) => {
      m[k.replace(`${req.params.lang}.`, '')] = v;
      return m;
    }, {}));
  }
}

module.exports = Lang;
