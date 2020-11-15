<template>
    <div
        id="pay-header"
        class="clearfix"
    >
        <div class="pull-left pt8 clearfix l34">
            <div class="pull-left bold">
                <!-- <i class="icon-statistics vm fs32" /> -->
                <img
                    src="../../assets/imgs/logo.png"
                    class="logo_pic"
                >
                <span class="vt ml8 fs24">{{ $t('header.DAISO') }}</span>
            </div>
            <div class="pull-left ml64 bold ">
                <router-link
                    to="/home"
                    class="l32"
                >
                    <span class="c-white"><i class="el-icon-s-home" /> {{ $t('header.home') }}</span>
                </router-link>
            </div>
            <div class="pull-left vt ml32">
                <el-select
                    size="mini"
                    class="w90"
                    v-model="currentLang"
                    @change="changeLang"
                    placeholder="Languages"
                >
                    <el-option
                        v-for="item in languageOpt"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                </el-select>
            </div>
        </div>
        <div class="pull-right">
            <el-button-group class="c-blue2">
                <el-button
                    round
                    class="w140"
                    icon="el-icon-s-marketing"
                >
                    <router-link
                        class="c-blue2"
                        to="/dashboard"
                    >
                        {{ $t('header.dash') }}
                    </router-link>
                </el-button>
                <el-button
                    class="w140"
                    icon="el-icon-notebook-2"
                >
                    <a
                        href="https://medium.com/@lichenguang62/streampay-kleros-daico-659e4e00145a"
                        target="_blank"
                        class="c-blue2"
                    >
                        {{ $t('header.docs') }}
                    </a>
                </el-button>
                <el-button
                    round
                    icon="el-icon-s-custom"
                >
                    {{ name | filterAdressName }}
                </el-button>
            </el-button-group>
        </div>
    </div>
</template>

<script>
import Web3 from 'web3'
import {filterAdressName} from '@/utils/utils.js'
export default {
    name: 'Header',
    data() {
        return {
            name: '',
            currentLang: this.$currentLang,
            languageOpt: [
                {
                    value: 'zh',
                    label: '中文'
                },
                {
                    value: 'en',
                    label: 'English'
                },
            ]
        }
    },
    created() {
        this.getUser()
        setTimeout(() =>{//防止页面持续刷新
            this.watchEnvChange()
        }, 2000)
    },
    filters: {
        filterAdressName,
    },
    methods: {
        changeLang(lang){
            if (lang == 'zh'){
                localStorage.setItem('streampayLang', 'zh')
                this.$i18n.locale = localStorage.getItem('streampayLang')
            } else if (lang == 'en') {
                localStorage.setItem('streampayLang', 'en')
                this.$i18n.locale = localStorage.getItem('streampayLang')
            }
        },
        getUser() {
            // this.web3.eth.getCoinbase((err, coinbase) => {
            //     this.name = coinbase
            // })
            this.web3.eth.getAccounts().then((val)=>{
                // console.log(val)
                this.name = val[0]
                this.$store.commit('updateData', {key: 'user', value: val[0]})
                this.$store.commit('updateData', {key: 'recipient', value: val[1]})
            })
        },
        watchEnvChange() {
            //监听账号的变化。
            window.ethereum.on('accountsChanged', (accounts) => {
                this.name = accounts[0];
                this.$store.commit('updateData', {key: 'user', value: accounts[0]})
                location.reload()
            });
            //监听网络
            window.ethereum.on('chainChanged', () => {
                location.reload()
            });
            //监听web3
            window.addEventListener('load', async () => {
                //新版web3检测metamask方式
                if (window.ethereum) {
                    // eslint-disable-next-line
                    window.web3 = new Web3(ethereum);
                    // eslint-disable-next-line
                    await ethereum.enable();
                }
                // 老版web3检测metamask方式
                else if (window.web3) {
                    // eslint-disable-next-line
                    window.web3 = new Web3(web3.currentProvider);
                }
                // metamask不存在
                else {
                    alert(this.$t('header.metamask'))
                }
            });
        }
    },
}
</script>
<style scoped>
.logo_pic{
    width: 30px;
    height: 30px;
}
</style>
