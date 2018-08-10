import Vue from 'vue'

const state = {
  currentType: 'bitcoin',
  currentIndex: 0,
  loadedTypes: [],
  instantiatedTypes: [],
  registeredTypes: [],
  controllers: {},
  controllerInstances: {
    0: {  // dummy contoller
      getInfo: () => new Promise(resolve => resolve({})),
      info: {},
      getPeers: () => new Promise(resolve => resolve([])),
      peers: {}
    } 
  },
  nodes: {},
  currentInfo: {},
  currentPeers: {},
  currentPage: 'info',
  loading: false,
  consoleReady: false
}

const mutations = {
  node_type_loaded (state, type) { 
    state.loadedTypes = state.loadedTypes.concat([type]) 
  },
  node_controller_type_loaded (state, controllerinfo) {
    if(!state.controllers[controllerinfo.type]) state.controllers[controllerinfo.type] = controllerinfo.controller
  },
  node_controller_type_instantiated (state, type) {
    state.instantiatedTypes = state.instantiatedTypes.concat([type]) 
  },
  node_controller_type_registered (state, type) {
    state.registeredTypes = state.registeredTypes.concat([type]) 
  },
  node_type_changed (state, type) { state.currentType = type },
  node_instantiate_controller (state, instanceInfo) {
    if(!state.controllerInstances[instanceInfo.index]) {
      state.controllerInstances[instanceInfo.index] = instanceInfo.controller
      this.commit('node_controller_type_instantiated', instanceInfo.type)
    }
  },
  node_add(state, nodeInfo) { Vue.set(state.nodes, nodeInfo.index, nodeInfo.node) },
  node_remove_all (state) { state.nodes =[] },
  node_remove (state, node) {
    state.nodes = Object.keys(state.nodes).reduce((o, c) => {
      if(c!=node) o[c] = state.nodes[c]
      return o
    }, {})
  },
  node_update_controller (state, node) { state.nodes[node.index] = node },
  node_set_index (state, index) { state.currentIndex = index },
  node_set_info (state, info) { state.currentInfo = info },
  node_set_peers (state, peers) { state.currentPeers = peers },
  node_set_console (state, con) { // mdels are mutable and mutate on every keystroke, so use window
    window.commandEditor.setModel(con.command)
    if(window.consoleStates[state.currentIndex]) window.commandEditor.restoreViewState(window.consoleStates[state.currentIndex].command)
    window.resultEditor.setModel(con.result)
    if(window.consoleStates[state.currentIndex]) window.resultEditor.restoreViewState(window.consoleStates[state.currentIndex].result)

  }, 
  node_set_page (state, page) { state.currentPage = page },
  node_set_loading (state, loading) { state.loading = loading },
  console_ready (state, val) { state.consoleReady = val }
}

export default {
  state,
  mutations
}