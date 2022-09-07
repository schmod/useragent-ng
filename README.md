# useragent-ng - high performance user agent parser for Node.js

useragent-ng is a fork of the popular [useragent](https://www.npmjs.com/package/useragent)
library, which can parse useragent strings into machine-readable objects. For the most part, it can be used a drop-in replacement for `useragent`.

## Differences with `useragent`

Most users will be able to use `useragent-ng` as a drop-in replacement for `useragent`.

- The internal database of useragent regexps is fetched from the [uap-core](https://github.com/ua-parser/uap-core) NPM module on install, ensuring that a current database is always available. Upgrades are automatically handled via your package-manager's dependency-resolution mechanism.
- The `update()` method has been removed, as it no longer has any purpose.
- The LRU-cache dependency has been upgraded, and now depends on Node >= 10
- The LRU-cache library is only loaded when `.lookup()` is invoked.
- Building your own extension points via `useragent/features` is actively-discouraged, and will be removed in a future release.

## History

Useragent originated as port of [browserscope.org][browserscope]'s user agent
parser project also known as ua-parser. Useragent allows you to parse user agent
strings with high [performance](#high-performance) and accuracy by using [hand tuned](#hand-tuned-regular-expressions) regular expressions for
browser matching. This database is needed to ensure that every browser is
correctly parsed as every browser vendor implements it's own user agent schema.
This is why regular user agent parsers have major issues because they will
most likely parse out the wrong browser name or confuse the render engine version
with the actual version of the browser.

---

### High performance

The original `useragent` module was developed with a benchmark driven approach.

As of September 2022, it is no longer the fastest module on modern versions of Node (v16.6.0).

**NOTE**: This section needs to be updated, as the competing libraries are unmaintained, and
do not contain a modern database of user-agent regexes.

```
Starting the benchmark, parsing 62 useragent strings per run

Executed benchmark against node module: "useragent-ng"
Count (27), Cycles (3), Elapsed (5.405), Hz (503.8134678821794)

Executed benchmark against node module: "useragent_parser"
Count (173), Cycles (4), Elapsed (5.435), Hz (3163.4275145218658)

Executed benchmark against node module: "useragent-parser"
Count (60), Cycles (3), Elapsed (5.332), Hz (1131.8792574746035)

Executed benchmark against node module: "ua-parser"
Count (231), Cycles (6), Elapsed (5.439), Hz (4267.527490389378)

Module: "ua-parser" is the user agent fastest parser.
```

### Hand tuned regular expressions

This module depends on [uap-core][uap-core]'s `regexes.yaml` user agent database to parse user agent strings.

This database is up-to-date thanks to [contributors][uap-core-contributors] such as you. Feel free to submit [issues][uap-core-issues] and [pull requests][uap-core-pull-requests].

---

### Installation

Installation is done using the Node Package Manager (NPM). If you don't have
NPM installed on your system you can download it from
[npmjs.org][npm]

```
npm install useragent-ng --save
```

The `--save` flag tells NPM to automatically add it to your `package.json` file.

---

### API

Include the `useragent-ng` parser in you node.js application:

```js
var useragent = require("useragent-ng");
```

#### useragent.parse(useragent string[, js useragent]);

This is the actual user agent parser, this is where all the magic is happening.
The function accepts 2 arguments, both should be a `string`. The first argument
should the user agent string that is known on the server from the
`req.headers.useragent` header. The other argument is optional and should be
the user agent string that you see in the browser, this can be send from the
browser using a xhr request or something like this. This allows you detect if
the user is browsing the web using the `Chrome Frame` extension.

The parser returns a Agent instance, this allows you to output user agent
information in different predefined formats. See the Agent section for more
information.

```js
var agent = useragent.parse(req.headers["user-agent"]);

// example for parsing both the useragent header and a optional js useragent
var agent2 = useragent.parse(req.headers["user-agent"], req.query.jsuseragent);
```

The parse method returns a `Agent` instance which contains all details about the
user agent. See the Agent section of the API documentation for the available
methods.

#### useragent.lookup(useragent string[, js useragent]);

This provides the same functionality as above, but it caches the user agent
string and it's parsed result in memory to provide faster lookups in the
future. This can be handy if you expect to parse a lot of user agent strings.

It uses the same arguments as the `useragent.parse` method and returns exactly
the same result, but it's just cached.

```js
var agent = useragent.lookup(req.headers["user-agent"]);
```

And this is a serious performance improvement as shown in this benchmark:

```
Executed benchmark against method: "useragent.parse"
Count (49), Cycles (3), Elapsed (5.534), Hz (947.6844321931629)

Executed benchmark against method: "useragent.lookup"
Count (11758), Cycles (3), Elapsed (5.395), Hz (229352.03831239208)
```

#### useragent.fromJSON(obj);

Transforms the JSON representation of a `Agent` instance back in to a working
`Agent` instance

```js
var agent = useragent.parse(req.headers["user-agent"]),
  another = useragent.fromJSON(JSON.stringify(agent));

console.log(agent == another);
```

#### useragent.is(useragent string).browsername;

This api provides you with a quick and dirty browser lookup. The underlying
code is usually found on client side scripts so it's not the same quality as
our `useragent.parse` method but it might be needed for legacy reasons.

`useragent.is` returns a object with potential matched browser names

```js
useragent.is(req.headers["user-agent"]).firefox; // true
useragent.is(req.headers["user-agent"]).safari; // false
var ua = useragent.is(req.headers["user-agent"]);

// the object
{
  version: "3";
  webkit: false;
  opera: false;
  ie: false;
  chrome: false;
  safari: false;
  mobile_safari: false;
  firefox: true;
  mozilla: true;
  android: false;
}
```

---

### Agents, OperatingSystem and Device instances

Most of the methods mentioned above return a Agent instance. The Agent exposes
the parsed out information from the user agent strings. This allows us to
extend the agent with more methods that do not necessarily need to be in the
core agent instance, allowing us to expose a plugin interface for third party
developers and at the same time create a uniform interface for all versioning.

The Agent has the following property

- `family` The browser family, or browser name, it defaults to Other.
- `major` The major version number of the family, it defaults to 0.
- `minor` The minor version number of the family, it defaults to 0.
- `patch` The patch version number of the family, it defaults to 0.

In addition to the properties mentioned above, it also has 2 special properties,
which are:

- `os` OperatingSystem instance
- `device` Device instance

When you access those 2 properties the agent will do on demand parsing of the
Operating System or/and Device information.

The OperatingSystem has the same properties as the Agent.

Device has the properties:

- `family` A human-readable description of the device
- `brand` The device manufacturer
- `model` The device's model number

If we cannot find the family, they will default to `Other`.

The following methods are available:

#### Agent.toAgent();

Returns the family and version number concatinated in a nice human readable
string.

```js
var agent = useragent.parse(req.headers["user-agent"]);
agent.toAgent(); // 'Chrome 15.0.874'
```

#### Agent.toString();

Returns the results of the `Agent.toAgent()` but also adds the parsed operating
system to the string in a human readable format.

```js
var agent = useragent.parse(req.headers["user-agent"]);
agent.toString(); // 'Chrome 15.0.874 / Mac OS X 10.8.1'

// as it's a to string method you can also concat it with another string
"your useragent is " + agent;
// 'your useragent is Chrome 15.0.874 / Mac OS X 10.8.1'
```

#### Agent.toVersion();

Returns the version of the browser in a human readable string.

```js
var agent = useragent.parse(req.headers["user-agent"]);
agent.toVersion(); // '15.0.874'
```

#### Agent.toJSON();

Generates a JSON representation of the Agent. By using the `toJSON` method we
automatically allow it to be stringified when supplying as to the
`JSON.stringify` method.

```js
var agent = useragent.parse(req.headers["user-agent"]);
agent.toJSON(); // returns an object

JSON.stringify(agent);
```

#### OperatingSystem.toString();

Generates a stringified version of operating system;

```js
var agent = useragent.parse(req.headers["user-agent"]);
agent.os.toString(); // 'Mac OSX 10.8.1'
```

#### OperatingSystem.toVersion();

Generates a stringified version of operating system's version;

```js
var agent = useragent.parse(req.headers["user-agent"]);
agent.os.toVersion(); // '10.8.1'
```

#### OperatingSystem.toJSON();

Generates a JSON representation of the OperatingSystem. By using the `toJSON`
method we automatically allow it to be stringified when supplying as to the
`JSON.stringify` method.

```js
var agent = useragent.parse(req.headers["user-agent"]);
agent.os.toJSON(); // returns an object

JSON.stringify(agent.os);
```

#### Device.toString();

Generates a stringified version of device;

```js
var agent = useragent.parse(req.headers["user-agent"]);
agent.device.toString(); // 'Asus A100'
```

#### Device.toVersion();

Generates a stringified version of device's version;

```js
var agent = useragent.parse(req.headers["user-agent"]);
agent.device.toVersion(); // '' , no version found but could also be '0.0.0'
```

#### Device.toJSON();

Generates a JSON representation of the Device. By using the `toJSON` method we
automatically allow it to be stringified when supplying as to the
`JSON.stringify` method.

```js
var agent = useragent.parse(req.headers["user-agent"]);
agent.device.toJSON(); // returns an object

JSON.stringify(agent.device);
```

---

### Migrations

For small changes between version please review the [changelog][changelog].

#### Upgrading from `useragent` 2.x

- The `useragent(true)` command no longer fetches a fresh set of regexps from the web, as the regexps are now provided via the [uap-core](https://www.npmjs.com/package/uap-core) NPM module, which is now a dependency of this package.

#### Upgrading from 1.10 to 2.0.0

- `useragent.fromAgent` has been removed.
- `agent.toJSON` now returns an Object, use `JSON.stringify(agent)` for the old
  behaviour.
- `agent.os` is now an `OperatingSystem` instance with version numbers. If you
  still a string only representation do `agent.os.toString()`.
- `semver` has been removed from the dependencies, so if you are using the
  `require('useragent-ng/features')` you need to add it to your own dependencies

#### Upgrading from 0.1.2 to 1.0.0

- `useragent.browser(ua)` has been renamed to `useragent.is(ua)`.
- `useragent.parser(ua, jsua)` has been renamed to `useragent.parse(ua, jsua)`.
- `result.pretty()` has been renamed to `result.toAgent()`.
- `result.V1` has been renamed to `result.major`.
- `result.V2` has been renamed to `result.minor`.
- `result.V3` has been renamed to `result.patch`.
- `result.prettyOS()` has been removed.
- `result.match` has been removed.

---

### License

MIT

[browserscope]: http://www.browserscope.org/
[benchmark]: https://github.com/3rd-Eden/useragent/blob/master/benchmark/run.js
[uap-core]: https://github.com/ua-parser/uap-core
[uap-core-contributors]: https://github.com/ua-parser/uap-core/graphs/contributors
[uap-core-issues]: https://github.com/ua-parser/uap-core/issues
[uap-core-pull-requests]: https://github.com/ua-parser/uap-core/pulls
[changelog]: https://github.com/3rd-eden/useragent/blob/master/CHANGELOG.md
[npm]: http://npmjs.org
