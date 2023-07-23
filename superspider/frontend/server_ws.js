const WebSocket = require('ws');
let socket_window = null;
let socket_start = null;
let socket_flowchart = null;
// 配置web socket 端口
const websocket_port = 8084; //目前只支持8084端口，写死，因为扩展里面写死了
let wss = new WebSocket.Server({port: websocket_port});

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

function start(){
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
  console.log("Web Socket Server has started.")
}

exports.websocket_port = websocket_port
exports.start = start
