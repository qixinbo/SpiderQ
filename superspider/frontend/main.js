// 加载fs模块
const fs = require('fs');
// 加载path模块
const path = require('path');
// 加载electron相关模块
const {app, ipcMain, BrowserWindow, screen} = require('electron')
// 加载selenium相关模块
const {Builder, By, Key, until} = require("selenium-webdriver");
const {ServiceBuilder} = require('selenium-webdriver/chrome');
const chrome = require('selenium-webdriver/chrome');
// 加载图标
const icon_path = path.join(__dirname, 'favicon.ico');
// 加载自定义的server.js
const task_server = require(path.join(__dirname, 'server.js'));

// 读取配置文件
let config = fs.readFileSync(path.join(task_server.getDir(), 'config.json'), 'utf8')
config = JSON.parse(config)

// 构造后台服务器的地址和端口号
let server_address = `${config.webserver_address}:${config.webserver_port}`

let driver_path = "";
let chrome_binary_path = "";
let execute_path = "";
let driver = null;
// 启动后台服务器，用于监听前端和后端的请求
task_server.start(config.webserver_port)

// web socket相关设置
const WebSocket = require('ws');
let socket_window = null;
let socket_start = null;
let socket_flowchart = null;
let handle_pairs = {};
// 配置web socket 端口
const websocket_port = 8084; //目前只支持8084端口，写死，因为扩展里面写死了
let wss = new WebSocket.Server({port: websocket_port});

function arrayDifference(arr1, arr2) {
    return arr1.filter(item => !arr2.includes(item));
}

driver_path = path.join(__dirname, "resources/chromedriver");
chrome_binary_path = path.join("/Applications/Google Chrome.app/", "Contents/MacOS/Google Chrome");
execute_path = path.join(__dirname, "");

// 创建窗口
function createWindow(){
  mainWindow = new BrowserWindow({
    width: 520,
    height: 750,
    // 预加载，在渲染进程中创建两个startDesign和startInvoke的api，后续window对象可以调用这两个api向主进程发送消息
    webPreferences:{
      preload: path.join(__dirname, 'preload.js')
    },
    resizable: false
  })
  // 加载index.html页面，即起始的主界面，加载的方式是通过传入server.js所启动的服务器承载的url
  mainWindow.loadURL(server_address+'/index.html?user_data_folder='+config.user_data_folder);
}

