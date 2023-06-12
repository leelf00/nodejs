/* =========================================================
	Mysql连接
	@author fei
	@version 20160728
	@update 20160728 by fei 首次提交
  @update 20160818 by fei 修正问题
 * ========================================================= */
'use strict';
const Promise = require('bluebird');
const mysql = require('mysql2');
const crypto = require('crypto');
const redisClient = require('./redis');
// 系统配置文件
const appconfig = require('./config/config').appconfig;
var pool = (appconfig.mysql_server.mode==='unix')?mysql.createPool({
    connectionLimit: appconfig.mysql_server.connectionLimit,
    socketPath : appconfig.mysql_server.socketPath,
    //host: appconfig.mysql_server.host,
    user: appconfig.mysql_server.user,
    password: appconfig.mysql_server.password,
    namedPlaceholders: true
}):mysql.createPool({
    connectionLimit: appconfig.mysql_server.connectionLimit,
    //socketPath : appconfig.mysql_server.socketPath,
    host: appconfig.mysql_server.host,
    user: appconfig.mysql_server.user,
    password: appconfig.mysql_server.password,
    namedPlaceholders: true
})
pool.config.namedPlaceholders = true;

module.exports.getClient = function (){
  return pool;
}

// 判断登录信息，成功时返回登录人信息，失败时返回错误码
module.exports.queryDateBase = function(params, db_prefix) {
    return new Promise((resolve, reject) => {
        let result = 0;
        let hash = crypto.createHash('sha256').update(`${params.password}haohaoxuexi,tiantianxiangshang`).digest('hex'),_hash = crypto.createHash('sha256').update(`${params.username}${params.password}haohaoxuexi,tiantianxiangshang`).digest('hex');
        //let ;
        //尝试从redis缓存中获取商户配置
        return redisClient.getMerchConfig(params.merchantnum).then(v => {
            //商户号不存在
            if(Object.keys(v).length==0) {
              resolve(1);
              return;
            };
            let schema = v.sso_db_schema,merch_name = v.merch_name;
            pool.query(`select t1.id,t1.user_id,t2.user_name,t2.node_no,t2.user_code,t2.email,t2.mobile,t3.node_sname,t3.province_no from ${v.sso_db_schema}.${db_prefix}_account t1 inner join ${v.sso_db_schema}.${db_prefix} t2 on t1.user_id = t2.id inner join ${v.sso_db_schema}.tbl_sys_node t3 on t2.node_no = t3.node_no where t1.account = :username`, params, function(err, rows2) {
                if (err) console.log(err);
                if (typeof rows2!= 'undefined'&&rows2.length > 0) {
                    let _query_result2 = rows2[0];
                    params.id = _query_result2.id;
                    params.account_id = _query_result2.id;
                    params.user_id = _query_result2.user_id;
                    params.user_name = _query_result2.user_name;
                    params.user_code = _query_result2.user_code;
                    params.node_name = _query_result2.node_sname;
                    params.node_no = _query_result2.node_no;
                    params.province_no = _query_result2.province_no;
                    params.email = _query_result2.email;
                    params.mobile = _query_result2.mobile;

                    params.schema = schema;
                    params.merch_name = merch_name;
                    let _param = {
                        'schema': schema,'username': params.username,'hash': hash,'hash2': _hash
                    };
                    pool.query(`select
                         	(case (select count(*) from	${v.sso_db_schema}.${db_prefix}_account t1	where t1.account = :username) when 1 then	'y' when 0 then 'n' else 'm' end) as account_exists,
                         	(case (select t2.acc_type from ${v.sso_db_schema}.${db_prefix}_account t2 where t2.account = :username) when 'username' then 'y' when 'wechat' then 'w' when 'empcard' then 'empcard' else 'n' end) as acc_type_correct,
                         	(case (select p3.locked from ${v.sso_db_schema}.${db_prefix}_account t3,${v.sso_db_schema}.${db_prefix} p3 where t3.user_id = p3.id and t3.account = :username) when 0 then 'y' else 'n' end) as account_not_locked,
                         	(case when (select t5.hash from ${v.sso_db_schema}.${db_prefix}_account t5 where t5.account = :username) = :hash2 then 'y' else 'n' end) as hash_correct,
                         	(case when (select t4.pwd from ${v.sso_db_schema}.${db_prefix}_account t4 where t4.account = :username) = :hash then 'y' else 'n' end) as pwd_correct`, _param,
                        function(err, rows, fields) {
                            if (err) console.error(err);
                            let _query_result = rows[0];
                            if (_query_result.account_exists == 'n') result = 2; //账号不存在
                            else if (_query_result.acc_type_correct == 'n') result = 3; //登陆类型错误
                            else if (_query_result.account_not_locked == 'n') result = 4; //账户被锁定
                            // else if(_query_result.acc_type_correct == 'w') result = 0;//微信登陆不验证密码
                            else if(_query_result.acc_type_correct == 'empcard') result = 0;//员工卡登陆
                            else if (_query_result.acc_type_correct == 'w' && _query_result.pwd_correct == 'y') result = 6; //微信登陆成功
                            else if (_query_result.acc_type_correct == 'w' && _query_result.pwd_correct == 'n') result = 7; //微信登陆失败
                            else if (_query_result.pwd_correct == 'n') result = 5; //密码错误
                            else if (_query_result.hash_correct == 'n') result = 8; //账号密码的hash不匹配
                            else result = 0;
                            resolve(result);
                        });

                }
                else if(rows2.length==0){
                  resolve(2);
                }
            });

        });

    });

}


