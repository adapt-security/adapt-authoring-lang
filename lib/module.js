const { AbstractModule, Responder } = require('adapt-authoring-core');
/**
* Module to handle localisation of language strings
* @extends {AbstractApiModule}
*/
class LangModule extends AbstractModule {
  /** @override */
  preload(app, resolve, reject) {
    app.getModule('server').api.createChildRouter('lang').addRoute({
      route: '/:lang?',
      handlers: { get: this.getStrings.bind(this) }
    });
    app.auth.secureRoute('/api/lang/:lang?', 'get', ['read:lang']);
    resolve();
  }
  /**
  * Request handler to expose language strings
  * @param {ClientRequest} req
  * @param {ServerResponse} res
  * @param {Function} next
  */
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
