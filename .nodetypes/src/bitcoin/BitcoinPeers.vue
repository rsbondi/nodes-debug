<template>
  <div>
    <el-row :gutter="15" type="flex">
      <el-col :span="12">
        <h2 class="newrow">Peers</h2>
        <el-table :data="peers" 
                  highlight-current-row
                  :default-sort = "{prop: 'id', order: 'ascending'}"
                  >
          <el-table-column type="expand">
            <template slot-scope="props">
              <div>
                <div class="label">Whitelisted</div>
                <div class="value">{{ props.row.whitelisted }}</div>
              </div>
              <div>
                <div class="label">Direction</div>
                <div class="value">{{ props.row.inbound ? 'in' : 'out' }}</div>
              </div>
              <div>
                <div class="label">Version</div>
                <div class="value">{{ props.row.version }}</div>
              </div>
              <div>
                <div class="label">User Agent</div>
                <div class="value">{{ props.row.subver }}</div>
              </div>
              <div>
                <div class="label">Services</div>
                <div class="value">
                  <div v-for="s in props.row.serv" v-bind:key="s.val">{{ s.val }}</div></div>
              </div>
              <div>
                <div class="label">Starting Block</div>
                <div class="value">{{ props.row.startingheight }}</div>
              </div>
              <div>
                <div class="label">Synced Headers</div>
                <div class="value">{{ props.row.synced_headers }}</div>
              </div>
              <div>
                <div class="label">Synced Blocks</div>
                <div class="value">{{ props.row.synced_blocks }}</div>
              </div>
              <div>
                <div class="label">Ban Score</div>
                <div class="value">{{ props.row.banscore }}</div>
              </div>
              <div>
                <div class="label">Connection Time</div>
                <div class="value">{{ props.row.howlong }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column sortable prop="id" label="Node Id"></el-table-column>
          <el-table-column sortable prop="addr" label="Service"></el-table-column>
          <el-table-column sortable prop="subver" label="User Agent"></el-table-column>
          <el-table-column sortable prop="pingtime" label="Ping"></el-table-column>
        </el-table>          
      </el-col>
      <el-col :span="12">
        <h2 class="newrow">Banned Peers</h2>
        <el-table :data="banned" empty-text="No Banned Peers">
          <el-table-column sortable prop="address" label="IP/Netmask"></el-table-column>
          <el-table-column sortable prop="until" label="Banned Until"></el-table-column>
        </el-table>
      </el-col>
    </el-row>
  </div>
</template>

<script>
  const Services = { 
    [0]: 'NODE_NONE',
    [(1 << 0)]: 'NODE_NETWORK',
    [(1 << 1)]: 'NODE_GETUTXO',
    [(1 << 2)]: 'NODE_BLOOM',
    [(1 << 3)]: 'NODE_WITNESS',
    [(1 << 4)]: 'NODE_XTHIN',
    [(1 << 10)]: 'NODE_NETWORK_LIMITED'
    }
  function NA(num) { // TODO: wrap some values with this
    return num == -1 ? 'N/A' : num
  }

  function HHMMSS(secs) {
    const seconds = Math.floor(secs)
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const sec = Math.floor(seconds % 60)
    return `${hours ? hours + 'h ' : ''}${mins ? mins + 'm ' : ''}${sec}s`
  }    

  export default {
    name: 'bitcoin-peers',
    props: ['renderData'],
    data() {
      return {
        selectedPeer: {},
        peers: [],
        banned: []
      }
    },
    methods: {
      peerSelect(p) {
        this.selectedPeer = p
      }
    },
    watch: { 
      renderData: function(newVal, oldVal) { 
        // need to calculate some values and update others so ref is not lost when expanded
        const existing = this.peers.map(p => p.id)
        newVal.peers.forEach(v => {
          const index = existing.indexOf(v.id)
          const s = parseInt(v.services, 16)
          v.serv = Object.keys(Services).reduce((o, c) => {
            if (s & c) o.push({val: Services[c]})
            return o
          }, [])
          if(!v.services.length) v.services = [{val: "None"}]
          v.howlong = HHMMSS((new Date().getTime()) / 1000 - v.conntime)
          if(index > -1) {
            // update
            const p = this.peers[index]
            Object.keys(v).forEach(k => p[k] = v[k])
          } else this.peers.push(v)
        })
        const currentIds = newVal.peers.map(n => n.id)
        for(let i = this.peers.length - 1; i > -1; i--) {
          if(!~currentIds.indexOf(this.peers[i].id)) this.peers.splice(i, 1)
        }
        const banned = Object.assign([], newVal.banned)
        banned.forEach(b => b.until = (new Date(b.banned_until*1000)).toISOString())
        this.banned = banned
      }
    }
  }

</script>
