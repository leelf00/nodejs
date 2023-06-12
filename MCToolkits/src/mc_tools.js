/* =========================================================
	站级工具集合主程序
	@author
	@version 20160620
	@update 20160620 by fei 首次提交站级系统自动化优化、打包、部署工具
 * ========================================================= */
const mysql = require('mysql2');
//sqllite3 debug mode
var sqlite3 = require('sqlite3').verbose();
//sqllite db
var sqlitedb;
//系统配置文件
const appconfig = require('./config/config').appconfig;
//Mysql连接池
var pool = mysql.createPool({
    connectionLimit: appconfig.mysql_server.connectionLimit,
    //socketPath : appconfig.mysql_server.socketPath,
    host: appconfig.mysql_server.host,
    user: appconfig.mysql_server.user,
    password: appconfig.mysql_server.password,
    namedPlaceholders: true
})
pool.config.namedPlaceholders = true;

//需要同步的表名
const sync_tables = ['nozzle_info','product_category','product_price_current','product_skuinfo','work_team_info','sys_user','sys_user_account','tbl_card_black_info','tbl_card_white_info','client_user','client_user_card_bind','product_member_points_current','sys_user_pos_role'];
//'tbl_ctrl_ver_inf',

//module.exports = exports = {};

//生成mysql转换sqllite建表语句
module.exports.gen_create_table_sql = function gen_create_table_sql(tablename) {
    return new Promise((resolve, reject) => {
        console.log("show create table " + appconfig.db_schema + '.' + tablename + ";");
        pool.query("show create table " + appconfig.db_schema + '.' + tablename + ";", function(err, rows) {
            if (err) console.log(`从Mysql表${tablename}中获取数据发生异常：${err}`);
            console.log(`获取${tablename}中${rows.length}条记录`);
            if (rows.length > 0) {
                let _create_table_sql = rows[0]['Create Table'];
                console.log(_create_table_sql);
                _create_table_sql = _create_table_sql
                    .replace(/`(\w+)`\s/, '[$1] ')
                    .replace(/\s+UNSIGNED/i, '')
                    .replace(/\s+[A-Z]*INT(\([0-9]+\))/i, ' INTEGER$1')
                    .replace(/\s+INTEGER\(\d+\)(.+AUTO_INCREMENT)/i, ' INTEGER$1')
                    .replace(/\s+AUTO_INCREMENT(?!=)/i, ' PRIMARY KEY AUTOINCREMENT')
                    .replace(/\s+ENUM\([^)]+\)/i, ' VARCHAR(255)')
                    .replace(/\s+ON\s+UPDATE\s+[^,]*/i, ' ')
                    //.replace(/\s+COMMENT\s+(["\']).+\1/iU,' ')
                    //.replace(/.*?(COMMENT).*?(,),''["i"]'')


                    //.replace(/\s+timestamp/g, ' TEXT')
                    .replace(/\)[^,]*utf8_bin/g,') ')
                    .replace(/( timestamp | date | datetime )[^,)]*/g,' TEXT ')
                    .replace(/COMMENT[ =]*'[^']*'/g, '')
                    .replace(/[\r\n]+\s+PRIMARY\s+KEY\s+[^\r\n]+/i, '')
                    .replace(/[\r\n]+\s+UNIQUE\s+KEY\s+[^\r\n]+/i, '')
                    .replace(/[\r\n]+\s+KEY\s+[^\r\n]+/i, '')
                    .replace(/,([\s\r\n])+\)/i, '$1)')
                    .replace(/\s+ENGINE\s*=\s*\w+/i, ' ')
                    .replace(/DEFAULT *CHARSET/g, 'CHARSET')
                    .replace(/\s+CHARSET\s*=\s*\w+/i, ' ')
                    .replace(/\s+AUTO_INCREMENT\s*=\s*\d+/i, ' ')
                    .replace(/\s+DEFAULT\s+;/i, ';')
                    .replace(/\)([\s\r\n])+;/i, ');')
                    //.replace(/,[ \r\n]*KEY[\w\W]*[BTREE|HASH]+/g, '')

                    .replace(/,[ \r\n]*KEY[\w\W]*BTREE/g, '')
                    .replace(/,[ \r\n]*KEY[\w\W]*HASH/g, '')
                    .replace(/,[ \r\n]*KEY[\w\W]*\)\s*\)/g, ')')

                    .replace(/enum([^)]*)/g, 'char(1')
                    .replace(/ROW_FORMAT=[\w\W]*/,'');


                //console.log(_create_table_sql);
                resolve(_create_table_sql);
                //test
                //pool.end();
            }
        });
    });


}


