/** 新老mc路由程序 **/
'use strict';
const net = require('net');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const old_mc_ip = '172.18.4.88';
const old_mc_port = 8008;
const new_mc_ip = '172.18.4.114';
const new_mc_port = 1001;
const local_port = 8008;
const use_main_mc = 'new';// old , new

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
}else {

  //启动
  mcrouter();

}


/** 8008智能终端报文分发器 **/
function mcrouter(){

  let server = net.createServer({
    host: '127.0.0.1',
    port: local_port,
    exclusive: true
  },(c) => {

    let new_mc_client = undefined;
    let old_mc_client = undefined;

    try{
      //新版mc
      new_mc_client = net.createConnection({port: new_mc_port,host:new_mc_ip}, () => {
        console.log('[new_mc]connect success');
        //当新版mc获取到回应数据，写入到客户端
        new_mc_client.on('data',(newmcdata) =>{
          if(use_main_mc=='new') {
            c.write(newmcdata);
          }
          console.log('[new_mc]echo:',newmcdata.toString('hex'));
        });
        new_mc_client.on('end',(newmcdata) =>{
          if(use_main_mc=='new') {
            c.end();
          }
        });
        new_mc_client.on('error',(new_mc_error)=>{
          console.error('[new_mc]error:',new_mc_error);
        });
      });
    }catch(nmce){
      console.error(nmce);
    }

    try{
      //旧版mc
      old_mc_client = net.createConnection({port: old_mc_port,host:old_mc_ip}, () => {
        console.log('[old_mc]connect success');
        //当旧版mc获取到回应数据，写入到客户端
        old_mc_client.on('data',(oldmcdata) =>{
          if(use_main_mc=='old') {
            c.write(oldmcdata);
          }
          console.log('[old_mc]echo:',oldmcdata.toString('hex'));
        });
        old_mc_client.on('end',(oldmcdata) =>{
          if(use_main_mc=='old') {
            c.end();
          }
        });
        old_mc_client.on('error',(old_mc_error)=>{
          console.error('[old_mc]error:',old_mc_error);
        });
      });
    }catch(omce){
      console.error(nmce);
    }

    //监听获取到数据,同时写入新版mc和老版mc
    c.on('data', (data) => {

      if(undefined===new_mc_client){
        console.error('[new_mc]connect error');
      }else{
        try{

          if(data.toString('hex').substring(12,14)=='a5'){
            console.log('[new_mc]加油机签到命令write:',data.toString('hex'));
            if(use_main_mc=='new') {
              new_mc_client.write(data);
            }
          }else{
            console.log('[new_mc]write:',data.toString('hex'));
            new_mc_client.write(data);
          }

        }catch(we){
          console.error(we);
        }
      }

      if(undefined===old_mc_client){
        console.error('[old_mc]connect error');
      }else{
        try{
          if(data.toString('hex').substring(12,14)=='a5'){
            console.log('[old_mc]加油机签到命令write:',data.toString('hex'));
            if(use_main_mc=='old') {
              old_mc_client.write(data);
            }
          }else{
            console.log('[old_mc]write:',data.toString('hex'));
            old_mc_client.write(data);
          }

        }catch(we){
          console.error(we);
        }
      }

    });
    c.on('end', () => {
      try{
        new_mc_client.end();
      }catch(we){
        console.error(we);
      }
      try{
        old_mc_client.end();
      }catch(we){
        console.error(we);
      }
    });

    //
    c.on('error', (err) => {
      console.error(err);
    });

    // c.write('hello\r\n');
    // c.pipe(c);
  });



  //监听获取到数据,同时写入新版mc和老版mc
  // server.on('data', (data) => {
  //   // new_mc_client.write(data);
  //   // old_mc_client.write(data);
  //   console.log(data.toString('hex'));
  // });
  server.on('error', (err) => {
    throw err;
  });
  server.listen(8008, () => {
    console.log('server bound');
  });


}
