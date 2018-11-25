<template>
  <div>
    <h3>Node</h3>
    <div class="info-group">
      <div class="label">Alias</div>
      <div class="value">{{ renderData.alias }}</div>
    </div>
    <div class="info-group">
      <div class="label">ID</div>
      <div class="value">{{ renderData.id }}</div>
    </div>
    <div class="info-group">
      <div class="label">Version</div>
      <div class="value">{{ renderData.version }}</div>
    </div>
    <div class="info-group">
      <div class="label">Pending Channels</div>
      <div class="value">{{ renderData.num_pending_channels }}</div>
    </div>
    <div class="info-group">
      <div class="label">Active Channels</div>
      <div class="value">{{ renderData.num_active_channels }}</div>
    </div>
    <div class="info-group">
      <div class="label">Inactive Channels</div>
      <div class="value">{{ renderData.num_inactive_channels }}</div>
    </div>
    <div class="info-group">
      <div class="label">Peers</div>
      <div class="value">{{ renderData.num_peers }}</div>
    </div>
    <div class="info-group">
      <div class="label">Block Height</div>
      <div class="value">{{ renderData.blockheight }}</div>
    </div>
    <div class="info-group">
      <div class="label">Network</div>
      <div class="value">{{ renderData.network }}</div>
    </div>

    <h3>Wallet</h3>
    <div class="info-group">
      <div class="label">Balance</div>
      <div class="value">{{ balance }}</div>
    </div>
    <div class="info-group">
      <div class="label">Confirmed</div>
      <div class="value">{{ confirmed }}</div>
    </div>
    <div class="info-group">
      <div class="label">Unconfirmed</div>
      <div class="value">{{ unconfirmed }}</div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'clightning-info',
    props: ['renderData'],
    data() {
      return {
        balance: 0,
        confirmed: 0,
        unconfirmed: 0
      }
    },
     watch: { 
      renderData: function(newVal, oldVal) { 
        let b = 0, c = 0, u = 0
        newVal.outputs.forEach(o => {
          b += o.value
          if(o.status == 'confirmed') c += o.value
          else u += o.value
        })
        this.balance = b
        this.confirmed = c
        this.unconfirmed = u
      }
     }
   
  }

</script>
