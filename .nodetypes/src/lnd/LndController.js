const fs = require('fs')
const { BitcoinController } = require('../bitcoin/BitcoinController')
const path = require('path')
const Config = require('./config')
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader')
//process.env.GRPC_SSL_CIPHER_SUITES = 'HIGH+ECDSA'

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
        const val = this.constructor._getCommandBlock(ed.getModel(), ed.getPosition()).map(b => b.text).join(' ')
        console.log(val)
        let chunks = val.split(/\s/)
        const method = chunks[0]
        let params = chunks.length > 1 ? JSON.parse(val.slice(chunks[0].length)) : {}

        this._postRPC(method, params).then(response => {
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

        const lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
        
        const lnrpc = lnrpcDescriptor.lnrpc;
        const instance = new lnrpc.Lightning(`${this._config.host}:${this._config.port}`, credentials);

        return instance
    
    }

    _postRPC(method, options, id) {
        var promiseFunction = (resolve, reject) => {
            let opts = options || {}
            try {
                this.instance[method](opts, (err, result) => {
                    if (err) reject(err)
                    else resolve(result)
                });
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


}

LndController.lang = 'lnd-rpc'

module.exports = {
    type: 'lnd',
    controller: LndController
}