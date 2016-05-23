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

/**
 * @param {Object} options
 * @constructor
 */
function ExtractTranslationPlugin(options) {
    options = options || {};
    this.functionName = options.functionName || '__';
    this.done = options.done || function () {};
    this.output = typeof options.output === 'string' ? options.output : false;
    this.mangleKeys = options.mangle || false;
}

ExtractTranslationPlugin.prototype.apply = function(compiler) {
    var mangleKeys = this.mangleKeys;
    var keys = this.keys = mangleKeys ? Object.create(null) : [];
    var shortKeyName = ['a'.charCodeAt(0)];

    compiler.parser.plugin('call ' + this.functionName, function(expr) {
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

        if (mangleKeys) {
            if (key in keys) {
                value = keys[key];
            } else {
                // After this code point we run into surrogate pair namespace, but
                // if you have > 55000 keys in your SPA, you have other problems.
                if (shortKeyName >= 0xD800) {
                    this.state.module.errors.push(
                        new Error('Mangling of translation keys is only supported for ~55000 keys')
                    );
                    return false;
                }
                value = String.fromCharCode(shortKeyName++);
                keys[key] = value;
            }

            // This replaces the original string with the new string
            var dep = new ConstDependency(JSON.stringify(value), expr.arguments[0].range);
            dep.loc = expr.arguments[0].loc;
            this.state.current.addDependency(dep);
        } else {
            if (keys.indexOf(key) === -1) {
                keys.push(key);
            }
        }

        return false;
    });

    compiler.plugin('done', function() {
        this.done(this.keys);
        if (this.output) {
            require('fs').writeFileSync(this.output, JSON.stringify(this.keys));
        }
    }.bind(this));

    compiler.plugin('compilation', function(compilation) {
        compilation.dependencyFactories.set(ConstDependency, new NullFactory());
        compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
    });

};

module.exports = ExtractTranslationPlugin;
