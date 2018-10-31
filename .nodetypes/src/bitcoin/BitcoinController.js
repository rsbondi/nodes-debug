const axios = require('axios') // ajax
const fs = require('fs')
const os = require('os')

class BitcoinController {

    constructor(cfg) {
        this.update(cfg)
    }

    _interval() {
        return new Promise((resolve, reject) => {
            Promise.all([
                this._getBlock(),
                this._getMempool(),
                this._getBanned(),
                this._getPeerInfo()]
            ).then(() => {
                this._infoTime = new Date().getTime()
                resolve(Object.assign({}, this._info))  // assign to isolate from store
            }).catch(reject)

        })
    }

    _getNetInfo() {
        return new Promise(async (resolve, reject) => {
            try {
                const js = await this._postRPC({
                    method: "getnetworkinfo"
                })
                try {
                    this._info.version = js.data.result.version
                    this._info.subversion = js.data.result.subversion
                    resolve()
                } catch(wtf) {resolve('network error')}
            } catch (e) { resolve() }
        })

    }

    _getMempool() {
        return new Promise(async (resolve, reject) => {
            try {
                const pool = await this._postRPC({
                    method: "getmempoolinfo",
                })
                this._info.memusage = pool.data.result.bytes
                this._info.memnum = pool.data.result.size
                resolve()
            } catch (e) { resolve() }
        })
    }

    _getBanned() {
        return new Promise(async (resolve, reject) => {
            try {
                let response = await this._postRPC({ method: 'listbanned' })
                let tbody = ''
                const peers = response.data.result
                this._banned = { banned: peers }
                resolve()
            } catch (e) { resolve() }
        })
    }

    _getPeerInfo() {
        return new Promise(async (resolve, reject) => {
            try {
                let response = await this._postRPC({ method: 'getpeerinfo' })
                const peers = response.data.result
                let con = { in: 0, out: 0 }
                peers.forEach(peer => {
                    if (peer.inbound) con.in++; else con.out++
                })
                this._info.netconnections = `${con.in + con.out} (in: ${con.in} / out: ${con.out})`
                this._peers = peers
                resolve()
            } catch (e) { resolve() }
        })
    }

    _getHelp() { // called once to load completion providers
        return this._postRPC({ method: 'help' })
    }

    _getBlock() {
        return new Promise(async (resolve, reject) => {
            try {
                const js = await this._postRPC({
                    method: "getblockchaininfo"
                })
                const block = await this._postRPC({
                    method: "getblock",
                    params: [js.data.result.bestblockhash]
                })
                this._info.chain = js.data.result.chain
                this._info.blocks = js.data.result.blocks
                this._info.blocktime = block.data.result.time
                resolve()

            } catch (e) { resolve() }
        })
    }

    _postRPC(payload) {
        payload.jsonrpc = "1.0"
        payload.id = payload.id || ""
        payload.params = payload.params || []
        return axios({
            url: `http://${this._host}:${this._port}`,
            method: 'post',
            withCredentials: true,
            auth: {
                username: this._user,
                password: this._password
            },
            data: payload
        })
        .then(d => { this.online = true; return d}).catch(e => {
            this.online = false
            return e.response
        })
    }

    _createConsole() {
        this.constructor.models[this.constructor.getIndex()] = {
            command: monaco.editor.createModel('', this.constructor.lang),
            result:  monaco.editor.createModel('', 'javascript')
        }
    }

    // interface

