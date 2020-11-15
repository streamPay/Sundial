const path = require('path')
const conf = require('./build/config')
const configConst = require('./build/const')

module.exports = {
    publicPath: `./`,
    outputDir: path.join('dist', configConst.base),
    assetsDir: 'assets',
    pages: {
        index: {
            // page 的入口
            entry: 'src/main.js',
            // 模板来源
            template: 'src/index.html',
            // 在 dist/index.html 的输出
            filename: 'index.html',
            // 当使用 title 选项时，
            // template 中的 title 标签需要是 <title><%= htmlWebpackPlugin.options.title %></title>
            title: 'DAISO',
            // 在这个页面中包含的块，默认情况下会包含
            // 提取出来的通用 chunk 和 vendor chunk。
            chunks: ['index', 'main', 'vendors', 'vendors-chunk', 'manifest', 'components']
        }
    },
    lintOnSave: false,
    productionSourceMap: false,
    devServer: conf.devServer,
    configureWebpack: conf.configureWebpack
}