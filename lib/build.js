'use strict';

/**
 * Build in Native modules.
 */
var path = require('path')
  , fs = require('fs')
  , vm = require('vm')
  , tmp = require('tmp');

/**
 * Third party modules.
 */
var yaml = require('yamlparser');

/**
 * Local modules.
 */

function getKnown() {
  try {    
    var known = new Set();
    var old = require('./regexps');
    for (var type in old) {
      if (!old.hasOwnProperty(type)) continue;
      var group = old[type];
      for (var i = 0; i < group.length; i++) {
        var regex = group[i][0].source;
        known.add(regex);
      }
    }
    return known;
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') console.warn("Error parsing old regexps.js file.  Ignoring and continuing...", e)
    return null;
  }
}

var known = getKnown();

function isSafe(source) {
  if (!/[+*{].*[+*{]/.test(source)) return true; // -35%
  return false;
}

/**
 * Update the regexps.js file
 *
 * @param {Function} callback Completion callback.
 * @api public
 */
exports.update = function update(callback) {
  // Prepend local additions that are missing from the source
  fs.readFile(exports.before, 'utf8', function reading(err, before) {
    if (err) return callback(err);

    let pathToYaml = require.resolve(path.join('uap-core','regexes.yaml'));

    // Fetch the remote resource as that is frequently updated
    fs.readFile(pathToYaml, 'utf8', function loading(err, remote) {
      // request(exports.remote, function downloading(err, res, remote) {
      if (err) return callback(err);

      // Append get some local additions that are missing from the source
      fs.readFile(exports.after, 'utf8', function reading(err, after) {
        if (err) return callback(err);

        // Parse the contents
        exports.parse([ before, remote, after ], function parsing(err, results, source) {
          callback(err, results);

          if (!source || err) return;

          //
          // Save to a tmp file to avoid potential concurrency issues.
          //
          tmp.file({ mode: 0o644 }, function (err, tempFilePath) {
            if (err) return;
            fs.writeFile(tempFilePath, source, function idk(err) {
              if (err) return
              fs.rename(tempFilePath, exports.output, function(err) {
                if (err) {
                  fs.copyFile(tempFilePath, exports.output, function(err) {
                    if (err) return;
                    fs.unlink(tempFilePath, function() {});
                  });
                }
              });
            });
          });
        });
      });
    });
  });
};

/**
 * Parse the given sources.
 *
 * @param {Array} sources String versions of the source
 * @param {Function} callback completion callback
 * @api public
 */
exports.parse = function parse(sources, callback) {
  var unsafe = [];
  var results = {};

  var data = sources.reduce(function parser(memo, data) {
    // Try to repair some of the odd structures that are in the yaml files
    // before parsing it so we generate a uniform structure:

    // Normalize the Operating system versions:
    data = data.replace(/os_v([1-3])_replacement/gim, function replace(match, version) {
      return 'v'+ version +'_replacement';
    });

    // Make sure that we are able to parse the yaml string
    try { data = yaml.eval(data); }
    catch (e) {
      callback(e);
      callback = null;
      return memo;
    }

    // merge the data with the memo;
    Object.keys(data).forEach(function (key) {
      var results = data[key];
      memo[key] = memo[key] || [];

      for (var i = 0, l = results.length; i < l; i++) {
        memo[key].push(results[i]);
      }
    });

    return memo;
  }, {});

  [
      {
          resource: 'user_agent_parsers'
        , replacement: 'family_replacement'
        , name: 'browser'
      }
    , {
          resource: 'device_parsers'
        , replacement: 'device_replacement'
        , name: 'device'
      }
    , {
          resource: 'os_parsers'
        , replacement: 'os_replacement'
        , name: 'os'
      }
  ].forEach(function parsing(details) {
    results[details.resource] = results[details.resource] || [];

    var resources = data[details.resource]
      , resource
      , regex
      , parser
      , compiled;

    for (var i = 0, l = resources.length; i < l; i++) {
      resource = resources[i];
      regex = resource.regex;


      compiled = new RegExp(regex, resource.regex_flag);
      if (known && !known.has(compiled.source)) {
        // A quick check, regexes not matching those are clearly safe
        // This check excludes about 35% of all regexps we have
        if (!isSafe(compiled.source)) {
          unsafe.push(compiled.source);
        }
        known.add(compiled.source);
      }

      // We need to JSON stringify the data to properly add slashes escape other
      // kinds of crap in the RegularExpression. If we don't do thing we get
      // some illegal token warnings./(Linux)(?:[ /](\d+)\.(\d+)(?:\.(\d+)|)|)/

      // parser = 'parser = Object.create(null);\n';
      parser = '  [' + compiled.toString();

      // Check if we have replacement for the parsed family name
      if (resource[details.replacement]) {
        parser += ', "'+ resource[details.replacement].replace('"', '\\"') +'"';
      } else {
        parser += ', 0';
      }

      if (details.name === 'device') {
        if (resource.brand_replacement) {
          parser += ', "'+ resource.brand_replacement.replace('"', '\\"') +'"';
        } else if (resource.model_replacement) {
          parser += ', 0';
        }

        if (resource.model_replacement) {
          parser += ', "'+ resource.model_replacement.replace('"', '\\"') +'"';
        }
      } else {
        if (resource.v1_replacement) {
          parser += ', "'+ resource.v1_replacement.replace('"', '\\"') +'"';
        } else if (resource.v2_replacement || resource.v3_replacement) {
          parser += ', 0';
        }
  
        if (resource.v2_replacement) {
          parser += ', "'+ resource.v2_replacement.replace('"', '\\"') +'"';
        } else if (resource.v3_replacement) {
          parser += ', 0';
        }
  
        if (resource.v3_replacement) {
          parser += ', "'+ resource.v3_replacement.replace('"', '\\"') +'"';
        }
      }

      parser += ']';

      // parser += 'exports.'+ details.name +'['+ i +'] = parser;';
      results[details.resource].push(parser);
    }
  });

  // TODO: consider getting rid of these checks - we either need to scan the REs for REDoS vulnerabilities
  // ourselves OR consider uap-core to be trustworthy-enough.  (The latter seems fine)
  if (unsafe.length > 0) {
    console.log('There are new regexps! Here they are, one per line:');
    for (var i = 0; i < unsafe.length; i++) {
      console.log('  ' + unsafe[i]);
    }
    console.log('Those might be potentially unsafe and cause ReDoS.');
    console.log('Make sure to take them through Weideman\'s tool and to inspect them!');
    console.log('See https://github.com/NicolaasWeideman/RegexStaticAnalysis');
  }

  // Generate a correct format
  exports.generate(results, callback);
};

/**
 * Generate the regular expressions file source code.
 *
 * @param {Object} results The parsed result of the regexp.yaml.
 * @param {Function} callback Completion callback
 * @api public
 */
exports.generate = function generate(results, callback) {
  var regexps  = [
      '"use strict";'
    , exports.LEADER
    , 'exports.browser = ['
    , results.user_agent_parsers.join(',\n')
    , '];'

    , 'exports.device = ['
    , results.device_parsers.join(',\n')
    , '];'

    , 'exports.os = ['
    , results.os_parsers.join(',\n')
    , '];'
  ].join('\n\n');

  // Now that we have generated the structure for the RegExps export file we
  // need to validate that we created a JavaScript compatible file, if we would
  // write the file without checking it's content we could be breaking the
  // module.
  var sandbox = {
      exports: {} // Emulate a module context, so everything is attached here
  };

  // Crossing our fingers that it worked
  try { vm.runInNewContext(regexps, sandbox, 'validating.vm'); }
  catch (e) { return callback(e, null, regexps); }

  callback(undefined, sandbox.exports, regexps);
};

/**
 * The location of the ua-parser regexes yaml file.
 *
 * @type {String}
 * @api private
 */
exports.remote = process.env.USERAGENT_REMOTE ? process.env.USERAGENT_REMOTE : 'https://raw.githubusercontent.com/ua-parser/uap-core/master/regexes.yaml';

/**
 * The locations of our local regexes yaml files.
 *
 * @type {String}
 * @api private
 */
exports.before = path.resolve(__dirname, '..', 'static', 'user_agent.before.yaml');
exports.after = path.resolve(__dirname, '..', 'static', 'user_agent.after.yaml');

/**
 * The the output location for the generated regexps file
 *
 * @type {String}
 * @api private
 */
exports.output = path.resolve(__dirname, '..', 'lib', 'regexps.js');

/**
 * The leader that needs to be added so people know they shouldn't touch all the
 * things.
 *
 * @type {String}
 * @api private
 */
exports.LEADER = fs.readFileSync(path.join(__dirname, 'donotedit'), 'UTF-8');
