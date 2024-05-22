'use strict';

const webpack = require('webpack');
const Plugin = require('../index.js');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

describe('Smoke test for the executable script', function() {
    afterEach(() => {
        if (fs.existsSync('test/output.js')) {
            fs.unlinkSync('test/output.js');
        }
        if (fs.existsSync('test/translation-keys.json')) {
            fs.unlinkSync('test/translation-keys.json');
        }
    });

    describe('when valid input and output file given', function() {
        const webpackConfig = {
            // entry varies per test
            output: {
                filename: 'output.js',
                path: path.join(__dirname, '../test/')
            },
            plugins: [
                new Plugin({
                    output: path.join(__dirname, 'translation-keys.json')
                }),
                new webpack.ProvidePlugin({'__': 'tranzlate'})
            ]
        };

        it('extracts the keys used in input file', done => {
            webpackConfig.entry = './test/data/simple.js';
            const expected = '{"test.key":"test.key"}';

            webpack(webpackConfig, (error) => {
                assert.equal(error, null);

                const content = fs.readFileSync('test/translation-keys.json').toString();
                assert.equal(content, expected);
                done();
            });
        });

        it('supports string literal concatenation in input file', done => {
            webpackConfig.entry = './test/data/string-concat.js';
            const expected = '{"test string concat":"test string concat"}';

            webpack(webpackConfig, (error) => {
                assert.equal(error, null);

                const content = fs.readFileSync('test/translation-keys.json').toString();
                assert.equal(content, expected);
                done();
            });
        });
    });
});
