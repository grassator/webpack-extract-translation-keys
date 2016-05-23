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
const create = require('../key-generator').create;

describe('Key Generator', function () {

    it('should be able to generate based on the incremental seed', function () {
        const keyGenerator = create();
        const key = keyGenerator.next().value;
        assert.equal(key.length, 1);
        assert.equal(key.charCodeAt(0), 32);
    });

    it('should be able to generate 2-char ', function () {
        const keyGenerator = create();
        var key;
        for (var i = 0; i < 93; ++i) {
            key = keyGenerator.next().value;
        }
        assert.equal(key.length, 2);
        assert.equal(key.charCodeAt(0), 33);
        assert.equal(key.charCodeAt(1), 32);
    });

});
