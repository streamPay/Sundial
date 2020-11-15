<template>
    <div class="pay-dashboard">
        <p class="title-lv1">
            {{ $t('cancelStream.streaminfo') }}
            <router-link to="/dashboard">
                <el-button
                    size="samll"
                    class="vm ml16"
                    circle
                    icon="el-icon-back"
                />
            </router-link>
        </p>
        <div class="panel minW1100">
            <div
                class="flex"
                style="justify-content:space-between;"
            >
                <div
                    style="margin-right:2vw;"
                >
                    <div
                        id="liquidfill"
                        style="width:550px;height:600px;"
                    />
                </div>
                <div style="flex:auto;">
                    <el-card>
                        <div
                            slot="header"
                            class="clearfix"
                        >
                            <span class="l40 bold fs18">{{ $t('cancelStream.details.info') }}</span>
                        </div>
                        <div>
                            <el-row class="t-c mb16">
                                <el-col :span="10">
                                    <el-tooltip :content="`点击复制：${info.sender}`">
                                        <el-button
                                            size="small"
                                            style="width:100%;"
                                            type="primary"
                                            class="senderText"
                                            :data-clipboard-text="info.sender"
                                            @click="copyText('senderText')"
                                            plain
                                        >
                                            {{ $t('cancelStream.info.sender') }}：{{ info.sender | filterAdressName }}
                                        </el-button>
                                    </el-tooltip>
                                </el-col>
                                <el-col :span="4">
                                    <i class="el-icon-d-arrow-right" />
                                </el-col>
                                <el-col :span="10">
                                    <el-tooltip :content="`点击复制：${info.recipient}`">
                                        <el-button
                                            size="small"
                                            style="width:100%;"
                                            type="primary"
                                            class="recipientText"
                                            :data-clipboard-text="info.recipient"
                                            @click="copyText('recipientText')"
                                            plain
                                        >
                                            {{ $t('cancelStream.info.recipient') }}：{{ info.recipient | filterAdressName }}
                                        </el-button>
                                    </el-tooltip>
                                </el-col>
                            </el-row>
<!--                            <p class="bold fs18 mb12">-->
<!--                                基本信息-->
<!--                            </p>-->
                            <el-row
                                class="mb16"
                            >
                                <el-col :span="24">
                                    <el-card shadow="never">
                                        <div v-if="activeTabName=='fixedFlowrate'">
                                            <p class="bold fs16">
                                                {{ $t('cancelStream.info.maxAmount') }}：<span class="normal break">{{ getMoney(addAmount) }}</span> {{ unit }}
                                            </p>
                                            <p class="bold fs16 mt8">
                                                {{ $t('cancelStream.info.ratepersecond') }}：<span class="normal break">{{ getMoney(info.ratePerSecond) }}</span> {{ unit }}
                                            </p>
                                        </div>
                                        <div v-else-if="activeTabName=='installmentWithDP'||activeTabName=='installment'">
                                            <p class="bold fs16">
                                                {{ $t('cancelStream.info.deposit') }}：<span class="normal break">{{ getMoney(info.deposit) }}</span> {{ unit }}
                                            </p>
                                            <p class="bold fs16 mt8">
                                                {{ $t('cancelStream.info.haveBeenPaidAmount') }}：<span class="normal break">{{ getMoney(this.total) }}</span> {{ unit }}
                                            </p>
                                        </div>
                                        <div v-else>
                                            <p class="bold fs16">
                                                {{ $t('cancelStream.info.deposit') }}：<span class="normal break">{{ getMoney(info.deposit) }}</span> {{ unit }}
                                            </p>
                                        </div>
                                        <p class="bold fs16 mt8">
                                            {{ $t('cancelStream.info.endOfsenderBalance') }}：<span class="normal break">{{ getMoney(senderBalance) }}</span> {{ unit }}
                                        </p>
                                        <p class="bold fs16 mt8">
                                            {{ $t('cancelStream.info.endOfrecipientBalance') }}：<span class="normal break">{{ getMoney(recipientBalance) }}</span> {{ unit }}
                                        </p>
                                        <p
                                            v-if="activeTabName=='installmentWithDP'"
                                            class="bold fs16 mt8"
                                        >
                                            {{ $t('cancelStream.info.downpayment') }}：<span class="normal break">{{ getMoney(this.downPaymentAmount) }}</span> {{ unit }}
                                        </p>
                                        <div v-if="activeTabName=='installmentWithDP'||activeTabName=='installment'">
                                            <p class="bold fs16 mt8">
                                                {{ $t('cancelStream.info.fees') }}：<span class="normal break">{{ getMoney(this.fees) }}</span> {{ unit }}
                                            </p>
                                            <p class="bold fs16 mt8">
                                                {{ $t('cancelStream.info.numbeOfInstallments') }}：<span class="normal break">{{ info.numberOfInstallments }}</span>
                                            </p>
                                            <p class="bold fs16 mt8">
                                                {{ $t('cancelStream.info.haveBeenNumberOfInstallment') }}：<span class="normal break">{{ this.haveBeenNumberOfInstallment }}</span>
                                            </p>
                                        </div>
                                        <p class="bold fs16 mt8">
                                            {{ $t('cancelStream.info.actualStopTime') }}：<span class="normal break">{{ timestamp|filterDate }}</span>
                                        </p>
                                    </el-card>
                                </el-col>
                            </el-row>
                            <p class="bold fs18 mb12">
                                {{ $t('cancelStream.info.duration') }}
                            </p>
                            <el-card shadow="never">
                                <div>
                                    <p class="bold">
                                        {{ $t('cancelStream.info.startTime') }}
                                    </p>
                                    <p class="bold fs18 my12">
                                        <i class="el-icon-watch" />
                                        <span>{{ info.startTime|filterDate }}</span>
                                    </p>
                                </div>
                                <div>
                                    <p class="bold mt20">
                                        {{ $t('cancelStream.info.stopTime') }}
                                    </p>
                                    <p class="bold fs18 my12">
                                        <i class="el-icon-watch" />
                                        <span>
                                            {{ activeTabName=='fixedFlowrate'?info.maxStopTime:info.stopTime|filterDate }}
                                        </span>
                                    </p>
                                </div>
                            </el-card>
                        </div>
                    </el-card>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import moment from 'moment'
