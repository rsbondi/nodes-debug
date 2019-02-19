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
          <el-table-column sortable prop="ping" label="Ping"></el-table-column>
          <el-table-column sortable :sort-method="sort_bytes_sent" prop="bytes_sent" label="Bytes Sent"></el-table-column>
          <el-table-column sortable :sort-method="sort_bytes_recv" prop="bytes_recv" label="Bytes Received"></el-table-column>
          <el-table-column sortable :sort-method="sort_sat_sent" prop="sat_sent" label="Satoshis Sent"></el-table-column>
          <el-table-column sortable :sort-method="sort_sat_recv" prop="sat_recv" label="Satoshis Received"></el-table-column>
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
          <el-table-column sortable :sort-method="sort_capacity" prop="capacity" label="Capacity"></el-table-column>
          <el-table-column sortable :sort-method="sort_local_balance" prop="local_balance" label="Balance"></el-table-column>
          <el-table-column sortable :sort-method="sort_remote_balance" prop="remote_balance" label="Remote Balance"></el-table-column>
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
        this.peers.forEach(p => p.ping = (p.ping_time/1000000).toFixed(6))
        this.channels = newVal.chans.channels
      }
    },
    methods: {
      intsort(a,b) {
        const aa = parseInt(a, 10)
        const bb = parseInt(b, 10)
        return aa > bb ? 1 : bb > aa ? -1 : 0
      },
      sort_bytes_sent(a, b) {
        return this.intsort(a.bytes_sent, b.bytes_sent)
      },
      sort_bytes_recv(a, b) {
        return this.intsort(a.bytes_recv, b.bytes_recv)
      },
      sort_sat_sent(a, b) {
        return this.intsort(a.sat_sent, b.sat_sent)
      },
      sort_sat_recv(a, b) {
        return this.intsort(a.sat_recv, b.sat_recv)
      },
      sort_capacity(a, b) {
        return this.intsort(a.capacity, b.capacity)
      },
      sort_local_balance(a, b) {
        return this.intsort(a.local_balance, b.local_balance)
      },
      sort_remote_balance(a, b) {
        return this.intsort(a.remote_balance, b.remote_balance)
      }
    }
  }
</script>

<style>
  .el-table .cell:first-child {
    white-space: nowrap
  }
</style>
