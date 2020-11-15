import {shallowMount} from '@vue/test-utils'
import HelloWorld from '@/components/HelloWorld.vue'

describe('HelloWorld.vue', () => {
    let wrapper
    let vm

    const propsData = {
        msg: 'new message'
    }
    beforeEach(() => {
        wrapper = shallowMount(HelloWorld, {
            propsData,
        })
        vm = wrapper.vm
    }),
    it('renders props.msg when passed', () => {
        expect(wrapper.text()).toMatch(propsData.msg)
    })
    it('jestTestAdd', () => {
        expect(vm.jestTestAdd(1,2)).toBe(3)
    })
    it('jestTestAsync', async() => {
        expect(await vm.asyncFunc()).toBe('hello')
    })
})
