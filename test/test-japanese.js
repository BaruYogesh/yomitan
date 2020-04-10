/*
 * Copyright (C) 2020  Yomichan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const assert = require('assert');
const {VM} = require('./yomichan-vm');

const vm = new VM();
vm.execute([
    'mixed/lib/wanakana.min.js',
    'mixed/js/japanese.js',
    'bg/js/text-source-map.js',
    'bg/js/japanese.js'
]);
const jp = vm.get('jp');
const TextSourceMap = vm.get('TextSourceMap');


function testIsCodePointKanji() {
    const data = [
        ['力方', true],
        ['\u53f1\u{20b9f}', true],
        ['かたカタ々kata、。？,.?', false]
    ];

    for (const [characters, expected] of data) {
        for (const character of characters) {
            const codePoint = character.codePointAt(0);
            const actual = jp.isCodePointKanji(codePoint);
            assert.strictEqual(actual, expected, `isCodePointKanji failed for ${character} (\\u{${codePoint.toString(16)}})`);
        }
    }
}

function testIsCodePointKana() {
    const data = [
        ['かたカタ', true],
        ['力方々kata、。？,.?', false],
        ['\u53f1\u{20b9f}', false]
    ];

    for (const [characters, expected] of data) {
        for (const character of characters) {
            const codePoint = character.codePointAt(0);
            const actual = jp.isCodePointKana(codePoint);
            assert.strictEqual(actual, expected, `isCodePointKana failed for ${character} (\\u{${codePoint.toString(16)}})`);
        }
    }
}

function testIsCodePointJapanese() {
    const data = [
        ['かたカタ力方々、。？', true],
        ['\u53f1\u{20b9f}', true],
        ['kata,.?', false]
    ];

    for (const [characters, expected] of data) {
        for (const character of characters) {
            const codePoint = character.codePointAt(0);
            const actual = jp.isCodePointJapanese(codePoint);
            assert.strictEqual(actual, expected, `isCodePointJapanese failed for ${character} (\\u{${codePoint.toString(16)}})`);
        }
    }
}

function testIsStringEntirelyKana() {
    const data = [
        ['かたかな', true],
        ['カタカナ', true],
        ['ひらがな', true],
        ['ヒラガナ', true],
        ['カタカナひらがな', true],
        ['かたカタ力方々、。？', false],
        ['\u53f1\u{20b9f}', false],
        ['kata,.?', false],
        ['かたカタ力方々、。？invalid', false],
        ['\u53f1\u{20b9f}invalid', false],
        ['kata,.?かた', false]
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.isStringEntirelyKana(string), expected);
    }
}

function testIsStringPartiallyJapanese() {
    const data = [
        ['かたかな', true],
        ['カタカナ', true],
        ['ひらがな', true],
        ['ヒラガナ', true],
        ['カタカナひらがな', true],
        ['かたカタ力方々、。？', true],
        ['\u53f1\u{20b9f}', true],
        ['kata,.?', false],
        ['かたカタ力方々、。？invalid', true],
        ['\u53f1\u{20b9f}invalid', true],
        ['kata,.?かた', true]
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.isStringPartiallyJapanese(string), expected);
    }
}

function testConvertKatakanaToHiragana() {
    const data = [
        ['かたかな', 'かたかな'],
        ['ひらがな', 'ひらがな'],
        ['カタカナ', 'かたかな'],
        ['ヒラガナ', 'ひらがな'],
        ['カタカナかたかな', 'かたかなかたかな'],
        ['ヒラガナひらがな', 'ひらがなひらがな'],
        ['chikaraちからチカラ力', 'chikaraちからちから力'],
        ['katakana', 'katakana'],
        ['hiragana', 'hiragana']
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.convertKatakanaToHiragana(string), expected);
    }
}

function testConvertHiraganaToKatakana() {
    const data = [
        ['かたかな', 'カタカナ'],
        ['ひらがな', 'ヒラガナ'],
        ['カタカナ', 'カタカナ'],
        ['ヒラガナ', 'ヒラガナ'],
        ['カタカナかたかな', 'カタカナカタカナ'],
        ['ヒラガナひらがな', 'ヒラガナヒラガナ'],
        ['chikaraちからチカラ力', 'chikaraチカラチカラ力'],
        ['katakana', 'katakana'],
        ['hiragana', 'hiragana']
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.convertHiraganaToKatakana(string), expected);
    }
}

function testConvertToRomaji() {
    const data = [
        ['かたかな', 'katakana'],
        ['ひらがな', 'hiragana'],
        ['カタカナ', 'katakana'],
        ['ヒラガナ', 'hiragana'],
        ['カタカナかたかな', 'katakanakatakana'],
        ['ヒラガナひらがな', 'hiraganahiragana'],
        ['chikaraちからチカラ力', 'chikarachikarachikara力'],
        ['katakana', 'katakana'],
        ['hiragana', 'hiragana']
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.convertToRomaji(string), expected);
    }
}

function testConvertReading() {
    const data = [
        [['アリガトウ', 'アリガトウ', 'hiragana'], 'ありがとう'],
        [['アリガトウ', 'アリガトウ', 'katakana'], 'アリガトウ'],
        [['アリガトウ', 'アリガトウ', 'romaji'], 'arigatou'],
        [['アリガトウ', 'アリガトウ', 'none'], null],
        [['アリガトウ', 'アリガトウ', 'default'], 'アリガトウ'],

        [['ありがとう', 'ありがとう', 'hiragana'], 'ありがとう'],
        [['ありがとう', 'ありがとう', 'katakana'], 'アリガトウ'],
        [['ありがとう', 'ありがとう', 'romaji'], 'arigatou'],
        [['ありがとう', 'ありがとう', 'none'], null],
        [['ありがとう', 'ありがとう', 'default'], 'ありがとう'],

        [['有り難う', 'ありがとう', 'hiragana'], 'ありがとう'],
        [['有り難う', 'ありがとう', 'katakana'], 'アリガトウ'],
        [['有り難う', 'ありがとう', 'romaji'], 'arigatou'],
        [['有り難う', 'ありがとう', 'none'], null],
        [['有り難う', 'ありがとう', 'default'], 'ありがとう'],

        // Cases with falsy readings

        [['ありがとう', '', 'hiragana'], ''],
        [['ありがとう', '', 'katakana'], ''],
        [['ありがとう', '', 'romaji'], 'arigatou'],
        [['ありがとう', '', 'none'], null],
        [['ありがとう', '', 'default'], ''],

        [['ありがとう', null, 'hiragana'], ''],
        [['ありがとう', null, 'katakana'], ''],
        [['ありがとう', null, 'romaji'], 'arigatou'],
        [['ありがとう', null, 'none'], null],
        [['ありがとう', null, 'default'], null],

        [['ありがとう', void 0, 'hiragana'], ''],
        [['ありがとう', void 0, 'katakana'], ''],
        [['ありがとう', void 0, 'romaji'], 'arigatou'],
        [['ありがとう', void 0, 'none'], null],
        [['ありがとう', void 0, 'default'], void 0],

        // Cases with falsy readings and kanji expressions

        [['有り難う', '', 'hiragana'], ''],
        [['有り難う', '', 'katakana'], ''],
        [['有り難う', '', 'romaji'], ''],
        [['有り難う', '', 'none'], null],
        [['有り難う', '', 'default'], ''],

        [['有り難う', null, 'hiragana'], ''],
        [['有り難う', null, 'katakana'], ''],
        [['有り難う', null, 'romaji'], null],
        [['有り難う', null, 'none'], null],
        [['有り難う', null, 'default'], null],

        [['有り難う', void 0, 'hiragana'], ''],
        [['有り難う', void 0, 'katakana'], ''],
        [['有り難う', void 0, 'romaji'], void 0],
        [['有り難う', void 0, 'none'], null],
        [['有り難う', void 0, 'default'], void 0]
    ];

    for (const [[expressionFragment, readingFragment, readingMode], expected] of data) {
        assert.strictEqual(jp.convertReading(expressionFragment, readingFragment, readingMode), expected);
    }
}

function testConvertNumericToFullWidth() {
    const data = [
        ['0123456789', '０１２３４５６７８９'],
        ['abcdefghij', 'abcdefghij'],
        ['カタカナ', 'カタカナ'],
        ['ひらがな', 'ひらがな']
    ];

    for (const [string, expected] of data) {
        assert.strictEqual(jp.convertNumericToFullWidth(string), expected);
    }
}

function testConvertHalfWidthKanaToFullWidth() {
    const data = [
        ['0123456789', '0123456789'],
        ['abcdefghij', 'abcdefghij'],
        ['カタカナ', 'カタカナ'],
        ['ひらがな', 'ひらがな'],
        ['ｶｷ', 'カキ', [1, 1]],
        ['ｶﾞｷ', 'ガキ', [2, 1]],
        ['ﾆﾎﾝ', 'ニホン', [1, 1, 1]],
        ['ﾆｯﾎﾟﾝ', 'ニッポン', [1, 1, 2, 1]]
    ];

    for (const [string, expected, expectedSourceMapping] of data) {
        const sourceMap = new TextSourceMap(string);
        const actual1 = jp.convertHalfWidthKanaToFullWidth(string, null);
        const actual2 = jp.convertHalfWidthKanaToFullWidth(string, sourceMap);
        assert.strictEqual(actual1, expected);
        assert.strictEqual(actual2, expected);
        if (typeof expectedSourceMapping !== 'undefined') {
            assert.ok(sourceMap.equals(new TextSourceMap(string, expectedSourceMapping)));
        }
    }
}

function testConvertAlphabeticToKana() {
    const data = [
        ['0123456789', '0123456789'],
        ['abcdefghij', 'あbcでfgひj', [1, 1, 1, 2, 1, 1, 2, 1]],
        ['ABCDEFGHIJ', 'あbcでfgひj', [1, 1, 1, 2, 1, 1, 2, 1]], // wanakana.toHiragana converts text to lower case
        ['カタカナ', 'カタカナ'],
        ['ひらがな', 'ひらがな'],
        ['chikara', 'ちから', [3, 2, 2]],
        ['CHIKARA', 'ちから', [3, 2, 2]]
    ];

    for (const [string, expected, expectedSourceMapping] of data) {
        const sourceMap = new TextSourceMap(string);
        const actual1 = jp.convertAlphabeticToKana(string, null);
        const actual2 = jp.convertAlphabeticToKana(string, sourceMap);
        assert.strictEqual(actual1, expected);
        assert.strictEqual(actual2, expected);
        if (typeof expectedSourceMapping !== 'undefined') {
            assert.ok(sourceMap.equals(new TextSourceMap(string, expectedSourceMapping)));
        }
    }
}

function testDistributeFurigana() {
    const data = [
        [
            ['有り難う', 'ありがとう'],
            [
                {text: '有', furigana: 'あ'},
                {text: 'り'},
                {text: '難', furigana: 'がと'},
                {text: 'う'}
            ]
        ],
        [
            ['方々', 'かたがた'],
            [
                {text: '方々', furigana: 'かたがた'}
            ]
        ],
        [
            ['お祝い', 'おいわい'],
            [
                {text: 'お'},
                {text: '祝', furigana: 'いわ'},
                {text: 'い'}
            ]
        ],
        [
            ['美味しい', 'おいしい'],
            [
                {text: '美味', furigana: 'おい'},
                {text: 'しい'}
            ]
        ],
        [
            ['食べ物', 'たべもの'],
            [
                {text: '食', furigana: 'た'},
                {text: 'べ'},
                {text: '物', furigana: 'もの'}
            ]
        ],
        [
            ['試し切り', 'ためしぎり'],
            [
                {text: '試', furigana: 'ため'},
                {text: 'し'},
                {text: '切', furigana: 'ぎ'},
                {text: 'り'}
            ]
        ],
        // Ambiguous
        [
            ['飼い犬', 'かいいぬ'],
            [
                {text: '飼い犬', furigana: 'かいいぬ'}
            ]
        ],
        [
            ['長い間', 'ながいあいだ'],
            [
                {text: '長い間', furigana: 'ながいあいだ'}
            ]
        ]
    ];

    for (const [[expression, reading], expected] of data) {
        const actual = jp.distributeFurigana(expression, reading);
        vm.assert.deepStrictEqual(actual, expected);
    }
}

function testDistributeFuriganaInflected() {
    const data = [
        [
            ['美味しい', 'おいしい', '美味しかた'],
            [
                {text: '美味', furigana: 'おい'},
                {text: 'し'},
                {text: 'かた'}
            ]
        ],
        [
            ['食べる', 'たべる', '食べた'],
            [
                {text: '食', furigana: 'た'},
                {text: 'べ'},
                {text: 'た'}
            ]
        ]
    ];

    for (const [[expression, reading, source], expected] of data) {
        const actual = jp.distributeFuriganaInflected(expression, reading, source);
        vm.assert.deepStrictEqual(actual, expected);
    }
}

function testIsMoraPitchHigh() {
    const data = [
        [[0, 0], false],
        [[1, 0], true],
        [[2, 0], true],
        [[3, 0], true],

        [[0, 1], true],
        [[1, 1], false],
        [[2, 1], false],
        [[3, 1], false],

        [[0, 2], true],
        [[1, 2], true],
        [[2, 2], false],
        [[3, 2], false],

        [[0, 3], true],
        [[1, 3], true],
        [[2, 3], true],
        [[3, 3], false],

        [[0, 4], true],
        [[1, 4], true],
        [[2, 4], true],
        [[3, 4], true]
    ];

    for (const [[moraIndex, pitchAccentPosition], expected] of data) {
        const actual = jp.isMoraPitchHigh(moraIndex, pitchAccentPosition);
        assert.strictEqual(actual, expected);
    }
}

function testGetKanaMorae() {
    const data = [
        ['かこ', ['か', 'こ']],
        ['かっこ', ['か', 'っ', 'こ']],
        ['カコ', ['カ', 'コ']],
        ['カッコ', ['カ', 'ッ', 'コ']],
        ['コート', ['コ', 'ー', 'ト']],
        ['ちゃんと', ['ちゃ', 'ん', 'と']],
        ['とうきょう', ['と', 'う', 'きょ', 'う']],
        ['ぎゅう', ['ぎゅ', 'う']],
        ['ディスコ', ['ディ', 'ス', 'コ']]
    ];

    for (const [text, expected] of data) {
        const actual = jp.getKanaMorae(text);
        vm.assert.deepStrictEqual(actual, expected);
    }
}


function main() {
    testIsCodePointKanji();
    testIsCodePointKana();
    testIsCodePointJapanese();
    testIsStringEntirelyKana();
    testIsStringPartiallyJapanese();
    testConvertKatakanaToHiragana();
    testConvertHiraganaToKatakana();
    testConvertToRomaji();
    testConvertReading();
    testConvertNumericToFullWidth();
    testConvertHalfWidthKanaToFullWidth();
    testConvertAlphabeticToKana();
    testDistributeFurigana();
    testDistributeFuriganaInflected();
    testIsMoraPitchHigh();
    testGetKanaMorae();
}


if (require.main === module) { main(); }
