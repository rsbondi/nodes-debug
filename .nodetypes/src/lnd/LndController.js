const fs = require('fs')
const os = require('os')
const { BitcoinController } = require('../bitcoin/BitcoinController')
const grpc = require('grpc');

class LndControllerr extends BitcoinController {
    constructor(cfg) {
        this.update(cfg)
    }

    // ping, execute, getConsole from base

    static register(editor, resultEditor, store) {
        return new Promise((resolve, reject) => {
            monaco.languages.register({ id: this.lang })
            monaco.editor.tokenize("", 'json') // tokenizer not ready first time if not this
            this._store = store
            this.helpContent = {} // cache
            this.models = {} // models mutate on every keystroke and do not play well with vuex
            this.commandEditor = editor
            this.resultEditor = resultEditor
            fs.readFile(`${__dirname}/rpc.json`, (err, response) => {
                if(err) { reject(err); return }
                this._commands = JSON.parse(response.toString('utf8'))

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
                    keywords: Object.keys(this._commands), //.concat('true', 'false', 'null',),
                    exponent: /[eE][\-+]?[0-9]+/,
                    escapes: /\\(?:[btnfr\\"']|[0-7][0-7]?|[0-3][0-7]{2})/,
                    brackets: [
                        ['{', '}', 'bracket.curly'],
                        ['[', ']', 'bracket.square']
                    ],
                });
                
                // monaco.languages.registerHoverProvider(this.lang, {
                //     provideHover:  (model, position) => {
                //         let word = ''
                //         const wordAtPos = model.getWordAtPosition(position)
                //         if (wordAtPos) word = wordAtPos.word

                //         if (word && ~Object.keys(this._commands).indexOf(word)) {
                //             return this._getHelpContent(word).then(response => {
                //                 return {
                //                     contents: [
                //                         `**${word}**`,
                //                         { language: 'text', value: response.data.result }
                //                     ]
                //                 }
                //             })
                //         }
                //     }
                // });

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
                            if (word && ~Object.keys(this._commands).indexOf(word))
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
                        console.log('provide', model, position)
                        var tokens = monaco.editor.tokenize(model.getLineContent(position.lineNumber), 'json')
                        var token = tokens[0].filter(t => t.offset == (position.column-2))
                        if(token.length && token[0].type == "string.key.json") {
                            for(var l=position.lineNumber; l>0; l--) {
                                console.log(tokens, ''+(position.column-2), l)
                                const word = model.getWordAtPosition({
                                    lineNumber: l, column: 1})
                                const keys = Object.keys(this._commands)
                                console.log('word', word, keys)
                                if(word && ~keys.indexOf(word.word)) {
                                    return this._commands[word.word].args.map(a => {
                                        return {
                                            label: a.name,
                                            insertText: a.name,
                                            detail: a.type,
                                            documentation: a.description
                                        }
                                    })
                                    break
                                }
                            }
                        }
                        if(tokens[0].length==1 && tokens[0][0].offset == 0 ){
                            return Object.keys(this._commands).map(k => {
                                return {
                                    label: k,
                                    insertText: k,
                                    documentation: this._commands[k].description,
                                    kind: monaco.languages.CompletionItemKind.Function
                                }
                            })
                        }
                        return []
                    
                    },
                    triggerCharacters: ['"']
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
        fs = require('fs')
        this._host = cfg && cfg.host || '127.0.0.1'
        this._info = {}
        this._infoTime = 0
        this._notls = 0
        this.id = cfg.index
        const config = fs.readFileSync(cfg && cfg.config.replace('~', os.homedir()) || `${os.homedir()}/.lnd/lnd.conf`, 'utf8');
        let rpcport
        config.split('\n').forEach(line => {
            let rpcuser = line.match(/^\s?rpcuser\s?=\s?([^#]+)$/)
            if (rpcuser) this._user = rpcuser[1]
            let rpcpass = line.match(/^\s?rpcpass\s?=\s?([^#]+)$/)
            if (rpcpass) this._password = rpcpass[1]
            let port = line.match(/^\s?rpcport\s?=\s?([^#]+)$/)
            if (port) rpcport = port[1]
            let datadir = line.match(/^\s?datadir\s?=\s?([^#]+)$/)
            if (datadir) {
                const coin = "bitcoin" // TODO: get from config
                const network = 'simnet' // TODO: get from config
                const datadirectory = datadir[1]
                this._macaroonPath = `${datadirectory}/${coin}/${network}/admin.macaroon`
            }
        })
        this._port = cfg && cfg.port || rpcport || '8332'

        var fs = require('fs');

        function setupGrpc() {

        }
        
        setupGrpc()

    }

}

LndController.lang = 'lnd-rpc'

module.exports = {
    type: 'lnd',
    controller: LndController
}