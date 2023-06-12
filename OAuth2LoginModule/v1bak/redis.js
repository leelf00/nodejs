/* =========================================================
	Redis连接器
	@author
	@version 20160323
	@update 20160323 by fei 首次提交
 * ========================================================= */
// 系统配置文件
var uuid = require('node-uuid');
var appconfig = require('./config/config').appconfig;
var client = require('redis').createClient({
    // host:appconfig.redis_server.host,
    // port:appconfig.redis_server.port,
    path:appconfig.redis_server.path
});
var sub = require('redis').createClient({
    // host:appconfig.redis_server.host,
    // port:appconfig.redis_server.port,
    path:appconfig.redis_server.path
});
var sub_channel = require('redis').createClient({
    // host:appconfig.redis_server.host,
    // port:appconfig.redis_server.port,
    path:appconfig.redis_server.path
});
var Scheduler = require('redis-scheduler');
var scheduler = new Scheduler({ host: appconfig.redis_server.host, port: appconfig.redis_server.port });
var mysqlClient = require('./mysql.js');
var auth = require('./service/auth.js');
var worker_id = uuid.v1();
var worker_id_init = false;

client.on('connect', function() {
  console.log('Redis已连接');
  //自动订阅
  subWorker();
});

client.on("error", function (err) {
  console.log("Redis异常: " + err);
});

exports.getClient = function (){
  return client;
}

/** 根据AccessToken去获取登陆人信息 **/
exports.getUserByAccessToken = function getUserByAccessToken(accessToken){
  return new Promise((resolve, reject) => {
    client.hgetall('S_session_'+accessToken, (err, reply) => {
      if(!err) {
        resolve(reply);
      }else{
        console.error(err);
        reject(null);
      }
    });
  });
};

/** 向redis中写入accesstoken和fingerprint **/
exports.setAccesstokenAndFingerPringt = function (_accessToken,_fingerPrint,params,urls){
    var map = {
      '_accessToken':_accessToken, 'merch_id':params.merchantnum,
      'login_user_id':params.user_id, 'login_user_name':params.user_name, 'login_user_account':params.username,
      'schema' :params.schema,'ip_addr':params.ipaddr,'wss_path':urls
    }
    if(_fingerPrint) map['_fingerPrint'] = _fingerPrint;
    let _copyparams = ['merch_name','node_no','node_name','province_no','wechat_openid','wechat_access_token','wechat_refresh_token'];
    let _cps;
    for(_cps of _copyparams){
      if(params[_cps]) map[_cps] = params[_cps];
    }
    // console.log('login session map:',map);
    client.hmset('S_session_'+_accessToken,map,function (err, res) {
      if(err) console.log(err);
      client.expire('S_session_'+_accessToken,appconfig.session_expire_second);
    });
    return map;
}

/** 微信未绑定用户登录时将openid当作accesstoken写入redis */
exports.setAccesstokenWhenUnregisteredUserLogin = (val) => {
  var map = {
    'wechat_openid':val.wechat_openid,'wechat_access_token':val.wechat_access_token,'wechat_refresh_token':val.wechat_refresh_token
  }
  client.hmset('S_session_'+val.wechat_openid,map, (err, res) => {
    if(err) console.log(err);
    client.expire('S_session_'+val.wechat_openid,86400);
  });
}

/** 登陆失败时向redis中写入存在的账号的上次登录时间
    格式 merch_id@@@@@username ： time&0
**/
exports.recordLastLoginFailed = function recordLastLoginFailed(params){
  console.log('now in recordLastLoginFailed,params:',params);
  let new_time = new Date().getTime();
  let _username = params.merchantnum +'@@@@@'+ params.username;
  client.hget('Login_Failed_Accounts',_username, function (err, reply) {
    if(err) console.error('recordLastLoginFailed error');
    if(reply == undefined ){
      client.hset('Login_Failed_Accounts',_username,new_time+'&0');
    }else{
      client.hset('Login_Failed_Accounts',_username,new_time+'&'+(reply.split('&')[1] -1 +2));//字符串隐式转换
    }
  });
}

