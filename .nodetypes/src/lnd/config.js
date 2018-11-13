const fs = require('fs')
const os = require('os')
const path = require('path')

class Config {
    constructor(cfg) {
        const tilde = cfg && cfg.config.replace('~', os.homedir())
        const config = tilde && (fs.readFileSync(tilde || `${os.homedir()}/.lnd/lnd.conf`, 'utf8'));
        let rpcport, rpchost
        config.split('\n').forEach(line => {
            let rpcuser = line.match(/^[a-z]+\.rpcuser\s?=\s?([^(#|\s)]+)[#\s)]?/)
            if (rpcuser) {this.user = rpcuser[1]; return}
            let rpcpass = line.match(/^[a-z]+\.rpcpass(word)?\s?=\s?([^(#|\s)]+)[#\s)]?/)
            if (rpcpass) {this.password = rpcpass[2]; return}
            let rpclisten = line.match(/^\s?rpclisten\s?=\s?([^:]+):([0-9]+)/)
            if (rpclisten) {
                rpchost = rpclisten[1]
                rpcport = rpclisten[2]
                return
            }
            let macaroonPath = line.match(/^\s?adminmacaroonpath\s?=\s?([^(#|\s)]+)[#\s)]?/)
            if (macaroonPath) { this.macaroonPath = macaroonPath[1]; return } 
            let certPath = line.match(/^\s?tlscertpath\s?=\s?([^(#|\s)]+)[#\s)]?/)
            if (certPath) { this.certPath = certPath[1]; return } 
        })
        this.port = cfg && cfg.port || rpcport || '10009'
        this.host = cfg && cfg.host || rpchost || '127.0.0.1'
        if(!this.macaroonPath) this.macaroonPath = `${os.homedir()}/.lnd/data/chain/bitcoin/simnet/admin.macaroon`
        if(!this.certPath) this.certPath = `${os.homedir()}/.lnd/tls.cert`
    }
}

module.exports = Config