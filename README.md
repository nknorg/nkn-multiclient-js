[![CircleCI Status](https://circleci.com/gh/nknorg/nkn-multiclient-js.svg?style=shield&circle-token=:circle-token)](https://circleci.com/gh/nknorg/nkn-multiclient-js)

# nkn-multiclient-js

A high-level library that creates multiple
[nkn-client-js](https://github.com/nknorg/nkn-client-js) instances by adding
identifier prefix (`__0__.`, `__1__.`, `__2__.`, ...) to a nkn address and
send/receive packets concurrently. This will greatly increase reliability and
reduce latency at the cost of more bandwidth usage (proportional to the number
of clients).

## Usage

For npm:

```shell
npm install nkn-multiclient
```

And then in your code:

```javascript
const nknMultiClient = require('nkn-multiclient');
```

For browser, use `dist/nkn-multiclient.js` or `dist/nkn-multiclient.min.js`.

nkn-multiclient-js basically has the same API as
[nkn-client-js](https://github.com/nknorg/nkn-client-js), except for a few more
initial configurations:

```javascript
const multiclient = nknMultiClient({
  numSubClients: 3,
  originalClient: false,
});
```

where `originalClient` controls whether a client with original identifier
(without adding any additional identifier prefix) will be created, and
`numSubClients` controls how many sub-clients to create by adding prefix
`__0__.`, `__1__.`, `__2__.`, etc. Using `originalClient: true` and
`numSubClients: 0` is equivalent to using a standard nkn-client-js without any
modification to the identifier. Note that if you use `originalClient: true` and
`numSubClients` is greater than 0, your identifier should not starts with
`__X__` where `X` is any number, otherwise you may end up with identifier
collision.

Any additional options will be passed to nkn client.

multiclient instance shares the same API as regular nkn client, see
[nkn-client-js](https://github.com/nknorg/nkn-client-js) for usage and examples.
If you need low-level property or API, you can use `multiclient.defaultClient`
to get the default client and `multiclient.clients` to get all clients.

## Contributing

**Can I submit a bug, suggestion or feature request?**

Yes. Please open an issue for that.

**Can I contribute patches?**

Yes, we appreciate your help! To make contributions, please fork the repo, push
your changes to the forked repo with signed-off commits, and open a pull request
here.

Please sign off your commit. This means adding a line "Signed-off-by: Name
<email>" at the end of each commit, indicating that you wrote the code and have
the right to pass it on as an open source patch. This can be done automatically
by adding -s when committing:

```shell
git commit -s
```

## Community

* [Discord](https://discord.gg/c7mTynX)
* [Telegram](https://t.me/nknorg)
* [Reddit](https://www.reddit.com/r/nknblockchain/)
* [Twitter](https://twitter.com/NKN_ORG)
