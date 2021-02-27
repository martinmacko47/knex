// MySQL2 Client
// -------
const findIndex = require('lodash/findIndex');
const { inherits } = require('util');
const Client_MySQL = require('../mysql');
const Transaction = require('./transaction');

// Always initialize with the "QueryBuilder" and "QueryCompiler"
// objects, which extend the base 'lib/query/builder' and
// 'lib/query/compiler', respectively.
function Client_MySQL2(config) {
  Client_MySQL.call(this, config);
}
inherits(Client_MySQL2, Client_MySQL);

Object.assign(Client_MySQL2.prototype, {
  // The "dialect", for reference elsewhere.
  driverName: 'mysql2',

  transaction() {
    return new Transaction(this, ...arguments);
  },

  _driver() {
    return require('mysql2');
  },

  validateConnection(connection) {
    if (connection._fatalError) {
      return false;
    }
    return true;
  },

  async cancelQuery(connectionToKill, queryToKill) {
    const index = findIndex(
      connectionToKill._commands.toArray(),
      (cmd) => cmd._queryOptions.__knexQueryUid === queryToKill.__knexQueryUid
    )
    if (index >= 0) {
      connectionToKill._commands.removeOne(index)
      return
    }

    const conn = await this.acquireRawConnection();
    try {
      return await this._query(conn, {
        method: 'raw',
        sql: 'KILL QUERY ?',
        bindings: [connectionToKill.threadId],
        options: {},
      });
    } finally {
      await this.destroyRawConnection(conn);
    }
  },

});

module.exports = Client_MySQL2;
