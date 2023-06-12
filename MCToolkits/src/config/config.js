/* =========================================================
	配置文件
	@author
	@version 20160330
	@update 20160323 by fei 首次提交
	@update 20160408 by lxx 增加mysql数据库配置
 * ========================================================= */
module.exports.appconfig = {

	//mysql服务器配置
	mysql_server					: {
				connectionLimit : 10,
			  host            : '172.18.55.76',
				socketPath			: '/var/lib/mysql/mysql.sock',				
			  user            : 'root',
			  password        : '123123'//123456!Sapcis
	},

	//商户代码
	merch_id							: '1001',
	//db_schema
	db_schema							: 'merch1002',
	//sqlite
	sqlite_db_path				: '',
};
