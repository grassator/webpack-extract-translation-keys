/*!
 Copyright 2015 Dmitriy Kubyshkin

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

'use strict';

var DynamicTranslationKeyError = require('./DynamicTranslationKeyError');
var NoTranslationKeyError = require('./NoTranslationKeyError');
var ConstDependency = require('webpack/lib/dependencies/ConstDependency');
var NullFactory = require('webpack/lib/NullFactory');
var KeyGenerator = require('./key-generator');

/**
 * @param {Object} options
 * @constructor
 */
function ExtractTranslationPlugin(options) {
    options = options || {};
    this.functionName = options.functionName || '__';
    this.done = options.done || function () {};
    this.output = typeof options.output === 'string' ? options.output : false;
    this.merge = options.merge || false;
    this.mangleKeys = options.mangle || false;
    this.prettyPrint = typeof options.prettyPrint === 'number' ? options.prettyPrint : 0;
}

ExtractTranslationPlugin.prototype.apply = function(compiler) {
    var mangleKeys = this.mangleKeys;
    var keys = this.keys = Object.create(null);
    var generator = KeyGenerator.create();
    var functionName = this.functionName;

    compiler.plugin('compilation', function(compilation, params) {

        params.normalModuleFactory.plugin('parser', function(parser) {

            parser.plugin('call ' + functionName, function(expr) {
                var key;
                if (!expr.arguments.length) {
                    this.state.module.errors.push(
                        new NoTranslationKeyError(this.state.module, expr)
                    );
                    return false;
                }

                key = this.evaluateExpression(expr.arguments[0]);
                if (!key.isString()) {
                    this.state.module.errors.push(
                        new DynamicTranslationKeyError(this.state.module, expr)
                    );
                    return false;
                }

                key = key.string;

                var value = expr.arguments[0].value;

                if (!(key in keys)) {
                    if (mangleKeys) {
                        value = generator.next().value;
                    }
                    keys[key] = value;
                }

                if (mangleKeys) {
                    // This replaces the original string with the new string
                    var dep = new ConstDependency(JSON.stringify(keys[key]), expr.arguments[0].range);
                    dep.loc = expr.arguments[0].loc;
                    this.state.current.addDependency(dep);
                }

                return false;
            });
        });

        compilation.dependencyFactories.set(ConstDependency, new NullFactory());
        compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
    });

    compiler.plugin('done', function() {
        this.done(this.keys);

        if (this.output) {
            var data = this.keys;
            var fs = require('fs');

            if (this.merge && fs.existsSync(this.output)) {
                data = Object.assign({}, data, require(this.output));
            }

            fs.writeFileSync(this.output, JSON.stringify(data, null, this.prettyPrint));
        }
    }.bind(this));
};

module.exports = ExtractTranslationPlugin;
