const { BitcoinController } = require('../bitcoin/BitcoinController')
const net = require('net');

class CLightningController extends BitcoinController {
    static register(editor, resultEditor, store) {
        return new Promise((resolve, reject) => {
            CLightningController.registerInfo = {
                resolve: resolve, reject: reject, editor: editor, resultEditor: resultEditor, store: store}
        })
    }

    static _register() {
        const inf = CLightningController.registerInfo
        if(!inf) return
        super.register(inf.editor, inf.resultEditor, inf.store).then(r => {
            CLightningController.emitter.emit('controller-ready')
            inf.resolve()
        })
    }

    static _setHelpers(response) {
        this._helpers = response.data.result.help.reduce((o, c, i) => {
            const pieces = c.command.split(' ')
            o.push({ command: pieces[0], help: pieces.length > 1 ? pieces.slice(1).join(' ') : '' , description: c.description})
            return o
        }, [])
    }

    static _setHoverHelp() {
        monaco.languages.registerHoverProvider(this.lang, {
            provideHover:  (model, position) => {
                let word = ''
                const wordAtPos = model.getWordAtPosition(position)
                if (wordAtPos) word = wordAtPos.word

                if (word && ~this._helpers.map(h => h.command).indexOf(word)) {
                    return {
                        contents: [
                            `**${word}**`,
                            { language: 'text', value: this._helpers.filter(h => h.command == word)[0].description }
                        ]
                    }
                }
            }
        });
    }

    static _setSignatureHelp() {
        monaco.languages.registerSignatureHelpProvider(this.lang, {
            provideSignatureHelp: (model, position) => {
                const getBlockIndex = (block) => {
                    let index = -1
                    let lineindex = block.reduce((o, c, i) => c.offset === 0 ? i : o, -1)
                    const tokens = monaco.editor.tokenize(block.map(b => b.text).join('\n'), this.lang)
                    let brackets = []
                    for (let i = 0; i <= lineindex; i++) {
                        const token = tokens[i]
                        token.forEach((t, ti) => {
                            const prevToken = ti === 0 ? i === 0 ? null : tokens[i - 1][tokens[i - 1].length - 1] : token[ti - 1]
                            switch (t.type) {
                                case `white.${this.lang}`:
                                    if (prevToken.type == `keyword.${this.lang}`) index = 0
                                    if (~[`number.${this.lang}`, `string.${this.lang}`, `identifier.${this.lang}`].indexOf(prevToken.type) && !brackets.length) index++
                                    break
                                case `bracket.square.open.${this.lang}`:
                                    brackets.unshift('square')
                                    break
                                case `bracket.square.close.${this.lang}`:
                                    brackets.shift('square')
                                    index++
                                    break

                            }
                        });
                    }
                    return index
                }
                
                const block = this._getCommandBlock(model, position)
                let word = ''
                if (block.length) word = block[0].text.split(' ')[0]
               
                
                if (word) {
                    if (block.length) word = block[0].text.split(' ')[0]
                    const index = getBlockIndex(block, position.column)

                    const helpItem = this._helpers.filter(h => h.command == word)
                    const helpParams = helpItem.length && helpItem[0].help.split(' ') || []
                    const params = helpParams.map(p => { return {label: p}})
                    if (index > -1 && index < params.length && helpItem.length)
                        return {
                            activeSignature: 0,
                            activeParameter: index,
                            signatures: [
                                {
                                    label: `${helpItem[0].command} ${helpItem[0].help}`,
                                    parameters: params
                                }
                            ]
                        }
                    else return {}

                }
                
                else return {}

            },
            signatureHelpTriggerCharacters: [' ', '\t', '\n']
        })
    }

    _interval() {
        return new Promise(async (resolve, reject) => {
            try {
                const inf = await this._postRPC({"method": "getinfo"})
                this._info = inf.data.result
                const funds = await this._postRPC({"method": "listfunds"})
                this._info = Object.assign(this._info, funds.data.result)
                resolve(this._info)
            } catch(e) {reject(e)}
        })
    }

    getPeers() {
        return new Promise((resolve, reject) => {
            resolve({})
        })
    }

    update(cfg) {
        const fs = require('fs')
        const os = require('os')
        this._info = {}
        this._infoTime = 0
        this.id = cfg.index
        let rpcFile
        let config 
        
        try {
            config = fs.readFileSync(cfg && cfg.config.replace('~', os.homedir()) || `${os.homedir()}/.lightning/config`, 'utf8');
        } catch (e) {config = ''}
        config.split('\n').forEach(line => {
            let rpcfile = line.match(/^\s?rpc-file\s?=\s?([^#]+)$/)
            if (rpcfile) rpcFile = rpcfile[1]
        })

        if(!rpcFile) rpcFile = `${os.homedir()}/.lightning/lightning-rpc`

        const setupSocket = () => {

            const sock = new net.createConnection(rpcFile);
            sock.on('connect', () => {
                if(!CLightningController.registered) {
                    CLightningController._register()
                    CLightningController.registered = true
                }
            });

            var _resolve = (key, obj) => {
                this.sockpromises[key].resolve({data: obj})
                this.sockpromises[key] = undefined
            }
            sock.on('data', (data) => {
                const response = typeof data == 'string' ? data : data.toString('utf8')
                const obj = JSON.parse(response)
                const key = obj.id
                if(this.sockpromises && this.sockpromises[key]) {
                    _resolve(key, obj)
                } 
            });
            sock.on('error', (derp) => {
                console.log('ERROR:' + derp);
            })
            sock.on('close', (data) => {
                console.log('DISCONNECTED');
                setTimeout(setupSocket, 5000)
            })    
            
            this._sock = sock
            this.sockpromises = {}
        }
        
        setupSocket()

    }

    _postRPC(payload) {
        var self = this

        function promiseFunction(resolve, reject) {
            payload.jsonrpc = "2.0"
            payload.params = payload.params || []
            payload.id = payload.method
            self._sock.write(JSON.stringify(payload))
            self.sockpromises[payload.method] = {resolve: resolve, reject: reject}
            setTimeout(() => {
                if(self.sockpromises[payload.method]) {
                    self.sockpromises[payload.method].reject('CONNECTION ERROR')
                    self.sockpromises[payload.method] = undefined
                    self.online = false
                }
            }, 5000)
        }

        let promise = new Promise(promiseFunction)        
        .then(d => { this.online = true; return d})
        .catch(e => {
            self.online = false
            self.sockpromises[payload.method] = undefined
            return e.response
        })

        return promise
    }
}

CLightningController.lang = 'btcd-rpc'
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
CLightningController.emitter = new MyEmitter()

module.exports = {
    type: 'clightning',
    controller: CLightningController
}