// 导入http模块
const http = require('http');
// 导入url模块
const url = require('url');
// 导入fs模块
const fs = require('fs');
// 导入path模块
const path = require('path');
// 导入querystring模块
const querystring = require('querystring');
// 获取MIME字典
fileMimes = JSON.parse(fs.readFileSync(path.join(__dirname, "src", "mime.json")).toString());

function travel(dir,callback){
    fs.readdirSync(dir).forEach((file)=>{
        const pathname=path.join(dir,file)
        if(fs.statSync(pathname).isDirectory()){
            travel(pathname,callback)
        }else{
            callback(pathname)
        }
    })
}
function compare(p){ //这是比较函数
    return function(m,n){
        var a = m[p];
        var b = n[p];
        return b - a; //降序
    }
}

// 获得脚本所在的文件路径
function getDir(){
  return __dirname;
}

function getEasySpiderLocation(){
    if(__dirname.indexOf("app") >= 0 && __dirname.indexOf("sources") >= 0){
        if(process.platform == "darwin"){
            return path.join(__dirname,"../../../");
        } else {
            return path.join(__dirname,"../../../");
        }
    } else {
        return __dirname;
    }
}

function start(port = 8074){
  http.createServer(function(req, res){
    let body = ""; 
    // 设置可访问的源
    res.setHeader("Access-Control-Allow-Origin", "*")
    // 解析请求的参数
    const pathName = url.parse(req.url).pathname;
    // console.log("***************** load file ***********************")
    console.log("pathName = ", pathName)
    // 判断请求来自于前端还是后端
    if(pathName.indexOf(".") < 0) { // 此时为后台请求
      console.log("请求来自后台")
      res.writeHead(200, { 'Content-Type': 'application/json' });
    }
    else { // 此时为前端请求
      console.log("请求来自前台")
      // 读取src下的文件，并执行回调函数
      fs.readFile(path.join(__dirname, "src", pathName), async(err, data) => {
        // 如果读取出错，返回一个404的网页
        if(err){
          console.log("读取服务器文件失败")
          res.writeHead(404, {'Content-Type': 'text/html;charset="utf-8"'})
          res.end(err.message);
          return;
        }
        // 如果读取成功，根据不同的文件后缀返回不同的内容头
        if(!err){
          console.log("读取服务器文件成功")
          let extName = path.extname(pathName);
          console.log(extName)
          let mime = fileMimes[extName]
          console.log(mime)
          res.writeHead(200, {'Content-Type': mime + ';charset="utf-8"'})
          res.end(data);
          return;
        }
      })
    }
    // console.log("***************** finished ***********************")
    req.on('data', function(chuck){
      body += chuck;
    });

    req.on('end', function() {
      // 设置响应头部信息及编码
      if (pathName == "/queryTasks") { //查询所有服务信息，只包括id和服务名称
          output = [];
          tasks_path = path.join(getDir(), "tasks")
          if (!fs.existsSync(tasks_path)) {
            fs.mkdirSync(tasks_path)
          }
          travel(path.join(getDir(), "tasks"),function(pathname){
              const data = fs.readFileSync(pathname, 'utf8');
              let stat = fs.statSync(pathname, 'utf8');
              // parse JSON string to JSON object
              const task = JSON.parse(data);
              let item = {
                  "id": task.id,
                  "name": task.name,
                  "url": task.url,
                  "mtime": stat.mtime,
              }
              if(item.id!= -2) {
                  output.push(item);
              }
          });
          output.sort(compare("mtime"));
          res.write(JSON.stringify(output));
          res.end();
      } else if(pathName == "/queryOSVersion") {
          res.write(JSON.stringify({"version":process.platform, "bit":process.arch}));
          res.end();
      }
      else if (pathName == "/queryExecutionInstances") { //查询所有服务信息，只包括id和服务名称
          output = [];
          travel(path.join(getDir(), "execution_instances"),function(pathname){
              const data = fs.readFileSync(pathname, 'utf8');
              // parse JSON string to JSON object
              const task = JSON.parse(data);
              let item = {
                  "id": task.id,
                  "name": task.name,
                  "url": task.url,
              }
              if(item.id!= -2) {
                  output.push(item);
              }
          });
          res.write(JSON.stringify(output));
          res.end();
      } else if (pathName == "/queryTask") {
          var params = url.parse(req.url, true).query;
          try {
              var tid = parseInt(params.id);
              const data = fs.readFileSync(path.join(getDir(), `tasks/${tid}.json`), 'utf8');
              // parse JSON string to JSON object
              res.write(data);
              res.end();
          } catch (error) {
              res.write(JSON.stringify({ "error": "Cannot find task based on specified task ID." }));
              res.end();
          }
      } else if (pathName == "/queryExecutionInstance") {
          var params = url.parse(req.url, true).query;
          try {
              var tid = parseInt(params.id);
              const data = fs.readFileSync(path.join(getDir(), `execution_instances/${tid}.json`), 'utf8');
              // parse JSON string to JSON object
              res.write(data);
              res.end();
          } catch (error) {
              res.write(JSON.stringify({ "error": "Cannot find execution instance based on specified execution ID." }));
              res.end();
          }
      } else if(pathName == "/"){
          res.write("Hello World!", 'utf8');
          res.end();
      } else if(pathName == "/deleteTask"){
          var params = url.parse(req.url, true).query;
          try {
              let tid = parseInt(params.id);
              let data = fs.readFileSync(path.join(getDir(), `tasks/${tid}.json`), 'utf8');
              data = JSON.parse(data);
              data.id = -2;
              data = JSON.stringify(data);
              // write JSON string to a file
              fs.writeFile(path.join(getDir(), `tasks/${tid}.json`), data, (err) => {
                  if (err) {
                      throw err;
                  }
              });
              res.write(JSON.stringify({ "success": "Task has been deleted successfully." }));
              res.end();
          } catch (error) {
              res.write(JSON.stringify({ "error": "Cannot find task based on specified task ID." }));
              res.end();
          }
      } else if(pathName == "/manageTask"){
          body = querystring.parse(body);
          data = JSON.parse(body.paras);
          let id = data["id"];
          if (data["id"] == -1) {
              file_names = [];
              fs.readdirSync(path.join(getDir(), "tasks")).forEach((file)=>{
                  try{
                      if(file.split(".")[1] == "json"){
                          file_names.push(parseInt(file.split(".")[0]));
                      }
                  } catch (error) {

                  }
              })
              if(file_names.length == 0){
                  id = 0;
              } else {
                  id = Math.max(...file_names) + 1;
              }
              data["id"] = id;
              // write JSON string to a fil
          }
          data = JSON.stringify(data);
          // write JSON string to a file
          fs.writeFile(path.join(getDir(), `tasks/${id}.json`), data, (err) => {});
          res.write(id.toString(), 'utf8');
          res.end();
      } else if(pathName == "/invokeTask"){
          body = querystring.parse(body);
          let data = JSON.parse(body.paras);
          let id = body.id;
          let task = fs.readFileSync(path.join(getDir(), `tasks/${id}.json`), 'utf8');
          task = JSON.parse(task);
          try{
              task["links"] = data["urlList_0"];
          }catch(error){
              console.log(error);
          }
          for (const [key, value] of Object.entries(data)) {
              for (let i = 0; i < task["inputParameters"].length; i++) {
                  if (key === task["inputParameters"][i]["name"]) {  // 能调用
                      const nodeId = parseInt(task["inputParameters"][i]["nodeId"]);
                      const node = task["graph"][nodeId];
                      if (node["option"] === 1) {
                          node["parameters"]["links"] = value;
                      } else if (node["option"] === 4) {
                          node["parameters"]["value"] = value;
                      } else if (node["option"] === 8 && node["parameters"]["loopType"] === 0) {
                          node["parameters"]["exitCount"] = parseInt(value);
                      } else if (node["option"] === 8) {
                          node["parameters"]["textList"] = value;
                      }
                      break;
                  }
              }
          }
          let file_names = [];
          exe_instances_path = path.join(getDir(), "execution_instances")
          if (!fs.existsSync(exe_instances_path)) {
            fs.mkdirSync(exe_instances_path)
          }
          fs.readdirSync(exe_instances_path).forEach((file)=>{
              try{
                  if(file.split(".")[1] == "json"){
                      file_names.push(parseInt(file.split(".")[0]));
                  }
                  console.log(file);
              } catch (error) {

              }
          })
          let eid = 0;
          if (file_names.length != 0) {
              eid = Math.max(...file_names) + 1;
          }
          task["id"] = eid;
          task = JSON.stringify(task);
          fs.writeFile(path.join(getDir(), `execution_instances/${eid}.json`), task, (err) => {});
          res.write(eid.toString(), 'utf8');
          res.end();
      } else if(pathName == "/getConfig"){
          let config = fs.readFileSync(path.join(getDir(), `config.json`), 'utf8');
          config = JSON.parse(config);
          res.write(JSON.stringify(config));
          res.end();
      } else if(pathName == "/setUserDataFolder"){
          let config = fs.readFileSync(path.join(getDir(), `config.json`), 'utf8');
          config = JSON.parse(config);
          body = querystring.parse(body);
          config["user_data_folder"] = body["user_data_folder"];
          config = JSON.stringify(config);
          fs.writeFile(path.join(getDir(), `config.json`), config, (err) => {});
          res.write(JSON.stringify({ "success": "User data folder has been set successfully." }));
          res.end();
      }
    });
  })
  .listen(port);
  console.log("Server has started.")
}

exports.getDir = getDir;
exports.getEasySpiderLocation = getEasySpiderLocation;
exports.start = start;
