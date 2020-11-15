const cleanWebpackPlugin = require('clean-webpack-plugin')
const path = require('path')
const configConst = require('./const.js')

module.exports = {
    configureWebpack: {
        plugins: [
            new cleanWebpackPlugin([configConst.base], {
                root: path.resolve(__dirname, '../dist'),
                exclude: ['dll'],
                verbose: true
            })
        ]
    }
}