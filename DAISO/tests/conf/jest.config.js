// module.exports = {
//     preset: '@vue/cli-plugin-unit-jest'
// }

const path = require('path')
const coverage = require('./coverage')

module.exports = {
  rootDir: path.resolve(__dirname,'../../'),
  moduleFileExtensions: [
    'js',
    'jsx',
    'json',
    'vue',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.jsx?$': require.resolve('babel-jest'),
    '.*\\.(vue)$': require.resolve('vue-jest'),
    '.+\\.(css|styl|less|sass|scss|svg|png|jpg|ttf|woff|woff2)$':
    require.resolve('jest-transform-stub'),
  },
  transformIgnorePatterns: ['/node_modules/'],
  testEnvironment: 'jest-environment-jsdom-fifteen',
  testURL: 'http://localhost/',
  watchPlugins: [
    require.resolve('jest-watch-typeahead/filename'),
    require.resolve('jest-watch-typeahead/testname')
  ],
  snapshotSerializers: [
    'jest-serializer-vue',
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: ['<rootDir>/src/**/*.{js,vue}'],
  coveragePathIgnorePatterns: coverage.coveragePathIgnorePatterns,
  coverageReporters: ['lcov','json','text-summary'],
  testRegex:'(/__test-ui__/.*|(\\.|/)(test|spec))\\.jsx?$',
}

