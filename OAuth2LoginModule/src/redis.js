/* =========================================================
	Redis连接器
	@author
	@version 20160323
	@update 20160323 by fei 首次提交
 * ========================================================= */
'use strict';
// 系统配置文件
const appconfig = require('./config/config').appconfig;
const uuid = require('uuid');
// 目前bluebird性能比原生的高一些
const Promise = require('bluebird');
const client = (appconfig.redis_server.mode==='unix')?require('redis').createClient(appconfig.redis_server.path):require('redis').createClient({
    host:appconfig.redis_server.host,
    port:appconfig.redis_server.port
});
const sub = (appconfig.redis_server.mode==='unix')?require('redis').createClient(appconfig.redis_server.path):require('redis').createClient({
    host:appconfig.redis_server.host,
    port:appconfig.redis_server.port
});
//var Scheduler = require('redis-scheduler');
//var scheduler = new Scheduler((appconfig.redis_server.mode==='unix')?{path:appconfig.redis_server.path}:{ host: appconfig.redis_server.host, port: appconfig.redis_server.port });

const mysqlClient = require('./mysql');
var worker_id = uuid.v1();
var worker_id_init = false;

client.on('connect', function() {
  console.log(`[redis]Redis已连接`);
  //自动订阅
  subWorker();
});

client.on("error", function (err) {
  console.error(`[redis]Redis异常: ${err}`);
});

module.exports.getClient = function (){
  return client;
}

/** 根据AccessToken去获取登陆人信息 **/
var getUserByAccessToken = module.exports.getUserByAccessToken = function getUserByAccessToken(accessToken){
  return new Promise((resolve, reject) => {
    client.hgetall(`S_session_${accessToken}`, (err, reply) => {
      if(!err) {
        resolve(reply);
      }else{
        console.error(`[redis]getUserByAccessToken Err:${err}`);
        reject(err);
      }
    });
  });
};

/** 向redis中写入accesstoken和fingerprint **/
module.exports.setAccesstokenAndFingerPringt = function setAccesstokenAndFingerPringt(_accessToken,_fingerPrint,params,urls){
    return new Promise((resolve, reject) => {
      let map = {
        '_accessToken':_accessToken, 'merch_id':params.merchantnum,
        'login_user_id':params.user_id||params.member_no, 'login_user_code':params.user_code, 'login_user_name':params.user_name, 'login_user_account':params.username,
        'schema' :params.schema,'ip_addr':params.ipaddr,'wss_path':urls,'last_login_time':params.last_login_time||''
      }
      if(_fingerPrint) map['_fingerPrint'] = _fingerPrint;
      let _copyparams = ['merch_name','node_no','node_name','province_no','wechat_openid','wechat_access_token','wechat_refresh_token'];
      let _cps;
      for(_cps of _copyparams){
        if(typeof params[_cps]!='undefined') map[_cps] = params[_cps];
      }
      if(typeof map.merchid!='undefined'&&map.merchid!=-999){
        return mysqlClient.getFrequentIpAddr(params).then(k=>{
          console.log('login session map:',map);
          client.hmset(`S_session_${_accessToken}`,map,function (err, res) {
            if(err) console.error(err);
            client.expire(`S_session_${_accessToken}`,appconfig.session_expire_second);
            resolve(map);
          });
        })
      }else{
        return mysqlClient.getFrequentIpAddrC(params).then(k=>{
          console.log('login session map:',map);
          client.hmset(`S_session_${_accessToken}`,map,function (err, res) {
            if(err) console.error(err);
            client.expire(`S_session_${_accessToken}`,appconfig.session_expire_second);
            resolve(map);
          });
        })
      }


    //return map;
    });
}

/** 微信未绑定用户登录时将openid当作accesstoken写入redis */
module.exports.setAccesstokenWhenUnregisteredUserLogin = function setAccesstokenWhenUnregisteredUserLogin(val){
  let map = {
    'wechat_openid':val.wechat_openid,'wechat_access_token':val.wechat_access_token,'wechat_refresh_token':val.wechat_refresh_token
  }
  client.hmset('S_session_'+val.wechat_openid,map, (err, res) => {
    if(err) console.error(`setAccesstokenWhenUnregisteredUserLogin error:${err}`);
    client.expire(`S_session_${val.wechat_openid}`,86400);
  });
}

/** 登陆失败时向redis中写入存在的账号的上次登录时间
    格式 merch_id@@@@@username ： time&0
**/
module.exports.recordLastLoginFailed = function recordLastLoginFailed(params){
  console.log('now in recordLastLoginFailed,params:',params);
  let new_time = new Date().getTime();
  let _username = params.merchantnum +'@@@@@'+ params.username;
  client.hget('Login_Failed_Accounts',_username, function (err, reply) {
    if(err) console.error(`[redis]recordLastLoginFailed error:${err}`);
    if(reply === undefined || reply == null ){
      client.hset('Login_Failed_Accounts',_username,new_time+'&0');
    }else{
      client.hset('Login_Failed_Accounts',_username,new_time+'&'+(reply.split('&')[1] -1 +2));//字符串隐式转换
    }
  });
}

