module.exports = {
    presets: [
        '@vue/cli-plugin-babel/preset',
        '@babel/preset-env'
    ],
    env: {
        test: {
          presets: [
            ['@babel/preset-env', { 'targets': { 'node': 'current' } }],
          ],
        },
    },
}
