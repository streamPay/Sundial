const path = require('path')
const webpack = require('webpack')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const configConst = require('./const')

module.exports = {
    mode: "production",
    context: path.resolve(__dirname, '../'),
    entry: {
        vue: ['vue','vue-router','vue-resource','vuex'],
        // ui: ['jad-pc'],
        utils: ['lodash'],
    },
    output: {
        path: path.resolve('./dist', configConst.base, 'dll'),
        filename: '[name]-[hash:8].dll.js',
        library: '[name]_[hash:8]'
    },
    optimization: {
        minimize: true
    },
    plugins: [
        new CleanWebpackPlugin([path.join(configConst.base, 'dll')], {
            root: path.resolve(__dirname, '../dist'),
            verbose: true,
            dry: false
        }),
        new webpack.DllPlugin({
            path: path.resolve(__dirname, '../dist', configConst.base, 'dll', '[name].manifest.json'),
            name: '[name]_[hash:8]'
        })
    ],
    performance: {
        hints: false
    }
}