/** 登陆时从redis中读取登陆失败次数 **/
exports.getFailedLoginTimes = function getFailedLoginTimes(params) {
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
              console.log(`账号${_username}输入错误密码过多，用户锁定。`);
              if(reply.split('&')[1] == (appconfig.login_error.failure_times-2)){
                require('./mysql.js').getUserByMerchidAndUsername({
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
exports.setLoginCode = function (username,code) {
  client.hget('account_login_map',username,function (err,reply) {
    if (err) {console.log('set login code err');return;}
    let _map = JSON.parse(reply) || {} ;
    _map['code'] = code;
    client.hset('account_login_map',username,JSON.stringify(map));
  })
}

/** 申请访问令牌时认证用户名和授权码 */
//外部调用
exports.getLoginCode = function (username,code) {
  client.hget('account_login_map',username,function (err,reply) {
    if(err){
      console.error('get login code err');
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
exports.loginConflict = function (_accessToken,params,db_prefix){
  console.log('now in loginConflict');
  return client.hget('account_login_map',params.merchantnum+'_'+params.username,function (err, reply) {
    if(!err){
        var map = (reply!=null) ? JSON.parse(reply) : {};
        //操作redis，移除原有的AccessToken
        if((reply!= undefined)) {
          mysqlClient.updateLoginHistory(map.accesstoken,params,db_prefix);
          client.del('S_session_'+map.accesstoken);
        }
        //设置新的map
        map.accesstoken = params.accesstoken || '';
        map.logintime = new Date().getTime();
        client.hset('account_login_map',params.merchantnum+'_'+params.username,JSON.stringify(map));
        return true;
    } else{
      console.error('login conflict err');
      return false;
    }
  });
}

/** 判断AccessToken是否需要刷新 **/
exports.accessTokenRefreshJudgement = function (merch_id,username,accessToken,res,callback){
  	return new Promise((resolve, reject) => {
      client.hget('account_login_map',merch_id+'_'+username,function (err,reply) {
        if(err) {console.log('accessTokenRefreshJudgement error');return;}
        if(reply != undefined){
          let _new_accesstoken = uuid.v1();
          //先获取原来的所有值
          require('./redis.js').getUserByAccessToken(reply.accesstoken).then((val)=>{
            let _values = val || {};
            if(reply.logintime- 0 + appconfig.accesstoken_expire_second * 1000 < new Date().getTime()){
              _values._accessToken = _new_accesstoken;
              //复制到新的键值
              client.hset('S_session_' + _new_accesstoken,_values,(serr,sreply) => {
                client.expire('S_session_' + _new_accesstoken, appconfig.accesstoken_expire_second);
              });
              //老键值过期,60秒
              client.expire('S_session_' + accessToken,60);
              //在共用map内设置
              reply.accesstoken = _new_accesstoken;
              reply.logintime = new Date().getTime();
              client.hset('account_login_map',merch_id+'_'+username,reply);
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
exports.delAccessTokenWhenLogout = (accesstoken,db_prefix) => {
  require('./redis.js').getUserByAccessToken(accesstoken).then((val)=>{
    client.hdel('account_login_map',val.merch_id+'_'+val.login_user_account);
    client.del('S_session_' + accesstoken);
    mysqlClient.logoutHandling(val.login_user_account,val.schema,db_prefix);
  });
}

/** 根据商户id，获取商户配置信息 **/
exports.getMerchConfig = function getMerchConfig(merch_id) {
    return new Promise((resolve, reject) => {
        client.hget('C_merch_config',merch_id,function (err,reply) {
          if(err) {console.log('getMerchConfig error');return;}
          var _map = JSON.parse(reply) || {} ;
          resolve(_map);
        });
    });
}

/** 微信登出处理的Redis部分
    返回微信openid
**/
exports.wechatLogout = function wechatLogout(accesstoken) {
  	return new Promise((resolve, reject) => {
      require('./redis.js').getUserByAccessToken(accesstoken).then((val)=>{
        //修改account_login_map中的对应键值为S_session_openid
        client.hdel('account_login_map',val.merch_id+'_'+val.login_user_account);
        //复制原有的accesstoken中的wechat3个值到S_session_openid，包含wechat_openid,wechat_access_token,wechat_refresh_token
        var map = {
          'wechat_openid':val.wechat_openid,'wechat_access_token':val.wechat_access_token,'wechat_refresh_token':val.wechat_refresh_token
        }
        client.hmset('S_session_'+val.wechat_openid,map, (err, res) => {
          if(err) console.log(err);
          //设置一天失效
          client.expire('S_session_'+val.wechat_openid,86400);
          //删除之前的accesstoken
          client.del('S_session_'+accesstoken);
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

exports.syncToSubWorker = function (){
    return new Promise((resolve, reject) => {
        if(worker_id_init == false){
          //自动订阅
          subWorker().then((val)=>{ resolve(true); });
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
exports.standloneWork = function(doWork){
  return new Promise((resolve, reject) => {
    require('./redis.js').syncToSubWorker().then((val)=>{
      client.hgetall('nodejs_cluster_workers',(err,reply) => {
        if(err) console.log('get nodejs_cluster_workers error:',err);
        //当前工作线程id
        if(reply['current_worker']==worker_id){
          console.log('工作任务',doWork.name,'由',worker_id,'执行');
          doWork().then((val)=>{
            client.hmset('nodejs_cluster_workers',[worker_id,JSON.stringify({ id: worker_id, update_time: new Date() }),'current_worker',worker_id],(serr,sreply) => {
              console.log('工作线程'+worker_id+'执行'+doWork.name+'完成');
              resolve(true);
            })
          });
        }else{
          client.hmset('nodejs_cluster_workers',[worker_id,JSON.stringify({ id: worker_id, update_time: new Date() }),'current_worker',worker_id],(serr,sreply) => {
            console.log('下个工作线程',doWork.name,'由',worker_id,'执行');
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
exports.redisTimer = (handlerFunction,expirationTime) => {
  return new Promise((resolve,reject) => {
    scheduler.schedule({ key: handlerFunction.name+'_timer', expire: expirationTime, handler: handlerFunction }, function (err) {
      if(err) console.log(handlerFunction.name+'_timer error');
      resolve(true);
    });
  })
}

/** 基于redis keyspace的周期执行定时器 */
exports.redisIntervalTimer = (handlerFunction,expirationTime) => {
  function intervalHandler() {
    handlerFunction();
    scheduler.cancel({ key: handlerFunction.name+'_timer' }, function () {
      scheduler.schedule({ key: handlerFunction.name+'_timer', expire: expirationTime, handler: intervalHandler }, function (err) {
        if(err) console.log(handlerFunction.name+'_timer'+' error');
        //resolve(true);
      });
    })
  }
  return new Promise((resolve,reject) => {
    intervalHandler();
  })
}

/** 登录过期时候删除account_login_map中对应的值 **/
sub.on("psubscribe", function (channel, count) {
  console.log("sub channel psubscribe " + channel + ": " + count);
});

/** 接收到消息的时候 **/
sub.on("pmessage", function (pattern, channel, message) {
  if(message=='expired'){
    let _accesstoken = channel.split(':')[1].split('_')[2];
    client.hgetall('account_login_map', function (err, obj) {
      if(err) console.log(`get account_login_map error`);
      for(let _u in obj){
        if(JSON.parse(obj[_u]).accesstoken==_accesstoken){
          client.hdel('account_login_map',_u);
          console.log(`用户 ${_u} 会话超时，用户退出。`);
        }
      }
    });
  }
});

/** 订阅通道 **/
sub.psubscribe('__key*__:S_session*');

sub_channel.on("subscribe", function (channel, count) {
  console.log("js命令通道监听" + channel + ": " + count);
});

sub_channel.on("message", function (channel, message) {
  console.log("message" + message);
});

/** 订阅命令通道 **/
sub_channel.subscribe("js_cmd_channel");