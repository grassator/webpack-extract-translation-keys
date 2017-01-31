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

const assert = require('assert');
const Plugin = require('../index');
const bond = require('bondjs');
const DynamicTranslationKeyError = require('../DynamicTranslationKeyError');
const NoTranslationKeyError = require('../NoTranslationKeyError');

function createFakeCompiler() {
    return {
        plugin: bond(),
        parser: { plugin: bond() }
    };
}

function createContext() {
    return {
        state: {
            module: { errors: [] },
            current: { addDependency: bond() }
        },
        evaluateExpression: function (descriptor) {
            return {
                isString: function () {
                    return descriptor.type === 'string';
                },
                string: descriptor.value
            };
        }
    };
}

function createExpression(args) {
    return {
        arguments: args,
        loc: { start: { line: 0, column: 10 } }
    };
}

describe('Webpack Extract Translations Keys', function () {

    describe('normal mode', function () {

        it('should notify client with a list of keys when compiler is done', function () {
            const spy = bond();
            const pl = new Plugin({
                done: spy
            });
            const compiler = createFakeCompiler();
            pl.apply(compiler);
            // console.log('compiler and plugin', compiler.plugin.calledArgs);
            assert.equal(compiler.plugin.calledArgs[0][0], 'compilation');
            assert.equal(compiler.plugin.calledArgs[1][0], 'done');
            compiler.plugin.calledArgs[1][1]();
            assert.equal(spy.calledArgs[0][0], pl.keys);
        });

        it('should collect translation keys from the expressions', function () {
            const pl = new Plugin();
            const compiler = createFakeCompiler();
            pl.apply(compiler);
            compiler.plugin('compilation', function(compilation, params) {
                params.normalModuleFactory.plugin('parser', function(parser) {
                    const parserCallback = parser.plugin.calledArgs[0][1];
                    const ctx = createContext();

                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key1' }]));
                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key2' }]));
                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key3' }]));

                    assert.deepEqual(pl.keys, {'key1': 'key1', 'key2': 'key2', 'key3': 'key3'});
                });
            });
        });

        it('should eliminate duplicates when it collecting keys', function () {
            const pl = new Plugin();
            const compiler = createFakeCompiler();
            pl.apply(compiler);
            compiler.plugin('compilation', function(compilation, params) {
                params.normalModuleFactory.plugin('parser', function(parser) {
                    const parserCallback = parser.plugin.calledArgs[0][1];
                    const ctx = createContext();

                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key1' }]));
                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key1' }]));
                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key2' }]));

                    assert.deepEqual(pl.keys, {'key1': 'key1', 'key2': 'key2'});
                });
            });
        });

        it('should add an error to webpack when translate function does not contain any arguments', function () {
            const pl = new Plugin();
            const compiler = createFakeCompiler();
            pl.apply(compiler);
            compiler.plugin('compilation', function(compilation, params) {
                params.normalModuleFactory.plugin('parser', function(parser) {
                    const parserCallback = parser.plugin.calledArgs[0][1];
                    const expr = createExpression([]);
                    const ctx = createContext();
                    parserCallback.call(ctx, expr);
                    assert.equal(ctx.state.module.errors.length, 1);
                    assert(ctx.state.module.errors[0] instanceof NoTranslationKeyError);
                });
            });
        });

        it('should add an error to webpack when first argument of translate function is not a string', function () {
            const pl = new Plugin();
            const compiler = createFakeCompiler();
            pl.apply(compiler);
            compiler.plugin('compilation', function(compilation, params) {
                params.normalModuleFactory.plugin('parser', function(parser) {
                    const parserCallback = parser.plugin.calledArgs[0][1];
                    const ctx = createContext();
                    const arg = {
                        type: 'variable',
                        name: 'foo',
                        value: 'bar'
                    };
                    parserCallback.call(ctx, createExpression([arg]));
                    assert.equal(ctx.state.module.errors.length, 1);
                    assert(ctx.state.module.errors[0] instanceof DynamicTranslationKeyError);
                });
            });
        });

        it('should always return `false` from parser callback to allow further processing of expression', function () {
            const pl = new Plugin();
            const compiler = createFakeCompiler();
            pl.apply(compiler);
            compiler.plugin('compilation', function(compilation, params) {
                params.normalModuleFactory.plugin('parser', function(parser) {
                    const parserCallback = parser.plugin.calledArgs[0][1];
                    const ctx = createContext();

                    assert.equal(parserCallback.call(ctx, createExpression([])), false);

                    const incorrectArg = {
                        type: 'variable',
                        name: 'foo',
                        value: 'bar'
                    };
                    assert.equal(parserCallback.call(ctx, createExpression([incorrectArg])), false);

                    const correctArg = {
                        type: 'string',
                        name: 'foo',
                        value: 'bar'
                    };
                    assert.equal(parserCallback.call(ctx, createExpression([correctArg])), false);
                });
            });
        });
    });

    describe('mangling', function () {
        it('should create mapping from original string to a short one', function () {
            const pl = new Plugin({
                mangle: true
            });
            const compiler = createFakeCompiler();
            pl.apply(compiler);
            compiler.plugin('compilation', function(compilation, params) {
                params.normalModuleFactory.plugin('parser', function(parser) {
                    const parserCallback = parser.plugin.calledArgs[0][1];
                    const ctx = createContext();

                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key1' }]));
                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key2' }]));
                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key3' }]));

                    assert.deepEqual(pl.keys, {
                        'key1': ' ',
                        'key2': '!',
                        'key3': '#'
                    });
                });
            });
        });

        it('should correctly replace all the instances of a certain key with the same value', function () {
            const pl = new Plugin({
                mangle: true
            });
            const compiler = createFakeCompiler();
            pl.apply(compiler);
            compiler.plugin('compilation', function(compilation, params) {
                params.normalModuleFactory.plugin('parser', function(parser) {
                    const parserCallback = parser.plugin.calledArgs[0][1];
                    const ctx = createContext();

                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key1' }]));
                    parserCallback.call(ctx, createExpression([{ type: 'string', value: 'key1' }]));

                    assert.deepStrictEqual(
                        ctx.state.current.addDependency.calledArgs[0],
                        ctx.state.current.addDependency.calledArgs[1]
                    );
                });
            });
        });
    });

});
