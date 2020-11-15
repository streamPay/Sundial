<template>
    <el-drawer
        :visible.sync="showModal"
        id="creatStream"
        :wrapper-closable="false"
        @close="closeModal"
    >
        <div
            slot="title"
            class="bold fs20"
        >
            {{ $t('createstream.create.create') }}
        </div>
        <div class="px20">
            <el-form
                ref="createForm"
                label-position="top"
                label-width="80px"
                :model="params"
            >
                <el-form-item :label="$t('createstream.create.sellTokenAddress')">
                    <el-input v-model="params.sellTokenAddress" />
                </el-form-item>
                <el-form-item :label="$t('createstream.create.fundTokenAddress')">
                    <!-- <el-autocomplete style="width:100%" valueKey="label" :fetch-suggestions="querySearch" v-model="params.tokenAddress" /> -->
                    <el-select
                        style="width:100%"
                        v-model="params.fundTokenAddress"
                        :placeholder="$t('createstream.create.choose')"
                    >
                        <el-option
                            v-for="item in tokenAddressOpt"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item
                        :label="$t('createstream.create.sellDeposit')"
                >
                    <el-input
                            type="number"
                            v-model="params.sellDeposit"
                    />
                </el-form-item>
                <el-form-item
                        :label="$t('createstream.create.fundDeposit')"
                >
                    <el-input
                            type="number"
                            v-model="params.fundDeposit"
                    />
                </el-form-item>
                <el-form-item :label="$t('createstream.create.files')">
                    <el-upload
                            :on-preview="handlePreview"
                            :on-remove="handleRemove"
                            :before-remove="beforeRemove"
                            multiple
                            :limit="3"
                            :on-change="handleExceed"
                            :http-request="customUpload"
                            :file-list="fileList"
                    >
                        <el-button
                                size="small"
                                type="primary"
                        >
                            {{ $t('createstream.create.click') }}
                        </el-button>
                        <div
                                slot="tip"
                                class="el-upload__tip"
                        >
                            {{ $t('createstream.create.pdf') }}
                        </div>
                    </el-upload>
                </el-form-item>

                <el-form-item
                    :label="$t('createstream.create.time')"
                >
                    <el-date-picker
                        v-model="dateTime"
                        align="right"
                        style="width:100%"
                        type="datetimerange"
                        :range-separator="$t('createstream.create.to')"
                        :start-placeholder="$t('createstream.create.startTime')"
                        :end-placeholder="$t('createstream.create.stopTime')"
                        :picker-options="pickerOptions"
                    />
                </el-form-item>

                <el-form-item>
                    <el-button
                        round
                        class="mt36 py16"
                        style="width:100%"
                        type="primary"
                        :disabled="isOnlyClick"
                        @click="save"
                    >
                        {{ isOnlyClick? $t('createstream.create.creating'):$t('createstream.create.create') }}<i class="el-icon-right el-icon--right" />
                    </el-button>
                </el-form-item>
            </el-form>
        </div>
    </el-drawer>
</template>

<script>
import {mapState} from 'vuex'
import moment from 'moment'
import {tokenAddressOpt} from '@/components/constant/tokenAddress'
import {setMoneyWeb3} from '@/utils/utils.js'
import {getInstance} from '@/utils/connectContract'
import bignumber from 'bignumber.js'
export default {
    name: 'CreatProject',
    props: {
        showModal: {
            type: Boolean,
            default() {
                return false;
            }
        },
    },
    data() {
        return {
            tokenAddressOpt,
            options: [{
                value: 'Projects',
                label: this.$t('dashboard.stream.fixedDeposit')
            }
            ],
            dateTime: [],
            params: {},
            pickerOptions: {
                disabledDate(time) {
                    return moment(time) <= moment().subtract(1, 'days');
                },
            },
            isOnlyClick: false, //创建流只可点击一次
            activeTab: '',
            approveAmount: 0,
        }
    },
    computed: {
        ...mapState(['user', 'activeTabName']),
    },
    async created(){
        this.allInstance = await getInstance()
    },
    watch: {
        showModal(val){
            if (val) {
                this.isOnlyClick = false
                this.activeTab = this.activeTabName
                this.initParam()
            }
        },
        activeTab(){
            this.initParam()
        }
    },
    methods: {
        customUpload(file){
            let fileReader = new FileReader();
            fileReader.readAsArrayBuffer(file.file);

            fileReader.onloadend = () =>{
                this.uploadIpfs(fileReader.result, file.file.name)
            }
        },
        uploadIpfs(data, fileName){//data:File转bufferArray文件类型
            this.$http.post('https://ipfs.kleros.io/add', JSON.stringify({
                fileName: fileName,
                buffer: Buffer.from(data)
            }), {
                headers: {'content-type': 'application/json'},
            }).then(res=>{
                this.params.hash = res.data.data[0].hash
            })
        },
        handleExceed(files, fileList) {
        },
        initParam(){
            this.params = {
                sellTokenAddress:'',
                sellDeposit:'',
                fundTokenAddress:'',
                fundDeposit:'',
                startTime: moment().add(5, 'minutes'), //开始时间
                hash:'', //项目详情链接
            }
            this.dateTime = [moment().add(5, 'minutes'), moment().add(1, 'days')]
        },
        async save() {
            let isOk = await this.validate(this.params)
            if (!isOk) return
            this.isOnlyClick = true
            let res
            //批准、铸币
            await this.allInstance.xtestnetInstance.methods.mint(this.user, setMoneyWeb3(this.params.fundDeposit)).send({
                gas: 500000,
                from: this.user
            });
            await this.allInstance.xtestnetInstance.methods.approve(this.allInstance.DAISOInstance.options.address, setMoneyWeb3(this.params.fundDeposit)).send({
                gas: 500000,
                from: this.user
            });
            res = await this.allInstance.DAISOInstance.methods
                .createProject(this.params.sellTokenAddress, setMoneyWeb3(this.params.sellDeposit),
                    this.params.fundTokenAddress, setMoneyWeb3(this.params.fundDeposit) , moment(this.dateTime[0]).unix(), moment(this.dateTime[1]).unix(),this.params.hash)
                .send({
                    gas: 500000,
                    from: this.user
                })
            if (res) {
                this.isOnlyClick = false
                this.$store.commit('updateData', {key: 'activeTabName', value: this.activeTab})
                this.$alert(this.$t('createstream.create.createSuccess'), this.$t('streamInfo.function.operationHint'), {type: 'success'})
                this.closeModal()
            }else {
                this.$alert('Create Failure')
            }

        },
        async validate(params){
            try {
                if (!params.sellTokenAddress) throw new Error(this.$t('createstream.validate.sellTokenAddress'))
                if (!params.sellDeposit || params.sellDeposit <= 0) throw new Error(this.$t('createstream.validate.sellDeposit'))
                if (!params.fundTokenAddress) throw new Error(this.$t('createstream.validate.fundTokenAddress'))
                if (!params.fundDeposit || params.fundDeposit <= 0) throw new Error(this.$t('createstream.validate.fundDeposit'))
                if (!params.hash) throw new Error(this.$t('createstream.validate.hash'))
                if (!params.startTime || params.startTime <= moment()) throw new Error(this.$t('createstream.validate.startTime'))
            }
            catch (err){
                this.$notify.error({title: err.message})
                return false
            }
            return true
        },
        closeModal() {
            this.$emit('close');
        },
    },
};
</script>