// C端登陆时判断登录信息，成功时返回登录人信息，失败时返回错误码
module.exports.queryDateBaseFromC = function(params, db_prefix) {
    return new Promise((resolve, reject) => {
        let result = 0;
        let hash = crypto.createHash('sha256').update(`${params.password}haohaoxuexi,tiantianxiangshang`).digest('hex');
        let _hash = crypto.createHash('sha256').update(params.username + params.password + "haohaoxuexi,tiantianxiangshang").digest('hex');
        let schema = 'station';

        pool.query("select t1.id,t1.member_no,t2.user_name from station.client_user_account t1, station.client_user t2  where t1.member_no = t2.member_no and t1.account = :username", params, (err, rows, fields) => {
            if (err) console.log(err);
            if (typeof rows != 'undefined' && rows.length > 0) {
                params.id = rows[0].id;
                params.member_no = rows[0].member_no;
                params.user_name = rows[0].user_name;
            }

            params.schema = schema;
            var _param = {
                'schema': schema,
                'username': params.username,
                'hash': hash,
                'hash2': _hash,
                'wechat_openid': params.wechat_openid
            }
            pool.query("select" +
                " 	(case (select count(*) from station.client_user_account t1 where t1.account = :username) when 1 then 'y' when 0 then 'n' else 'm' end) as account_exists," +
                " 	(case (select t2.acc_type from station.client_user_account t2 where	t2.account = :username) when 'username' then 'y' when 'wechat' then 'w' else 'n' end) as acc_type_correct," +
                " 	(case (select p3.locked from station.client_user_account t3,station.client_user p3 where t3.member_no = p3.member_no and t3.account = :username" +
                " 		)" +
                " 		WHEN 0 THEN" +
                " 			'y'" +
                " 		ELSE" +
                " 			'n'" +
                " 		END" +
                " 	) AS account_not_locked,"

                +
                " 	(" +
                " 		CASE" +
                " 		WHEN (" +
                " 			SELECT t5.hash FROM station.client_user_account t5" +
                " 			WHERE" +
                " 				t5.account = :username" +
                " 		) = :hash2 THEN" +
                " 			'y'" +
                " 		ELSE" +
                " 			'n'" +
                " 		END" +
                " 	) AS hash_correct,"

                +
                " 	(" +
                "     CASE " +
                " 		WHEN (" +
                " 			SELECT t4.pwd FROM station.client_user_account t4" +
                " 			WHERE	t4.account = :username" +
                " 		) = :hash THEN" +
                " 			'y'" +
                " 		ELSE" +
                " 			'n'" +
                " 		END" +
                " 	) AS pwd_correct,"

                +
                " 	(" +
                " 		CASE" +
                " 		WHEN (" +
                " 			SELECT t5.account FROM station.client_user_account t5" +
                " 			WHERE t5.account = :username" +
                " 		) = :wechat_openid THEN" +
                " 			'y'" +
                " 		ELSE" +
                " 			'n'" +
                " 		END" +
                " 	) AS openid_correct,"

                +
                " 	(" +
                " 		CASE" +
                " 		WHEN (" +
                " 			SELECT t6.auto_login FROM station.client_user_account t6" +
                " 			WHERE t6.account = :username" +
                " 		) = 'true' THEN" +
                " 			'y'" +
                " 		ELSE" +
                " 			'n'" +
                " 		END" +
                " 	) AS auto_opened,"

                +
                " (" +
                " 		CASE" +
                " 		WHEN (" +
                " 			SELECT t8.account	FROM station.client_user_account t8" +
                " 			WHERE t8.member_no = (" +
                " 					SELECT t7.member_no FROM station.client_user_account t7" +
                " 					WHERE t7.account = :username" +
                " 				)" +
                " 			AND t8.account != :username" +
                " 		) = :wechat_openid THEN" +
                " 			'y'" +
                " 		ELSE" +
                " 			'n'" +
                " 		END" +
                " 	) AS openid_bound"


                +
                '', _param,
                function(err, rows, fields) {
                    if (err) console.log(err);
                    var _query_result = rows[0];
                    console.log(params);

                    //根据勾选设置自动登录
                    if (params['wechat_login_type'] == 'username') {
                        if (params.autoLogin == 1) {
                            pool.query("update station.client_user_account t set t.auto_login = 'true' where" +
                                " 	t.member_no = (" +
                                " 		SELECT" +
                                " 			membern_no" +
                                " 		FROM" +
                                " 			(" +
                                " 				SELECT" +
                                " 					p.member_no" +
                                " 				FROM" +
                                " 					" + schema + "." + db_prefix + "_account p" +
                                " 				WHERE" +
                                " 					p.account = " + "'" + params.username + "'" +
                                " 			) AS id" +
                                " 	)",
                                function(err) {
                                    if (err) console.error('error when update true:' + err);
                                });
                        } else {
                            pool.query("update station.client_user_account t set t.auto_login = 'false' where" +
                                " 	t.member_no = (" +
                                " 		SELECT" +
                                " 			user_id" +
                                " 		FROM" +
                                " 			(" +
                                " 				SELECT" +
                                " 					p.member_no" +
                                " 				FROM" +
                                " 					" + schema + "." + db_prefix + "_account p" +
                                " 				WHERE" +
                                " 					p.account = " + "'" + params.username + "'" +
                                " 			) AS id" +
                                " 	)",
                                function(err) {
                                    if (err) console.log('error when update false:' + err);
                                });
                        }
                    }
                    redisClient.getClient().hgetall('S_session_' + params.wechat_openid, function(err, reply) {
                        if (err) console.log('some error happened:', err);
                        let result_map = reply;
                        //if(params['wechat_login_type'] == 'username') console.log('patchca:',result_map['patchca'],'params.patchca:',params.patchca,',params:',params);
                        if (params['wechat_login_type'] == 'auto' && params['wechat_openid'] != undefined && _query_result.account_exists == 'n') result = 9; //微信未绑定登陆
                        else if (params['wechat_login_type'] == 'username' && params.patchca != result_map.patchca) result = 12; //验证码错误
                        else if (params['wechat_login_type'] == 'auto' && _query_result.auto_opened == 'n') result = 11; //微信自动登陆未开启
                        else if (params['wechat_openid'] != undefined && _query_result.openid_correct == 'y' && _query_result.auto_opened == 'y') result = 6; //微信自动登陆
                        //else if(params['wechat_openid'] != undefined && _query_result.openid_correct == 'n') result = 10;//openid不匹配
                        else if (_query_result.account_exists == 'n') result = 2; //账号不存在
                        else if (_query_result.acc_type_correct == 'n') result = 3; //登陆类型错误
                        else if (_query_result.account_not_locked == 'n') result = 4; //账户被锁定
                        else if (_query_result.acc_type_correct == 'w') result = 6; //微信登陆不验证密  码
                        else if (_query_result.acc_type_correct == 'w' && _query_result.pwd_correct == 'y') result = 6; //微信登陆成功
                        else if (_query_result.acc_type_correct == 'w' && _query_result.pwd_correct == 'n') result = 7; //微信登陆失败
                        else if (_query_result.pwd_correct == 'n') result = 5; //密码错误
                        else if (_query_result.hash_correct == 'n') result = 8; //账号密码不匹配
                        else if (_query_result.openid_bound == 'y') result = 6; //微信登陆成功
                        else result = 0;
                        //console.log('_query_result:',_query_result);
                        // console.log('_param:',_param);
                        resolve(result);
                    });

                });

        });

    });

}