import echarts from 'echarts'
import 'echarts-liquidfill'
import Clipboard from 'clipboard'
import {getMoney, filterAdressName, filterTokenAddress} from '@/utils/utils.js'
import {getInstance} from '../utils/connectContract'
import {mapState} from 'vuex'
import bignumber from 'bignumber.js'
let timer;
export default {
    name: 'CancelInfo',
    data() {
        return {
            streamId: '', //流ID
            activeTabName: '', //tab
            info: {},
            unit: '', //币种单位
            senderBalance: 0, //发送者余额
            recipientBalance: 0, //接收者余额
            cancelTime: 0,
            addAmount: 0,
            timestamp: 0,
            haveBeenNumberOfInstallment: 0,
            downPaymentAmount: 0,
            fees: 0,
            total: 0,
        }
    },
    filters: {
        filterAdressName,
        filterDate(val) {
            let date = moment(parseInt(val, 10), 'X').format('YYYY-MM-DD HH:mm:ss')
            return date
        },
    },
    created(){
        // this.getInfo()//获取流信息
    },
    async mounted(){
        this.streamId = this.$route.query.streamId//根据url参数获取流ID
        this.activeTabName = this.$route.query.activeTabName//根据url参数获取当前tab
        this.allInstance = await getInstance()
        await this.getInfo()//获取流信息
        this.unit = filterTokenAddress(this.info.tokenAddress)//获取币种单位
        let chart = echarts.init(document.getElementById('liquidfill'))
        await this.getBalance()
        this.initChart(chart)
    },
    beforeDestroy() {
        clearInterval(timer)
    },
    computed: {
        ...mapState(['user']),
    },
    methods: {
        getMoney,
        copyText(cla){//复制文本
            let that = this
            let clipboard = new Clipboard(`.${cla}`);
            clipboard.on('success', function () {
                that.$message({
                    type: 'success',
                    message: 'Copy Success!'
                })
                clipboard.destroy()
            });
            clipboard.on('error', function () {
                that.$message({
                    type: 'error',
                    message: 'Copy Failure!'
                })
                clipboard.destroy()
            });
        },
        async initChart(chart){
            let res
            if (this.activeTabName == 'sablier'){
                this.total = this.info.deposit
            } else if (this.activeTabName == 'fixedFlowrate') {
                this.total = this.addAmount
            } else if (this.activeTabName == 'installment'){
                res = await this.allInstance.installmentInstance.getPastEvents('TransferWithInstallment', {filter: {streamId: this.streamId}, fromBlock: 0})
                if (res.length != 0){
                    this.total = res[res.length - 1].returnValues.haveBeenPaidAmount
                    this.haveBeenNumberOfInstallment = res[res.length - 1].returnValues.haveBeenNumberOfInstallment
                } else {
                    this.total = this.info.haveBeenPaidAmount
                    this.haveBeenNumberOfInstallment = 1
                }
            } else {
                res = await this.allInstance.installmentWithDPInstance.getPastEvents('TransferWithDP', {filter: {streamId: this.streamId}, fromBlock: 0})
                if (res.length != 0){
                    this.total = res[res.length - 1].returnValues.haveBeenPaidAmount
                    this.haveBeenNumberOfInstallment = res[res.length - 1].returnValues.haveBeenNumberOfInstallment
                } else {
                    this.total = this.info.haveBeenPaidAmount
                    this.haveBeenNumberOfInstallment = 1
                }
            }
            let flowedPer = (getMoney(this.total) - getMoney(this.senderBalance)) / getMoney(this.total)

            let option = {
                title: {
                    text: this.$t('cancelStream.info.endedStreamed'),
                    // subtext: '',
                },
                series: [{
                    type: 'liquidFill',
                    data: [flowedPer, flowedPer],
                    radius: '90%',
                    name: this.$t('cancelStream.info.endedStreamed'),
                }],
                tooltip: {
                    show: true,
                    formatter: '{a}:' + flowedPer * 100 + '%'
                },
            }
            chart.setOption(option)
        },
        async getInfo(){//请求流详情数据
            let res
            if (this.activeTabName == 'sablier'){
                res = await this.allInstance.sablierInstance.getPastEvents('CreateStream', {filter: {streamId: this.streamId}, fromBlock: 0})
            } else if (this.activeTabName == 'fixedFlowrate') {
                res = await this.allInstance.fixedFlowrateInstance.getPastEvents('CreateFixedFlowrateStream', {filter: {streamId: this.streamId}, fromBlock: 0})
                this.addAmount = res[0].returnValues.maxAmount
                await this.allInstance.fixedFlowrateInstance.getPastEvents('TransferWithFixedFlowrate', {filter: {streamId: this.streamId}, fromBlock: 0},
                    async (error, events) =>{
                        for (let i = 0; i < events.length; i++){
                            this.addAmount = new bignumber(this.addAmount).plus(events[i].returnValues.amount)
                        }
                    })
            } else if (this.activeTabName == 'installment') {
                res = await this.allInstance.installmentInstance.getPastEvents('CreateInstallmentStream', {filter: {streamId: this.streamId}, fromBlock: 0})
                this.fees = new bignumber(res[0].returnValues.installmentAmountWithFees).minus(res[0].returnValues.deposit)

            } else if (this.activeTabName == 'installmentWithDP') {
                res = await this.allInstance.installmentWithDPInstance.getPastEvents('CreateInstallmentWithDPStream', {filter: {streamId: this.streamId}, fromBlock: 0})
                let downPaymentRatio = res[0].returnValues.downPaymentRatio / 100
                this.downPaymentAmount = new bignumber(res[0].returnValues.deposit).multipliedBy(downPaymentRatio)
                this.fees = new bignumber(res[0].returnValues.deposit).minus(this.downPaymentAmount)
                this.fees = new bignumber(res[0].returnValues.installmentAmountWithFees).minus(this.fees)
            }
            this.info = await res[0].returnValues
        },
        async getBalance(){//获取发送/接收者余额
            let res;
            if (this.activeTabName == 'sablier'){
                res = await this.allInstance.sablierInstance.getPastEvents('CancelStream', {filter: {streamId: this.streamId}, fromBlock: 0})
            } else if (this.activeTabName == 'fixedFlowrate') {
                res = await this.allInstance.fixedFlowrateInstance.getPastEvents('CancelFixedFlowrateStream', {filter: {streamId: this.streamId}, fromBlock: 0})
            } else if (this.activeTabName == 'installment') {
                res = await this.allInstance.installmentInstance.getPastEvents('CancelInstallmentStream', {filter: {streamId: this.streamId}, fromBlock: 0})
            } else if (this.activeTabName == 'installmentWithDP') {
                res = await this.allInstance.installmentWithDPInstance.getPastEvents('CancelInstallmentWithDPStream', {filter: {streamId: this.streamId}, fromBlock: 0})
            }
            this.senderBalance = res[0].returnValues.senderBalance
            this.recipientBalance = res[0].returnValues.recipientBalance
            this.timestamp = res[0].returnValues.timestamp
        },
    },
}
</script>
<style scoped>
.info-babel{
    width: 110px;
    display: inline-block;
    text-align: right;
}
</style>