/** 登陆时从redis中读取登陆失败次数 **/
module.exports.getFailedLoginTimes = function getFailedLoginTimes(params) {
  	return new Promise((resolve, reject) => {
      let _username = params.merchantnum + '@@@@@' + params.username;
      client.hget('Login_Failed_Accounts',_username , function (err, reply) {
        if (!err) {
          if(reply == undefined){
            resolve(true);
          }
          else {
            if ((reply.split('&')[0] - 1 + appconfig.login_error.lock_millisecond) < new Date().getTime()){
              //锁定时间过后再登录，触发解锁
              client.hdel('Login_Failed_Accounts',_username ,function (serr, sreply){
                resolve(true);
              });
            }
            if (((reply.split('&')[0] - 1 + appconfig.login_error.lock_millisecond) >= new Date().getTime()) && (reply.split('&')[1] >= appconfig.login_error.failure_times-2)) {
              console.log(`[server]账号${_username}输入错误密码过多，用户锁定。`);
              if(reply.split('&')[1] == (appconfig.login_error.failure_times-2)){
                require('./mysql').getUserByMerchidAndUsername({
                  schema:params.merchantnum,
                  account:params.username
                }).then((usermap)=>{
                  //console.log('usermap:',usermap);
                  if(usermap!=null){
                    let _now = new Date();
                    if(usermap.email!=null){
                      require('./email').sendMail({
                        to: usermap.email,//,hao.li@s-ap.com
                        subject: '【加油气站营销云平台】'+_now.toLocaleDateString('zh-CN')+' '+_now.toLocaleTimeString('zh-CN')+'商户【'+params.merchantnum+'】，用户账号【'+usermap.user_name+'】因异常登录锁定',
                        text: '',
                        html: '<p>【加油气站营销云平台】系统通知：'+_now.toLocaleDateString('zh-CN')+' '+_now.toLocaleTimeString('zh-CN')+'商户【'+params.merchantnum+'】，用户账号【'+usermap.user_name+'】因错误多次输入用户名密码锁定,解除锁定请联系管理员</p>'
                      });
                    }
                  }
                });

              }
              resolve(false);
            }
            else {
              resolve(true);
            }
          }
        } else {
          console.log(err);
        }
        resolve(true);
      });
    });
}

/** 登陆成功时写入account_login_map表当期授权码 */
//外部调用
module.exports.setLoginCode = function (username,code) {
  client.hget('account_login_map',username,function (err,reply) {
    if (err) {console.log(`[redis]set login code err:${err}`);return;}
    let _map = JSON.parse(reply) || {} ;
    _map['code'] = code;
    client.hset('account_login_map',username,JSON.stringify(map));
  })
}

/** 申请访问令牌时认证用户名和授权码 */
//外部调用
module.exports.getLoginCode = function getLoginCode(username,code) {
  client.hget('account_login_map',username,function (err,reply) {
    if(err){
      console.error('[redis]get login code err');
      return;
    }
    let _map = JSON.parse(reply) || {} ;
    if (_map == {}) {
      return false;
    }
    else if (_map['code'] != code) {
      return false;
    }
    else return true;
  });
}

/** 登陆冲突判断 ,同一账号后登录顶掉前登录**/
//TODO
module.exports.loginConflict = function loginConflict(_accessToken,params,db_prefix){
  return new Promise((resolve,reject)=>{
    //console.log('now in loginConflict');
    client.hget('account_login_map',`${params.merchantnum}_${params.username}`,function (err, reply) {
      if(!err){
          let map = (reply!=null) ? JSON.parse(reply) : {};
          //操作redis，移除原有的AccessToken
          if(!(reply===undefined)) {
            mysqlClient.updateLoginHistory(map.accesstoken,params,db_prefix);
            client.del(`S_session_${map.accesstoken}`);
          }
          //设置新的map
          map.accesstoken = params.accesstoken || '';
          map.logintime = new Date().getTime();
          client.hset('account_login_map',`${params.merchantnum}_${params.username}`,JSON.stringify(map));
          resolve(true);
      } else{
        console.error('[redis]login conflict err');
        resolve(false);
      }

    });
  });
}

