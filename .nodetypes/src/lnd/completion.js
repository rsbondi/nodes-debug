// teomporary file to be migrated to controller

monaco.languages.register({id:'lnd'})

monaco.editor.tokenize("", 'json') // tokenizer not ready first time if not this


monaco.languages.registerCompletionItemProvider('lnd', {
    provideCompletionItems: function(model, position) {
        console.log('provide', model, position)
        var tokens = monaco.editor.tokenize(model.getLineContent(position.lineNumber), 'json')
        var token = tokens[0].filter(t => t.offset == (position.column-2))
        if(token.length && token[0].type == "string.key.json") {
            for(var l=position.lineNumber; l>0; l--) {
                console.log(tokens, ''+(position.column-2), l)
                const word = model.getWordAtPosition({
                    lineNumber: l, column: 1})
                const keys = Object.keys(commands)
                console.log('word', word, keys)
                if(word && ~keys.indexOf(word.word)) {
                    return commands[word.word].args.map(a => {
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
            return Object.keys(commands).map(k => {
                return {
                    label: k,
                    insertText: k,
                    documentation: commands[k].description,
                    kind: monaco.languages.CompletionItemKind.Function
                }
            })
        }
        return []
    
    },
    triggerCharacters: ['"']
});

monaco.editor.create(document.getElementById("container"), {
    value: "",
    language: "lnd"
});