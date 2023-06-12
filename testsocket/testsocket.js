const net = require('net');
const client = net.createConnection({port: 8007,host:'127.0.0.1'}, () => {
  //'connect' listener
  console.log('connected to server!');

  //心跳报文
  var _hb = new Buffer("fa00000100000000050510010001695c", "hex");

  //写出
  for(var i=0;i<10;i++){
    client.write(_hb);
  }

});
var _len = 0;
client.on('data', (data) => {
  //console.log(data.toString());
  //console.log(data.length);
  _len += data.length;
  //console.log(_len);
  //client.end();
});
client.on('end', () => {
  console.log('disconnected from server');
});
