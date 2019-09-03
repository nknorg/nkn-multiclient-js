'use strict';

const cache = require('memory-cache');
const nkn = require('nkn-client');
const protocol = require('nkn-client/lib/protocol');
const tools = require('nkn-client/lib/crypto/tools');

const identifierRe = /^__\d+__$/;

function getIdentifier(base, id) {
  if (id === 'null') {
    return base;
  }
  return '__' + id + '__' + (base ? '.' + base : '');
}

function addIdentifier(addr, id) {
  if (id === 'null') {
    return addr;
  }
  return '__' + id + '__.' + addr;
}

function removeIdentifier(src) {
  let s = src.split('.');
  if (identifierRe.test(s[0])) {
    return s.slice(1).join('.');
  }
  return src;
}

function processDest(dest, clientID) {
  if (!Array.isArray(dest)) {
    return [addIdentifier(dest, clientID)];
  }
  return dest.map(addr => addIdentifier(addr, clientID));
}

function MultiClient(options = {}) {
  if (!(this instanceof MultiClient)) {
    return new MultiClient(options);
  }

  let clients = {};

  if (options.originalClient) {
    clients[null] = nkn(options);
    if (!options.seed) {
      options = Object.assign({}, options, { seed: clients[null].key.seed });
    }
  }

  for (var i = 0; i < options.numSubClients; i++) {
    clients[i] = nkn(Object.assign({}, options, {identifier: getIdentifier(options.identifier, i)}));
    if (i === 0 && !options.seed) {
      options = Object.assign({}, options, { seed: clients[i].key.seed });
    }
  }

  this.eventListeners = {};
  this.options = options;
  this.clients = clients;

  if (Object.keys(clients).length === 0) {
    return
  }

  this.defaultClient = options.originalClient ? clients[null] : clients[0];
  this.key = this.defaultClient.key;
  this.identifier = options.identifier || '';
  this.addr = (this.identifier ? this.identifier + '.' : '') + this.key.publicKey;

  Object.values(clients).forEach((client) => {
    client.on('message', async (src, payload, payloadType, encrypt, pid) => {
      if (cache.get(pid) !== null) {
        return false;
      }
      cache.put(pid, true, options.msgCacheExpiration);

      src = removeIdentifier(src);

      let responses = [];
      if (this.eventListeners.message) {
        responses = await Promise.all(this.eventListeners.message.map(f => {
          try {
            return Promise.resolve(f(src, payload, payloadType, encrypt, pid));
          } catch (e) {
            console.error('Message handler error:', e);
            return Promise.resolve(null);
          }
        }));
      }
      let responded = false;
      for (let response of responses) {
        if (response === false) {
          return false;
        } else if (response !== undefined && response !== null) {
          this.send(src, response, {
            encrypt: encrypt,
            msgHoldingSeconds: 0,
            replyToPid: pid,
            noReply: true,
          }).catch((e) => {
            console.error('Send response error:', e);
          });
          responded = true;
          break;
        }
      }
      if (!responded) {
        Object.keys(this.clients).forEach((clientID) => {
          if (this.clients[clientID] && this.clients[clientID].ready) {
            this.clients[clientID].sendACK(processDest(src, clientID), pid, encrypt);
          }
        });
      }
      return false;
    });
  });
};

MultiClient.prototype.sendWithClient = function (clientID, dest, data, options = {}) {
  if (this.clients[clientID] && this.clients[clientID].ready) {
    return this.clients[clientID].send(processDest(dest, clientID), data, options);
  }
  return null;
};

MultiClient.prototype.send = function (dest, data, options = {}) {
  options = Object.assign({}, options, { pid: tools.randomBytes(protocol.pidSize) });
  let readyClientID = Object.keys(this.clients).filter(clientID => this.clients[clientID] && this.clients[clientID].ready);
  if (readyClientID.length === 0) {
    return new Promise(function(resolve, reject) {
      reject('All clients are not ready.');
    });
  }
  return Promise.race(readyClientID.map((clientID) => {
    return this.sendWithClient(clientID, dest, data, options);
  }));
};

MultiClient.prototype.publish = async function (topic, data, options = {}) {
  let offset = 0;
  let limit = 1000;
  let res = await this.defaultClient.getSubscribers(topic, { offset, limit, txPool: options.txPool || false });
  let subscribers = res.subscribers;
  let subscribersInTxPool = res.subscribersInTxPool;
  while (res.subscribers && res.subscribers.length >= limit) {
    offset += limit;
    res = await this.getSubscribers(topic, { offset, limit });
    subscribers = subscribers.concat(res.subscribers);
  }
  if (options.txPool) {
    subscribers = subscribers.concat(subscribersInTxPool);
  }
  options = Object.assign({}, options, { noReply: true });
  return this.send(subscribers, data, options);
}

MultiClient.prototype.onconnect = function (func) {
  let promises = Object.values(this.clients).map(client => new Promise(function(resolve, reject) {
    client.on('connect', resolve);
  }));
  Promise.race(promises).then(func);
}

MultiClient.prototype.on = function (event, func) {
  switch (event) {
    case 'connect':
      return this.onconnect(func);
    case 'message':
      if (this.eventListeners[event]) {
        this.eventListeners[event].push(func);
      } else {
        this.eventListeners[event] = [func];
      }
      return;
    default:
      return this.defaultClient.on(event, func);
  }
};

MultiClient.prototype.close = function () {
  Object.values(this.clients).forEach((client) => {
    if (client && client.ready) {
      client.close();
    }
  });
};

module.exports = MultiClient;