// 记录当前登录人登录历史
module.exports.insertLoginHistory = function(params) {
    pool.query(`insert into ${params.schema}.sys_user_login_history values(0,:account_id,:username,:user_id,' ',:accesstoken,:clientid,:useragent,0,:ipaddr,NOW(),'pc',null,:fingerprint)`, params,function(err, rows, fields) {
        if (err) console.error(`[mysql]insertLoginHistory err:${err}`);
    });
}

// 记录当前登录人登录历史(C端)
module.exports.insertLoginHistoryC = function(params) {
    pool.query("insert into station.client_user_login_history(account_id,account_name,member_no,session_id,access_token,client_id,user_agent,error_login_times,ip_addr,login_time,terminal_code,logout_time,finger_print) values(:id,:username,:member_no,' ',:accesstoken,:clientid,:useragent,0,:ipaddr,NOW(),'pc',null,:fingerprint)", params,function(err, rows, fields) {
       if (err) console.error(`[mysql]insertLoginHistoryC err:${err}`);
    });
}

//强制冲突登陆人登出时更新登陆历史
module.exports.updateLoginHistory = function(_accessToken, params, db_prefix) {
    pool.query(`update ${params.schema}.${db_prefix}_login_history t set t.logout_time = now() where t.access_token = :access_token`,{'access_token':_accessToken}, function(err, rows, fields) {
        if (err) console.error(`[mysql]updateLoginHistory err:${err}`);
    });
}