async function beginInvoke(msg, ws) {
    if (msg.type == 1) {
        if (msg.message.id != -1) {
            let url = "";
            if (language == "zh") {
                url = server_address + `/taskGrid/FlowChart_CN.html?id=${msg.message.id}&wsport=${websocket_port}&backEndAddressServiceWrapper=` + server_address;
            } else if (language == "en") {
                url = server_address + `/taskGrid/FlowChart.html?id=${msg.message.id}&wsport=${websocket_port}&backEndAddressServiceWrapper=` + server_address;
            }
            console.log(url);
            flowchart_window.loadURL(url);
        }
        mainWindow.hide();
        // Prints the currently focused window bounds.
        // This method has to be called on macOS before changing the window's bounds, otherwise it will throw an error.
        // It will prompt an accessibility permission request dialog, if needed.
        if(process.platform != "linux" && process.platform != "darwin"){
            const {windowManager} = require("node-window-manager");
            const window = windowManager.getActiveWindow();
            console.log(window);
            windowManager.requestAccessibility();
            // Sets the active window's bounds.
            let size = screen.getPrimaryDisplay().workAreaSize
            let width = parseInt(size.width)
            let height = parseInt(size.height * 0.6)
            window.setBounds({x: 0, y: size.height * 0.4, height: height, width: width});
        }

        flowchart_window.show();
        // flowchart_window.openDevTools();
    } else if (msg.type == 2) {
        //keyboard
        // const robot = require("@jitsi/robotjs");
        let keyInfo = msg.message.keyboardStr;
        let handles = await driver.getAllWindowHandles();
        console.log("handles", handles);
        let exit = false;
        let content_handle = handle_pairs[msg.message.id];
        console.log(msg.message.id,  content_handle);
        let order = [...handles.filter(handle => handle != current_handle && handle != content_handle), current_handle, content_handle]; //搜索顺序
        let len = order.length;
        while (true) {
            // console.log("handles");
            try{
                let h = order[len - 1];
                console.log("current_handle", current_handle);
                if(h != null && handles.includes(h)){
                    await driver.switchTo().window(h);
                    current_handle = h;
                    console.log("switch to handle: ", h);
                }
                // await driver.executeScript("window.stop();");
                // console.log("executeScript");
                let element = await driver.findElement(By.xpath(msg.message.xpath));
                console.log("Find Element at handle: ", current_handle);
                await element.sendKeys(Key.HOME, Key.chord(Key.SHIFT, Key.END), keyInfo);
                console.log("send key");
                break;
            } catch (error) {
                console.log("len", len);
                len = len - 1;
                if (len == 0) {
                    break;
                }
            }
            // .then(function (element) {
            //     console.log("element", element, handles);
            //     element.sendKeys(Key.HOME, Key.chord(Key.SHIFT, Key.END), keyInfo);
            //         exit = true;
            //     }, function (error) {
            //         console.log("error", error);
            //         len = len - 1;
            //         if (len == 0) {
            //             exit = true;
            //         }
            //     }
            // );
        }
        // let handles = driver.getAllWindowHandles();
        // driver.switchTo().window(handles[handles.length - 1]);
        // driver.findElement(By.xpath(msg.message.xpath)).sendKeys(Key.HOME, Key.chord(Key.SHIFT, Key.END), keyInfo);
        // robot.keyTap("a", "control");
        // robot.keyTap("backspace");
        // robot.typeString(keyInfo);
        // robot.keyTap("shift");
        // robot.keyTap("shift");
    } else if (msg.type == 3) {
        try {
            if (msg.from == 0) {
                socket_flowchart.send(msg.message.pipe); //直接把消息转接
                let message = JSON.parse(msg.message.pipe);
                let type = message.type;
                console.log("FROM Browser: ", message);
                // if(type.indexOf("Click")>=0){
                //     await new Promise(resolve => setTimeout(resolve, 2000)); //等两秒
                //
                // }
            } else {
                socket_window.send(msg.message.pipe);
                console.log("FROM Flowchart: ", JSON.parse(msg.message.pipe));
            }
        } catch (e) {
            console.log(e);
        }
    } else if (msg.type == 5) {
        let child = require('child_process').execFile;
        // 参数顺序： 1. task id 2. server address 3. saved_file_name 4. "remote" or "local" 5. user_data_folder
        // var parameters = [msg.message.id, server_address];
        let parameters = [];
        console.log(msg.message)
        if (msg.message.user_data_folder == null || msg.message.user_data_folder == undefined || msg.message.user_data_folder == "") {
            parameters = ["--id", "[" + msg.message.id + "]", "--server_address", server_address, "--user_data", 0];
        } else {
            let user_data_folder_path = path.join(task_server.getDir(), msg.message.user_data_folder);
            parameters = ["--id", "[" + msg.message.id + "]", "--server_address", server_address, "--user_data", 1];
            config.user_data_folder = msg.message.user_data_folder;
            config.absolute_user_data_folder = user_data_folder_path;
            fs.writeFileSync(path.join(task_server.getDir(), "config.json"), JSON.stringify(config));
        }
        // child('Chrome/easyspider_executestage.exe', parameters, function(err,stdout, stderr) {
        //    console.log(stdout);
        // });

        let spawn = require("child_process").spawn;
        if (process.platform != "darwin" && msg.message.execute_type == 1) {
            console.log("&&&&&&&& trying to load execute_path ************")
            let child_process = spawn(execute_path, parameters);
            console.log("&&&&&&&& execute_path loaded OK ************")
            child_process.stdout.on('data', function (data) {
                console.log(data.toString());
            });
        } else {
            ws.send(JSON.stringify({"config_folder": task_server.getDir() + "/", "easyspider_location": task_server.getEasySpiderLocation()}));
        }
    } else if (msg.type == 6) {
        try{
            flowchart_window.openDevTools();
        } catch {

        }
    }
}

wss.on('connection', function (ws) {
    ws.on('message', async function (message, isBinary) {
        let msg = JSON.parse(message.toString());
        console.log("\n\nGET A MESSAGE: ", msg);
        // console.log(msg, msg.type, msg.message);
        if (msg.type == 0) {
            if (msg.message.id == 0) {
                socket_window = ws;
                console.log("set socket_window")
            } else if (msg.message.id == 1) {
                socket_start = ws;
                console.log("set socket_start")
            } else if (msg.message.id == 2) {
                socket_flowchart = ws;
                console.log("set socket_flowchart");
            } else { //其他的ID是用来标识不同的浏览器标签页的
                await new Promise(resolve => setTimeout(resolve, 2300));
                let handles = await driver.getAllWindowHandles();
                if(arrayDifference(handles, old_handles).length > 0){
                    old_handles = handles;
                    current_handle = handles[handles.length - 1];
                    console.log("New tab opened, change current_handle to: ", current_handle);
                }
                handle_pairs[msg.message.id] = current_handle;
                console.log("Set handle_pair for id: ", msg.message.id, " to ", current_handle, ", title is: ", msg.message.title);
                socket_flowchart.send(JSON.stringify({"type": "title", "data": {"title":msg.message.title}}));
                // console.log("handle_pairs: ", handle_pairs);
            }
        } else if (msg.type == 10) {
            let leave_handle = handle_pairs[msg.message.id];
            if (leave_handle!=null && leave_handle!=undefined && leave_handle!="")
            {
                await driver.switchTo().window(leave_handle);
                console.log("Switch to handle: ", leave_handle);
                current_handle = leave_handle;
            }
        }
        else {
            await beginInvoke(msg, ws);
        }
    });
});

