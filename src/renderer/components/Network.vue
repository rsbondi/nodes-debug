<template>
  <div>
    <h2>Network</h2>
    <component v-bind:is="currentView"></component>
  </div>
</template>

<script>
  import Empty from './Empty'
  import Vue from 'vue'

  export default {
    name: 'network-page',
    computed: {
      currentView() {
        const currentType = this.$store.state.Nodes.currentType
        const loaded = this.$store.state.Nodes.loadedTypes
        return loaded.length && ~loaded.indexOf(currentType) ? currentType + '-network' : 'empty'
      }
    },
    components: { Empty },    
  }
</script>