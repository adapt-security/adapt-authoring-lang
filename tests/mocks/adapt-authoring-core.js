/**
 * Mock AbstractModule for testing purposes
 * This is a minimal implementation that provides the structure needed for tests
 */
class AbstractModule {
  constructor () {
    this.app = null
  }

  log () {}
  getConfig () {}
}

export { AbstractModule }
