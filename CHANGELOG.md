## Version 2.0

- **v2.4.4**

- Resolve issues with permissions & moving files between filesystems ([#7](https://github.com/schmod/useragent-ng/pull/7) - [@johnou](https://github.com/johnou))
- Correctly list `tmp` as a non-dev dependency ([#5] - [@xwiz](https://github.com/xwiz))

- **v2.4.3**

  - Slimmed down the size/complexity of the built regexps.js file. The regexps are now stored in a normal array.

- **v2.4.0**

  - Forked and renamed to useragent-ng
  - **Feature**: Now depends on uap-core to provide the actual regexps
  - **Feature**: `Device` now includes fields for `brand` and `model`
  - **Bugfix**: Device regexps now respect case-insensitivity flags from upstream uap-core definitions
  - **Bugfix**: Correctly handle complex string substitution patterns from uap-core
  - **Bugfix**: `Agent.prototype.toJSON()` now calls `.toJSON()` recursively on `OperatingSystem` and `Device`.
  - **Deprecation**: Removes "update" functionality
  - **Deprecation**: The "version" fields will always return `'0'` for devices, and these fields will be removed in the next major release.
  - **Deprecation**: Deprecates the "Features" plugin system, and removes it from the documentation.

- **v2.3**

  - Updated dependencies

- **v2.1**

  - Default all values to minor,patch and major fields to 0 by default.

- **v2.0.x**

  - Parse file updates.

- **v2.0.0** _breaking_

  - Added support for Operating System version parsing
  - Added support for Device parsing
  - Introduced deferred OnDemand parsing for Operating and Devices
  - The `Agent#toJSON` method now returns an object instread of JSON string. Use
    `JSON.stringify(agent)` instead.
  - Removed the fromAgent method
  - semver is removed from the dependencies, if you use the useragent/features
    you should add it to your own dependencies.

- **v2.0.1**

  - Fixed broken reference to the update module.
  - Updated with some new parsers.

- **v2.0.2**

  - Use LRU-cache for the lookups so it doesn't create a memory "leak" #22
  - Updated with some new parsers.

- **v2.0.3**

  - Updated regexp library with new parsers as Opera's latest browser which runs
    WebKit was detected as Chrome Mobile.

- **v2.0.4**

  - Added support for IE11 and PhantomJS. In addition to that when you run the
    updater without the correct dependencies it will just output an error
    instead of throwing an error.

- **v2.0.5**

  - Upgraded the regular expressions to support Opera Next

- **v2.0.6**
  - Only write the parse file when there isn't an error. #30
  - Output an error in the console when we fail to compile new parsers #30

## Version 1.0

- **v1.1.0**

  - Removed the postupdate hook, it was causing to much issues #9

- **v1.0.6**

  - Updated the agent parser, JHint issues and leaking globals.

- **v1.0.5**

  - Potential fix for #11 where it doesn't install the stuff in windows this also
    brings a fresh update of the agents.js.

- **v1.0.3**

  - Rewritten the `is` method so it doesn't display IE as true for firefox, chrome
    etc fixes #10 and #7.

- **v1.0.3**

  - A fix for bug #6, updated the semver dependency for browserify support.

- **v1.0.2**

  - Don't throw errors when .parse is called without a useragent string. It now
    defaults to a empty Agent instance.

- **v1.0.1**

  - Added support for cURL, Wget and thunderbird using a custom useragent
    definition file.

- **v1.0.0** _breaking_
  - Complete rewrite of the API and major performance improvements.
