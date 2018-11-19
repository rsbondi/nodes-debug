<template>
  <div>
    <h3>Node</h3>
    <div class="info-group">
      <div class="label">Alias</div>
      <div class="value">{{ renderData.alias }}</div>
    </div>
    <div class="info-group">
      <div class="label">Pubkey</div>
      <div class="value">{{ renderData.identity_pubkey }}</div>
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

    <h3>Chain</h3>
    <div class="info-group">
      <div class="label">Block Height</div>
      <div class="value">{{ renderData.block_height }}</div>
    </div>
    <div class="info-group">
      <div class="label">Block Hash</div>
      <div class="value">{{ renderData.block_hash }}</div>
    </div>
    <div class="info-group">
      <div class="label">Synced</div>
      <div class="value">{{ renderData.synced_to_chain }}</div>
    </div>
    <div class="info-group">
      <div class="label">Testnet</div>
      <div class="value">{{ renderData.testnet }}</div>
    </div>
    <div class="info-group">
      <div class="label">Chains</div>
      <div class="value">{{ JSON.stringify(renderData.chains) }}</div>
    </div>

    <h3>Wallet</h3>
    <div class="info-group">
      <div class="label">Balance</div>
      <div class="value">{{ renderData.total_balance }}</div>
    </div>
    <div class="info-group">
      <div class="label">Confirmed</div>
      <div class="value">{{ renderData.confirmed_balance }}</div>
    </div>
    <div class="info-group">
      <div class="label">Unconfirmed</div>
      <div class="value">{{ renderData.unconfirmed_balance }}</div>
    </div>

  </div>
</template>

<script>

  export default {
    name: 'lnd-info',
    props: ['renderData'],
  }
</script>
