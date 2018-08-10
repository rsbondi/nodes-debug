<template>
  <div>
    <component v-bind:is="currentView" :render-data="$store.state.Nodes.currentPeers"></component>
  </div>
</template>

<script>
  import componentViewMixin from './common'

  export default {
    name: 'peers-page',
    data: () => {
      return {
        suffix: 'peers',
        mutation: 'node_set_peers',
        serviceName: 'getPeers',
      }
    },
    mixins: [componentViewMixin]
  }
</script>