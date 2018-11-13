const Lnd = require('../config')

let config = {
    host: '127.0.0.10',
    port: 11111,
    name: 'test',
    config: './lnd.conf'
}

let lnd = new Lnd(config)

console.log('test config all 5 parameters', (lnd.user=='user' && lnd.password=='pass'&& lnd.port==11111 && lnd.host=='127.0.0.10'
            && lnd.macaroonPath == '/home/dummyuser/alice/data/bitcoin/simnet/admin.macaroon'
            && lnd.certPath == '/dummypath/.lnd/tls.cert'))

delete config.host
lnd = new Lnd(config)

console.log('test host from file', (lnd.host=='localhost'))

delete config.port
lnd = new Lnd(config)

console.log('test port from file', (lnd.port=='10001'))

