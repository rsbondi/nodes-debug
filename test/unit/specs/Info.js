import Vue from 'vue'
import Info from '@/components/Info'

describe('Info.vue', () => {
  it('should be tested at some point, stay tuned', () => {
    const vm = new Vue({
      el: document.createElement('div'),
      render: h => h('i')
    }).$mount()

    expect(true).to.equal(true)
  })
})
