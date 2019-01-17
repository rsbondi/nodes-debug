const child_process = require("child_process")
const fs = require('fs')

const nodes = child_process.execSync("lnet-cli alias")
    .toString()
    .split("\n")
    .reduce((o, n, i) => {
        let node = /alias lcli-([^=]+)="lightning-cli --lightning-dir=([^"]+)"/.exec(n)
        if(node) {
            const name = node[1].replace(/"/g,"")
            const entry = {
                name: name, 
                type: "clightning",
                port: "",
                host: "",
                config: `${node[2]}/.ndconf`,
                index: `lnetnode${i}`,
                cfg: `alias=${name}
lightning-dir=${node[2]}
`
            }
            o.nodes.push(entry)
        }
        return o
    },{nodes: [], theme:"dark"})

nodes.nodes.forEach(n => {
    fs.writeFileSync(`${n.config}`, n.cfg)
    delete(n.cfg)
})
fs.writeFileSync("config.json", JSON.stringify(nodes))
