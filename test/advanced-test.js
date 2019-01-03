'use strict';

const webpack = require('webpack');
const Plugin = require('../index.js');
const path = require('path');
const assert = require('assert');
const fs = require('fs');
const rimraf = require('rimraf');

function sortObjectByKeyname(objectToSort) {
    return Object.keys(objectToSort)
        .sort()
        .reduce((r, k) => ((r[k] = objectToSort[k]), r), {});
}

function runWebpackConfig(
    webpackConfig,
    done,
    translationKeysPath,
    contentToCompare
) {
    webpack(webpackConfig, error => {
        assert.equal(error, null);
        const content = JSON.stringify(
            sortObjectByKeyname(
                JSON.parse(fs.readFileSync(translationKeysPath, 'utf8'))
            )
        );
        assert.equal(content, contentToCompare);
        done();
    });
}

describe('Smoke test for the executable script', function() {
    beforeEach(() => {
        fs.mkdirSync('test/modules');
        fs.mkdirSync('test/modules/moduleA');
        fs.mkdirSync('test/modules/moduleB');
        fs.mkdirSync('test/modules/moduleA/transformer');
        fs.writeFileSync(
            'test/modules/moduleA/index.js',
            `
require('./transformer/intermediate');

function moduleA() {
    return __('moduleA');
}
`
        );
        fs.writeFileSync(
            'test/modules/moduleB/index.js',
            `
function moduleB() {
    return __('moduleB');
}            
`
        );
        fs.writeFileSync(
            'test/modules/moduleA/transformer/intermediate.js',
            'require(\'./end\');'
        );
        fs.writeFileSync(
            'test/modules/moduleA/transformer/end.js',
            '__(\'end\');'
        );
    });

    afterEach(() => {
        rimraf.sync('test/modules');
    });

    describe('when advanced webpack configuration', function() {
        describe('with a single entry', function() {
            const webpackConfig = {
                entry: './test/modules/moduleA/index.js',
                output: {
                    filename: 'index.js',
                    path: path.join(__dirname, 'modules/moduleA')
                },
                plugins: [
                    new Plugin({
                        output: path.join(
                            __dirname,
                            'modules/moduleA/translation-keys.json'
                        )
                    })
                ]
            };

            it('works with a string', done => {
                runWebpackConfig(
                    webpackConfig,
                    done,
                    'test/modules/moduleA/translation-keys.json',
                    '{"end":"end","moduleA":"moduleA"}'
                );
            });

            it('works with an object with single key', done => {
                webpackConfig.entry = {
                    single: './test/modules/moduleA/index.js'
                };
                runWebpackConfig(
                    webpackConfig,
                    done,
                    'test/modules/moduleA/translation-keys.json',
                    '{"end":"end","moduleA":"moduleA"}'
                );
            });

            it('works with an object with single key and custom output for entry with [name]', done => {
                webpackConfig.output.filename = '[name]/index.js';
                webpackConfig.plugins = [
                    new Plugin({
                        output: path.join(
                            __dirname,
                            'modules/moduleA/[name]/translation-keys.json'
                        )
                    })
                ];
                runWebpackConfig(
                    webpackConfig,
                    done,
                    'test/modules/moduleA/single/translation-keys.json',
                    '{"end":"end","moduleA":"moduleA"}'
                );
            });
        });

        describe('with entry array', function() {
            const webpackConfig = {
                entry: [
                    './test/modules/moduleA/index.js',
                    './test/modules/moduleB/index.js'
                ],
                output: {
                    filename: 'index.js',
                    path: path.join(__dirname, 'modules')
                },
                plugins: [
                    new Plugin({
                        output: path.join(
                            __dirname,
                            'modules/translation-keys.json'
                        )
                    })
                ]
            };

            it('works with merging all keys', done => {
                runWebpackConfig(
                    webpackConfig,
                    done,
                    'test/modules/translation-keys.json',
                    '{"end":"end","moduleA":"moduleA","moduleB":"moduleB"}'
                );
            });
        });

        describe('with entry object with multiple keys', function() {
            const webpackConfig = {
                entry: {
                    moduleA: './test/modules/moduleA/index.js',
                    moduleB: './test/modules/moduleB/index.js'
                },
                output: {
                    filename: '[name]/index.js',
                    path: path.join(__dirname, 'modules')
                },
                plugins: [
                    new Plugin({
                        output: path.join(
                            __dirname,
                            'modules/translation-keys.json'
                        )
                    })
                ]
            };

            it('works with merging all keys', done => {
                runWebpackConfig(
                    webpackConfig,
                    done,
                    'test/modules/translation-keys.json',
                    '{"end":"end","moduleA":"moduleA","moduleB":"moduleB"}'
                );
            });

            it('works with splitting keys per entry', done => {
                webpackConfig.plugins = [
                    new Plugin({
                        output: path.join(
                            __dirname,
                            'modules/[name]/translation-keys.json'
                        )
                    })
                ];
                webpack(webpackConfig, error => {
                    assert.equal(error, null);
                    const contentA = JSON.stringify(
                        sortObjectByKeyname(
                            JSON.parse(
                                fs.readFileSync(
                                    'test/modules/moduleA/translation-keys.json',
                                    'utf8'
                                )
                            )
                        )
                    );
                    assert.equal(contentA, '{"end":"end","moduleA":"moduleA"}');
                    const contentB = JSON.stringify(
                        sortObjectByKeyname(
                            JSON.parse(
                                fs.readFileSync(
                                    'test/modules/moduleB/translation-keys.json',
                                    'utf8'
                                )
                            )
                        )
                    );
                    assert.equal(contentB, '{"moduleB":"moduleB"}');
                    done();
                });
            });
        });

        describe('with entry object with multiple keys and array value', function() {
            const webpackConfig = {
                entry: {
                    moduleA: [
                        './test/modules/moduleA/index.js',
                        'test/modules/moduleA/transformer/end.js'
                    ],
                    moduleB: './test/modules/moduleB/index.js'
                },
                output: {
                    filename: '[name]/index.js',
                    path: path.join(__dirname, 'modules')
                },
                plugins: [
                    new Plugin({
                        output: path.join(
                            __dirname,
                            'modules/translation-keys.json'
                        )
                    })
                ]
            };

            it('works with merging all keys', done => {
                runWebpackConfig(
                    webpackConfig,
                    done,
                    'test/modules/translation-keys.json',
                    '{"end":"end","moduleA":"moduleA","moduleB":"moduleB"}'
                );
            });

            it('works with splitting keys per entry', done => {
                webpackConfig.plugins = [
                    new Plugin({
                        output: path.join(
                            __dirname,
                            'modules/[name]/translation-keys.json'
                        )
                    })
                ];
                webpack(webpackConfig, error => {
                    assert.equal(error, null);
                    const contentA = JSON.stringify(
                        sortObjectByKeyname(
                            JSON.parse(
                                fs.readFileSync(
                                    'test/modules/moduleA/translation-keys.json',
                                    'utf8'
                                )
                            )
                        )
                    );
                    assert.equal(contentA, '{"end":"end","moduleA":"moduleA"}');
                    const contentB = JSON.stringify(
                        sortObjectByKeyname(
                            JSON.parse(
                                fs.readFileSync(
                                    'test/modules/moduleB/translation-keys.json',
                                    'utf8'
                                )
                            )
                        )
                    );
                    assert.equal(contentB, '{"moduleB":"moduleB"}');
                    done();
                });
            });
        });
    });
});
