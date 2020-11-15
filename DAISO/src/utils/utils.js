import BigNumber from 'bignumber.js'
import web3 from 'web3'
import _ from 'lodash'
import {tokenAddressOpt} from '@/components/constant/tokenAddress'
let commonExponent = new BigNumber(10).pow(18)

export function setMoney(val) {//往库中存取钱时需要*(10^18)
    let bigMoney = new BigNumber(val).times(commonExponent).toFixed()
    return bigMoney
}

export function getMoney(val) {//往库中查看钱时需要/(10^18)
    let bigMoney = new BigNumber(val).div(commonExponent).toFixed(4)
    return bigMoney
}

export function setMoneyWeb3(val) {//往库中存取钱时需要*(10^18),web3自带方法
    let bigMoney = web3.utils.toWei(val, 'ether')
    return bigMoney
}

export function filterAdressName(val) {//将长名字切割成...展示，默认前6位和后4位
    if (val && val.length > 10) {
        return val.substr(0, 6) + '...' + val.substr(val.length - 4, 4)
    } else {
        return val
    }
}

export function filterTokenAddress(val) {//将币种显示简称
    let text = val ? _.filter(tokenAddressOpt, {value: val})[0].label : ''
    return text
}

export function getMoneyWithUnit(val, tokenAddress) {//获取带单位的金额
    let money = getMoney(val)
    let unit = filterTokenAddress(tokenAddress)
    return `${money} ${unit}`
}