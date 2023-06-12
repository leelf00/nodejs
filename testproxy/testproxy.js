const http = require('http');
const net = require('net');
var httpProxy = require('http-proxy');
var url = require('url');
//var util = require('util');
var cluster = require('cluster');
const numCPUs = require('os').cpus().length;

var proxy = httpProxy.createServer();

// fork-join 模式
// 管理节点
if (cluster.isMaster) {
  // 加入工作线程.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  //工作线程监听
  cluster.on('listening',(worker,address) => {
    console.log('监听: 工作线程 ' + worker.process.pid +', Address: '+address.address+":"+address.port);
  });
  //工作线程退出
  cluster.on('exit', (worker, code, signal) => {
    console.log('工作线程线程 ' + worker.process.pid + ' 退出');
    //尝试启动一个新的工作进程
    cluster.fork();
  });

}
// 工作节点
else {

  var server = http.createServer(function (req, res) {
    //console.log('Receiving reverse proxy request for:', req.url);
    proxy.web(req, res, {target: req.url, secure: false, xfwd: true});

  }).listen(8888);

  server.on('connect', function (req, socket) {
    //console.log('Receiving reverse proxy request for:',req.url);
    var serverUrl = url.parse('https://' + req.url);
    var srvSocket = net.connect(serverUrl.port, serverUrl.hostname, function() {
      socket.write('HTTP/1.1 200 Connection Established\r\n' +
      'Proxy-agent: Node-Proxy\r\n' +
      '\r\n');
      srvSocket.pipe(socket);
      socket.pipe(srvSocket);
    });
  });

}

