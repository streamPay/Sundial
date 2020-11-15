import '@/assets/scss/reset.scss'
import '@/assets/scss/common.scss'
import '@/assets/scss/layout.scss'
import '@/assets/scss/font.scss'

import zhLang from '@/lang/zh'
import enLang from '@/lang/en'

import Vue from 'vue'
import VueResource from 'vue-resource'
import router from './router'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import store from './store'
import App from './App.vue'
import web3 from './utils/web3'
import VueI18n from 'vue-i18n'

Vue.use(VueResource)
Vue.use(ElementUI)
Vue.use(VueI18n)

Vue.prototype.web3 = web3
Vue.config.productionTip = false
//中英文语言切换
let currentLang = localStorage.getItem('streampayLang')
Vue.prototype.$currentLang = currentLang
const i18n = new VueI18n({
    locale: currentLang, // 语言标识:动态获取本地语言缓存
    messages: {
        'zh': zhLang,
        'en': enLang
    }
})

new Vue({
    router,
    store,
    i18n,
    render: h => h(App)
}).$mount('#app')
