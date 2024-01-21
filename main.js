const electron = require('electron')

const app = electron.app

const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

const DEV_MODE = process.argv.includes('--dev');

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({width: 1000, height: 800})

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'build', DEV_MODE ? 'index.dev.html' : 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  if (DEV_MODE) {
      mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

