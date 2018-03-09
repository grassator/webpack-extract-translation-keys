'use strict';

const webpack = require('webpack');
const Plugin = require('../index.js');
const path = require('path');
const assert = require('assert');
const fs = require('fs');

describe('Smoke test for the executable script', function() {
    beforeEach(() => {
        fs.writeFileSync('test/test-data.js', 'const a = __(\'test.key\');');
    });

    afterEach(() => {
        fs.unlinkSync('test/test-data.js');
        if (fs.existsSync('test/output.js')) {
            fs.unlinkSync('test/output.js');
        }

        if (fs.existsSync('test/translation-keys.json')) {
            fs.unlinkSync('test/translation-keys.json');
        }
    });

    describe('when valid input and output file given', function() {
        it('extracts the keys used in input file', done => {
            const webpackConfig = {
                entry: './test/test-data.js',
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

            webpack(webpackConfig, (error) => {
                assert.equal(error, null);

                const content = fs.readFileSync('test/translation-keys.json').toString();
                assert.equal(content, '{"test.key":"test.key"}');
                done();
            });
        });
    });
});
