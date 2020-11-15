<template>
    <div class="pay-dashboard">
        <p class="title-lv1">
            {{ $t('createArbitrate.arbitration.details') }}
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
            <el-table
                :data="data"
            >
                <el-table-column
                    prop="state"
                    width="200"
                    :label="$t('createArbitrate.arbitration.check')"
                >
                    <template slot-scope="scope">
                        <div v-if="scope.row.state=='1'">{{ $t('createArbitrate.arbitration.createArbitration') }}</div>
                        <div v-if="scope.row.state=='2'">{{ $t('createArbitrate.arbitration.createDisputes') }}</div>
                        <div v-if="scope.row.state=='3'">{{ $t('createArbitrate.arbitration.submitEvidence') }}</div>
                        <div v-if="scope.row.state=='4'">{{ $t('createArbitrate.arbitration.currentRulling') }}</div>
                        <div v-if="scope.row.state=='5'">{{ $t('createArbitrate.arbitration.appeal') }}</div>
                        <div v-if="scope.row.state=='6'">{{ $t('createArbitrate.arbitration.appealResult') }}</div>
                    </template>
                </el-table-column>
                <el-table-column
                    prop="info"
                    :label="$t('createArbitrate.arbitration.info')"
                >
                    <template slot-scope="scope">
                        <!-- <div v-for="(item, index) in scope.row.info" :key="index">
                            {{item}}
                        </div> -->
                        <div v-if="scope.row.state=='1'&&scope.row.info">
                            <div>projectId: {{scope.row.info.projectId}}</div>
                            <div>invest: {{scope.row.info.invest}}</div>
                            <div>metaEvidenceId: {{scope.row.info._metaEvidenceId}}</div>
                            <div>reclaimedAt: {{scope.row.info.reclaimedAt}}</div>
                        </div>
                        <div v-if="scope.row.state=='2'&&scope.row.info">
                            <div>arbitrator: {{scope.row.info._arbitrator}}</div>
                            <div>disputeID: {{scope.row.info._disputeID}}</div>
                        </div>
                        <div v-if="scope.row.state=='3'&&scope.row.info">
                            <div>evidence: {{scope.row.info._evidence}}</div>
                        </div>
                        <div v-if="scope.row.state=='4'&&scope.row.info">
                            <div>currentRuling: {{scope.row.info.currentRuling}}</div>
                        </div>
                        <div v-if="scope.row.state=='5'&&scope.row.info">
                            <div>appealCost: {{scope.row.info.appealCost}}</div>
                            <div>appealStartTime: {{scope.row.info.appealStartTime}}</div>
                            <div>appealStopTime: {{scope.row.info.appealStopTime}}</div>

                        </div>
                        <div v-if="scope.row.state=='6'&&scope.row.info">
                            <div>disputeId: {{scope.row.info.disputeId}}</div>
                            <div>rulling: {{scope.row.info.rulling}}</div>
                        </div>
                    </template>
                </el-table-column>          
                <el-table-column
                    width="150"
                    :label="$t('dashboard.info.operation')"
                >
                    <template slot-scope="scope">
                        <el-button v-if="scope.row.state=='1'" class="w130" type="primary" size="medium" round plain @click="reclaimFunds" >
                            {{ $t('createArbitrate.arbitration.refunds') }}
                        </el-button>
                        <el-button v-if="scope.row.state=='2'" class="w130" type="primary" size="medium" round plain @click="depositArbitrationFeeForPayee" >
                            {{ $t('createArbitrate.arbitration.payProjectFees') }}
                        </el-button>
                        <el-button v-if="scope.row.state=='3'" class="w130" type="primary" size="medium" round plain @click="arbitrate" >
                            {{ $t('createArbitrate.arbitration.submitEvidence') }}
                        </el-button>
                        <el-button v-if="scope.row.state=='4'" class="w130" type="primary" size="medium" round plain @click="currentRuling" >
                            {{ $t('createArbitrate.arbitration.check') }}
                        </el-button>
                        <el-button v-if="scope.row.state=='5'" class="w130" type="primary" size="medium" round plain @click="appeal" >
                            {{ $t('createArbitrate.arbitration.appealResult') }}
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <creat-arbitrate
                :show-modal="showArbitrateModal"
                from="proposalInfo"
                :metaEvidenceId="metaEvidenceId"
                @close="closeArbitrateModal"
            />
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
            data:[
                {
                    state:1,
                    info:{},
                },
                {
                    state:2,
                    info:{},
                },
                {
                    state:3,
                    info:{},
                },
                {
                    state:4,
                    info:{currentRuling:''},
                },
                {
                    state:5,
                    info:{appealCost:'',appealStartTime:'',appealStopTime:""},
                },
                {
                    state:6,
                    info:{},
                },
            ],
            showArbitrateModal: false,
        }
    },
    async created(){
        this.metaEvidenceId = await this.$route.query._metaEvidenceId//根据url参数获取流ID
        this.allInstance = await getInstance()
        await this.ajaxQuery()//获取流信息
    },
    computed: {
        ...mapState(['user']),
    },
    methods: {
        formatDate(val) {
            return moment(parseInt(val, 10), 'X').format('YYYY-MM-DD HH:mm:ss');
        },
        async ajaxQuery(){
            let create = await this.allInstance.iarbitrablesInstance.getPastEvents('Txs', {filter:{_metaEvidenceId:this.metaEvidenceId},fromBlock: 0})
            if(create.length)this.data[0].info = create[0].returnValues;

            let createDisputes = await this.allInstance.iarbitrablesInstance.getPastEvents('Dispute', {filter:{_metaEvidenceID:this.metaEvidenceId},fromBlock: 0})
            if(createDisputes.length)this.data[1].info = createDisputes[0].returnValues;

            let submitEvidence = await this.allInstance.iarbitrablesInstance.getPastEvents('Evidence', {filter:{_evidenceGroupID:this.metaEvidenceId},fromBlock: 0})
            if(submitEvidence.length)this.data[2].info = submitEvidence[0].returnValues;

            await this.allInstance.iarbitrablesInstance.methods.currentRuling(this.metaEvidenceId).call({
                from:this.user
            }).then((result,err) => {
                this.data[3].info.currentRuling = result
            });

            await this.allInstance.iarbitrablesInstance.methods.appealCost(this.metaEvidenceId,"0x00").call({
                from:this.user
            }).then((result,err) => {
                this.data[4].info.appealCost = result
            });

            await this.allInstance.iarbitrablesInstance.methods.appealPeriod(this.metaEvidenceId).call({
                from:this.user
            }).then((result,err) => {
                this.data[4].info.appealStartTime = this.formatDate(result[0]);
                this.data[4].info.appealStopTime = this.formatDate(result[1]);
            });

            let result = await this.allInstance.iarbitrablesInstance.getPastEvents('Rule', {filter:{_metaEvidenceId:this.metaEvidenceId},fromBlock: 0})
            if(result.length)this.data[5].info = create[0].returnValues;
        },
        async reclaimFunds(){
            let res = await this.allInstance.iarbitrablesInstance.methods.reclaimFunds(this.metaEvidenceId).send({gas: 500000, from: this.user})
            if(res) {
                this.$alert("Refund Success")
            }
            await this.ajaxQuery()
        },
        async depositArbitrationFeeForPayee(){
            let cost;
            await this.allInstance.iarbitrablesInstance.methods.arbitrationCost("0x00").call({
                gas:3000000,
                from:this.user
            }).then((result,err) => {
                cost = result
            });
            let res = await this.allInstance.iarbitrablesInstance.methods.depositArbitrationFeeForPayee(this.metaEvidenceId).send({from: this.user,value:cost})
            if(res) {
                this.$alert("Create dispute success")
            }
            await this.ajaxQuery()
        },
        async currentRuling(){
            await this.allInstance.iarbitrablesInstance.methods.currentRuling(this.metaEvidenceId).call({
                gas:3000000,
                from:this.user
            }).then((result,err) => {
                this.$alert(result)
            });
        },
        async appeal(){
            let cost;
            await this.allInstance.iarbitrablesInstance.methods.appealCost(this.metaEvidenceId,"0x00").call({
                from:this.user
            }).then((result,err) => {
                cost = result
            });

            let res = await this.allInstance.iarbitrablesInstance.methods.appeal(this.metaEvidenceId,"0x00").send({from: this.user,value:cost})
            if(res) {
                this.$alert("Appeal success")
            }
        },
        arbitrate(){//仲裁
            this.showArbitrateModal = true
        },
        closeArbitrateModal() {
            this.showArbitrateModal = false
            this.ajaxQuery()
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
