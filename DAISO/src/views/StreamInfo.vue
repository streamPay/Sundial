<template>
    <div class="pay-dashboard">
        <p class="title-lv1">
            {{ $t('streamInfo.streaminfo') }}
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
                            <div v-if="activeTabName=='Projects' || activeTabName=='MyProjects'">
                                <span class="l40 bold fs18">{{ $t('streamInfo.details.projectinfo') }}</span>
                            </div>
                            <div v-else>
                                <span class="l40 bold fs18">{{ $t('streamInfo.details.investInfo') }}</span>
                            </div>
                            <div class="pull-right">
                                <el-button
                                    v-if="activeTabName=='Projects'"
                                    type="primary"
                                    round
                                    size="medium"
                                    @click="invest"
                                >
                                    {{ $t('streamInfo.details.invest') }}
                                </el-button>
                                <el-button
                                    v-if="activeTabName=='MyProjects' || activeTabName=='Streams'"
                                    type="success"
                                    round
                                    size="medium"
                                    @click="withdraw"
                                >
                                    {{ $t('streamInfo.details.withdrawl') }}
                                </el-button>
                                <el-button
                                    v-if="activeTabName=='MyProjects' || activeTabName=='Streams'"
                                    type="danger"
                                    round
                                    size="medium"
                                    @click="cancel"
                                >
                                    {{ $t('streamInfo.details.cancel') }}
                                </el-button>
                                <el-button
                                    v-if="activeTabName=='Streams'"
                                    type="primary"
                                    round
                                    size="medium"
                                    @click="arbitrate"
                                >
                                    {{ $t('streamInfo.details.arbitrate') }}
                                </el-button>
                                <creat-arbitrate
                                        :show-modal="showModal"
                                        :projectId="projectId"
                                        :sender="sender"
                                        from="streamInfo"
                                        @close="closeModal"
                                />
                            </div>
                        </div>
                        <div>
                            <el-row class="t-c mb16">
                                <el-col :span="10">
                                    <el-tooltip :content="$t('streamInfo.info.copy',{who:info.sender})">
                                        <el-button
                                            size="small"
                                            style="width:100%;"
                                            type="primary"
                                            class="senderText"
                                            :data-clipboard-text="info.sender"
                                            @click="copyText('senderText')"
                                            plain
                                        >
                                            {{ $t('streamInfo.info.sender') }}：{{ info.sender | filterAdressName }}
                                        </el-button>
                                    </el-tooltip>
                                </el-col>
                                <el-col :span="4">
                                    <i class="el-icon-d-arrow-right" />
                                </el-col>
                                <el-col :span="10">
                                    <div v-if="activeTabName=='Projects' || activeTabName=='MyProjects'">
                                        <el-tooltip>
                                            <el-button
                                                size="small"
                                                style="width:100%;"
                                                type="primary"
                                                class="recipientText"
                                                :data-clipboard-text="info.projectId"
                                                @click="copyText('recipientText')"
                                                plain
                                            >
                                                {{ $t('streamInfo.info.projectId') }}：{{ this.projectId}}
                                            </el-button>
                                        </el-tooltip>
                                    </div>
                                    <div v-else>
                                        <el-tooltip>
                                            <el-button
                                                    size="small"
                                                    style="width:100%;"
                                                    type="primary"
                                                    class="recipientText"
                                                    :data-clipboard-text="info.projectId"
                                                    @click="copyText('recipientText')"
                                                    plain
                                            >
                                                {{ $t('streamInfo.info.projectId') }}：{{ info.projectId}}
                                            </el-button>
                                        </el-tooltip>
                                    </div>
                                </el-col>
                            </el-row>

                            <el-row
                                class="mb16"
                            >
                                <el-col :span="24">
                                    <el-card shadow="never">
                                        <div v-if="activeTabName=='Streams'">
                                            <p class="bold fs16">
                                                {{ $t('streamInfo.info.investSellDeposit') }}：<span class="normal break">{{ getMoney(info.investSellDeposit) }}</span> {{ fundTokenAddress }}
                                            </p>
                                            <p class="bold fs16">
                                                {{ $t('streamInfo.info.investFundDeposit') }}：<span class="normal break">{{ getMoney(info.investFundDeposit) }}</span> {{ sellTokenAddress }}
                                            </p>
                                            <p class="bold fs16">
                                                {{ $t('streamInfo.info.investWithdrawalAmount') }}：<span class="normal break">{{ getMoney(info.investWithdrawalAmount) }}</span> {{ sellTokenAddress }}
                                            </p>
                                            <p class="bold fs16 mt8">
                                                {{ $t('streamInfo.info.sellBalance') }}：<span class="normal break">{{ getMoney(sellBalance) }}</span> {{ fundTokenAddress }}
                                            </p>
                                            <p class="bold fs16 mt8">
                                                {{ $t('streamInfo.info.fundBalance') }}：<span class="normal break">{{ getMoney(fundBalance) }}</span> {{ sellTokenAddress }}
                                            </p>
                                        </div>
                                        <div v-else>
                                            <p class="bold fs16">
                                                {{ $t('streamInfo.info.projectSellDeposit') }}：<span class="normal break">{{ getMoney(info.projectSellDeposit) }}</span> {{ sellTokenAddress }}
                                            </p>
                                            <p class="bold fs16">
                                                {{ $t('streamInfo.info.projectFundDeposit') }}：<span class="normal break">{{ getMoney(info.projectFundDeposit) }}</span> {{ fundTokenAddress }}
                                            </p>
                                            <p class="bold fs16">
                                                {{ $t('streamInfo.info.projectActualSellDeposit') }}：<span class="normal break">{{ getMoney(info.projectActualSellDeposit) }}</span> {{ sellTokenAddress }}
                                            </p>
                                            <p class="bold fs16">
                                                {{ $t('streamInfo.info.projectActualFundDeposit') }}：<span class="normal break">{{ getMoney(info.projectActualFundDeposit) }}</span> {{ fundTokenAddress }}
                                            </p>
                                            <p class="bold fs16">
                                                {{ $t('streamInfo.info.projectWithdrawalAmount') }}：<span class="normal break">{{ getMoney(info.projectWithdrawalAmount) }}</span> {{ fundTokenAddress }}
                                            </p>
                                            <p class="bold fs16 mt8">
                                                {{ $t('streamInfo.info.sellBalance') }}：<span class="normal break">{{ getMoney(sellBalance) }}</span> {{ sellTokenAddress }}
                                            </p>
                                            <p class="bold fs16 mt8">
                                                {{ $t('streamInfo.info.fundBalance') }}：<span class="normal break">{{ getMoney(fundBalance) }}</span> {{ fundTokenAddress }}
                                            </p>
                                        </div>
                                    </el-card>
                                </el-col>
                            </el-row>
                            <el-card shadow="never">
                                <div>
                                    <p class="bold">
                                        {{ $t('streamInfo.info.startTime') }}
                                    </p>
                                    <p class="bold fs18 my12">
                                        <i class="el-icon-watch" />
                                        <span>{{ info.startTime|filterDate }}</span>
                                    </p>
                                </div>
                                <div>
                                    <p class="bold mt20">
                                        {{ $t('streamInfo.info.stopTime') }}
                                    </p>
                                    <p class="bold fs18 my12">
                                        <i class="el-icon-watch" />
                                        <span>{{ info.stopTime|filterDate }}</span>
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
import {setMoneyWeb3, getMoney, filterAdressName, filterTokenAddress} from '@/utils/utils.js'
import {getInstance} from '../utils/connectContract'
import {mapState} from 'vuex'
import bignumber from 'bignumber.js'
import CreatArbitrate from '@/components/qualification/CreatArbitrate.vue'

