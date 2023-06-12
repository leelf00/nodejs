/* =========================================================
	配置文件
	@author
	@version 20160330
	@update 20160323 by fei 首次提交
	@update 20160407 by fei 增加redis和数据库配置
	@update 20160408 by lxx 增加mysql数据库配置
	@update 20170803 by fei 增加微信模块配置，增加mysql和redis连接模式配置
 * ========================================================= */
module.exports.appconfig = {
	//会话过期时间
	session_expire_second : 3600,
	//访问令牌过期时间
	accesstoken_expire_second : 10,

	//redis服务器配置
	redis_server					:	{
					mode  : 'unix',
					host	:	'127.0.0.1',  //tcp
					port	:	6379,   //tcp
					path  : '/tmp/redis.sock',  //unix
	},

	//mysql服务器配置
	mysql_server					: {
				mode            : 'unix',     // tcp unix
				connectionLimit : 5,
				//host            : '127.0.0.1',   //tcp
				socketPath			: '/var/run/mysqld/mysqld.sock',    //unix
				user            : 'root',
				password        : '1234'
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

	//服务器监听地址，在linux下使用UNIX socket提高性能
	server_listen					: '/tmp/server.sock',
	//server_listen					: '81',
	//使用微信相关功能
	use_wechat_module     : false,
};