    execute(ed) {
        const val = this.constructor._getCommandBlock(ed.getModel(), ed.getPosition()).map(b => b.text).join(' ')
        const tokens = monaco.editor.tokenize(val, this.constructor.lang)[0]
        let chunks = val.split(' ')
        const method = chunks[0]
        let params = [], brackets = []
        if (chunks.length > 1) {
          try {
            tokens.forEach((t, ti) => {
                if(ti===0) return
                const prevToken =  tokens[ti-1] 
                const tokenVal = val.slice(t.offset, ti == tokens.length-1 ? val.length : tokens[ti+1].offset)
                if(prevToken.type ==`white.${this.constructor.lang}` || prevToken.type==`bracket.square.open.${this.constructor.lang}`) {
                    if((t.type==`bracket.square.open.${this.constructor.lang}` || t.type==`bracket.curly.open.${this.constructor.lang}`))  {
                        brackets.unshift('')
                    } else if(!brackets.length) {
                        try {
                            params.push(JSON.parse(tokenVal))   
                        } catch(e) {console.log('invalid JSON', tokenVal)}
                    }                 
                }
                if(brackets.length && t.type != `white.${this.constructor.lang}`) {
                     brackets[0]+= tokenVal
                     if((t.type==`bracket.square.close.${this.constructor.lang}` || t.type==`bracket.curly.close.${this.constructor.lang}`)) {
                         if(brackets.length == 1) {
                            const done = brackets.shift() 
                            try {
                                params.push(JSON.parse(done))
                            } catch(e) {console.log('invalid JSON', done)}
                         } else {
                           const raw = brackets.shift()
                           brackets[0] += raw
                         }
                     }
                     
                }
            });
    
          } catch (err) {
            this.constructor.appendToEditor(`${err}\n\n`)
            return
          }
        }
        this._postRPC({ method: method, params: params }).then(response => {
          let content = '// '+method+' '+params.map(p => JSON.stringify(p)).join(' ') + '\n'
          content += JSON.stringify(response.data || response.error, null, 2) + '\n\n'
          this.constructor.appendToEditor(content)
        }).catch(err => console.log)
        return null;
    }

    ping() { return this._postRPC({method: 'ping'})}

    getConsole() {
        return new Promise((resolve, reject) => {
            if(!this.constructor.models[this.constructor.getIndex()]) this._createConsole()
            resolve(this.constructor.models[this.constructor.getIndex()])
        })
    }

    getInfo() {
        return this._interval()
    }

    getNetwork() {
        // console.log('get bitcoin network')
    }

    getPeers() {
        return new Promise((resolve, reject) => {
            Promise.all(
                [this._postRPC({ method: 'getpeerinfo' })
                    , this._postRPC({ method: 'listbanned' })
                ]
            ).then((arr) => resolve({ peers: arr[0].data.result, banned: arr[1].data.result }))
                .catch(reject)
        })
    }