/** 判断AccessToken是否需要刷新 **/
module.exports.accessTokenRefreshJudgement = function (merch_id,username,accessToken,res,callback){
  	return new Promise((resolve, reject) => {
      client.hget('account_login_map',`${merch_id}_${username}`,function (err,reply) {
        if(err) {console.error(`[redis]accessTokenRefreshJudgement error:${err}`);return;}
        if(reply != undefined){
          let _new_accesstoken = uuid.v1();
          //先获取原来的所有值
          getUserByAccessToken(reply.accesstoken).then(val=>{
            let _values = val || {};
            if(reply.logintime- 0 + appconfig.accesstoken_expire_second * 1000 < new Date().getTime()){
              _values._accessToken = _new_accesstoken;
              //复制到新的键值
              client.hset(`S_session_${_new_accesstoken}`,_values,(serr,sreply) => {
                client.expire(`S_session_${_new_accesstoken}`, appconfig.accesstoken_expire_second);
              });
              //老键值过期,60秒
              client.expire(`S_session_${accessToken}`,60);
              //在共用map内设置
              reply.accesstoken = _new_accesstoken;
              reply.logintime = new Date().getTime();
              client.hset('account_login_map',`${merch_id}_username`,reply);
              //写入客户端cookie
              res.cookie('_accessToken', _atobj['_accessToken'], { expires: new Date(Date.now() + 86400000), httpOnly: true });
            };
            resolve(true);
          });
        }
        resolve(true);
      });
      resolve(true);
    });
}

/** 登出时删除对应的S_session */
//TODO
module.exports.delAccessTokenWhenLogout = (accesstoken,db_prefix) => {
  getUserByAccessToken(accesstoken).then(val=>{
    console.log(`[server]用户退出:${JSON.stringify(val)}`);
    if(typeof val != 'undefined' && (val != null) && (val.hasOwnProperty('merch_id')) && (val['merch_id']!=null)) client.hdel('account_login_map',val.merch_id+'_'+val.login_user_account);
    client.del('S_session_' + accesstoken);
    if(typeof val != 'undefined' && (val != null) && (val.hasOwnProperty('merch_id')) && (val['merch_id']!=null)) {
      mysqlClient.logoutHandling(val.login_user_account,accesstoken,val.schema,db_prefix);
    }
    else{

    }
  });
}

/** 根据商户id，获取商户配置信息 **/
module.exports.getMerchConfig = function getMerchConfig(merch_id) {
    return new Promise((resolve, reject) => {
        client.hget('C_merch_config',merch_id,function (err,reply) {
          if(err) {console.error(`[redis]getMerchConfig error:${err}`);return;}
          var _map = JSON.parse(reply) || {} ;
          resolve(_map);
        });
    });
}

/** 微信登出处理的Redis部分
    返回微信openid
**/
module.exports.wechatLogout = function wechatLogout(accesstoken) {
  	return new Promise((resolve, reject) => {
      getUserByAccessToken(accesstoken).then((val)=>{
        //修改account_login_map中的对应键值为S_session_openid
        client.hdel('account_login_map',val.merch_id+'_'+val.login_user_account);
        //复制原有的accesstoken中的wechat3个值到S_session_openid，包含wechat_openid,wechat_access_token,wechat_refresh_token
        var map = {
          'wechat_openid':val.wechat_openid,'wechat_access_token':val.wechat_access_token,'wechat_refresh_token':val.wechat_refresh_token
        }
        client.hmset(`S_session_${val.wechat_openid}`,map, (err, res) => {
          if(err) console.error(err);
          //设置一天失效
          client.expire('S_session_'+val.wechat_openid,86400);
          //删除之前的accesstoken
          client.del(`S_session_${accesstoken}`);
        });
        resolve(val.wechat_openid);
      });
    });
}

/** 订阅一个通道 **/


/** 设置每个worker的公用对象
  nodejs_cluster_workers {
    worker_map : { } {id:worker_uuid,update_time:long} ]
    current_worker : worker_uuid
  }
  每个worker启动时都在list内注册一个uuid，同时写入current_worker
  最后一个写入worker的作为工作主线程，其余的轮空
  每次执行时，所有worker都重写一次这个对象，包括worker_map和current_worker
  worker_uuid 为 worker订阅到redis时产生，使用uuid法则
**/

function subWorker () {
  return new Promise((resolve, reject) => {
    client.hmset('nodejs_cluster_workers',[worker_id,JSON.stringify({ id: worker_id, update_time: new Date() }),'current_worker',worker_id],(serr,sreply) => {
      //console.log('工作线程'+worker_id+'订阅');
      worker_id_init = true;
      resolve(true);
    });
  });
};

var syncToSubWorker = module.exports.syncToSubWorker = function (){
    return new Promise((resolve, reject) => {
        if(worker_id_init == false){
          //自动订阅
          subWorker().then(val=>{ resolve(true); });
        }else{
          resolve(true);
        }
    });
}