module.exports.getUserByMerchidAndUsername = function getUserByMerchidAndUsername(params) {
    return new Promise((resolve, reject) => {
      redisClient.getMerchConfig(params.schema).then(v => {
        pool.query(`select t1.id,t1.user_name,t1.email,t1.mobile,t2.account from ${v.sso_db_schema}.sys_user t1,${v.sso_db_schema}.sys_user_account t2 where t1.id = t2.user_id and t2.account = :account limit 1`,params, function(err, rows, fields) {
            if (err) console.error(`[mysql]getUserByMerchidAndUsername err:${err}`);
              if(rows.length>0){
              resolve(rows[0]);
            }
            else resolve(null);
        });
      });

    });
}

//从sys_router表中获取context-path:server_url键值对map
//TODO
module.exports.getRouterMap = (result) => {
    return new Promise((resolve, reject) => {
        pool.query('select t.context_path,t.server_url from station.sys_router t', function(err, rows, fields) {
            if (err) console.error(`[mysql]getRouterMap Error:${err}`);
            rows.forEach(o => {
                result[o.context_path] = o.server_url;
            });
            resolve(result);
        });
    });
}

//从sys_url_whitelist表中获取白名单数据
module.exports.getWhitelist = (result) => {
    return new Promise((resolve, reject) => {
        pool.query('select url from station.sys_url_whitelist', function(err, rows) {
            if (err) console.error(`[mysql]getWhitelist Error:${err}`);
            rows.forEach(o => {
                result.push(o.url);
            });
            console.log(`[mysql]访问白名单读取成功，共${rows.length}条`);
            resolve(result);
        });
    });
}