//创建sqllite数据库
module.exports.createSqliteDB = function createSqliteDB() {
    return new Promise((resolve, reject) => {
        ///home/
        sqlitedb = new sqlite3.Database(appconfig.sqlite_db_path+'/'+'pos.db', function() {
            resolve(true);
        });
    });
};

//共用的方法
module.exports.commonSyncWork = function commonSyncWork(tablename) {
    return new Promise((resolve, reject) => {
        sqlitedb.run('begin;', function() {
          sqlitedb.run(require('./mc_tools').dropTableSql(tablename), function() {
              console.log(`删除${tablename}成功`);
              require('./mc_tools').gen_create_table_sql(tablename).then(createtblsql => {
                console.log(createtblsql);
                  sqlitedb.run(createtblsql, function() {
                      console.log(`创建${tablename}成功`);
                      //先从mysql获取数据
                      pool.query("select * from " + appconfig.db_schema + '.' + tablename, function(err, rows) {
                          if (err) console.log(`从Mysql表${tablename}中获取数据发生异常：${err}`);
                          console.log(`获取${tablename}中${rows.length}条记录`);
                          if (rows.length > 0) {
                              let _valuestpl = '';
                              for (let o in rows[0]) {
                                  _valuestpl += ':' + o + ','
                              }
                              _valuestpl = _valuestpl.substring(0, _valuestpl.length - 1);
                              //console.log(`_valuestpl:${_valuestpl}`);
                              //插入数据,TODO
                              console.time(`插入${tablename}${rows.length}条记录耗时`);
                              let stmt = sqlitedb.prepare("INSERT INTO " + tablename + " VALUES (" + _valuestpl + ")");
                              for (let i = 0; i < rows.length; i++) {
                                  for (let o in rows[i]) {
                                      //修改日期格式，sqlite必须用 yyyy-MM-dd HH:mm:ss格式
                                      if (rows[i][o] instanceof Date) {
                                          rows[i][o] = rows[i][o].getFullYear() + '-' + ((rows[i][o].getMonth() < 9) ? '0' : '') + (rows[i][o].getMonth() + 1) + '-' + ((rows[i][o].getDate() < 10) ? '0' : '') + rows[i][o].getDate() + ' ' + ((rows[i][o].getHours() < 10) ? '0' : '') + rows[i][o].getHours() + ":" + ((rows[i][o].getMinutes() < 10) ? '0' : '') + rows[i][o].getMinutes() + ":" + ((rows[i][o].getSeconds() < 10) ? '0' : '') + rows[i][o].getSeconds();
                                          //console.log(rows[i]);
                                          //判断是不是日期格式
                                          //console.log(rows[i][o] instanceof Date);
                                      }
                                      //修改前缀，不然sqllite3无法识别
                                      rows[i][':' + o] = rows[i][o] + '';
                                      rows[i][o] = undefined;
                                      delete rows[i][o];
                                  };
                                  stmt.run(rows[i]);
                                  //console.log('rows'+i,rows[i]);
                              }
                              stmt.finalize(function() {
                                  sqlitedb.run('commit;',function(){
                                    console.log(`插入${tablename}${rows.length}条记录成功`);
                                    console.timeEnd(`插入${tablename}${rows.length}条记录耗时`);
                                    resolve(true);
                                  });

                              });
                          }
                          resolve(true);

                      });
                      resolve(true);
                  });
              });

          });


        });

    });
}

//删除表语句
module.exports.dropTableSql = function dropTableSql(tablename) {
    return 'DROP TABLE IF EXISTS ' + tablename + ';';
}

this.createSqliteDB().then(v => {

  let asynworks = [];
  sync_tables.forEach(table=>{
    console.log(`push ${table}`);
    asynworks.push(this.commonSyncWork(table));
  });
  //db.run('PRAGMA auto_vacuum = 0;',function() {
  console.time(`插入记录耗时`);
  //关闭每事务自动同步模式,//PRAGMA main.journal_mode = OFF;begin;PRAGMA cache_size=10000;
  sqlitedb.run('PRAGMA main.synchronous = 0;PRAGMA journal_mode = MEMORY;',function(){
    Promise.all(asynworks).then(values=>{
      console.log(values);
      //强制手工同步commit;
      sqlitedb.run('fsync();',function(){
        sqlitedb.close(function(err){
          if(err) console.log(`close sqlite error:${err}`);
          console.log('sqllite closed');
          pool.end();
          console.timeEnd(`插入记录耗时`);
        });
      });

    });
  })



  //});

});

// sync_tables.forEach(table=>{
//   this.gen_create_table_sql(table).then(v=>{console.log(table);});
// })

//