async function runBrowser(lang="en", user_data_folder='') {
  const serviceBuilder = new ServiceBuilder(driver_path);
  let options = new chrome.Options();
  // disable-blink-features 是一个启动参数，它可以用来隐藏 navigator.webdriver 的值，从而防止被一些网站检测出使用了自动化工具
  options.addArguments('--disable-blink-features=AutomationControlled');
  language = lang;
  // 加载在浏览器上进行操作的插件，插件的编写在另一个仓库
  if (lang == "en") {
    options.addExtensions(path.join(__dirname, "resources/EasySpider_en.crx"));
  } 
  else if (lang == "zh") {
    options.addExtensions(path.join(__dirname, "resources/EasySpider_zh.crx"));
  }
  // 加载XPathHelper插件
  options.addExtensions(path.join(__dirname, "XPathHelper.crx"));
  options.setChromeBinaryPath(chrome_binary_path);
  if (user_data_folder != "") {
      let dir = path.join(task_server.getDir(), user_data_folder);
      options.addArguments("--user-data-dir=" + dir);
      config.user_data_folder = user_data_folder;
      fs.writeFileSync(path.join(task_server.getDir(), "config.json"), JSON.stringify(config));
  }
  driver = new Builder()
      .forBrowser('chrome')  // 设置目标浏览器为chrome
      .setChromeOptions(options)
      .setChromeService(serviceBuilder)
      .build();
  console.log("********* driver is created ************")

  // 设置浏览器的超时
  await driver.manage().setTimeouts({implicit: 10000, pageLoad: 10000, script: 10000});
  // 执行一段 JavaScript 代码，从而实现一些 WebDriver 本身不能做到的操作
  await driver.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");
  // driver.createCDPConnection()：这个方法可以用来创建一个与 Chrome DevTools Protocol 的连接，从而实现一些高级的功能，如模拟地理位置、监听控制台日志、捕获 JS 异常等。这个方法返回一个 Promise 对象，需要使用 await 关键字或 then 方法来获取连接对象。
  const cdpConnection = await driver.createCDPConnection("page");
  let stealth_path = path.join(__dirname, "src/js/", "stealth.min.js");
  let stealth = fs.readFileSync(stealth_path, 'utf8');
  await cdpConnection.execute('Page.addScriptToEvaluateOnNewDocument', {
      source: stealth,
  });
  try {
      // 打开任务列表页面
      await driver.get(server_address + "/taskGrid/taskList.html?wsport=" + websocket_port + "&backEndAddressServiceWrapper=" + server_address + "&lang=" + lang);
      old_handles = await driver.getAllWindowHandles();
      current_handle = old_handles[old_handles.length - 1];
  } finally {
      // await driver.quit(); // 退出浏览器
  }
}

// 主进程接收到从渲染进程发送的start-design消息后，就会调用如下函数
function handleOpenBrowser(event, lang="en", user_data_folder="") {
  // 获取该事件的发送者
  // const webContents = event.sender;
  // 从发送者这里获取BrowserWindow对象，即这里的win应该跟mainWindow是同一个对象
  // const win = BrowserWindow.fromWebContents(webContents);
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
  const window = new BrowserWindow({icon: icon_path});
  let url = "";
  language = lang;
  if (lang == "en") {
      url = server_address + `/taskGrid/taskList.html?type=1&wsport=${websocket_port}&backEndAddressServiceWrapper=` + server_address;
  } else if (lang == "zh") {
      url = server_address + `/taskGrid/taskList.html?type=1&wsport=${websocket_port}&backEndAddressServiceWrapper=` + server_address + "&lang=zh";
  }
  // and load the index.html of the app.
  window.loadURL(url);
  window.maximize();
  mainWindow.hide();
  window.on('close', function (event) {
      mainWindow.show();
  });
}

// 入口函数
app.whenReady().then(()=>{
  // 创建两个IPC通道，用于监听从渲染进程发送过来的消息并做处理
  ipcMain.on('start-design', handleOpenBrowser);
  ipcMain.on('start-invoke', handleOpenInvoke);
  // 创建窗口
  createWindow();
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
})
