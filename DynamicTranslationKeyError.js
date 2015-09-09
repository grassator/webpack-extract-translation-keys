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

function DynamicTranslationKeyError(module, expr) {
    Error.call(this);
    Error.captureStackTrace(this, DynamicTranslationKeyError);
    this.name = 'DynamicTranslationKeyError';
    this.message =
        ' @ line ' + expr.loc.start.line + ' column ' + expr.loc.start.column + '\n' +
        'Dynamic variable "' + expr.arguments[0].name +
        '" is not supported as a translation key';
    this.module = module;
}
module.exports = DynamicTranslationKeyError;

DynamicTranslationKeyError.prototype = Object.create(Error.prototype);
