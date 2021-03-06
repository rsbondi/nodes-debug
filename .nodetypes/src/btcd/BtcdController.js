const { BitcoinController } = require('../bitcoin/BitcoinController')

class BtcdController extends BitcoinController {
    static register(editor, resultEditor, store) {
        if(window.controllerInstances[store.state.Nodes.currentIndex]._notls) 
            return super.register(editor, resultEditor, store)

        return new Promise((resolve, reject) => {
            BtcdController.registerInfo = {
                resolve: resolve, reject: reject, editor: editor, resultEditor: resultEditor, store: store}
        })
    }

    static _register() {
        const inf = BtcdController.registerInfo
        if(!inf) return
        super.register(inf.editor, inf.resultEditor, inf.store).then(r => {
            BtcdController.emitter.emit('controller-ready')
            inf.resolve()
        })
    }

    _interval() {
        const self = this
        return new Promise((resolve, reject) => {
            function doInterval() {
                if(BtcdController.registered)
                    Promise.all([
                        self._getBlock(),
                        self._getMempool(),
                        self._getNetInfo(),
                        //self._getBanned(),
                        self._getPeerInfo()]
                    ).then(() => {
                        self._infoTime = new Date().getTime()
                        resolve(Object.assign({}, self._info))  // assign to isolate from store
                    }).catch(reject)
                else    
                    setTimeout(doInterval, 100)
            }
            doInterval()
        })
    }

    getPeers() {
        return new Promise((resolve, reject) => {
            Promise.all(
                [this._postRPC({ method: 'getpeerinfo' })
                    
                ]
            ).then((arr) => resolve({ peers: arr[0].data.result}))
                .catch(reject)
        })
    }

    _getNetInfo() {
        const self = this
        return new Promise(async (resolve, reject) => {
            try {
                const js = await self._postRPC({
                    method: "getinfo"
                })
                try {
                    
                    this._info.version = js.data.result.version
                    this._info.subversion = js.data.result.protocolversion
                    resolve()
                } catch(wtf) {resolve('network error')}
            } catch (e) { resolve() }
        })

    }

    _handleNotification (text)  {
        const model = this.constructor.models[this.id]
        if(!model) return
        const lineCount = model.result.getLineCount();
        const lastLineLength = model.result.getLineMaxColumn(lineCount);
    
        const range = new monaco.Range(lineCount, lastLineLength, lineCount, lastLineLength);
    
        model.result.pushEditOperations([new monaco.Selection(1, 1, 1, 1)],
                        [{ range: range, text: "/* NOTIFICATION */\n"+text }],
                        () => [new monaco.Selection(model.result.getLineCount(),0,model.result.getLineCount(),0)])
        if(this.constructor._store.state.Nodes.currentIndex == this.id)
            this.constructor.resultEditor.revealPosition({ lineNumber: this.constructor.resultEditor.getModel().getLineCount(), column: 0 })
    }

    update(cfg) {
        fs = require('fs')
        const os = require('os')
        this._host = cfg && cfg.host || '127.0.0.1'
        this._info = {}
        this._infoTime = 0
        this._notls = 0
        this.id = cfg.index
        const config = fs.readFileSync(cfg && cfg.config.replace('~', os.homedir()) || `${os.homedir()}/.btcd/btcd.conf`, 'utf8');
        let rpcport
        config.split('\n').forEach(line => {
            let rpcuser = line.match(/^\s?rpcuser\s?=\s?([^#]+)$/)
            if (rpcuser) this._user = rpcuser[1]
            let rpcpass = line.match(/^\s?rpcpass\s?=\s?([^#]+)$/)
            if (rpcpass) this._password = rpcpass[1]
            let port = line.match(/^\s?rpcport\s?=\s?([^#]+)$/)
            if (port) rpcport = port[1]
            let notls = line.match(/^\s?notls\s?=\s?([^#]+)$/)
            if (notls) this._notls = notls[1]
        })
        this._port = cfg && cfg.port || rpcport || '8332'

        if(!this._notls) {
            var fs = require('fs');
            var cert = fs.readFileSync(`${os.homedir()}/.btcd/rpc.cert`);
            var WebSocket = require('ws');
            let self = this

            function setupWebsocket() {

                const ws = new WebSocket(`wss://${self._host}:${self._port}/ws`, {
                  headers: {
                    'Authorization': 'Basic '+new Buffer.from(`${self._user}:${self._password}`).toString('base64')
                  },
                  cert: cert,
                  ca: [cert]
                });
                ws.on('open', () => {
                    if(!BtcdController.registered) {
                        BtcdController._register()
                        BtcdController.registered = true
                    }
                });
    
                function _resolve(key, obj) {
                    self.wspromises[key].resolve({data: obj})
                    self.wspromises[key] = undefined
                }
                ws.on('message', (data, flags) => {
                    const obj = JSON.parse(data)
                    const key = obj.id
                    if(self.wspromises && self.wspromises[key]) {
                        _resolve(key, obj)
                    } else if(self.constructor.resultEditor) {
                        self._handleNotification(JSON.stringify(JSON.parse(data), null, 2)+"\n\n")
                    }
                });
                ws.on('error', (derp) => {
                  console.log('ERROR:' + derp);
                })
                ws.on('close', (data) => {
                  console.log('DISCONNECTED');
                  setTimeout(setupWebsocket, 5000)
                })    
                
                self._ws = ws
                self.wspromises = {}
            }
            
            setupWebsocket()
        }

    }

    _postRPC(payload) {
        if(this._notls) return super._postRPC(payload) 
        else {
            var self = this

            function promiseFunction(resolve, reject) {
                payload.jsonrpc = "1.0"
                payload.params = payload.params || []
                payload.id = payload.method
                self._ws.send(JSON.stringify(payload))
                self.wspromises[payload.method] = {resolve: resolve, reject: reject}
                setTimeout(() => {
                    if(self.wspromises[payload.method]) {
                        self.wspromises[payload.method].reject('CONNECTION ERROR')
                        self.wspromises[payload.method] = undefined
                        self.online = false
                    }
                }, 5000)
            }

            let promise = new Promise(promiseFunction)        
            .then(d => { this.online = true; return d})
            .catch(e => {
                self.online = false
                self.wspromises[payload.method] = undefined
                return e.response
            })
    
            return promise
        }
    }
}

BtcdController.lang = 'btcd-rpc'
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
BtcdController.emitter = new MyEmitter()

module.exports = {
    type: 'btcd',
    controller: BtcdController
}