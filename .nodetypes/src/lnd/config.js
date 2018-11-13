const fs = require('fs')
const os = require('os')
const path = require('path')

class Config {
    constructor(cfg) {
        const tilde = cfg && cfg.config.replace('~', os.homedir())
        const config = tilde && (fs.readFileSync(tilde || `${os.homedir()}/.lnd/lnd.conf`, 'utf8'));
        let rpcport, rpchost
        config.split('\n').forEach(line => {
            let rpcuser = line.match(/^[a-z]+\.rpcuser\s?=\s?([^#]+)$/)
            if (rpcuser) this._user = rpcuser[1]
            let rpcpass = line.match(/^[a-z]+\.rpcpass(word)?\s?=\s?([^#]+)$/)
            if (rpcpass) this._password = rpcpass[2]
            let rpclisten = line.match(/^\s?rpclisten\s?=\s?([^:]+):([0-9]+)/)
            if (rpclisten) {
                rpchost = rpclisten[1]
                rpcport = rpclisten[2]
            }
            let datadir = line.match(/^\s?datadir\s?=\s?([^#]+)$/)
            if (datadir) {
                const coin = "bitcoin" // TODO: get from config
                const network = 'simnet' // TODO: get from config
                const datadirectory = datadir[1]
                this._macaroonPath = path.join(datadirectory, coin, network, 'admin.macaroon')
            }
        })
        this._port = cfg && cfg.port || rpcport || '10009'
        this._host = cfg && cfg.host || rpchost || '127.0.0.1'
    }
}

module.exports = Config