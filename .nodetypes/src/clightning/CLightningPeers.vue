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
                  :default-sort = "{prop: 'remote_pubkey', order: 'ascending'}"
                  >
          <el-table-column sortable prop="node" label="Node"></el-table-column>

          <el-table-column sortable prop="short_channel_id" label="ID"></el-table-column>
          <el-table-column sortable prop="satoshis" label="Capacity"></el-table-column>
          <el-table-column sortable prop="balance" label="Balance"></el-table-column>
          <el-table-column sortable prop="mode" label="Privacy"></el-table-column>
          <el-table-column sortable prop="direction" label="Direction"></el-table-column>
          <el-table-column sortable prop="fee" label="Fee(base/per)"></el-table-column>


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
        this.peers = newVal.peers.peers.map(p => {
          return {
            id: p.id,
            addr: JSON.stringify(p.netaddr),
            connect: p.connected ? 'yes' : 'no'
          }
        })
        this.channels = newVal.chans.channels.map(c => {
          const chan = newVal.inf.channels.filter(ch => ch.short_channel_id == c.short_channel_id)
          return {
            node: c.source == newVal.inf.id ? c.destination : c.source,
            direction: c.source == newVal.inf.id ? 'out' : 'in',
            mode: c.public ? 'public' : 'private',
            current: c.active ? 'active' : 'inactive',
            short_channel_id: c.short_channel_id,
            satoshis: c.satoshis,
            fee: `${c.base_fee_millisatoshi}/${c.fee_per_millionth}`,
            balance: chan.length ? chan[0].channel_sat : 0
          }
        })
      }
    }
  }

/*
{
  "jsonrpc": "2.0",
  "id": "listchannels",
  "result": {
    "channels": [
      {
        "source": "030bd4a3961c2db7285a0eb7535f690be543c14fbab03fdd6ff93a5f32c75aecea",
        "destination": "036ff69f785964f009e9839266ac60e715263afb69612b2824cd7fb8b0695a889c",
        "short_channel_id": "629:1:0",
        "public": true,
        "satoshis": 3000000,
        "message_flags": 1,
        "channel_flags": 0,
        "flags": 256,
        "active": true,
        "last_update": 1543160485,
        "base_fee_millisatoshi": 1,
        "fee_per_millionth": 10,
        "delay": 6
      }
    ]
  }
}
*/
</script>

<style>
  .el-table .cell:first-child {
    white-space: nowrap
  }
</style>

