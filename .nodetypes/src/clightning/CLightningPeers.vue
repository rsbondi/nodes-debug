<template>
  <div>
    <el-row :gutter="15" type="flex">
      <el-col :span="24">
        <h2 class="newrow">Peer Connections</h2>
        <el-table :data="peers" 
                  highlight-current-row
                  :default-sort = "{prop: 'id', order: 'ascending'}"
                  >
          <el-table-column sortable prop="id" label="ID"></el-table-column>
          <el-table-column sortable prop="alias" label="Alias"></el-table-column>
          <el-table-column sortable prop="addr" label="Address"></el-table-column>
          <el-table-column sortable prop="connect" label="Connected"></el-table-column>
        </el-table>          
      </el-col>
    </el-row>
    <el-row :gutter="15" type="flex">
      <el-col :span="24">
        <h2 class="newrow">Channels</h2>
        <el-table :data="channels" 
                  highlight-current-row
                  :default-sort = "{prop: 'peer_id', order: 'ascending'}"
                  >
          <el-table-column sortable prop="peer_id" label="Node"></el-table-column>
          <el-table-column sortable prop="alias" label="Alias"></el-table-column>
          <el-table-column sortable prop="short_channel_id" label="ID"></el-table-column>
          <el-table-column sortable prop="channel_total_sat" label="Capacity"></el-table-column>
          <el-table-column sortable prop="liquidity" label="Remote"></el-table-column>
          <el-table-column sortable prop="channel_sat" label="Balance"></el-table-column>
        </el-table>          
      </el-col>
    </el-row>
  </div>
</template>

<script>
  export default {
    name: 'clightning-peers',
    props: ['renderData'],
    data() {
      return {
        peers: [],
        channels: []
      }
    },
    watch: { 
      renderData: function(newVal, oldVal) { 
        this.peers = (newVal.peers.peers || [])
        .map(p => {
          return {
            id: p.id,
            alias: p.alias, // this is sanitized in element ui
            addr: JSON.stringify(p.netaddr),
            connect: p.connected ? 'yes' : 'no'
          }
        })
        this.channels = (newVal.chans || []).map(c => {
          return {
            peer_id: c.peer_id,
            short_channel_id: c.short_channel_id,
            channel_total_sat: c.channel_total_sat,
            channel_sat: c.channel_sat,
            liquidity: c.channel_total_sat - c.channel_sat,
            alias: this.peers.filter(p => p.id == c.peer_id)[0].alias
          }
        })
      }
    }
  }

</script>

<style>
  .el-table .cell:first-child {
    white-space: nowrap
  }
</style>

