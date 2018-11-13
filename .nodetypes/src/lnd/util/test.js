const Lnd = require('../config')

let config = {
    host: '127.0.0.10',
    port: 11111,
    name: 'test',
    config: './lnd.conf'
}

let lnd = new Lnd(config)

console.log('test config all 4 parameters', (lnd._user=='user' && lnd._password=='pass'&& lnd._port==11111 && lnd._host=='127.0.0.10'
            && lnd._macaroonPath == '/home/dummyuser/alice/data/bitcoin/simnet/admin.macaroon'))

delete config.host
lnd = new Lnd(config)

console.log('test host from file', (lnd._host=='localhost'))

delete config.port
lnd = new Lnd(config)

console.log('test port from file', (lnd._port=='10001'))

