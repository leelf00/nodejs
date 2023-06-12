/* =========================================================
	主程序
	@author
	@version 20180725
 * ========================================================= */
'use strict';
const numCPUs = require('os').cpus().length;
//const numCPUs = 8;
const os = require('os');
const cluster = require('cluster');
const thrift = require("thrift");
const RPCConvService = require("./RPCConvService");
const ttypes = require("./rpcconv_types");
var Html2PdfRes = require("./rpcconv_types").Html2PdfRes;

// fork-join 模式
// 管理节点
if (cluster.isMaster) {
  // 加入工作线程.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  //工作线程监听
  cluster.on('listening',(worker,address) => {
    console.log(`[convservice]监听: 工作线程 ${worker.process.pid},Address: ${address.address}:${address.port}`);
  });
  //工作线程退出
  cluster.on('exit', (worker, code, signal) => {
    console.error(`[convservice]工作线程线程${worker.process.pid}退出`);
    //尝试启动一个新的工作进程
    cluster.fork();
  });

  try{

    //linux下释放unix socket
    if(os.type().toUpperCase().match(/LINUX/g)&&fs.existsSync(appconfig.server_listen)){
      fs.unlinkSync(appconfig.server_listen);
    }

  }catch(e){
    console.error(e);
  }
}
// 工作节点
else {

  var server = thrift.createServer(RPCConvService, {
    Html2Pdf: function(req, result) {
      console.log(1);
      console.log(req);
      var res=new Html2PdfRes();
      res.resp_code=0;
      res.message='调用成功';
      res.content='';
      result(null,res);
    }
   });
  server.listen(9090);

}