//登出时往数据库"+db_prefix+"_login_history表中最后一条更新logouttime
module.exports.logoutHandling = function logoutHandling(username, access_token, schema, db_prefix) {
    pool.query(`update ${schema}.${db_prefix}_login_history t set t.logout_time = NOW() where t.account_name = :username and t.access_token = :access_token order by t.login_time desc limit 1`, {'username': username,'access_token': access_token}, function(err, rows) {
        if (err) console.error(`[mysql]logoutHandling error:${err}`);
    });
}

//微信登出时，设置该账号的autologin为false
module.exports.wechatLogouthandle = function wechatLogouthandle(username, schema, db_prefix) {
    pool.query("update " + schema + "." + db_prefix + "_account t set t.auto_login = 'false' where	t.user_id = (select user_id	from (select	p.user_id	from " + schema + "." + db_prefix + "_account p	WHERE p.account = :account ) as id	)", {
        'account': username
    }, function(err2, rows2) {
        if (err2) console.error(`[mysql]wechatLogouthandle Error:${err2}`);
    })
}

//登陆成功时从数据库中读取符合用户对应角色的所有权限的访问路径
module.exports.getAuthorizedPath = function(username, schema, db_prefix, db_afterfix) {
    return new Promise((resolve, reject) => {
        pool.query(`select distinct t3.account,p.wss_path from ${schema}.${db_prefix}_user_${db_afterfix} t1,${schema}.${db_prefix}_${db_afterfix}_menu t2,${schema}.${db_prefix}_user_account t3,station.${db_prefix}_menu_info p where t1.${db_afterfix}_code = t2.${db_afterfix}_code and t2.menu_code = p.menu_code and t1.user_id = t3.user_id and t3.account = '${username}'`, function(err, rows) {
            if (err) console.error(`[mysql]getAuthorizedPath error:${err}`);
            let i,result=[];
            for (i = 0; i < rows.length; i++) {
              if(rows[i].wss_path!=null){
                if (rows[i].wss_path.indexOf(';') > 0) {
                    rows[i].wss_path.split(';').forEach(o => {
                        if(o!=''&&!result.includes(o)){
                          result.push(o);
                        }
                    });
                } else result.push(rows[i].wss_path);
              }
              //if (rows[i].wss_path != null && !result.includes(rows[i].wss_path)) result.push(rows[i].wss_path);
            }
            resolve(result);
            //callback(JSON.stringify(urls));
        });
    });
}

//初始化时从数据库中读取菜单
module.exports.getMenuList = function getMenuList(result) {
    return new Promise((resolve, reject) => {
        pool.query('select p.wss_path as pa from station.sys_menu_info p where p.wss_path is not null union select q.menu_path as pa from station.sys_menu_info q where q.menu_path is not null', function(err, rows) {
            if (err) console.error(`[mysql]getMenuList error:${err}`);
            for (let i = 0; i < rows.length; i++) {
                if (!result.includes(rows[i].pa)) result.push(rows[i].pa);
            }
            resolve(result);
        });
    });
}

//读取指定用户的上次登录时间
module.exports.getUserLastLoginTime = function getUserLastLoginTime(params) {
    return new Promise((resolve, reject) => {
        pool.query(`select id,concat(login_time,\'\') as last_login_time from ${params.schema}.sys_user_login_history where user_id = :user_id order by login_time desc limit 1`,{user_id:params.user_id}, function(err, rows) {
            if (err) console.error(`getUserLastLoginTime error:${err}`);
            let _result = (rows.length>0)?rows[0]:{last_login_time:''};
            resolve(_result);
        });
    });
}

