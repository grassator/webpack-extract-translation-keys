'use strict';

const alphabet = [];

for (var i = 32; i < 127; ++i) {
    // Remove the characters that require escaping
    if (i !== 34 && i !== 39 && i !== 92) {
        alphabet.push(String.fromCharCode(i));
    }
}

console.log(alphabet.length);

exports.create = function *() {
    var index = 0;
    while (true) { // eslint-disable-line
        var remainder = index++;
        var key = '';
        do {
            key = alphabet[remainder % alphabet.length] + key;
            remainder = (remainder / alphabet.length) | 0;
        } while (remainder);
        yield key;
    }
};

