const path = require('path')

module.exports = {
    //项目路径
    base: 'payFlow',
    //项目名称
    title: 'payFlow-ui',
    //不同环境下配置
    development: {//本地开发环境
        erpLoginUrl: '',
        apiUrl: ''
    },
    test: {//测试环境
        erpLoginUrl: '',
        apiUrl: ''
    },
    production: {//预发和线上环境
        erpLoginUrl: '',
        apiUrl: ''
    }
}