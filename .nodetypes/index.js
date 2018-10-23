const compiler = require('vueify').compiler
const fs = require('fs')
const path = require('path')

const src = path.resolve('./src')
const out = path.resolve('../dist/electron/build_nodetypes')
const nodetypes = fs.readdirSync(src)
nodetypes.forEach(t => {
  const files = fs.readdirSync(path.join(src, t))
  if(!fs.existsSync(path.join(out, t)))
    fs.mkdirSync(path.join(out, t))
  files.forEach(f => {
    const fileContent = fs.readFileSync(path.join(src, t, f)).toString()
    if(f.slice(-3) != 'vue') 
      fs.writeFileSync(path.join(out, t, f), fileContent)
    else
      compiler.compile(fileContent, path.join(src, t, f), (err, result) => {
        fs.writeFileSync(path.join(out, t, f.replace('.vue', '.js')), result)
      })  
  })
})