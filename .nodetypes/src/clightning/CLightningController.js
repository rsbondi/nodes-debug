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
        if(!this._aliases) this._aliases = {}

        return new Promise(async (resolve, reject) => {
            try {
                const p = await this._postRPC({"method": "listpeers"})
                const peers = p.data.result
                const chan = await this._postRPC({"method": "listfunds"})
                for(let i=0; i<peers.peers.length; i++) {
                    const id = peers.peers[i].id
                    if(this._aliases[id]) peers.peers[i].alias = this._aliases[id]
                    else {
                        const node = await this._postRPC({method: "listnodes", params: [id]})
                        const alias = node.data.result.nodes.length && node.data.result.nodes[0].alias || ""
                        peers.peers[i].alias = alias
                        if(alias) this._aliases[id] = alias
                    }
                }
                const chans = chan.data.result.channels
                const inf = this._info
                resolve({peers, chans, inf})
            } catch(e) {reject(e)}
        })
    }

    _handleNotification (text)  {
        console.log('notification', text)

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
        const fs = require('fs')
        const os = require('os')
        this._info = {}
        this._infoTime = 0
        this.id = cfg.index
        let rpcFile, lightningDir
        let config 
        
        try {
            config = fs.readFileSync(cfg && cfg.config.replace('~', os.homedir()) || `${os.homedir()}/.lightning/config`, 'utf8');
        } catch (e) {config = ''}
        config.split('\n').forEach(line => {
            let rpcfile = line.match(/^\s?rpc-file\s?=\s?([^#]+)$/)
            if (rpcfile) rpcFile = rpcfile[1]
            let ldir = line.match(/^\s?lightning-dir\s?=\s?([^#]+)$/)
            if (ldir) lightningDir = ldir[1]
        })

        if(!rpcFile) rpcFile = `lightning-rpc`
        if(!lightningDir) lightningDir = `${os.homedir()}/.lightning`
        rpcFile =`${lightningDir}/${rpcFile}`

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

            let jsonBuild = ""
            sock.on('data', (data) => {
                const response = typeof data == 'string' ? data : data.toString('utf8')
                jsonBuild += response
                if (jsonBuild.slice(-2) === "\n\n") {
                    const obj = JSON.parse(jsonBuild)
                    const key = obj.id
                    if(this.sockpromises && this.sockpromises[key]) {
                        _resolve(key, obj)
                    } else if(this.constructor.resultEditor) {
                        this._handleNotification(JSON.stringify(JSON.parse(data), null, 2)+"\n\n")
                    }
                    jsonBuild = ""
                }
            });
            sock.on('error', (derp) => {
                jsonBuild = ""
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
        const promiseFunction = (resolve, reject) => {
            payload.jsonrpc = "2.0"
            payload.params = payload.params || []
            payload.id = payload.method
            this._sock.write(JSON.stringify(payload))
            this.sockpromises[payload.method] = {resolve: resolve, reject: reject}
            setTimeout(() => {
                if(this.sockpromises[payload.method]) {
                    this.sockpromises[payload.method].reject('CONNECTION ERROR')
                    this.sockpromises[payload.method] = undefined
                    this.online = false
                }
            }, 5000)
        }

        let promise = new Promise(promiseFunction)        
        .then(d => { this.online = true; return d})
        .catch(e => {
            this.online = false
            this.sockpromises[payload.method] = undefined
            return e.response
        })

        return promise
    }
}

CLightningController.lang = 'clightning-rpc'
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
CLightningController.emitter = new MyEmitter()

module.exports = {
    type: 'clightning',
    controller: CLightningController
}