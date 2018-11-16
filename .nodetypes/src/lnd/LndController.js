const fs = require('fs')
const { BitcoinController } = require('../bitcoin/BitcoinController')
const path = require('path')
const Config = require('./config')
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader')
//process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA'

// TODO: parse enums

process.env.GRPC_SSL_CIPHER_SUITES =
  'ECDHE-RSA-AES128-GCM-SHA256:' +
  'ECDHE-RSA-AES128-SHA256:' +
  'ECDHE-RSA-AES256-SHA384:' +
  'ECDHE-RSA-AES256-GCM-SHA384:' +
  'ECDHE-ECDSA-AES128-GCM-SHA256:' +
  'ECDHE-ECDSA-AES128-SHA256:' +
  'ECDHE-ECDSA-AES256-SHA384:' +
  'ECDHE-ECDSA-AES256-GCM-SHA384';

const MonacoHandler = require('./monaco')

class LndController {
    constructor(cfg) {
        this.update(cfg)
        this.noservice = false
    }

    static register(editor, resultEditor, store) {
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
            this.instance = this._createInstance()
        }
        
        setupGrpc()

    }

    getConsole() {
        return new Promise((resolve, reject) => {
            if(!MonacoHandler.models[this.id]) this._createConsole()
            resolve(MonacoHandler.models[this.id])
        })
    }

    ping() { return this._postRPC('getInfo')}

    execute(ed) {
        if(this.noservice) {
            this.instance = this._createInstance()
            setTimeout(() => {
                this.execute(ed)
            }, 1000)
            return
        }
        const val = this.constructor._getCommandBlock(ed.getModel(), ed.getPosition()).map(b => b.text).join(' ')
        let chunks = val.split(/\s/)
        const method = chunks[0]
        if(!~Object.keys(MonacoHandler._commands).indexOf(method)) {
            this.constructor._appendToEditor(`unknown method, ${method}`)
            return
        }
        const service = MonacoHandler._commands[method].service
        let params 
        try {
            params = chunks.length > 1 ? JSON.parse(val.slice(chunks[0].length)) : {}
        } catch (e) {
            const checkEnum = MonacoHandler._commands[method]
            const enums = checkEnum.args.filter(a => a.enum)
            let commandString = val.slice(chunks[0].length)
            enums.forEach(en => {
                Object.keys(en.enum).forEach(k => {
                    commandString = commandString.replace(k, en.enum[k])
                })
            })
            try {params = JSON.parse(commandString)} catch(ohwell) {}
            if(!params) {
                this.constructor._appendToEditor(e+"\n")
                return
            }
        }

        this._postRPC(method, params, service).then(response => {
          let content = '// '+method+' '+(params ? JSON.stringify(params):'') + '\n'
          content += JSON.stringify(response, null, 2) + '\n\n'
          this.constructor._appendToEditor(content)
        }).catch(err => this.constructor._appendToEditor(err))
        return null;
    }

    _createConsole() {
        MonacoHandler.models[this.id] = {
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
        
        const packageDefinition = protoLoader.loadSync(`${__dirname}/rpc.proto`,{keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
           });

        let lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
        
        const lnrpc = lnrpcDescriptor.lnrpc;
        const instance = new lnrpc.Lightning(`${this._config.host}:${this._config.port}`, credentials);

        lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
        const wlnrpc = lnrpcDescriptor.lnrpc;
        const winstance = new wlnrpc.WalletUnlocker(`${this._config.host}:${this._config.port}`, sslCreds);

        this.noservice = false
        return {Lightning: instance, WalletUnlocker: winstance}
    
    }

    _postRPC(method, options, service) {
        if(!service) service='Lightning'
        let encoding = service == 'Lightning' ? 'hex': 'utf8' // TODO: sign/verifyMessage utf8
        var promiseFunction = (resolve, reject) => {
            let opts = Object.assign({}, options || {})
            Object.keys(opts).forEach(k => {
                const opt = MonacoHandler._commands[method].args.filter(a => a.name == k)
                if(opt.length && opt[0].type == 'bytes') opts[k] = Buffer.from(opts[k], encoding)
            })
            try {
                if(MonacoHandler._commands[method].stream) {
                     var call = this.instance[service][method](opts)
                     const callstr = '// '+method+' '+(opts ? JSON.stringify(opts):'')
                     this.constructor._appendToEditor(callstr + '\n\n')
                     call.on('data', (response) => {
                        this._handleNotification(`${callstr} STREAM RESPONSE\n${JSON.stringify(response,null,2)}\n\n`)
                      });
                     call.on('status', (status) => {
                        console.log('status', status)
                        this._handleNotification(`${callstr} STREAM RESPONSE\n${JSON.stringify(status,null,2)}\n\n`)
                      });
                     call.on('end', () => {
                        // The server has closed the stream.
                      });                
                } else {
                    this.instance[service][method](opts, (err, result) => {
                        if (err) {
                                
                            if(err.details == "unknown service lnrpc.Lightning") {
                                this.noservice = true
                            }
                            reject(err)
                        }
                        else resolve(result)
                    });
                }
            } catch(e) {reject(e.message)}
        }

        let promise = new Promise(promiseFunction)        
        .then(d => { this.online = true; return d})
        .catch(e => {
            this.online = false
            return e
        })

        return promise
        

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
                if(~Object.keys(MonacoHandler._commands).indexOf(word)) break;
            }
            line--
            if(line===0) break
        }
        line = position.lineNumber + 1
        if(line > model.getLineCount()) return block
        while(tmpline = model.getLineContent(line)) {
            wordAtPos = model.getWordAtPosition({lineNumber: line, column: 1})
            if(wordAtPos && ~Object.keys(MonacoHandler._commands).indexOf(wordAtPos.word)) break;
            tmpline = tmpline.replace(/^\s+/,'')
            if(!tmpline) break;
            block.push({text: model.getLineContent(line), offset: line - position.lineNumber})
            line++
            if(line > model.getLineCount()) break
        }
        return block
    }

    static _appendToEditor (text)  {
        const lineCount = MonacoHandler.resultEditor.getModel().getLineCount();
        const lastLineLength = MonacoHandler.resultEditor.getModel().getLineMaxColumn(lineCount);
    
        const range = new monaco.Range(lineCount, lastLineLength, lineCount, lastLineLength);
    
        MonacoHandler.resultEditor.updateOptions({ readOnly: false })
        MonacoHandler.resultEditor.executeEdits('', [
        { range: range, text: text }
        ])
        MonacoHandler.resultEditor.updateOptions({ readOnly: true })
        MonacoHandler.resultEditor.setSelection(new monaco.Range(1, 1, 1, 1))
        MonacoHandler.resultEditor.revealPosition({ lineNumber: MonacoHandler.resultEditor.getModel().getLineCount(), column: 0 })
                
    }

    _handleNotification (text)  {
        const model = MonacoHandler.models[this.id]
        if(!model) return
        const lineCount = model.result.getLineCount();
        const lastLineLength = model.result.getLineMaxColumn(lineCount);
    
        const range = new monaco.Range(lineCount, lastLineLength, lineCount, lastLineLength);
    
        model.result.pushEditOperations([new monaco.Selection(1, 1, 1, 1)],
                        [{ range: range, text: text }],
                        () => [new monaco.Selection(model.result.getLineCount(),0,model.result.getLineCount(),0)])
        if(MonacoHandler._store.state.Nodes.currentIndex == this.id)
            MonacoHandler.resultEditor.revealPosition({ lineNumber: MonacoHandler.resultEditor.getModel().getLineCount(), column: 0 })
    }




}

LndController.lang = 'lnd-rpc'

module.exports = {
    type: 'lnd',
    controller: LndController
}