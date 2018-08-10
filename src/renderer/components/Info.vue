<template>
  <div id="wrapper">
    <main>
      <div class="left-side">
        <component v-bind:is="currentView" :render-data="$store.state.Nodes.currentInfo"></component>
      </div>
    </main>
  </div>
</template>

<script>
  import componentViewMixin from './common'

  export default {
    name: 'info-page',
    data: () => {
      return {
        suffix: 'info',
        mutation: 'node_set_info',
        serviceName: 'getInfo',
      }
    },
    mixins: [componentViewMixin],
  }
</script>