    update(cfg) {
        this._host = cfg && cfg.host || '127.0.0.1'
        this._info = {}
        this._infoTime = 0
        const config = fs.readFileSync(cfg && cfg.config.replace('~', os.homedir()) || `${os.homedir()}/.bitcoin/bitcoin.conf`, 'utf8');
        let rpcport
        config.split('\n').forEach(line => {
            let rpcuser = line.match(/^\s?rpcuser\s?=\s?([^#]+)$/)
            if (rpcuser) this._user = rpcuser[1]
            let rpcpass = line.match(/^\s?rpcpassword\s?=\s?([^#]+)$/)
            if (rpcpass) this._password = rpcpass[1]
            let port = line.match(/^\s?rpcport\s?=\s?([^#]+)$/)
            if (port) rpcport = port[1]
        })
        this._port = cfg && cfg.port || rpcport || '8332'

        this._getNetInfo()
    }

    static _getHelpContent (key) {
        if (!~this._helpers.map(h => h.command).indexOf(key)) {
            return new Promise(resolve => resolve({ results: [] }))
        }
        if (this.helpContent[key]) {
            let promise = new Promise((resolve, reject) => {
                resolve(this.helpContent[key])
            })
            return promise
        } else return window.controllerInstances[this._store.state.Nodes.currentIndex]._postRPC({ method: 'help', params: [key] }).then(resp => {
            this.helpContent[key] = resp
            return resp
        })
    }

    static getIndex()  {
        return this._store.state.Nodes.currentIndex
    }

    static _getCommandBlock (model, position) {
        let line = position.lineNumber, wordAtPos, word = ''
        let block = model.getLineContent(line) ? [] : [{text:''}] // keep block alive on enter
        let tmpline
        while(tmpline = model.getLineContent(line)) {
            wordAtPos = model.getWordAtPosition({lineNumber: line, column: 1})
            block.unshift({text: model.getLineContent(line), offset: line - position.lineNumber})
            if(wordAtPos) word = wordAtPos.word
            if(word) {
                if(~this._helpers.map(w => w.command).indexOf(word)) break;
            }
            line--
            if(line===0) break
        }
        line = position.lineNumber + 1
        if(line > model.getLineCount()) return block
        while(tmpline = model.getLineContent(line)) {
            wordAtPos = model.getWordAtPosition({lineNumber: line, column: 1})
            if(wordAtPos && ~this._helpers.map(w => w.command).indexOf(wordAtPos.word)) break;
            tmpline = tmpline.replace(/^\s+/,'')
            if(!tmpline) break;
            block.push({text: model.getLineContent(line), offset: line - position.lineNumber})
            line++
            if(line > model.getLineCount()) break
        }
        return block
    }

    static appendToEditor (text)  {
        const lineCount = this.resultEditor.getModel().getLineCount();
        const lastLineLength = this.resultEditor.getModel().getLineMaxColumn(lineCount);
    
        const range = new monaco.Range(lineCount, lastLineLength, lineCount, lastLineLength);
    
        this.resultEditor.updateOptions({ readOnly: false })
        this.resultEditor.executeEdits('', [
        { range: range, text: text }
        ])
        this.resultEditor.updateOptions({ readOnly: true })
        this.resultEditor.setSelection(new monaco.Range(1, 1, 1, 1))
        this.resultEditor.revealPosition({ lineNumber: this.resultEditor.getModel().getLineCount(), column: 0 })
                
    }

    static register(editor, resultEditor, store) {
        return new Promise((resolve, reject) => {
            monaco.languages.register({ id: this.lang })
            this._store = store
            this.helpContent = {} // cache
            this.models = {} // models mutate on every keystroke and do not play well with vuex
            this.commandEditor = editor
            this.resultEditor = resultEditor
            window.controllerInstances[store.state.Nodes.currentIndex]._getHelp().then(response => {
                if(!response) { reject(); return }
                this._helpers = response.data.result.split('\n').reduce((o, c, i) => {
                    if (c && !c.indexOf('==') == 0) {
                        const pieces = c.split(' ')
                        o.push({ command: pieces[0], help: pieces.length > 1 ? pieces.slice(1).join(' ') : '' })
                    }
                    return o
                }, [])

                monaco.languages.setMonarchTokensProvider(this.lang, {
                    tokenizer: {
                        root: [
                            [/([a-zA-Z_\$][\w\$]*)(\s*)(:?)/, {
                                cases: { '$1@keywords': ['keyword', 'white', 'delimiter'], '@default': ['identifier', 'white', 'delimiter'] }
                            }],
                            [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
                            [/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
                            [/"/, 'string', '@string."'],
                            [/'/, 'string', '@string.\''],
                            [/\d+\.\d*(@exponent)?/, 'number.float'],
                            [/\.\d+(@exponent)?/, 'number.float'],
                            [/\d+@exponent/, 'number.float'],
                            [/0[xX][\da-fA-F]+/, 'number.hex'],
                            [/0[0-7]+/, 'number.octal'],
                            [/\d+/, 'number'],
                            // [/[{}\[\]]/, '@brackets'],
                            [/\[/, 'bracket.square.open'],
                            [/\]/, 'bracket.square.close'],
                            [/{/, 'bracket.curly.open'],
                            [/}/, 'bracket.curly.close'],
                            [/[ \t\r\n]+/, 'white'],
                            [/[;,.]/, 'delimiter'],
                            [/null/, 'null'],
                        ],
                        string: [
                            [/[^\\"']+/, 'string'],
                            [/@escapes/, 'string.escape'],
                            [/\\./, 'string.escape.invalid'],
                            [/["']/, {
                                cases: {
                                    '$#==$S2': { token: 'string', next: '@pop' },
                                    '@default': 'string'
                                }
                            }]
                        ],
                    },
                    keywords: this._helpers.map(h => h.command), //.concat('true', 'false', 'null',),
                    exponent: /[eE][\-+]?[0-9]+/,
                    escapes: /\\(?:[btnfr\\"']|[0-7][0-7]?|[0-3][0-7]{2})/,
                    brackets: [
                        ['{', '}', 'bracket.curly'],
                        ['[', ']', 'bracket.square']
                    ],
                });
                
                monaco.languages.registerHoverProvider(this.lang, {
                    provideHover:  (model, position) => {
                        let word = ''
                        const wordAtPos = model.getWordAtPosition(position)
                        if (wordAtPos) word = wordAtPos.word

                        if (word && ~this._helpers.map(h => h.command).indexOf(word)) {
                            return this._getHelpContent(word).then(response => {
                                return {
                                    contents: [
                                        `**${word}**`,
                                        { language: 'text', value: response.data.result }
                                    ]
                                }
                            })
                        }
                    }
                });

                monaco.languages.registerSignatureHelpProvider(this.lang, {
                    provideSignatureHelp: (model, position) => {
                        const getBlockIndex = (block, col) => {
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
                        if (word) return this._getHelpContent(word).then(response => {
                            if(!response.data) return {}
                            let lines = response.data.result.split("\n")
                            let args = false, desc = false
                            const obj = lines.reduce((o, c, i) => {
                                if (!c && args) {
                                    args = false
                                }
                                else if (c.match(/Arguments/)) args = true
                                else if (args) {
                                    let ltokens = c.split(/\s+/)
                                    if (ltokens[0].match(/[0-9]+\./))
                                        o.params[ltokens[1].replace(/"/g, '')] = ltokens.slice(2).join(' ')
                                }
                                else if (i > 1 && !c) desc = true
                                else if (i > 0 && !desc) o.desc += c + "\n"
                                return o
                            }, { params: {}, desc: '' })
                            obj.desc = obj.desc.replace(/(^\n|\n$)/, '')
                            const index = getBlockIndex(block, position.column)
                            const params = Object.keys(obj.params).map(k => { return { label: k, documentation: obj.params[k] } })
                            if (index > -1 && index < params.length)
                                return {
                                    activeSignature: 0,
                                    activeParameter: index,
                                    signatures: [
                                        {
                                            label: lines[0],
                                            parameters: params
                                        }
                                    ]
                                }
                            else return {}
                        })
                        else return {}

                    },
                    signatureHelpTriggerCharacters: [' ', '\t', '\n']
                })
                const execCommandId = editor.addCommand(0, function (wtf, line) { // don't knnow what first argument is???
                    const pos = editor.getPosition()
                    editor.setPosition({ lineNumber: line, column: 1 })
                    editor.getAction('action-execute-command').run()
                    editor.setPosition(pos)
                }, '');
                monaco.languages.registerCodeLensProvider(this.lang, {
                    provideCodeLenses: (model, token) => {
                        return model.getLinesContent().reduce((o, c, i) => {
                            let word = ''
                            const lineNumber = i + 1
                            const wordAtPos = model.getWordAtPosition({ lineNumber: lineNumber, column: 1 })
                            if (wordAtPos) word = wordAtPos.word
                            if (word && ~this._helpers.map(h => h.command).indexOf(word))
                                o.push(
                                    {
                                        range: {
                                            startLineNumber: lineNumber,
                                            startColumn: 1,
                                            endLineNumber: lineNumber + 1,
                                            endColumn: 1
                                        },
                                        id: "lens item" + lineNumber,
                                        command: {
                                            id: execCommandId,
                                            title: "Execute",
                                            arguments: [lineNumber]
                                        }
                                    }

                                )
                            return o
                        }, [])
                    },
                    resolveCodeLens: function (model, codeLens, token) {
                        return codeLens;
                    }
                });
                monaco.languages.registerCompletionItemProvider(this.lang, {
                    provideCompletionItems: (model, position) => {
                        return this._helpers.reduce((o, c) => {
                            o.push({
                                label: c.command,
                                kind: monaco.languages.CompletionItemKind.Function,
                                detail: c.help
                            })
                            return o
                        }, [])
                    }
                });
                monaco.languages.setLanguageConfiguration(this.lang, {
                    autoClosingPairs: [
                        {open: '"', close: '"'},
                        {open: '{', close: '}'},
                        {open: '[', close: ']'},
                    ]
                })
                resolve()
            }).catch(e => reject(e))
        })

    }
}

BitcoinController.lang = 'bitcoin-rpc'
module.exports = {
    type: 'bitcoin',
    controller: BitcoinController,
    BitcoinController: BitcoinController
}
