const fs = require('fs')

class MonacoHandler {
    static register(editor, resultEditor, store, lang) {
        return new Promise((resolve, reject) => {
            monaco.languages.register({ id: lang })
            monaco.editor.tokenize("", 'json') // tokenizer not ready first time if not this
            this.lang = lang
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
                
                monaco.languages.registerHoverProvider(this.lang, {
                    provideHover:  (model, position) => {
                        let word = ''
                        const wordAtPos = model.getWordAtPosition(position)
                        if (wordAtPos) word = wordAtPos.word

                        if (word && ~Object.keys(this._commands).indexOf(word)) {
                            const cmd = this._commands[word]
                            let md = `${cmd.description.split("\n").join('\n\n')}\n`
                            let contents = [`**${word}**`].concat(cmd.description)
                            contents.push('### Options\n\n')
                            cmd.args.forEach(a => {
                                contents.push(`**${a.name}**: _${a.type}_\n\n${a.description.split("\n").join('\n\n\n\n')}\n\n\n\n`)
                            })
                            return {
                                contents: contents
                            }
                        }

                    }
                });

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
                        var tokens = monaco.editor.tokenize(model.getLineContent(position.lineNumber), 'json')
                        var token = tokens[0].filter(t => t.offset == (position.column-2))
                        if(token.length && token[0].type == "string.key.json") {
                            for(var l=position.lineNumber; l>0; l--) {
                                const word = model.getWordAtPosition({
                                    lineNumber: l, column: 1})
                                const keys = Object.keys(this._commands)
                                if(word && ~keys.indexOf(word.word)) {

                                    // here I have the command, need to check if any args have args
                                    // loop back again from position and check against args
                                    // if found, return its args and not commands args

                                    const argargs = this._commands[word.word].args.filter(a => a.args)

                                    if(argargs.length) {
                                        const block = model.getValueInRange({
                                            startColumn: 1, startLineNumber: l, endColumn: position.column, endLineNumber: position.lineNumber
                                        })
                                        const re = /("([^"]|"")*")/g
                                        let m = block.match(re)
                                        if(m) {
                                            const argnames = argargs.map(a => a.name)
                                            m = m.filter(f => ~argnames.indexOf(f.replace(/"/g, '')))
                                            if(m.length) {
                                                const key = m[m.length-1].replace(/"/g, '')
                                                const keyIndex = block.indexOf(m[m.length-1])
                                                const lastBrace = block.lastIndexOf("}")
                                                if((lastBrace==-1 || keyIndex > lastBrace) && ~argnames.indexOf(key))
                                                    return this._commands[word.word].args.filter(a => a.name == key)[0].args.map(a => {
                                                        return {
                                                            label: a.name,
                                                            insertText: a.name,
                                                            detail: a.type,
                                                            documentation: a.description
                                                        }
                                                    })
                                            }
                                        }
                                        console.log('complete from block', m)
                                    }

                                    return this._commands[word.word].args.map(a => {
                                        return {
                                            label: a.name,
                                            insertText: a.name,
                                            detail: a.type,
                                            documentation: a.description
                                        }
                                    })
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
            })

        }).catch(e => reject(e))
    }
}

module.exports = MonacoHandler