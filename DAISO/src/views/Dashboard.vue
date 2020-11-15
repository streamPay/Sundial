<template>
    <div class="pay-dashboard">
        <p class="title-lv1">
            {{ $t('dashboard.dash') }}
        </p>
        <el-tabs
            v-model="activeTab"
            @tab-click="changeTab"
        >
            <el-tab-pane
                :label="$t('dashboard.stream.projects')"
                name="Projects"
            >
                <div class="p16">
                    <div class="clearfix mb24">
                        <el-button
                                type="primary"
                                round
                                icon="el-icon-s-promotion"
                                @click="creat"
                        >
                            {{ $t('dashboard.create') }}
                        </el-button>
                        <creat-project
                                :show-modal="showModal"
                                @close="closeModal"
                        />
                    </div>
                    <el-table
                        :data="data"
                        border
                    >
                        <el-table-column
                            prop="projectId"
                            :label="$t('dashboard.info.projectId')"
                        />
                        <el-table-column
                            prop="projectSellTokenAddress"
                            :label="$t('dashboard.info.projectSellTokenAddress')"
                        >
                            <template slot-scope="scope">
                                <el-tooltip :content="scope.row.projectSellTokenAddress">
                                    <div>{{ scope.row.projectSellTokenAddress | filterAdressName }}</div>
                                </el-tooltip>
                            </template>
                        </el-table-column>
                        <el-table-column
                            prop="projectSellDeposit"
                            :label="$t('dashboard.info.projectSellDeposit')"
                            :formatter="formatMoneyWithUnit"
                        />
                        <el-table-column
                            prop="projectFundTokenAddress"
                            :label="$t('dashboard.info.projectFundTokenAddress')"
                        >
                            <template slot-scope="scope">
                                <el-tooltip :content="scope.row.projectFundTokenAddress">
                                    <div>{{ scope.row.projectFundTokenAddress | filterAdressName }}</div>
                                </el-tooltip>
                            </template>
                        </el-table-column>
                        <el-table-column
                            prop="projectFundDeposit"
                            :label="$t('dashboard.info.projectFundDeposit')"
                            :formatter="formatMoneyWithUnit"
                        />
                        <el-table-column
                            prop="hash"
                            :label="$t('dashboard.info.hash')"
                        />
                        <el-table-column
                            prop="startTime"
                            :label="$t('dashboard.info.startTime')"
                            :formatter="formatDate"
                        />
                        <el-table-column
                            prop="stopTime"
                            :label="$t('dashboard.info.stopTime')"
                            :formatter="formatDate"
                        />
                        <el-table-column
                            width="120"
                            :label="$t('dashboard.info.operation')"
                        >
                            <template slot-scope="scope">
                                <router-link
                                        :to="{path: '/streamInfo',
                          query: {projectId:scope.row.projectId, activeTabName:activeTab}}"
                                >
                                    <el-button
                                            :title="$t('dashboard.info.checkStream')"
                                            type="primary"
                                            size="medium"
                                            round
                                            plain
                                    >
                                        {{ $t('dashboard.info.checkStream') }}<i class="el-icon-right" />
                                    </el-button>
                                </router-link>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </el-tab-pane>
            <el-tab-pane
                :label="$t('dashboard.stream.myprojects')"
                name="MyProjects"
            >
                <div class="p16">
                    <el-table
                            :data="data"
                            border
                    >
                        <el-table-column
                                prop="projectId"
                                :label="$t('dashboard.info.projectId')"
                        />
                        <el-table-column
                                prop="projectSellTokenAddress"
                                :label="$t('dashboard.info.projectSellTokenAddress')"
                        >
                            <template slot-scope="scope">
                                <el-tooltip :content="scope.row.projectSellTokenAddress">
                                    <div>{{ scope.row.projectSellTokenAddress | filterAdressName }}</div>
                                </el-tooltip>
                            </template>
                        </el-table-column>
                        <el-table-column
                                prop="projectSellDeposit"
                                :label="$t('dashboard.info.projectSellDeposit')"
                                :formatter="formatMoneyWithUnit"
                        />
                        <el-table-column
                                prop="projectFundTokenAddress"
                                :label="$t('dashboard.info.projectFundTokenAddress')"
                        >
                            <template slot-scope="scope">
                                <el-tooltip :content="scope.row.projectFundTokenAddress">
                                    <div>{{ scope.row.projectFundTokenAddress | filterAdressName }}</div>
                                </el-tooltip>
                            </template>
                        </el-table-column>
                        <el-table-column
                                prop="projectFundDeposit"
                                :label="$t('dashboard.info.projectFundDeposit')"
                                :formatter="formatMoneyWithUnit"
                        />
                        <el-table-column
                                prop="startTime"
                                :label="$t('dashboard.info.startTime')"
                                :formatter="formatDate"
                        />
                        <el-table-column
                                prop="stopTime"
                                :label="$t('dashboard.info.stopTime')"
                                :formatter="formatDate"
                        />
                        <el-table-column
                                width="120"
                                :label="$t('dashboard.info.operation')"
                        >
                            <template slot-scope="scope">
                                <router-link
                                        :to="{path: '/streamInfo',
                              query: {projectId:scope.row.projectId, activeTabName:activeTab}}"
                                >
                                    <el-button
                                            :title="$t('dashboard.info.checkStream')"
                                            type="primary"
                                            size="medium"
                                            round
                                            plain
                                    >
                                        {{ $t('dashboard.info.checkStream') }}<i class="el-icon-right" />
                                    </el-button>
                                </router-link>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </el-tab-pane>
            <el-tab-pane
                :label="$t('dashboard.stream.streams')"
                name="Streams"
            >
                <div class="p16">
                    <el-table
                            :data="data"
                            border
                    >
                        <el-table-column
                            prop="streamId"
                            :label="$t('dashboard.info.streamId')"
                        />
                        <el-table-column
                            prop="projectId"
                            :label="$t('dashboard.info.projectId')"
                        />
                        <el-table-column
                                prop="investSellDeposit"
                                :label="$t('dashboard.info.investSellDeposit')"
                                :formatter="formatMoney"
                        />
                        <el-table-column
                                v-if="activeTab=='Streams'"
                                prop="investFundDeposit"
                                :label="$t('dashboard.info.investFundDeposit')"
                                :formatter="formatMoney"
                        />
                        <el-table-column
                                prop="startTime"
                                :label="$t('dashboard.info.startTime')"
                                :formatter="formatDate"
                        />
                        <el-table-column
                                prop="stopTime"
                                :label="$t('dashboard.info.stopTime')"
                                :formatter="formatDate"
                        />
                        <el-table-column
                                width="120"
                                :label="$t('dashboard.info.operation')"
                        >
                            <template slot-scope="scope">
                                <router-link
                                        v-if="!scope.row.isCancelStstus"
                                        :to="{path: '/streamInfo',
                                          query: {streamId:scope.row.streamId, activeTabName:activeTab}}"
                                >
                                    <el-button
                                            :title="$t('dashboard.info.checkStream')"
                                            type="primary"
                                            size="medium"
                                            round
                                            plain
                                    >
                                        {{ $t('dashboard.info.checkStream') }}<i class="el-icon-right" />
                                    </el-button>
                                </router-link>
                                <router-link
                                        v-else
                                        :to="{path: '/cancelInfo',
                                          query: {streamId:scope.row.streamId, activeTabName:activeTab}}"
                                >
                                    <el-button
                                            :title="$t('dashboard.info.cancel')"
                                            type="danger"
                                            size="medium"
                                            round
                                            plain
                                    >
                                        {{ $t('dashboard.info.cancel') }}<i class="el-icon-right" />
                                    </el-button>
                                </router-link>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </el-tab-pane>

            <el-tab-pane
                :label="$t('dashboard.stream.vote')"
                name="Votes"
            >
                <div class="p16">
                    <el-table
                            :data="data"
                            border
                    >
                        <el-table-column
                            prop="projectId"
                            :label="$t('dashboard.info.projectId')"
                        />
                        <el-table-column
                            prop="streamId"
                            :label="$t('dashboard.info.streamId')"
                        />
                        <el-table-column
                            prop="amount"
                            :label="$t('dashboard.info.amount')"
                            :formatter="formatMoneyWithUnit"
                        />
                        <el-table-column
                            prop="weight"
                            :label="$t('dashboard.info.weight')"
                            :formatter="formatMoneyWithUnit"
                        />
                        <el-table-column
                            prop="startTime"
                            :label="$t('dashboard.info.startTime')"
                            :formatter="formatDate"
                        />
                        <el-table-column
                            prop="stopTime"
                            :label="$t('dashboard.info.stopTime')"
                            :formatter="formatDate"
                        />
                        <el-table-column
                                :label="$t('dashboard.info.vote')"
                        >
                            <template slot-scope="scope">
                                <el-button
                                        type="primary"
                                        round
                                        plain
                                        size="medium"
                                        @click="vote(scope.row)"
                                >
                                    {{ $t('dashboard.info.vote') }} <i class="el-icon-s-data" />
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </el-tab-pane>
            <el-tab-pane
                :label="$t('dashboard.stream.arbitration')"
                name="Arbitration"
            >
                <div class="p16">
                    <el-table
                            :data="data"
                            border
                    >
                        <el-table-column
                            prop="projectId"
                            :label="$t('dashboard.info.projectId')"
                        />
                        <el-table-column
                                prop="projectFundTokenAddress"
                                :label="$t('dashboard.info.invest')"
                        >
                            <template slot-scope="scope">
                                <el-tooltip :content="scope.row.invest">
                                    <div>{{ scope.row.invest | filterAdressName }}</div>
                                </el-tooltip>
                            </template>
                        </el-table-column>
                        <el-table-column
                                prop="projectFundTokenAddress"
                                :label="$t('dashboard.info.project')"
                        >
                            <template slot-scope="scope">
                                <el-tooltip :content="scope.row.project">
                                    <div>{{ scope.row.project | filterAdressName }}</div>
                                </el-tooltip>
                            </template>
                        </el-table-column>
                        <el-table-column
                                prop="_metaEvidenceId"
                                :label="$t('dashboard.info.metaEvidence')"
                        />
                        <el-table-column
                                prop="reclaimedAt"
                                :label="$t('dashboard.info.reclaimedAt')"
                                :formatter="formatDate"
                        />
                        <el-table-column
                                width="120"
                                :label="$t('dashboard.info.operation')"
                        >
                            <template slot-scope="scope">
                                <router-link
                                    :to="{path: '/proposalInfo',
                                    query: {_metaEvidenceId:scope.row._metaEvidenceId}}"
                                >
                                    <el-button
                                        :title="$t('dashboard.info.checkStream')"
                                        type="primary"
                                        size="medium"
                                        round
                                        plain
                                    >
                                        {{ $t('dashboard.info.checkStream') }}<i class="el-icon-right" />
                                    </el-button>
                                </router-link>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script>