//记录b端用户访问日志
module.exports.logMerchUserAccess = function logMerchUserAccess(params) {
    return new Promise((resolve, reject) => {
        redisClient.getMerchConfig(params.merchantnum).then(v => {
            pool.query(`insert into ${v.sso_db_schema}.sys_access_log(user_id,url,params,proxy_status_code,status_code,log_time,fingerprint,account_name,user_agent) values (:user_id,:url,:params,:proxy_status_code,:status_code,:log_time,:fingerprint,:account_name,:user_agent)`, params, function(err, rows, fields) {
                if (err) console.error(`[mysql]logMerchUserAccess error:${err}`);
                resolve(true);
            });
        });

    });
}

//选取指定商户用户最近的5条登录ip地址记录
module.exports.getFrequentIpAddr = function getFrequentIpAddr(params) {
    return new Promise((resolve, reject) => {
        redisClient.getMerchConfig(params.merchantnum).then(v => {
            pool.query(`select o.* from (select ip_addr,count(1) as num,substring_index(ip_addr, '.', 2) as ip_abbr from ${v.sso_db_schema}.sys_user_login_history	where user_id = :user_id group by substring_index(ip_addr, '.', 2)	) o	order by o.num desc limit 5`, params, function(err, rows, fields) {
                if (err) console.error(`[mysql]getFrequentIpAddr error:${err}`);
                if(!(rows===undefined)){
                  rows.forEach(p=>{
                    if(p.ip_abbr==params.ip_addr) resolve(true);
                  })
                }
                resolve(false);
            });
        });
    });
}

//选取指定商户用户最近的5条登录ip地址记录
module.exports.getFrequentIpAddrC = function getFrequentIpAddrC(params) {
    return new Promise((resolve, reject) => {
        redisClient.getMerchConfig(params.merchantnum).then(v => {
            pool.query("select o.* from (select ip_addr,count(1) as num,substring_index(ip_addr, '.', 2) as ip_abbr from station.client_user_login_history	where member_no = :member_no group by substring_index(ip_addr, '.', 2)	) o	order by o.num desc limit 5", params, function(err, rows, fields) {
                if (err) console.error(`[mysql]getFrequentIpAddrC error:${err}`);
                if(rows!='undefined'){
                  rows.forEach(p=>{
                    if(p.ip_abbr==params.ip_addr) resolve(true);
                  })
                }
                resolve(false);
            });
        });
    });
}

//获取某个用户的菜单
module.exports.getMenu = function getMenu(params) {
    return new Promise((resolve,reject) => {
      redisClient.getMerchConfig(params.merchantnum).then(v => {
        pool.query(`select t.db_schema,	t.menu_code,t.menu_name,t.menu_path,t.menu_lvl,t.icon_class from station.sys_menu_info t where t.menu_type = 'merch' and t.menu_code in (`
        +"select mc from ("
      	+`(select	substr(rm.menu_code,1,2) as mc from	${v.sso_db_schema}.sys_role_menu rm where role_code in (select role_code from ${v.sso_db_schema}.sys_user_role	where	user_id = :user_id))	union (`
      	+`select rm.menu_code as mc	from ${v.sso_db_schema}.sys_role_menu rm where role_code in (select role_code from ${v.sso_db_schema}.sys_user_role	where	user_id = :user_id))) mmc)`
        +"order by length(t.menu_code),menu_code ASC",params,function(err,rows,fields){
              if (err) console.error(err);
              if(typeof rows!='undefined'){
                  resolve(rows);
              }else{
                  resolve([]);
              }
        });
      });
    });
}

//设置商户缓存到Redis
var putMerchConfigCache = module.exports.putMerchConfigCache = function putMerchConfigCache() {
    return new Promise((resolve, reject) => {
        pool.query('select t.merch_id,t.merch_name,t.thread_num,t.salesys_db_schema,t.mc_db_schema,t.iccard_db_schema,t.sso_db_schema,t.sub_merch_id from station.merch_config t', {}, (err, rows, fields) => {
            if (err) console.error(`[mysql]putMerchConfigCache error:${err}`);
            let _parr = [];
            rows.forEach(o => {
              _parr.push(o.merch_id,JSON.stringify(o));
            });
            redisClient.getClient().hmset('C_merch_config',_parr);
            resolve(true);
        });
    });
}
