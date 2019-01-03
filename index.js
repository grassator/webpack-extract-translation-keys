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

const DynamicTranslationKeyError = require('./DynamicTranslationKeyError');
const NoTranslationKeyError = require('./NoTranslationKeyError');
const ConstDependency = require('webpack/lib/dependencies/ConstDependency');
const NullFactory = require('webpack/lib/NullFactory');
const path = require('path');
const KeyGenerator = require('./key-generator');

// resolve entry for given module, we try to exit early with rawRequest in case of multiple modules issuing request
function resolveEntry(module, reverseEntryPoints) {
    let issuer = module;
    if (reverseEntryPoints[issuer.rawRequest]) {
        return issuer.rawRequest;
    }
    while (issuer.issuer) {
        issuer = issuer.issuer;
        if (reverseEntryPoints[issuer.rawRequest]) {
            return issuer.rawRequest;
        }
    }
    return issuer.rawRequest;
}

/**
 * @param {Object} options
 * @constructor
 */
function ExtractTranslationPlugin(options) {
    options = options || {};
    this.functionName = options.functionName || '__';
    this.done = options.done || function() {};
    this.output = typeof options.output === 'string' ? options.output : false;
    this.mangleKeys = options.mangle || false;
}

ExtractTranslationPlugin.prototype.apply = function(compiler) {
    const mangleKeys = this.mangleKeys;
    const outputMap = (this.outputMap = new Map());
    const generator = KeyGenerator.create();
    const functionName = this.functionName;

    let entryPoints = {};
    let reverseEntryPoints = {};

    compiler.hooks.compilation.tap('WebpackExtractTranslationKeys', function(
        compilation
    ) {
        compilation.dependencyFactories.set(ConstDependency, new NullFactory());
        compilation.dependencyTemplates.set(
            ConstDependency,
            new ConstDependency.Template()
        );

        // prepare entryPoints in case of non object syntax
        entryPoints = compilation.options.entry;
        if (typeof entryPoints === 'string' || Array.isArray(entryPoints)) {
            entryPoints = { main: entryPoints };
        }

        // prepare reverseEntryPoints object for entry resolution of given module
        reverseEntryPoints = Object.keys(entryPoints).reduce(
            (reverseEntryPointsAcc, name) => {
                let entryPoint = entryPoints[name];
                if (!Array.isArray(entryPoint)) {
                    entryPoint = [entryPoint];
                }
                entryPoint.reduce((acc, curr) => {
                    acc[curr] = name;
                    return acc;
                }, reverseEntryPointsAcc);
                return reverseEntryPointsAcc;
            },
            {}
        );
    });

    compiler.hooks.normalModuleFactory.tap(
        'WebpackExtractTranslationKeys',
        function(factory) {
            factory.hooks.parser
                .for('javascript/auto')
                .tap('WebpackExtractTranslationKeys', function(parser) {
                    parser.hooks.call
                        .for(functionName)
                        .tap('WebpackExtractTranslationKeys', function(expr) {
                            let key;

                            if (!expr.arguments.length) {
                                parser.state.module.errors.push(
                                    new NoTranslationKeyError(
                                        parser.state.module,
                                        expr
                                    )
                                );
                                return false;
                            }

                            key = parser.evaluateExpression(expr.arguments[0]);
                            if (!key.isString()) {
                                parser.state.module.errors.push(
                                    new DynamicTranslationKeyError(
                                        parser.state.module,
                                        expr
                                    )
                                );
                                return false;
                            }

                            key = key.string;

                            let value = expr.arguments[0].value;

                            const entry =
                                reverseEntryPoints[
                                    resolveEntry(
                                        parser.state.module,
                                        reverseEntryPoints
                                    )
                                ];

                            const entryKeys = outputMap.get(entry) || {};
                            if (!(key in entryKeys)) {
                                if (mangleKeys) {
                                    value = generator.next().value;
                                }
                                entryKeys[key] = value;
                                outputMap.set(entry, entryKeys);
                            }

                            if (mangleKeys) {
                                // This replaces the original string with the new string
                                const dep = new ConstDependency(
                                    JSON.stringify(value),
                                    expr.arguments[0].range
                                );
                                dep.loc = expr.arguments[0].loc;
                                parser.state.current.addDependency(dep);
                            }

                            return false;
                        });
                });
        }
    );

    compiler.hooks.done.tap(
        'WebpackExtractTranslationKeys',
        function() {
            if (
                typeof this.output === 'string' &&
                this.output.includes('[name]')
            ) {
                this.done(this.outputMap);
                this.outputMap.forEach((value, key) => {
                    require('fs').writeFileSync(
                        path.resolve(this.output.replace(/\[name\]/g, key)),
                        JSON.stringify(value)
                    );
                });
            } else {
                const keys = Array.from(this.outputMap.values()).reduce(
                    (allKeys, currKeys) => Object.assign({}, allKeys, currKeys),
                    {}
                );
                this.done(keys);
                if (this.output) {
                    require('fs').writeFileSync(
                        this.output,
                        JSON.stringify(keys)
                    );
                }
            }
        }.bind(this)
    );
};

module.exports = ExtractTranslationPlugin;