import _ from 'lodash'
import moment from 'moment'
import {mapState} from 'vuex'
import {getMoney, filterAdressName, getMoneyWithUnit} from '@/utils/utils.js'
import {getInstance} from '../utils/connectContract'
import CreatProject from '@/components/qualification/CreatProject.vue'
import CreatArbitrate from '@/components/qualification/CreatArbitrate.vue'
export default {
    name: 'Dashboard',
    components: {
        CreatProject,
        CreatArbitrate,
    },
    filters: {
        filterAdressName,
    },
    data() {
        return {
            data: [],
            showModal: false,
            cancelStreamArr: [],
            activeTab: 'Projects',
            allInstance: {},//获取的所有合约接口
            showArbitrateModal: false, //仲裁弹框
        }
    },
    async created(){
        this.allInstance = await getInstance()
        this.ajaxQuery()
    },
    computed: {
        ...mapState(['user', 'recipient', 'activeTabName']),
    },
    methods: {
        formatDate(row, column, val) {
            return moment(parseInt(val, 10), 'X').format('YYYY-MM-DD HH:mm:ss');
        },
        formatMoney(row, column, val) {
            return getMoney(val)
        },
        formatMoneyWithUnit(row, column, val) {
            return getMoneyWithUnit(val, row.tokenAddress)
        },
        creat() {
            this.showModal = true
        },
        changeTab(){
            this.$store.commit('updateData', {key: 'activeTabName', value: this.activeTab})
            this.ajaxQuery()
        },
        closeModal() {
            this.showModal = false
            this.ajaxQuery()
        },
        async ajaxQuery(){//post请求列表数据
            this.data = []//每次清空数据
            let cancelRes = []//被取消的流
            let dataOfSender = []//返回当前用户作为发送者列表
            let dataOfProject = []//返回当前用户作为发送者列表
            if (this.user != undefined) {
                if (this.activeTab == 'Projects') {
                    await this.allInstance.iarbitrablesInstance.getPastEvents('Rule', {fromBlock: 0}, async (error, events) => {
                        this.data = _.map(events, 'returnValues')
                    })

                    await this.allInstance.DAISOInstance.getPastEvents('CreateProject', {fromBlock: 0}, async (error, events) => {
                        this.data = _.map(events, 'returnValues')
                    })
                } else if (this.activeTab == 'MyProjects'){
                    await this.allInstance.DAISOInstance.getPastEvents('CreateProject', {filter: {sender: this.user},fromBlock: 0}, async (error, events) => {
                        this.data = _.map(events, 'returnValues')
                    })
                } else if (this.activeTab == 'Streams'){
                    cancelRes = await this.allInstance.DAISOInstance.getPastEvents('CancelStream', {fromBlock: 0})
                    dataOfSender = await this.allInstance.DAISOInstance.getPastEvents('CreateStream', {filter: {sender: this.user}, fromBlock: 0})

                    this.cancelStreamArr = _.map(cancelRes, (o)=>{return o.returnValues.streamId})
                    this.data = _.map(dataOfSender, (o)=>{
                        o.returnValues.isCancelStstus = this.cancelStreamArr.includes(o.returnValues.streamId)
                        return o.returnValues
                    })
                } else if (this.activeTab == 'Votes'){
                    await this.allInstance.DAISOInstance.getPastEvents('LaunchProposal', {filter: {sender: this.user},fromBlock: 0}, async (error, events) => {
                        this.data = _.map(events, 'returnValues')
                    })
                } else if (this.activeTab == 'Arbitration'){
                    let invest = await this.allInstance.iarbitrablesInstance.getPastEvents('Txs', {filter:{invest:this.user},fromBlock: 0})
                    let project = await this.allInstance.iarbitrablesInstance.getPastEvents('Txs', {filter:{project:this.user},fromBlock: 0})
                    let dataAll = _.concat(invest, project)
                    this.data = _.map(dataAll, 'returnValues')
                }
            }
        },
        async vote(row){
            const now = Date.parse(new Date()) / 1000
            let result = await this.allInstance.DAISOInstance.methods.voteForInvestStatus(row.streamId).call()
            if (result[1] == 0){
                if (now < row.stopTime){
                    this.$prompt("Input：1 is Pass，2 is NotPass", this.$t('streamInfo.function.operation'), {
                        confirmButtonText: this.$t('streamInfo.function.confirm'),
                        cancelButtonText: this.$t('streamInfo.function.cancel'),
                        inputPattern: /^([0-9]*|[0-9]*.[0-9]+)$/,
                        inputErrorMessage: this.$t('streamInfo.function.format'),
                    }).then(async ({value}) => {
                        let res = await this.allInstance.DAISOInstance.methods.voteForInvest(row.projectId,value).send({gas: 500000, from: this.user})
                        if (res) {
                            this.$alert("Vote Success")
                        } else {
                            this.$alert("Vote Failure")
                        }
                    })
                } else{
                    this.$alert("The vote is finished!")
                }
            } else if(result[1] == 1){
                 this.$alert("Have been voted!")
            }
        }
    },
}
</script>
