const { Module, Responder } = require('adapt-authoring-core');
/**
*
* @extends {Api}
*/
class LangModule extends Module {
  /** @override */
  preload(app, resolve, reject) {
    app.getModule('server').api.createChildRouter('lang').addRoute({
      route: '/:lang?',
      handlers: { get: this.getStrings.bind(this) }
    });
    app.auth.secureRoute('/api/lang/:lang?', 'get', ['read:lang']);
    resolve();
  }

  getStrings(req, res, next) {
    if(!req.params.lang) { // defaults to the request (browser) lang
      req.params.lang = req.acceptsLanguages(this.app.lang.supportedLanguages);
    }
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

module.exports = LangModule;
