<template>
  <div>
    <el-row :gutter="15" type="flex">
      <el-col :span="24">
        <h2 class="newrow">Peer Connections</h2>
        <el-table :data="peers" 
                  highlight-current-row
                  :default-sort = "{prop: 'pub_key', order: 'ascending'}"
                  >
          <el-table-column sortable prop="pub_key" label="Pubkey"></el-table-column>
          <el-table-column sortable prop="address" label="Address"></el-table-column>
          <el-table-column sortable prop="ping_time" label="Ping"></el-table-column>
          <el-table-column sortable prop="bytes_sent" label="Bytes Sent"></el-table-column>
          <el-table-column sortable prop="bytes_recv" label="Bytes Received"></el-table-column>
          <el-table-column sortable prop="sat_sent" label="Satoshis Sent"></el-table-column>
          <el-table-column sortable prop="sat_recv" label="Satoshis Received"></el-table-column>
        </el-table>          
      </el-col>
    </el-row>
    <el-row :gutter="15" type="flex">
      <el-col :span="24">
        <h2 class="newrow">Channels</h2>
        <el-table :data="channels" 
                  highlight-current-row
                  :default-sort = "{prop: 'remote_pubkey', order: 'ascending'}"
                  >
          <el-table-column sortable prop="remote_pubkey" label="Pubkey"></el-table-column>
          <el-table-column sortable prop="channel_point" label="Channel Point"></el-table-column>
          <el-table-column sortable prop="chan_id" label="ID"></el-table-column>
          <el-table-column sortable prop="capacity" label="Capacity"></el-table-column>
          <el-table-column sortable prop="local_balance" label="Balance"></el-table-column>
          <el-table-column sortable prop="remote_balance" label="Remote Balance"></el-table-column>
        </el-table>          
      </el-col>
    </el-row>
  </div>
</template>

<script>

  export default {
    name: 'lnd-peers',
    props: ['renderData'],
    data() {
      return {
        peers: [],
        channels: []
      }
    },
    watch: { 
      renderData: function(newVal, oldVal) { 
        this.peers = newVal.peers.peers
        this.channels = newVal.chans.channels
      }
    }
  }
</script>

<style>
  .el-table .cell:first-child {
    white-space: nowrap
  }
</style>
