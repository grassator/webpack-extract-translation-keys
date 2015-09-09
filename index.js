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

/**
 * @param {Object} options
 * @constructor
 */
function ExtractTranslationPlugin(options) {
    options = options || {};
    this.functionName = options.functionName || '__';
    this.done = options.done || function () {};
    this.output = typeof options.output === 'string' ? options.output : false;
}

ExtractTranslationPlugin.prototype.apply = function(compiler) {
    var keys = this.keys = [];

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

        if (keys.indexOf(key.string) === -1) {
            keys.push(key.string);
        }

        return false;
    });

    compiler.plugin('done', function() {
        this.done(this.keys);
        if (this.output) {
            require('fs').writeFileSync(this.output, JSON.stringify(this.keys));
        }
    }.bind(this));

};

module.exports = ExtractTranslationPlugin;
