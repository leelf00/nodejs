/* =========================================================
	配置文件
	@author
	@version 20160330
	@update 20160323 by fei 首次提交
	@update 20160407 by fei 增加redis和数据库配置
	@update 20160408 by lxx 增加mysql数据库配置
 * ========================================================= */
exports.appconfig = {
	//会话过期时间
	session_expire_second : 3600,
	//访问令牌过期时间
	accesstoken_expire_second : 10,

	//redis服务器配置
	redis_server					:	{
				host	:	'127.0.0.1',
				port	:	6379,
				path  : '/tmp/redis.sock',
	},

	//mysql服务器配置
	mysql_server					: {
				connectionLimit : 5,
				host            : '127.0.0.1',
				socketPath			: '/var/lib/mysql/mysql.sock',
				user            : 'root',
				password        : '123456!Sapcis'
	},

	//登陆配置
	login_config					:{
				success_redirect_url		:	'/sso_web/static/page/index.html',
				failure_redirect_url		:	'/b/'
	},

	//登陆失败重试
	login_error						:{
				failure_times				:	5,
				lock_millisecond			:	300000
	},


};
