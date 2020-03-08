const { remote, webFrame } = require('electron') 
const { Menu, MenuItem } = remote

export class MenuHandler {
    constructor(app) {
        var app = app
        const menu = new Menu()
        menu.append(new MenuItem({
          label: 'Config',
          submenu: [
            { label: 'Save', click() { app.handleMenu('cfg-save') } },
            { label: 'Load', click() { app.handleMenu('cfg-load') } },
            { label: 'Edit Node', click() { app.handleMenu('cfg-node') } },
            {
                label: 'Theme',
                submenu: [
                    { label: 'Light', click() { app.handleMenu('theme-light') } },
                    { label: 'Dark', click() { app.handleMenu('theme-dark') } },
                ]
            }
          ]
        }))
        
        menu.append(new MenuItem({
            label: 'Command',
            submenu: [
                { label: 'Execute at Cursor', click() { app.handleMenu('cmd-exec') } },
                { label: 'Save', click() { app.handleMenu('cmd-save') } },
                { label: 'Load', click() { app.handleMenu('cmd-load') } },
            ]
        }))
        
        menu.append(new MenuItem({
            label: 'Console',
            submenu: [
            { label: 'Clear', click() { app.handleMenu('result-clear') } },
            { label: 'Save', click() { app.handleMenu('result-save') } },
            { label: 'Load', click() { app.handleMenu('result-load') } },
            ]
        }))
        
        menu.append(new MenuItem({
            label: 'View',
            submenu: [
            { label: 'Zoon +', accelerator: 'CmdOrCtrl+=', click() { webFrame.setZoomFactor(webFrame.getZoomFactor()*1.2) } },
            { label: 'Zoom -', accelerator: 'CmdOrCtrl+-', click() { webFrame.setZoomFactor(webFrame.getZoomFactor()/1.2) } },
            ]
        }))
        
        if(process.env.NODE_ENV == 'development')
            menu.append(new MenuItem({
                label: 'Dev',
                submenu: [
                { label: 'Reload', click() { remote.BrowserWindow.getFocusedWindow().reload() } },
                ]
            }))

        Menu.setApplicationMenu(menu)
    }
}

