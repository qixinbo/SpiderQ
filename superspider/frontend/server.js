// 导入http模块
const http = require('http');
// 导入url模块
const url = require('url');
// 导入fs模块
const fs = require('fs');
// 导入path模块
const path = require('path');

// 获取MIME字典
fileMimes = JSON.parse(fs.readFileSync(path.join(__dirname, "src", "mime.json")).toString());

// 获得脚本所在的文件路径
function getDir(){
  return __dirname;
}

function start(port = 8074){
  http.createServer(function(req, res){
    let body = ""; 
    // 设置可访问的源
    res.setHeader("Access-Control-Allow-Origin", "*")
    // 解析请求的参数
    const pathName = url.parse(req.url).pathname;
    // 判断请求来自于前端还是后端
    if(pathName.indexOf(".") < 0) { // 此时为后台请求
      console.log("请求来自后台")
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
    req.on('data', function(chuck){
      body += chuck;
    });
  })
  .listen(port);
  console.log("Server has started.")
}

exports.getDir = getDir;
exports.start = start

