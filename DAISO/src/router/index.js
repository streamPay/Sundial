import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Dashboard from '../views/Dashboard.vue'
import StreamInfo from '../views/StreamInfo.vue'
import CancelInfo from '../views/CancelInfo.vue'
import ProposalInfo from '../views/ProposalInfo.vue'

Vue.use(VueRouter)

const routes = [
    {
        path: '*',
        redirect: '/home'
    },
    {
        path: '/home',
        name: 'Home',
        display: '主页',
        component: Home,
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        display: '仪表盘',
        component: Dashboard,
    },
    {
        path: '/streamInfo',
        name: 'StreamInfo',
        display: '流信息',
        component: StreamInfo,
    },
    {
        path: '/cancelInfo',
        name: 'CancelInfo',
        display: '已取消',
        component: CancelInfo,
    },
    {
        path: '/proposalInfo',
        name: 'ProposalInfo',
        display: '仲裁详情',
        component: ProposalInfo,
    },
]

const router = new VueRouter({
    routes
})

export default router
