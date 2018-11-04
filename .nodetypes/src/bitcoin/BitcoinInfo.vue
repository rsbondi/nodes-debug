<template>
  <div>
    <h3>General</h3>
    <div class="info-group">
      <div class="label">Client Version</div>
      <div class="value">{{ version }}</div>
    </div>
    
    <div class="info-group">
      <div class="label label2">User Agent</div>
      <div class="value">{{  renderData.subversion }}</div>
    </div>
    
        
    <h3>Network</h3>
    <div class="info-group">
      <div class="label">Name</div>
      <div class="value">{{  renderData.chain }}</div>
    </div>
  
    <div class="info-group">
      <div class="label">Connections</div>
      <div class="value">{{  renderData.netconnections }}</div>
    </div>
  
    <h3>Blockchain</h3>
    <div class="info-group">
      <div class="label">Number of Blocks </div>
      <div class="value">{{  renderData.blocks }}</div>
    </div>
  
    <div class="info-group">
      <div class="label">Last Block Time</div>
      <div class="value">{{  blocktime }}</div>
    </div>
  
    <h3>Mempool</h3>
    <div class="info-group">
      <div class="label">Number of transaction </div>
      <div class="value">{{  renderData.memnum }}</div>
    </div>
    
    <div class="info-group">
      <div class="label">Memory Usage</div>
      <div id="mem-usage" class="value">{{  renderData.memusage }}</div>
    </div>
</div>
</template>

<script>
  const MAJOR = 1000000
  const MINOR = 10000
  const REV = 100
  const BUILD = 1

  export default {
    name: 'bitcoin-info',
    props: ['renderData'],
    computed: {
      blocktime() {
        return (new Date(this.$props.renderData.blocktime * 1000)).toString()
      },
      version() {
        const myver = this.$props.renderData.version
        const major = Math.floor(myver / MAJOR)
        const minor = Math.floor((myver - major * MAJOR) / MINOR)
        const rev = Math.floor((myver - major * MAJOR - minor * MINOR) / REV)
        const build = Math.floor((myver - major * MAJOR - minor * MINOR - rev * REV) / BUILD)

        return `v${major}.${minor}.${rev}${build ? '.' + build : ''}`
        
      }
    }
  }
</script>
