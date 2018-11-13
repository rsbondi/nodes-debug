const fs = require('fs')
const { BitcoinController } = require('../bitcoin/BitcoinController')
const path = require('path')
const Config = require('./config')
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader')
process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA'

const MonacoHandler = require('./monaco')

class LndController {
    constructor(cfg) {
        this.update(cfg)
    }

    static register(editor, resultEditor, store) {
        this.models = {}
        return MonacoHandler.register(editor, resultEditor, store, this.lang)
    }


    getInfo() {
        return new Promise((resolve, reject) => {
            resolve({})
        })
    }

    getPeers() {
        return new Promise((resolve, reject) => {
            resolve({})
        })
    }
    
    update(cfg) {
        this.id = cfg.index
        this._config = new Config(cfg)
        const setupGrpc = () => {
            let instance = this._createInstance()
        }
        
        setupGrpc()

    }

    getConsole() {
        return new Promise((resolve, reject) => {
            if(!this.constructor.models[this.id]) this._createConsole()
            resolve(this.constructor.models[this.id])
        })
    }

    ping() { return this._postRPC({method: 'ping'})}


    _createConsole() {
        this.constructor.models[this.id] = {
            command: monaco.editor.createModel('', this.constructor.lang),
            result:  monaco.editor.createModel('', 'javascript')
        }
    }

    _createInstance() {
        const m = fs.readFileSync(this._config.macaroonPath);
        const macaroon = m.toString('hex');
        
        let metadata = new grpc.Metadata()
        metadata.add('macaroon', macaroon)
        const macaroonCreds = grpc.credentials.createFromMetadataGenerator((_args, callback) => {
            callback(null, metadata);
        });
        
        const lndCert = fs.readFileSync(this._config.certPath);
        const sslCreds = grpc.credentials.createSsl(lndCert);
        
        const credentials = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
        
        const packageDefinition = protoLoader.loadSync(`${__dirname}/rpc.proto`);

        const lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
        //const loadPackageDefinition
        const lnrpc = lnrpcDescriptor.lnrpc;
        const instance = new lnrpc.Lightning(`${this._config.host}:${this._config.port}`, credentials);
        instance.listPeers({}, function (err, response) {
            console.log('Peers:', JSON.stringify(response));
        });

        //return instance
    
    }

    _postRPC() {
        return new Promise((resolve, reject) => {
            resolve({})
        })
    }

}

LndController.lang = 'lnd-rpc'

module.exports = {
    type: 'lnd',
    controller: LndController
}