// parses rpc.proto to something useful for code completion, not used in production

// TODO: handle map - `map<string, int64> AddrToAmount = 1;` used in sendMany

const fs = require('fs')

const proto = fs.readFileSync(`${__dirname}/../rpc.proto`).toString('utf8')

const lines = proto.split("\n")

let commands = {}
let messages = {}
let inmsg = false
let inenum = false
let enums = {}
let currentEnum = ""
let currentMsg = ""
let description = ""
let incomment = false

let currentService = ''

lines.forEach(l => {
    const rpc = l.match(/rpc ([a-zA-Z]+)\s?\((stream )?([a-zA-Z]+)\) returns \((stream )?([a-zA-Z]+)\)/)
    if(rpc) {
        // TODO: if rpc[2] maybe ? save to quick pick for write ?
        const key = rpc[1].slice(0, 1).toLowerCase()+rpc[1].slice(1)
        commands[key] = {
            request: rpc[3], returns: rpc[5], description: description, 
            service: currentService
        }
        if(rpc[4]) commands[key].stream = true
    }

    const service = l.match(/^service\s+([a-zA-Z_]+)/)
    if(service) currentService = service[1]

    const uncom = l.match(/\*\//)
    if(uncom) incomment = false
    if(incomment) description += l.trimLeft()+"\n"

    if(inenum) {
        const e = l.match(/([A-Z_]+)\s=\s([0-9]+)/)
        if(e) 
            enums[currentEnum][e[1]] = parseInt(e[2], 10)
    }

    if(inmsg) {
        const comment = l.match(/\/\/\/ (.+)/)
        if(comment) description = comment[1]
        const field = l.match(/([a-zA-Z0-9_]+) ([a-zA-Z_]+)\s?(=|{)/)
        if(field && field[1]!='message' && !incomment && !comment) {
            if(field[1]=='enum') {
                inenum = true
                currentEnum = field[2]
                enums[currentEnum] = {}
            } else if(field[1] != 'oneof') {
                let msgObj = {name: field[2], type: field[1], description: ''+description}
                if(currentEnum && msgObj.type == currentEnum) {
                    msgObj.enum = enums[currentEnum]
                }
                messages[currentMsg].fields.push(msgObj)
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
    c.args.forEach(a => {
        if(messages[a.type]) {
            a.args = messages[a.type].fields.filter(f => f.type != 'oneof')
        }
    })
    c.response = messages[c.returns].fields

    delete c.request; delete c.returns
})
console.log(JSON.stringify(commands, null, 2))
