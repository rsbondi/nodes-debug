import Vue from 'vue'

import App from './App'
import store from './store'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.config.productionTip = false

import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import locale from 'element-ui/lib/locale/lang/en'
import './css/app.css'

Vue.use(ElementUI, { locale })

/* eslint-disable no-new */
new Vue({
  components: { App },
  store,
  template: '<App/>',
}).$mount('#app')