let timer;
export default {
    name: 'StreamInfo',
    components: {
        CreatArbitrate,
    },
    data() {
        return {
            streamId: '', //流ID
            projectId: '',
            activeTabName: '', //tab
            info: {},
            infoCal:{},
            projectInfo: {}, //后端方法最多返回13个参数，多出的放入infoCal
            sellBalance: 0, //发送者余额
            fundBalance: 0, //接收者余额
            sellTokenAddress: '', //币种单位
            fundTokenAddress: '', //币种单位
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
        this.projectId = this.$route.query.projectId
        this.activeTabName = this.$route.query.activeTabName//根据url参数获取当前tab
        this.allInstance = await getInstance()
        await this.getInfo()//获取流信息
        let chart = echarts.init(document.getElementById('liquidfill'))
        timer = setInterval(async () =>{//每秒动态获取账户余额
            await this.getBalance()
            this.initChart(chart)
        }, 1000)
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
        initChart(chart){
            let total
            if (this.activeTabName == 'Streams'){
                total = this.info.investFundDeposit
            } else if (this.activeTabName == 'Projects' || this.activeTabName == 'MyProjects') {
                total = this.info.projectActualFundDeposit
            }

            if (total == 0){
                let option = {
                    title: {
                        text: this.$t('streamInfo.info.havebeenStreamed'),
                        // subtext: '',
                    },
                    series: [{
                        type: 'liquidFill',
                        data: [0, 0],
                        radius: '90%',
                        name: this.$t('streamInfo.info.havebeenStreamed')
                    }],
                }
                chart.setOption(option)
            } else {
                let flowedPer = (getMoney(this.fundBalance)) / getMoney(total)
                let option = {
                    title: {
                        text: this.$t('streamInfo.info.havebeenStreamed'),
                        // subtext: '',
                    },
                    series: [{
                        type: 'liquidFill',
                        data: [flowedPer, flowedPer],
                        radius: '90%',
                        name: this.$t('streamInfo.info.havebeenStreamed')
                    }],
                    tooltip: {
                        show: true,
                        formatter: '{a}:' + flowedPer * 100 + '%'
                    },
                }
                chart.setOption(option)
            }
        },
        async getInfo(){//请求流详情数据
            if (this.activeTabName == 'Streams'){
                this.info = await this.allInstance.DAISOInstance.methods.getStream(this.streamId).call()
                this.infoCal = await this.allInstance.DAISOInstance.methods.getProject(this.info.projectId).call()
                this.sellTokenAddress = filterTokenAddress(this.infoCal.projectSellTokenAddress)//获取币种单位
                this.fundTokenAddress = filterTokenAddress(this.infoCal.projectFundTokenAddress)//获取币种单位
                // res = await this.allInstance.sablierInstance.getPastEvents('CreateStream', {filter:{streamId:this.streamId},fromBlock: 0})
            } else if (this.activeTabName == 'Projects' || this.activeTabName == 'MyProjects') {
                this.info = await this.allInstance.DAISOInstance.methods.getProject(this.projectId).call()
                this.infoCal = await this.allInstance.DAISOInstance.methods.getCancelProjectForInvest(this.projectId).call()
                this.sellTokenAddress = filterTokenAddress(this.info.projectSellTokenAddress)//获取币种单位
                this.fundTokenAddress = filterTokenAddress(this.info.projectFundTokenAddress)//获取币种单位
            }
        },
        async getBalance(){//获取发送/接收者余额
            let sellBalance
            let fundBalance
            let delta
            const now = Date.parse(new Date()) / 1000
            if (this.activeTabName == 'Streams'){
                let withdrawAmount
                if (now < this.info.startTime){
                    delta = 0
                } else if (now < this.info.stopTime){
                    delta = now - this.info.startTime
                } else {
                    delta = this.info.stopTime - this.info.startTime
                }
                fundBalance = await new bignumber(this.info.ratePerSecondOfInvestFund).multipliedBy(delta)

                if (Number(this.info.investWithdrawalAmount) > 0){
                    fundBalance = await new bignumber(fundBalance).minus(this.info.investWithdrawalAmount)
                }
                sellBalance = await new bignumber(this.info.ratePerSecondOfInvestSell).multipliedBy(delta)
                sellBalance = await new bignumber(this.info.investSellDeposit).minus(sellBalance)
                this.fundBalance = fundBalance
                this.sellBalance = sellBalance
                // senderBalance = await this.allInstance.sablierInstance.methods.balanceOf(this.streamId, this.info.sender).call()
                // recipientBalance = await this.allInstance.sablierInstance.methods.balanceOf(this.streamId, this.info.recipient).call()
            } else if (this.activeTabName == 'Projects' || this.activeTabName == 'MyProjects') {
                let invest = await this.allInstance.DAISOInstance.getPastEvents('RullingResult', {filter:{invest:this.user},fromBlock: 0})
                if (now < this.infoCal.exitStartTime){
                    delta = 0
                } else if (now < this.info.stopTime){
                    delta = now - this.infoCal.exitStartTime
                } else {
                    delta = this.info.stopTime - this.infoCal.exitStartTime
                }

                fundBalance = await new bignumber(this.infoCal.ratePerSecondOfProjectFund).multipliedBy(delta)
                fundBalance = await new bignumber(fundBalance).plus(this.infoCal.exitProjectFundBalance)

                if (Number(this.info.projectWithdrawalAmount) > 0){
                    fundBalance = await new bignumber(fundBalance).minus(this.info.projectWithdrawalAmount)
                }
                sellBalance = await new bignumber(this.infoCal.ratePerSecondOfProjectSell).multipliedBy(delta)
                sellBalance = await new bignumber(this.infoCal.exitProjectSellBalance).minus(sellBalance)
                this.fundBalance = fundBalance
                this.sellBalance = sellBalance
            }
        },
        invest() {//增加最大金额
            const now = Date.parse(new Date()) / 1000
            if (now < this.info.startTime){
                this.$prompt('Please input invest amount：', this.$t('streamInfo.function.operation'), {
                    confirmButtonText: this.$t('streamInfo.function.confirm'),
                    cancelButtonText: this.$t('streamInfo.function.cancel'),
                    inputPattern: /^([0-9]*|[0-9]*.[0-9]+)$/,
                    inputErrorMessage: this.$t('streamInfo.function.format'),
                }).then(async ({value}) => {
                    let remainder = setMoneyWeb3(value) % (this.info.stopTime - this.info.startTime)
                    let duration = this.info.stopTime - this.info.startTime
                    if (remainder == 0){
                        await this.allInstance.testnetInstance.methods.approve(this.allInstance.DAISOInstance.options.address, setMoneyWeb3(value))
                            .send({gas: 500000, from: this.user})
                        await this.allInstance.testnetInstance.methods.mint(this.user, setMoneyWeb3(value))
                            .send({gas: 500000, from: this.user})
                        let res = await this.allInstance.DAISOInstance.methods.createStream(this.projectId, setMoneyWeb3(value))
                            .send({gas: 500000, from: this.user})
                        if (res) {
                            this.$alert(this.$t('streamInfo.function.addSuccess'), this.$t('streamInfo.function.operationHint'), {type: 'success'})
                            await this.getInfo()//重新获取流信息
                        } else {
                            this.$alert(this.$t('streamInfo.function.addFailure'), this.$t('streamInfo.function.operationHint'), {type: 'error'})
                        }
                    } else {
                        this.$alert("Must be multiple of " + duration )
                    }
                })
            } else {
                this.$alert("The invest has been finished!")
            }
        },
        async withdraw() {//提取金额
            if (this.activeTabName == 'Streams'){
                this.$prompt(this.$t('streamInfo.function.withdraw'), this.$t('streamInfo.function.operation'), {
                    confirmButtonText: this.$t('streamInfo.function.confirm'),
                    cancelButtonText: this.$t('streamInfo.function.cancel'),
                    inputPattern: /^([0-9]*|[0-9]*.[0-9]+)$/,
                    inputErrorMessage: this.$t('streamInfo.function.format'),
                }).then(async ({value}) => {
                    let res = await this.allInstance.DAISOInstance.methods.withdrawFromInvest(this.streamId, setMoneyWeb3(value))
                        .send({gas: 500000, from: this.user})

                    if (res) {
                        this.$alert(this.$t('streamInfo.function.withdrawlSuccess'), this.$t('streamInfo.function.operationHint'), {type: 'success'})
                        await this.getInfo()//重新获取流信息
                    } else {
                        this.$alert(this.$t('streamInfo.function.withdrawlFailure'), this.$t('streamInfo.function.operationHint'), {type: 'error'})
                    }
                })
            } else if (this.activeTabName == 'Projects' || this.activeTabName == 'MyProjects') {
                let proposal = await this.allInstance.DAISOInstance.methods.getProposal(this.projectId).call()
                if(proposal.status == 0){
                    this.$prompt(this.$t('streamInfo.function.withdraw'), this.$t('streamInfo.function.operation'), {
                        confirmButtonText: this.$t('streamInfo.function.confirm'),
                        cancelButtonText: this.$t('streamInfo.function.cancel'),
                        inputPattern: /^([0-9]*|[0-9]*.[0-9]+)$/,
                        inputErrorMessage: this.$t('streamInfo.function.format'),
                    }).then(async ({value}) => {
                        let res = await this.allInstance.DAISOInstance.methods.launchProposal(this.projectId,setMoneyWeb3(value)).send({gas: 500000, from: this.user})
                    })
                } else if (proposal.status == 1){
                    const now = Date.parse(new Date()) / 1000
                    if (now <= proposal.stopTime){
                        this.$alert('The vote not finish!')
                    }else if (now > proposal.stopTime) {
                        let res = await this.allInstance.DAISOInstance.methods.votingResult(this.projectId).send({gas: 500000, from: this.user})
                        if (res) {
                            this.$alert("Withdrawl Success")
                            await this.getInfo()//重新获取流信息
                        } else {
                            this.$alert("Withdrawl Failure")
                        }
                    }
                }

            }
        },
        cancel() {//取消流
            if (this.activeTabName == 'Streams'){
                this.$confirm(this.$t('streamInfo.function.cancelStream'), this.$t('streamInfo.function.operation'), {
                    confirmButtonText: this.$t('streamInfo.function.confirm'),
                    cancelButtonText: this.$t('streamInfo.function.cancel'),
                }).then(async () => {
                    let res = await this.allInstance.DAISOInstance.methods.cancelInvest(this.streamId).send({gas: 500000, from: this.user})
                    if (res) {
                        clearInterval(timer)
                        this.$alert(this.$t('streamInfo.function.cancelSuccess'), this.$t('streamInfo.function.operationHint'), {type: 'success', showClose: false}).then(()=>{
                            this.$router.push({path: '/cancelInfo', query: {streamId: this.streamId, activeTabName: this.activeTabName}})
                        })
                    } else {
                        this.$alert(this.$t('streamInfo.function.cancelFailure'), this.$t('streamInfo.function.operationHint'), {type: 'error'})
                    }
                })
            } else if (this.activeTabName == 'Projects' || this.activeTabName == 'MyProjects') {
                const now = Date.parse(new Date()) / 1000
                if (now > this.info.stopTime){
                    this.$confirm(this.$t('streamInfo.function.cancelStream'), this.$t('streamInfo.function.operation'), {
                        confirmButtonText: this.$t('streamInfo.function.confirm'),
                        cancelButtonText: this.$t('streamInfo.function.cancel'),
                    }).then(async () => {
                        let res = await this.allInstance.DAISOInstance.methods.projectRefunds(this.projectId).send({gas: 500000, from: this.user})
                        if (res) {
                            clearInterval(timer)
                            this.$alert(this.$t('streamInfo.function.cancelSuccess'), this.$t('streamInfo.function.operationHint'), {type: 'success'})
                        } else {
                            this.$alert(this.$t('streamInfo.function.cancelFailure'), this.$t('streamInfo.function.operationHint'), {type: 'error'})
                        }
                    })
                } else {
                    this.$alert("Project is not finished!")
                }

            }
        },
        arbitrate(){//仲裁
            this.projectId = this.info.projectId
            this.showModal = true
            this.sender = this.infoCal.sender
        },
        closeModal() {
            this.showModal = false
            this.getInfo()
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
