/* =========================================================
	更新缓存
	@author
	@version 20161101
	@update 20161101 by fei 首次提交
 * ========================================================= */
const Promise = require('bluebird');
const mysql = require('mysql2');
// 系统配置文件
const appconfig = require('./config/config').appconfig;
const client = (appconfig.redis_server.mode==='unix')?require('redis').createClient(appconfig.redis_server.path):require('redis').createClient({
    host:appconfig.redis_server.host,
    port:appconfig.redis_server.port
});
var pool = mysql.createPool({
    connectionLimit: appconfig.mysql_server.connectionLimit,
    socketPath : appconfig.mysql_server.socketPath,
    //host: appconfig.mysql_server.host,
    user: appconfig.mysql_server.user,
    password: appconfig.mysql_server.password,
    namedPlaceholders: true
})
pool.config.namedPlaceholders = true;

module.exports.refreshMerchConfig = function refreshMerchConfig(){
  return new Promise((resolve, reject) => {
    pool.query("select t.* from station.merch_config t", {}, function(err_mysql, rows) {
      if(err_mysql) console.log(err_mysql);
      let map = {};
      rows.forEach(o => {
        let _m;
        for (_m in o){
          if (typeof o[_m] != "string") {
            if (o[_m] instanceof Date){
              o[_m] = format(o[_m], 'yyyy-MM-dd hh:mm:ss');
            }else{
              o[_m] = o[_m] + '';
            }
          }
        };
        map[o.merch_id] = JSON.stringify(o);
      })
      client.hmset("C_merch_config",map,function (err_redis, res){
        if(err_redis) console.error(err_redis);
        resolve(true);
      });
    });


  });
}



//更新station下client_user表到redis的C_client_user
module.exports.refreshClientUser = function refreshClientUser(){
  return new Promise((resolve, reject) => {
    pool.query("select t.* from station.client_user t", {}, function(err_mysql, rows) {
      if(err_mysql) console.log(err_mysql);
      let map = {};
      rows.forEach(o => {
        let _m;
        for (_m in o){
          if (typeof o[_m] != "string") {
            if (o[_m] instanceof Date){
              o[_m] = format(o[_m], 'yyyy-MM-dd hh:mm:ss');
            }else{
              o[_m] = o[_m] + '';
            }
          }
        };
        map[o.member_no] = JSON.stringify(o);
      })
      client.hmset("C_client_user",map,function (err_redis, res){
        if(err_redis) console.error(err_redis);
        resolve(true);
      });
    });
  });
}

//更新station下client_user_card_bind表到redis的C_client_user_card_bind
module.exports.refreshClientUser = function refreshClientUser(){
  return new Promise((resolve, reject) => {
    pool.query("select t.* from station.client_user_card_bind t", {}, function(err_mysql, rows) {
      if(err_mysql) console.log(err_mysql);
      let map = {};
      rows.forEach(o => {
        let _m;
        for (_m in o){
          if (typeof o[_m] != "string") {
            if (o[_m] instanceof Date){
              o[_m] = format(o[_m], 'yyyy-MM-dd hh:mm:ss');
            }else{
              o[_m] = o[_m] + '';
            }
          }
        };
        map[o.card_no] = JSON.stringify(o);
      })
      client.hmset("C_client_user_card_bind",map,function (err_redis, res){
        if(err_redis) console.error(err_redis);
        resolve(true);
      });
    });
  });
}


//更新各商户下的tbl_card_inf表到redis的C_tbl_card_inf
module.exports.refreshTblCardInf = function refreshTblCardInf(){
  return new Promise((resolve, reject) => {
    client.hgetall('C_merch_config',function (err_redis,reply) {
      if(err_redis) console.log('getMerchConfig error');
      console.log('C_merch_config:',reply);
      var _map = reply || {};
      let _m;
      for(_m in _map){
        if(_m!='0000') {
          pool.query("select t.* from "+JSON.parse(_map[_m])['iccard_db_schema']+".tbl_card_inf t", {}, function(err_mysql, rows) {
            if(err_mysql) console.log(err_mysql);
            let map = {};
            rows.forEach(o => {
              let _m;
              for (_m in o){
                if (typeof o[_m] != "string") {
                  if (o[_m] instanceof Date){
                    o[_m] = format(o[_m], 'yyyy-MM-dd hh:mm:ss');
                  }else{
                    o[_m] = o[_m] + '';
                  }

                }
              };
              map[o.card_no] = JSON.stringify(o);
            })
            client.hmset("C_tbl_card_inf",map,function (err_redis, res){
              if(err_redis) console.error(err_redis);
              resolve(true);
            });
          });
        }

      }
    });



  });
}

//更新各商户下的tbl_card_inf表到redis的C_tbl_card_inf
module.exports.refreshTblSysNode = function refreshTblSysNode(){
  return new Promise((resolve, reject) => {
    client.hgetall('C_merch_config',function (err_redis,reply) {
      if(err_redis) console.log('getMerchConfig error');
      console.log('C_merch_config:',reply);
      var _map = reply || {};
      let _m;
      for(_m in _map){
        //if(_m!='0000') {
          pool.query("select t.* from "+JSON.parse(_map[_m])['sso_db_schema']+".tbl_sys_node t", {}, function(err_mysql, rows) {
            if(err_mysql) console.log(err_mysql);
            let map = {};
            rows.forEach(o => {
              let _m;
              for (_m in o){
                if (typeof o[_m] != "string") {
                  if (o[_m] instanceof Date){
                    o[_m] = format(o[_m], 'yyyy-MM-dd hh:mm:ss');
                  }else{
                    o[_m] = o[_m] + '';
                  }

                }
              };
              map[o.node_no] = JSON.stringify(o);
            })
            client.hmset("C_tbl_sys_node",map,function (err_redis, res){
              if(err_redis) console.err(err_redis);
              resolve(true);
            });
          });
        //}

      }
    });



  });
}

format = function date2str(x, y) {
    var z = {
        M: x.getMonth() + 1,
        d: x.getDate(),
        h: x.getHours(),
        m: x.getMinutes(),
        s: x.getSeconds()
    };
    y = y.replace(/(M+|d+|h+|m+|s+)/g, function(v) {
        return ((v.length > 1 ? "0" : "") + eval('z.' + v.slice(-1))).slice(-2)
    });

    return y.replace(/(y+)/g, function(v) {
        return x.getFullYear().toString().slice(-v.length)
    });
}


//刷新缓存
module.exports.refresh = () => {
//]
	Promise.all([require('./refreshcache').refreshMerchConfig(),require('./refreshcache').refreshClientUser(),require('./refreshcache').refreshTblCardInf(),require('./refreshcache').refreshClientUser(),require('./refreshcache').refreshTblSysNode()]).then(v=>{
    console.log('success');
    //client.quit();
    //pool.end();
	});
}


require('./refreshcache').refresh();