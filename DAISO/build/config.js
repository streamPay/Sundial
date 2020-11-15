const path = require('path')
const fs = require('fs')
const merge = require('webpack-merge')
const webpack = require('webpack')
const shajs = require('sha.js')
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin')

const confDev = require('./config.dev.js')
const confProd = require('./config.prod.js')

//获取打包参数
let argv = getArgv(process)

//根据不同环境获取const配置
let configConst = require('./const.js')
configConst = Object.assign(configConst,configConst[argv.type])

//动态插入打包好的dll包
let dllPlugins = []
if(process.argv.indexOf('--dll') != -1){
    //--dll说明需要使用打包后的dll包
    try{
        const dllFiles = fs.readdirSync(path.resolve(__dirname, '../dist', configConst.base, 'dll'))
        dllFiles.forEach(file => {
            if(/.*\.dll\.js/.test(file)){
                dllPlugins.push(
                    new AddAssetHtmlPlugin({
                        // dll文件位置
                        filepath: path.resolve(__dirname,'../dist',configConst.base,'dll',file),
                        // dll 引用路径
                        publicPath: path.join('./', 'dll'),
                        // dll最终输出的目录
                        outputPath: path.join('../', configConst.base, 'dll'),
                    }) 
                )
            }
            if(/.*\.manifest\.json/.test(file)){
                dllPlugins.push(
                    new webpack.DllReferencePlugin({
                        manifest:  require(path.resolve(__dirname, '../dist', configConst.base, 'dll', file))
                    })
                )
            }
        })
    }
    catch(e){
        console.error('\x1B[44m 提示: \x1B[49m', '\x1B[34m请先npm run dll\x1B[39m')
        throw e
    }
}

let conf = {
    configureWebpack: {
        externals: {
            //不打包前后台公共组件
            JztNavCommon: 'JztNavCommon',
            JztManagementCommon: 'JztManagementCommon',
        },
        plugins: [
            new webpack.DefinePlugin({
                '$erpLoginUrl': JSON.stringify(configConst.erpLoginUrl),
                '$apiUrl': JSON.stringify(configConst.apiUrl),
            })
        ].concat(dllPlugins),
        optimization: {
            runtimeChunk: {
                name: 'manifest'
            },
            splitChunks: {
                cacheGroups: {
                    nodeModules: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'initial',
                        enforce: true
                    },

                    'nodeModules-chunk': {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors-chunk',
                        chunks: 'async'
                    },
                    components: {
                        reuseExistingChunk: true,
                        test: m => {
                            if (m.constructor.name != "NormalModule") return false
                            return /[\\/]src\/components\/.+\.vue/.test(m.nameForCondition())
                        },
                        name: 'components',
                        chunks: 'all'
                    },
                    main: {
                        reuseExistingChunk: true,
                        test: m => {
                            return (m.constructor.name != "CssModule") && /[\\/]src[\\/]/.test(m.identifier())
                        },
                        name: m => {
                            let relativePath = path.relative(`/${configConst.base}`, m.nameForCondition())
                            let name = relativePath.split('.')[0].replace(/\//g, '_')
                            return 'main-' + shajs('sha256').update(name).digest('hex').slice(0, 4)
                        },
                        chunks: 'async'
                    }
                }
            }
        }
    }
}

module.exports = (()=>{
    let env = process.env.NODE_ENV
    let envConf = env === 'development' ?  confDev : confProd
    configureWebpack = merge(conf.configureWebpack,envConf.configureWebpack)
    return Object.assign(conf,envConf,{configureWebpack})
})()

//获取并处理process参数
function getArgv(process) {
    let argv = {}
    for (let i = 0; i < process.argv.length; i++) {
        if (process.argv[i].substr(0, 2) == '--') {
            if (i + 1 < process.argv.length && process.argv[i + 1].substr(0, 2) != '--') {
                argv[process.argv[i].substr(2)] = process.argv[i + 1]
            } else {
                argv[process.argv[i].substr(2)] = true
            }
        }
    }
    return argv
}
