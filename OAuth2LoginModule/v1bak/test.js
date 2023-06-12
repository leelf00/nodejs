"use strict";
require("babel-core/register")({
    "presets": [
      "es2015",
      "stage-3"
    ],
    "plugins": [
      "transform-runtime"
    ]
});
require("babel-polyfill");
require('./test');
//import Koa from 'koa';
//import router from 'koa-router';
//var app = require('koa');
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
const Koa = require('koa');
const app = new Koa();
var Router = require('koa-router');
const router = new Router();

// fork-join 模式
// 管理节点
if (cluster.isMaster) {
  // 加入工作线程.
  for (var i = 0; i < numCPUs; i++) {
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


  function testfunc1(){
    return new Promise((resolve,reject) => {


      resolve(1234);
    })
  }

  var test1 = async function test1(){
    console.log(await testfunc1());

  }

  test1();

  router.get('/test', function (ctx, next) {
    ctx.body = 'hehe';
  });

  app.use(router.routes()).use(router.allowedMethods());

  app.listen(3000, ()=>console.log(`listen on 3000`));

}


