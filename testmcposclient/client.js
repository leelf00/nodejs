'use strict';
const protobuf = require("protobufjs");
const net = require('net');
const crc = require('./crc');
const cluster = require('cluster');
const fa = require('./fa');
//var numCPUs = require('os').cpus().length;
//网点号
var node_no = 50000092;

// 管理节点
if (cluster.isMaster) {
  // 加入工作线程.numCPUs
  for (let i = 0; i < 100; i++) {
    cluster.fork();
  }
  cluster.on('fork', (worker) => {
  	node_no+=1;
    worker.id = node_no;
    //console.log(`[Cloud测试程序]启动${node_no}`);
    worker.send(node_no);
    //console.log(worker.id);
  });
  //工作线程监听
  cluster.on('listening',(worker,address) => {
    console.log('[Cloud测试程序]监听: 工作线程 ' + worker.process.pid +', Address: '+address.address+":"+address.port);
  });
  //工作线程退出
  cluster.on('exit', (worker, code, signal) => {
    console.log('[Cloud测试程序]工作线程线程 ' + worker.process.pid + ' 退出');
    //尝试启动一个新的工作进程
    //cluster.fork();
  });

}
// 工作节点
else {

  function testcloud() {

    // let _testobj =
    process.on('message', (nodeno) => {
    	    console.log(`[Cloud测试程序]网点${nodeno}`);
    let client = net.createConnection({port: 183,host:'127.0.0.1'}, () => {

    	protobuf.load("sapcis-mcpos.proto", function(err, root) {
            if (err)
                throw err;
                  //写出
		      //固定间隔发送心跳
		      setInterval(function(){
		         //heartbeat(node_no+cluster.worker.id)
		         client.write(fa.clientHB(nodeno,1,root),function(){
		           // client.write(fa.twob(node_no,2,genObj(_termTraNo)));
		           // _termTraNo++;
		         });
		      
		      },100);

        });


      // client.write(fa.heartbeat(node_no,1),function(){
      //   client.write(fa.twob(node_no,2,genObj(_termTraNo)));
      //   _termTraNo++;
      // });
      //let _termTraNo = 1;
      //client.write(fa.clientHB(node_no,1,1));
      //client.write(fa.heartbeat(node_no,1));
      // fa.deal(node_no,1,{}).then(v=>{
      //   client.write(v);
      // });
      // fa.twoc(node_no,1,{}).then(v=>{
      //   client.write(v);
      // });
      // fa.twob(node_no,1,{}).then(v=>{
      //   client.write(v);
      // });

      //client.write(fa.twob(node_no,2,genObj(_termTraNo)));
      //console.time('insert Time');
      // for(var i = 2;i<1000000;i++){
      //   client.write(fa.heartbeat(node_no,1));
      //   //client.write(fa.heartbeat(node_no,i%249));
      //   //client.write(fa.twob(node_no,i%249,genObj(_termTraNo)));
      //   //client.write(fa.twoc(node_no,i%249,gentwoc()));

      //   //_termTraNo++;
      // }
      //console.timeEnd('insert Time');
      //client.end();




      //固定间隔发送交易记录
      // setInterval(function(){
      //
      // },1000);

    });
    // let pack;
    // client.on('data', (data) => {
    //   console.log(data.toString('hex'));
    //   //console.log(data.length);
    //   pack += data;
    //   //client.end();
    // });
    client.on('end', () => {
      //console.log(pack.length);
      console.log('disconnected from server');
    });
  	});



  }


  testcloud();

}




