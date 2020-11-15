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
            {{ $t('createArbitrate.create') }}
        </div>
        <div class="px20">
            <el-form
                ref="createForm"
                label-position="top"
                label-width="80px"
                :model="params"
            >
                <el-form-item :label="$t('createArbitrate.info')">
                    <el-input
                        type="textarea"
                        v-model="params.description"
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
                            {{ $t('createstream.create.metaEvidence') }}
                        </div>
                    </el-upload>
                </el-form-item>
                <el-form-item>
                    <el-button
                        round
                        class="mt36 py16"
                        style="width:100%"
                        type="primary"
                        :disabled="isOnlyClick"
                        @click="arbitrate"
                    >
                        {{ isOnlyClick? $t('createstream.create.arbitrate'):$t('createstream.create.arbitrate') }}<i class="el-icon-right el-icon--right" />
                    </el-button>
                </el-form-item>
            </el-form>
        </div>
    </el-drawer>
</template>

<script>
import {mapState} from 'vuex'
import moment from 'moment'
import {setMoneyWeb3} from '@/utils/utils.js'
import {getInstance} from '@/utils/connectContract'
import getEv from '@/utils/generate-meta-evidence.js'
import getGv from '@/utils/generate-evidence.js'

export default {
    name: 'CreatStream',
    props: {
        showModal: {
            type: Boolean,
            default() {
                return false;
            }
        },
        projectId:{
            type:Number,
        },
        sender:{
            type:String,
        },
        from:{
            type:String,
        },
        metaEvidenceId:{
            type:Number,
        }
    },
    data() {
        return {
            fileList: [],
            dateTime: [],
            params: {},
            pickerOptions: {
                disabledDate(time) {
                    return moment(time) <= moment().subtract(1, 'days');
                },
            },
            isOnlyClick: false, //创建流只可点击一次
            // projectId:0,
            // sender:0,
            hash:0,
            hashForJson:0,
            jsonhash:0,
            // from:0,
            // metaEvidenceId:0,
        }
    },
    computed: {
        ...mapState(['user']),
    },
    async created(){
        this.allInstance = await getInstance()
    },
    watch: {
        showModal(val){
            if (val) {
                this.isOnlyClick = false
                this.initParam()
            }
        },
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
                // eslint-disable-next-line
                buffer: Buffer.from(data)
            }), {
                headers: {'content-type': 'application/json'},
            }).then(res=>{
                this.hash = res.data.data[0].hash
            })
        },
        async customUploadForJson(data){
            var content = await JSON.stringify(data)
            var blob = await new Blob([content])
            let fileReader = await new FileReader();
            await fileReader.readAsArrayBuffer(blob);

            fileReader.onloadend = () =>{
                this.uploadIpfsForJson(fileReader.result, "MetaEvidence.json")
            }
        },
        async uploadIpfsForJson(data, fileName){//data:File转bufferArray文件类型
            let res = await this.$http.post('https://ipfs.kleros.io/add', JSON.stringify({
                fileName: fileName,
                // eslint-disable-next-line
                buffer: Buffer.from(data)
            }), {
                headers: {'content-type': 'application/json'},
            })
            this.hashForJson = res.data.data[0].hash
            this.jsonhash = await "/ipfs/" +this.hashForJson

            let cost;
            await this.allInstance.iarbitrablesInstance.methods.arbitrationCost("0x00").call({
                gas:3000000,
                from:this.user
            }).then((result,err) => {
                cost = result
            });
            let res1 = await this.allInstance.iarbitrablesInstance.methods.newTransaction(this.projectId,this.sender,this.jsonhash).send({from: this.user,value:cost})
            if(res1) {
                this.$alert("Submit Arbitrator Success")
                this.closeModal()
            }
        },
        async customUploadForEvidence(data){
            var content = await JSON.stringify(data)
            var blob = await new Blob([content])
            let fileReader = await new FileReader();
            await fileReader.readAsArrayBuffer(blob);

            fileReader.onloadend = () =>{
                this.uploadIpfsForEvidence(fileReader.result, "Evidence.json")
            }
        },
        async uploadIpfsForEvidence(data, fileName){//data:File转bufferArray文件类型
            let res = await this.$http.post('https://ipfs.kleros.io/add', JSON.stringify({
                fileName: fileName,
                // eslint-disable-next-line
                buffer: Buffer.from(data)
            }), {
                headers: {'content-type': 'application/json'},
            })
            this.hashForJson = res.data.data[0].hash
            this.jsonhash = await "/ipfs/" +this.hashForJson

            let res1 = await this.allInstance.iarbitrablesInstance.methods.submitEvidence(this.metaEvidenceId,this.jsonhash).send({gas: 500000, from: this.user})
            if(res1) {
                this.$alert("Submit Evidence Success")
                this.closeModal()
            }
        },
        handleExceed(files, fileList) {
            // this.$message.warning(`当前限制选择 3 个文件，本次选择了 ${files.length} 个文件，共选择了 ${files.length + fileList.length} 个文件`);
        },
        initParam(){
            this.params = {}
            this.hash = 0
            this.hashForJson = 0
            this.fileList = []
        },
        async arbitrate() {
            if (this.from == "streamInfo"){
                await this.allInstance.DAISOInstance.methods.updateAddress("0x1bBAc7769e126e2C93510d1Fc08D5d23207e159A").send({gas: 500000, from: this.user})
                let projectHash
                await this.allInstance.DAISOInstance.getPastEvents('CreateProject', {filter: {projectId: this.projectId},fromBlock: 0}, async (error, events) => {
                    projectHash = events[0].returnValues.hash
                })
                let ev = await getEv(projectHash,this.params.description,this.hash,this.sender,this.user)
                await this.customUploadForJson(ev);

            } else if (this.from == "proposalInfo") {
                let gv = getGv(this.hash,this.params.description)
                await this.customUploadForEvidence(gv)
            }
        },
        async validate(params){
            try {
                if (!params.recipient) throw new Error(this.$t('createstream.validate.recipient'))
                if (!params.tokenAddress) throw new Error(this.$t('createstream.validate.tokenAddress'))
                if (this.activeTab == 'fixedFlowrate'){
                    if (!params.maxAmount || params.maxAmount <= 0) throw new Error(this.$t('createstream.validate.maxAmount'))
                    if (!params.ratePerSecond || params.ratePerSecond <= 0) throw new Error(this.$t('createstream.validate.ratePerSecond'))
                    if (!params.startTime || params.startTime <= moment()) throw new Error(this.$t('createstream.validate.startTime'))
                } else {
                    if (!params.deposit || params.deposit <= 0) throw new Error(this.$t('createstream.validate.deposit'))
                    if (!this.dateTime || this.dateTime[0] <= moment()) throw new Error(this.$t('createstream.validate.dateTime'))
                }
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


