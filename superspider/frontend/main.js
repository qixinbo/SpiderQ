// 加载fs模块
const fs = require('fs');
// 加载path模块
const path = require('path');
// 加载electron相关模块
const {app, ipcMain, BrowserWindow} = require('electron')

// 加载自定义的server.js
const task_server = require(path.join(__dirname, 'server.js'));

// 读取配置文件
let config = fs.readFileSync(path.join(task_server.getDir(), 'config.json'), 'utf8')
config = JSON.parse(config)

// 构造后台服务器的地址和端口号
let server_address = `${config.webserver_address}:${config.webserver_port}`

// 启动后台服务器，用于监听前端和后端的请求
task_server.start(config.webserver_port)


let drive_path = "";
let chrome_binary_path = "";
let execute_path = "";

drive_path = path.join("/Users/qixinbo/Projects/EasySpider/ElectronJS/", "chromedriver_mac64/chromedriver");
chrome_binary_path = path.join("/Applications/Google Chrome.app/", "Contents/MacOS/Google Chrome");
execute_path = path.join(__dirname, "");

function createWindow(){
  mainWindow = new BrowserWindow({
    width: 520,
    height: 750,
    resizable: false
  })
  // 加载主界面的html页面
  mainWindow.loadURL(server_address+'/index.html?user_data_folder='+config.user_data_folder);
}

app.whenReady().then(()=>{
  // ipcMain.on('')
  createWindow()
})
