// 加载fs模块
const fs = require('fs');
// 加载path模块
const path = require('path');
// 加载electron相关模块
const {app, ipcMain, BrowserWindow, screen} = require('electron')
// 加载selenium相关模块
const {ServiceBuilder} = require('selenium-webdriver/chrome');
// 加载图标
const icon_path = path.join(__dirname, 'favicon.ico');
// 加载自定义的server.js
const task_server = require(path.join(__dirname, 'server.js'));
// 配置web socket 端口
const websocket_port = 8084; //目前只支持8084端口，写死，因为扩展里面写死了

// 读取配置文件
let config = fs.readFileSync(path.join(task_server.getDir(), 'config.json'), 'utf8')
config = JSON.parse(config)

// 构造后台服务器的地址和端口号
let server_address = `${config.webserver_address}:${config.webserver_port}`


// 启动后台服务器，用于监听前端和后端的请求
task_server.start(config.webserver_port)


let driver_path = "";
let chrome_binary_path = "";
let execute_path = "";

driver_path = path.join("/Users/qixinbo/Projects/EasySpider/ElectronJS/", "chromedriver_mac64/chromedriver");
chrome_binary_path = path.join("/Applications/Google Chrome.app/", "Contents/MacOS/Google Chrome");
execute_path = path.join(__dirname, "");

function createWindow(){
  mainWindow = new BrowserWindow({
    width: 520,
    height: 750,
    webPreferences:{
      preload: path.join(__dirname, 'src/preload.js')
    },
    resizable: false
  })
  // 加载主界面的html页面
  mainWindow.loadURL(server_address+'/index.html?user_data_folder='+config.user_data_folder);
}


async function runBrowser(lang="en", user_data_folder='') {
  console.log("-------------- start to create serviceBuilder --------------")
  console.log("drive_path = ", driver_path)
  const serviceBuilder = new ServiceBuilder(driver_path);
  console.log("-------------- driver loaded OK --------------")
  let options = new chrome.Options();
  options.addArguments('--disable-blink-features=AutomationControlled');
  language = lang;
  // if (lang == "en") {
  //   options.addExtensions(path.join(__dirname, "EasySpider_en.crx"));
  // } 
  // else if (lang == "zh") {
  //   options.addExtensions(path.join(__dirname, "EasySpider_zh.crx"));
  // }
  // options.addExtensions(path.join(__dirname, "XPathHelper.crx"));
  options.setChromeBinaryPath(chrome_binary_path);
  console.log("-------------- chrome loaded OK --------------")
  options.add
  if (user_data_folder != "") {
      let dir = path.join(task_server.getDir(), user_data_folder);
      console.log(dir);
      options.addArguments("--user-data-dir=" + dir);
      config.user_data_folder = user_data_folder;
      fs.writeFileSync(path.join(task_server.getDir(), "config.json"), JSON.stringify(config));
  }
  driver = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .setChromeService(serviceBuilder)
      .build();
  await driver.manage().setTimeouts({implicit: 10000, pageLoad: 10000, script: 10000});
  await driver.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
  const cdpConnection = await driver.createCDPConnection("page");
  let stealth_path = path.join(__dirname, "src/", "stealth.min.js");
  console.log(stealth_path)
  let stealth = fs.readFileSync(stealth_path, 'utf8');
  await cdpConnection.execute('Page.addScriptToEvaluateOnNewDocument', {
      source: stealth,
  });
  try {
      await driver.get(server_address + "/taskGrid/taskList.html?wsport=" + websocket_port + "&backEndAddressServiceWrapper=" + server_address + "&lang=" + lang);
      old_handles = await driver.getAllWindowHandles();
      current_handle = old_handles[old_handles.length - 1];
  } finally {
      // await driver.quit(); // 退出浏览器
  }
}

function handleOpenBrowser(event, lang="en", user_data_folder="") {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  runBrowser(lang, user_data_folder);
  let size = screen.getPrimaryDisplay().workAreaSize;
  let width = parseInt(size.width);
  let height = parseInt(size.height * 0.6);
  flowchart_window = new BrowserWindow({
      x: 0,
      y: 0,
      width: width,
      height: height,
      icon: icon_path,
  });
  let url = "";
  let id = -1;
  if (lang == "en") {
      url = server_address + `/taskGrid/FlowChart.html?id=${id}&wsport=${websocket_port}&backEndAddressServiceWrapper=` + server_address;
  } else if (lang == "zh") {
      url = server_address + `/taskGrid/FlowChart_CN.html?id=${id}&wsport=${websocket_port}&backEndAddressServiceWrapper=` + server_address;
  }
  // and load the index.html of the app.
  flowchart_window.loadURL(url);
  if(process.platform != "darwin"){
      flowchart_window.hide();
  }
  flowchart_window.on('close', function (event) {
      mainWindow.show();
      driver.quit();
  });
}

function handleOpenInvoke(event, lang="en"){

}


app.whenReady().then(()=>{
  // 创建两个IPC通道，用于监听从渲染进程发送过来的消息并做处理
  ipcMain.on('start-design', handleOpenBrowser);
  ipcMain.on('start-invoke', handleOpenInvoke);
  // 创建窗口
  createWindow();
})
