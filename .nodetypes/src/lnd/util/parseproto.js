// parses rpc.proto to something useful for code completion, not used in production

const fs = require('fs')

const proto = fs.readFileSync(`${__dirname}/rpc.proto`).toString('utf8')

const lines = proto.split("\n")

let commands = {}
let messages = {}
let inmsg = false
let inenum = false
let currentMsg = ""
let description = ""
let incomment = false

lines.forEach(l => {
    const rpc = l.match(/rpc ([a-zA-Z]+)\s?\((stream )?([a-zA-Z]+)\) returns \((stream )?([a-zA-Z]+)\)/)
    if(rpc) {
        commands[rpc[1].slice(0, 1).toLowerCase()+rpc[1].slice(1)] = {request: rpc[3], returns: rpc[5], description: description}
    }

    const uncom = l.match(/\*\//)
    if(uncom) incomment = false
    if(incomment) description += l.trimLeft()+"\n"

    if(inmsg) {
        const comment = l.match(/\/\/\/ (.+)/)
        if(comment) description = comment[1]
        const field = l.match(/([a-zA-Z0-9]+) ([a-zA-Z_]+)/)
        if(field && field[1]!='message' && !incomment && !comment) {
            if(field[1]=='enum') {
                inenum = true
            } else {
                messages[currentMsg].fields.push({name: field[2], type: field[1], description: ''+description})
            }
            description = ""
        }
    }

    const msg = l.match(/message ([a-zA-Z]+)\s?(\{\})?/)
    if(msg) {
        if(typeof msg[2]== 'undefined') inmsg = true; else inmsg = false
        currentMsg = msg[1]
        messages[currentMsg] = {fields:[]} 
        
    }

    const com = l.match(/\/\*\*/)
    if(com) {incomment = true; description = ""}

    const brace = l.match(/^{/)
    if(brace && inmsg) {
        if(inenum) inenum = false
        else inmsg = false
    }
})

Object.keys(commands).forEach(k => {
    let c = commands[k]
    c.args = messages[c.request].fields
    c.response = messages[c.returns].fields

    delete c.request; delete c.returns
})
console.log(JSON.stringify(commands, null, 2))
