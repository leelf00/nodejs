var mysql = require('mysql2');
var crypto = require('crypto');
var router = require('./router.js');
var redisClient = require('./redis.js');
// 系统配置文件
var appconfig = require('./config/config').appconfig;
var pool = mysql.createPool({
    connectionLimit: appconfig.mysql_server.connectionLimit,
    socketPath : appconfig.mysql_server.socketPath,
    //host: appconfig.mysql_server.host,
    user: appconfig.mysql_server.user,
    password: appconfig.mysql_server.password,
    namedPlaceholders: true
})
pool.config.namedPlaceholders = true;

// 判断登录信息，成功时返回登录人信息，失败时返回错误码
exports.queryDateBase = function(params, db_prefix) {
    return new Promise((resolve, reject) => {
        var result = 0;
        var hash = crypto.createHash('sha256').update(params.password + "haohaoxuexi,tiantianxiangshang").digest('hex');
        var _hash = crypto.createHash('sha256').update(params.username + params.password + "haohaoxuexi,tiantianxiangshang").digest('hex');
        //尝试从redis缓存中获取商户配置
        redisClient.getMerchConfig(params.merchantnum).then((v) => {
            let schema = v.sso_db_schema;
            let merch_name = v.merch_name;
            pool.query("select t1.id,t1.user_id,t2.user_name,t2.node_no,t2.email,t2.mobile,t3.node_sname,t3.province_no from " + schema + "." + db_prefix + "_account t1, " + schema + "." + db_prefix + " t2 , " + schema + ".tbl_sys_node t3 where t1.user_id = t2.id and t2.node_no = t3.node_no and t1.account = :username", params, function(err, rows2) {
                if (err) console.log(err);
                if (rows2.length > 0) {
                    var _query_result2 = rows2[0];
                    params.id = _query_result2.id;
                    params.user_id = _query_result2.user_id;
                    params.user_name = _query_result2.user_name;
                    params.node_name = _query_result2.node_sname;
                    params.node_no = _query_result2.node_no;
                    params.province_no = _query_result2.province_no;
                    params.email = _query_result2.email;
                    params.mobile = _query_result2.mobile;

                    params.schema = schema;
                    params.merch_name = merch_name;
                    var _param = {
                        'schema': schema,
                        'username': params.username,
                        'hash': hash,
                        'hash2': _hash
                    };
                    pool.query('' +
                        " SELECT" +
                        " 	(" +
                        " 		CASE (" +
                        " 			SELECT" +
                        " 				count(*)" +
                        " 			FROM" +
                        " 				" + schema + "." + db_prefix + "_account t1" +
                        " 			WHERE" +
                        " 				t1.account = :username" +
                        " 		)" +
                        " 		WHEN 1 THEN" +
                        " 			'y'" +
                        " 		WHEN 0 THEN" +
                        " 			'n'" +
                        " 		ELSE" +
                        " 			'm'" +
                        " 		END" +
                        " 	) AS account_exists," +
                        " 	(" +
                        " 		CASE (" +
                        " 			SELECT" +
                        " 				t2.acc_type" +
                        " 			FROM" +
                        " 				" + schema + "." + db_prefix + "_account t2" +
                        " 			WHERE" +
                        " 				t2.account = :username" +
                        " 		)" +
                        " 		WHEN 'username' THEN" +
                        " 			'y'" +
                        " 		WHEN 'wechat' THEN" +
                        " 			'w'" +
                        " 		WHEN 'empcard' THEN" +
                        " 			'empcard'" +
                        " 		ELSE" +
                        " 			'n'" +
                        " 		END" +
                        " 	) AS acc_type_correct," +
                        " 	(" +
                        " 		CASE (" +
                        " 			SELECT" +
                        " 				p3.locked" +
                        " 			FROM" +
                        " 				" + schema + "." + db_prefix + "_account t3," +
                        " 				" + schema + "." + db_prefix + " p3" +
                        " 			WHERE" +
                        " 				t3.user_id = p3.id" +
                        " 			AND t3.account = :username" +
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
                        " 			SELECT" +
                        " 				t5.hash" +
                        " 			FROM" +
                        " 				" + schema + "." + db_prefix + "_account t5" +
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
                        " 			SELECT" +
                        " 				t4.pwd" +
                        " 			FROM" +
                        " 				" + schema + "." + db_prefix + "_account t4" +
                        " 			WHERE" +
                        " 				t4.account = :username" +
                        " 		) = :hash THEN" +
                        " 			'y'" +
                        " 		ELSE" +
                        " 			'n'" +
                        " 		END" +
                        " 	) AS pwd_correct"

                        +
                        '', _param,
                        function(err, rows, fields) {
                            if (err) console.log(err);

                            var _query_result = rows[0];
                            if (_query_result.account_exists == 'n') result = 2; //账号不存在
                            else if (_query_result.acc_type_correct == 'n') result = 3; //登陆类型错误
                            else if (_query_result.account_not_locked == 'n') result = 4; //账户被锁定
                            // else if(_query_result.acc_type_correct == 'w') result = 0;//微信登陆不验证密码
                            else if(_query_result.acc_type_correct == 'empcard') result = 0;//员工卡登陆
                            else if (_query_result.acc_type_correct == 'w' && _query_result.pwd_correct == 'y') result = 6; //微信登陆成功
                            else if (_query_result.acc_type_correct == 'w' && _query_result.pwd_correct == 'n') result = 7; //微信登陆失败
                            else if (_query_result.pwd_correct == 'n') result = 5; //密码错误
                            else if (_query_result.hash_correct == 'n') result = 8; //账号密码不匹配
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
exports.queryDateBaseFromC = function(params, db_prefix) {
    return new Promise((resolve, reject) => {
        var result = 0;
        var hash = crypto.createHash('sha256').update(params.password + "haohaoxuexi,tiantianxiangshang").digest('hex');
        var _hash = crypto.createHash('sha256').update(params.username + params.password + "haohaoxuexi,tiantianxiangshang").digest('hex');
        var schema = 'station';

        pool.query("select t1.id,t1.user_id,t2.user_name from " + schema + "." + db_prefix + "_account t1, " + schema + "." + db_prefix + " t2  where t1.user_id = t2.id  and t1.account = :username", params, (err, rows, fields) => {
            if (err) console.log(err);
            if (rows.length > 0) {
                var _query_result2 = rows[0];
                params.id = _query_result2.id;
                params.user_id = _query_result2.user_id;
                params.user_name = _query_result2.user_name;
            }

            params.schema = schema;
            var _param = {
                'schema': schema,
                'username': params.username,
                'hash': hash,
                'hash2': _hash,
                'wechat_openid': params.wechat_openid
            }
            pool.query('' +
                " SELECT" +
                " 	(" +
                " 		CASE (" +
                " 			SELECT" +
                " 				count(*)" +
                " 			FROM" +
                " 				" + schema + "." + db_prefix + "_account t1" +
                " 			WHERE" +
                " 				t1.account = :username" +
                " 		)" +
                " 		WHEN 1 THEN" +
                " 			'y'" +
                " 		WHEN 0 THEN" +
                " 			'n'" +
                " 		ELSE" +
                " 			'm'" +
                " 		END" +
                " 	) AS account_exists," +
                " 	(" +
                " 		CASE (" +
                " 			SELECT" +
                " 				t2.acc_type" +
                " 			FROM" +
                " 				" + schema + "." + db_prefix + "_account t2" +
                " 			WHERE" +
                " 				t2.account = :username" +
                " 		)" +
                " 		WHEN 'username' THEN" +
                " 			'y'" +
                " 		WHEN 'wechat' THEN" +
                " 			'w'" +
                " 		ELSE" +
                " 			'n'" +
                " 		END" +
                " 	) AS acc_type_correct," +
                " 	(" +
                " 		CASE (" +
                " 			SELECT" +
                " 				p3.locked" +
                " 			FROM" +
                " 				" + schema + "." + db_prefix + "_account t3," +
                " 				" + schema + "." + db_prefix + " p3" +
                " 			WHERE" +
                " 				t3.user_id = p3.id" +
                " 			AND t3.account = :username" +
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
                " 			SELECT" +
                " 				t5.hash" +
                " 			FROM" +
                " 				" + schema + "." + db_prefix + "_account t5" +
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
                " 			SELECT" +
                " 				t4.pwd" +
                " 			FROM" +
                " 				" + schema + "." + db_prefix + "_account t4" +
                " 			WHERE" +
                " 				t4.account = :username" +
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
                " 			SELECT" +
                " 				t5.account" +
                " 			FROM" +
                " 				" + schema + "." + db_prefix + "_account t5" +
                " 			WHERE" +
                " 				t5.account = :username" +
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
                " 			SELECT" +
                " 				t6.auto_login" +
                " 			FROM" +
                " 				" + schema + "." + db_prefix + "_account t6" +
                " 			WHERE" +
                " 				t6.account = :username" +
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
                " 			SELECT" +
                " 				t8.account" +
                " 			FROM" +
                " 				" + schema + "." + db_prefix + "_account t8" +
                " 			WHERE" +
                " 				t8.user_id = (" +
                " 					SELECT" +
                " 						t7.user_id" +
                " 					FROM" +
                " 						" + schema + "." + db_prefix + "_account t7" +
                " 					WHERE" +
                " 						t7.account = :username" +
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
                            pool.query("" +
                                " UPDATE " + schema + "." + db_prefix + "_account t" +
                                " SET t.auto_login = 'true'" +
                                " WHERE" +
                                " 	t.user_id = (" +
                                " 		SELECT" +
                                " 			user_id" +
                                " 		FROM" +
                                " 			(" +
                                " 				SELECT" +
                                " 					p.user_id" +
                                " 				FROM" +
                                " 					" + schema + "." + db_prefix + "_account p" +
                                " 				WHERE" +
                                " 					p.account = " + "'" + params.username + "'" +
                                " 			) AS id" +
                                " 	)",
                                function(err) {
                                    if (err) console.log('error when update true:' + err);
                                });
                        } else {
                            pool.query("" +
                                " UPDATE " + schema + "." + db_prefix + "_account t" +
                                " SET t.auto_login = 'false'" +
                                " WHERE" +
                                " 	t.user_id = (" +
                                " 		SELECT" +
                                " 			user_id" +
                                " 		FROM" +
                                " 			(" +
                                " 				SELECT" +
                                " 					p.user_id" +
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
                        var result_map = reply;
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





// TODO
exports.getUserInfo = function(params) {
    console.log('now in getUserInfo');
}

// 记录当前登录人登录历史
exports.insertLoginHistory = function(params, db_prefix) {
    // console.log('params of insert history:',params,'db_prefix:',db_prefix);
    pool.query('' +
        " insert into " + params.schema + "." + db_prefix + "_login_history values(" +
        "   0," +
        " 	:id," +
        " 	:username," +
        "   :user_id," +
        " 	' '," +
        " 	:accesstoken," +
        " 	:clientid," +
        " 	:useragent," +
        " 	0," +
        " 	:ipaddr," +
        " 	NOW()," +
        " 	'pc'," +
        " 	null," +
        " 	:fingerprint" +
        " )" +
        '', params,
        function(err, rows, fields) {
            // if (err) console.log(err);
        });
}

//强制冲突登陆人登出时更新登陆历史
exports.updateLoginHistory = function(_accessToken, params, db_prefix) {
    pool.query('update ' + params.schema + '.' + db_prefix + '_login_history t set t.logout_time = now() where t.access_token = \'' + _accessToken + '\'', _accessToken, function(err, rows, fields) {
        if (err) console.log(err);
    });
}

//TODO redis中登陆信息数据失效时无法触发当前登录表中的数据抹除
//登陆成功时更新当前登录表
exports.updateLoginCurrent = function(params, db_prefix) {
    pool.query('select * from ' + params.schema + '.' + db_prefix + '_login_current where account_name = :username', params, function(err, rows, fields) {
        if (err) console.log(err);
        if (rows.length == 0) {
            console.log('params of insert current:', params);
            pool.query('' +
                " insert into " + params.schema + "." + db_prefix + "_login_current values(" +
                " 	:id," +
                " 	:username," +
                " 	:user_id," +
                " 	' '," +
                " 	:accesstoken," +
                " 	:useragent," +
                " 	0," +
                " 	:ipaddr," +
                " 	NOW()," +
                " 	'pc'" +
                " )" +
                '', params,
                function(err, rows, fields) {
                    if (err) console.log(err);
                });
        } else {
            pool.query('' +
                "update " + params.schema + "." + db_prefix + "_login_current t" +
                " set t.account_id = :id," +
                " t.account_name = :username," +
                " t.user_id = :user_id," +
                " t.session_id = ' '," +
                " t.access_token = :accesstoken," +
                " t.user_agent = :useragent," +
                " t.error_login_times = 0," +
                " t.ip_addr = :ipaddr," +
                " t.login_time = NOW()," +
                " t.terminal_code = 'pc'" +
                " where t.account_name = :username" +
                '', params,
                function(err, rows, fields) {
                    if (err) console.log(err);
                });


        }
    });
    // pool.query()
}

exports.getUserByMerchidAndUsername = function getUserByMerchidAndUsername(params) {
    return new Promise((resolve, reject) => {
      redisClient.getMerchConfig(params.schema).then((v) => {
        pool.query('select t1.id,t1.user_name,t1.email,t1.mobile,t2.account from '+ v.sso_db_schema +'.sys_user t1,' + v.sso_db_schema + '.sys_user_account t2 where t1.id = t2.user_id and t2.account = :account limit 1',params, function(err, rows, fields) {
            if (err) console.log(err);
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
exports.getRouterMap = (result) => {
    return new Promise((resolve, reject) => {
        pool.query('select t.context_path,t.server_url from station.sys_router t', function(err, rows, fields) {
            if (err) console.log(reject(err));
            rows.forEach(o => {
                result[o.context_path] = o.server_url;
            });
            resolve(result);
        });
    });
}

//从sys_url_whitelist表中获取白名单数据
exports.getWhitelist = (result) => {
    return new Promise((resolve, reject) => {
        pool.query('select * from station.sys_url_whitelist', function(err, rows) {
            if (err) console.log(reject(err));
            rows.forEach(o => {
                result.push(o.url);
            });
            resolve(result);
        });
    });
}

//登出时往数据库"+db_prefix+"_login_history表中最后一条更新logouttime&删除"+db_prefix+"_login_current表中当前登录人的记录
exports.logoutHandling = function logoutHandling(username, schema, db_prefix) {
    pool.query('update ' + schema + '.' + db_prefix + '_login_history t set t.logout_time = NOW() where t.account_name = :username order by t.login_time desc limit 1', {
        'username': username
    }, function(err, rows) {
        if (err) console.log(err);
    });
    pool.query('delete from ' + schema + '.' + db_prefix + '_login_current where account_name = :username', {
        'username': username
    }, function(err2, rows2) {
        if (err2) console.log(err2);
    })
}

//微信登出时，设置该账号的autologin为false
exports.wechatLogouthandle = function wechatLogouthandle(username, schema, db_prefix) {
    pool.query("update " + schema + "." + db_prefix + "_account t set t.auto_login = 'false' where	t.user_id = (select user_id	from (select	p.user_id	from " + schema + "." + db_prefix + "_account p	WHERE p.account = :account ) as id	)", {
        'account': username
    }, function(err2, rows2) {
        if (err2) console.log(err2);
    })
}

//登陆成功时从数据库中读取符合用户对应角色的所有权限的访问路径
exports.getAuthorizedPath = function(username, schema, db_prefix, db_afterfix) {
    return new Promise((resolve, reject) => {
        pool.query('select distinct t3.account,p.wss_path from ' + schema + '.' + db_prefix + '_user_' + db_afterfix + ' t1,' + schema + '.' + db_prefix + '_' + db_afterfix + '_menu t2,' + schema + '.' + db_prefix + '_user_account t3,station.' + db_prefix + '_menu_info p where t1.' + db_afterfix + '_code = t2.' + db_afterfix + '_code and t2.menu_code = p.menu_code and t1.user_id = t3.user_id and t3.account = \'' + username + '\'', function(err, rows) {
            if (err) console.log('getAuthorizedPath error', err);
            let i;
            let result=[];
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
exports.getMenuList = function getMenuList(result) {
    return new Promise((resolve, reject) => {
        pool.query('select p.wss_path from station.sys_menu_info p where p.wss_path is not null union select q.wss_path from station.client_menu_info q where q.wss_path is not null', function(err, rows) {
            if (err) console.log('getMenuList error', err);
            for (let i = 0; i < rows.length; i++) {
                if (!result.includes(rows[i].wss_path)) result.push(rows[i].wss_path);
            }
            resolve(result);
        });
    });
}

//记录b端用户访问日志
exports.logMerchUserAccess = function logMerchUserAccess(params) {
    return new Promise((resolve, reject) => {
        redisClient.getMerchConfig(params.merchantnum).then((v) => {
            pool.query('insert into ' + v.sso_db_schema + "." + "sys_access_log(user_id,url,params,proxy_status_code,status_code,log_time,fingerprint,account_name,user_agent) values (:user_id,:url,:params,:proxy_status_code,:status_code,:log_time,:fingerprint,:account_name,:user_agent)", params, function(err, rows, fields) {
                if (err) console.log(err);
                resolve(true);
            });
        });

    });
}

//设置商户缓存到Redis
function putMerchConfigCache() {
    return new Promise((resolve, reject) => {
        pool.query('select t.merch_id,t.merch_name,t.thread_num,t.salesys_db_schema,t.mc_db_schema,t.iccard_db_schema,t.sso_db_schema,t.sub_merch_id from station.merch_config t', {}, (err, rows, fields) => {
            if (err) console.log(err);
            rows.forEach(o => {
                redisClient.getClient().hset('C_merch_config', o.merch_id, JSON.stringify(o));
            });
            resolve(true);
        });
    });
}

//启动时添加商户缓存
putMerchConfigCache().then((val)=>{
  console.log('商户缓存载入成功');
});