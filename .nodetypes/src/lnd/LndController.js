const fs = require('fs')
const { BitcoinController } = require('../bitcoin/BitcoinController')
const path = require('path')
const Config = require('./config')
const grpc = require('grpc');
const MonacoHandler = require('./monaco')

class LndController {
    constructor(cfg) {
        // super({})
        this.update(cfg)
    }

    // ping, execute, getConsole from base

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
        function setupGrpc() {

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