/**
  从nodejs_cluster_workers中获取workers列表，从workers列表中判断current_worker是否为当前的worker_id，
  如果为同一个id，则执行，否则轮空。
  执行后，所有worker重新写入nodejs_cluster_workers
  一般本函数由定时器或全局触发器调用
**/
module.exports.standloneWork = function(doWork){
  return new Promise((resolve, reject) => {
    return syncToSubWorker().then(val=>{
      client.hgetall('nodejs_cluster_workers',(err,reply) => {
        if(err) console.error(`[cluster_workers]get nodejs_cluster_workers error: ${err}`);
        //当前工作线程id
        if(reply['current_worker']==worker_id){
          console.log(`[cluster_workers]工作任务${doWork.name}由${worker_id}执行`);
          doWork().then(do_val=>{
            client.hmset('nodejs_cluster_workers',[worker_id,JSON.stringify({ id: worker_id, update_time: new Date() }),'current_worker',worker_id],(serr,sreply) => {
              console.log(`[cluster_workers]工作线程${worker_id}执行${doWork.name}完成`);
              resolve(true);
            })
          });
        }else{
          client.hmset('nodejs_cluster_workers',[worker_id,JSON.stringify({ id: worker_id, update_time: new Date() }),'current_worker',worker_id],(serr,sreply) => {
            console.log(`[cluster_workers]下个工作线程${doWork.name}由${worker_id}执行`);
            resolve(true);
          })
        }
      });
    });
  });
};

/** 根据AccessToken去获取微信信息 */
//exports.getWechatInfo = require('./redis.js').getUserByAccessToken;

/** 基于redis keyspace的定时器 */
module.exports.redisTimer = (handlerFunction,expirationTime) => {
  return new Promise((resolve,reject) => {
    client.setex(`js_cluster_timer_${handlerFunction.name}`,expirationTime,1,function (err,reply) {
      if(err) console.error(`js_cluster_timer_${handlerFunction.name} error`);
      client.set(`js_cluster_timer_method_${handlerFunction.name}`,JSON.stringify(handlerFunction),function (err2,reply2) {
        if(err2) console.error(`js_cluster_timer_method_${handlerFunction.name} error`);
        resolve(true);
      });
    });
  });
  // return new Promise((resolve,reject) => {
  //   scheduler.schedule({ key: `${handlerFunction.name}_timer`, expire: expirationTime, handler: handlerFunction }, function (err) {
  //     if(err) console.error(`${handlerFunction.name}_timer error`);
  //     resolve(true);
  //   });
  // })
}

/** 基于redis keyspace的周期执行定时器 */
/** remove for test 20170828 **/
// module.exports.redisIntervalTimer = (handlerFunction,expirationTime) => {
//   function intervalHandler() {
//     //handlerFunction();
//     redisTimer(handlerFunction,expirationTime);
//     // scheduler.cancel({ key: `${handlerFunction.name}_timer` }, function () {
//     //   scheduler.schedule({ key: `${handlerFunction.name}_timer`, expire: expirationTime, handler: intervalHandler }, function (err) {
//     //     if(err) console.error(`${handlerFunction.name}_timer error:${err}`);
//     //     //resolve(true);
//     //   });
//     // })
//   }
//   return new Promise((resolve,reject) => {
//     intervalHandler();
//   })
// }

/** 登录过期时候删除account_login_map中对应的值 **/
sub.on("psubscribe", function (channel, count) {
  console.log(`[redis]psubscribe ${channel}:${count}`);
});

/** 接收到消息的时候 **/
sub.on("pmessage", function (pattern, channel, message) {
  //console.log(`pattern:${pattern},channel:${pattern},message:${message}`);
  if(channel=='js_cmd_channel'){
    console.log(`[redis]命令通道收到消息。${message}`);
  }
  if(message=='expired'){
    if(channel.indexOf('S_session')!= -1){
      //会话过期情况
      let _accesstoken = channel.split(':')[1].split('_')[2];
      client.hgetall('account_login_map', function (err, obj) {
        if(err) console.error(`get account_login_map error:${err}`);
        for(let _u in obj){
          if(JSON.parse(obj[_u]).accesstoken==_accesstoken){
            client.hdel('account_login_map',_u);
            console.log(`用户 ${_u} 会话超时，用户退出。`);
          }
        }
      });
    }
    if(channel.indexOf('js_cluster_timer')!= -1){
      let _method = channel.split(':')[1].split('_')[3]
      client.get(`js_cluster_timer_method_${_method}`,function(err, reply){
        if(err) console.error(`excute js_cluster_timer_method_${_method} error:${err}`);
        eval(reply);
      });
    }
  }
});

/** 订阅通道 第一个是键值变化信息，第二个是js命令通道**/
sub.psubscribe(['__key*__:S_session*','js_cmd_channel','__key*__:js_cluster_timer_method']);