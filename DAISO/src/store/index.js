import Vue from 'vue'
import Vuex from 'vuex'
import mutations from './common/mutations'
import state from './common/state'
import getters from './common/getters'

Vue.use(Vuex)

export default new Vuex.Store({
    state,
    mutations,
    getters,
})