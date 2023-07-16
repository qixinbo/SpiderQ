// 导入http模块
const http = require('http')


// 获得脚本所在的文件路径
function getDir(){
  return __dirname;
}

function start(port = 8074){
  http.createServer(function(req, res){
    res.end("hello nodejs")
  })
  .listen(port);
  console.log("Server has started.")
}

exports.getDir = getDir;
exports.start = start

