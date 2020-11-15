const typesConfig = require('./.cz-changelog/types.js')
let types = Object.keys(typesConfig)

module.exports = {
    parserPreset: './.cz-changelog/presetParser.js',
    rules: {
        'body-leading-blank': [1, 'always'],
        'header-max-length': [2, 'always', 72],
        'subject-case': [0, 'never', []],
        'subject-empty': [2, 'never'],
        'subject-full-stop': [2, 'never', '.'],
        'type-case': [2, 'always', 'lower-case'],
        'type-empty': [2, 'never'],
        'type-enum': [
            2,
            'always', types
        ]
    }
}