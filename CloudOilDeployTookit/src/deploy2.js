/* =========================================================
	主程序
	@author
	@version 20160608
	@update 20160608 by fei 首次提交系统自动化优化、打包、部署工具
	@update 20160810 by fei 更换minicss为cleancss模块，原模块已过期
 * ========================================================= */
'use strict';
const gulp = require('gulp');//gulp自动化部署工具
//var sass = require('gulp-ruby-sass');
//var autoprefixer = require('gulp-autoprefixer');
const cleancss = require('gulp-clean-css');//压缩css
const htmlmin = require('gulp-htmlmin');//html压缩
const gzip = require('gulp-gzip');//gzip压缩
//var jshint = require('gulp-jshint');
const uglify = require('gulp-uglify');//uglify，JS代码优化工具
const ngAnnotate = require('gulp-ng-annotate');//ng-annotate，AngularJS代码优化工具，和uglify混用时，必须设置uglify({mangle: false})
const imagemin = require('gulp-imagemin');//图片压缩
//var rename = require('gulp-rename');
const clean = require('gulp-clean');//目标目录清理，在用于gulp任务执行前清空目标目录
//var concat = require('gulp-concat');//文件拼接工具，可用于多个CSS文件或多个JS文件的合并
//var notify = require('gulp-notify');//任务通知工具，可用于某项任务执行完成的在控制台输出通知
//var cache = require('gulp-cache');//资源缓存处理，可用于缓存已压缩过的资源，如：图片
//var livereload = require('gulp-livereload');
const debug = require('gulp-debug');//调试工具

//登录静态页面源根目录
//const login_web_b_source_path = '/home/workspace/login_web_b/WebContent';
const login_web_b_source_path = 'D:/亚太工作区/Eclipse测试工程工作区/login_web_b/WebContent';
//登录静态页面发布根目录
const login_web_b_deploy_path = '/home/web/b';
//网站页面源代码根目录
//const web_c_source_path = '/home/workspace/web_c/WebContent';
const web_c_source_path = 'D:/亚太工作区/Eclipse测试工程工作区/web_c/WebContent';
//网站页面发布根目录
const web_c_deploy_path = '/home/web/c';
//sso_web源根目录
//const sso_web_source_path = '/home/workspace/sso_web/WebContent';
const sso_web_source_path = 'D:/亚太工作区/Eclipse测试工程工作区/sso_web/WebContent';
//sso_web发布根目录
const sso_web_deploy_path = '/home/web/sso_web';
//iccard_web源根目录
//const iccard_web_source_path = '/home/workspace/iccard_web/WebContent';
const iccard_web_source_path = 'D:/亚太工作区/Eclipse测试工程工作区/iccard_web/WebContent';
//iccard_web发布根目录
const iccard_web_deploy_path = '/home/web/iccard_web';

//登录静态页面打包发布
var login_web_b_build = function login_web_b_build() {
		return new Promise((reslove,reject)=>{
			console.log('b端登录系统--打包开始');
			//html清理=>gzip
			gulp.src(login_web_b_source_path+'/**/*.html')
				.pipe(debug())
				.pipe(htmlmin({collapseWhitespace: true,minifyCSS: true}))
				.pipe(gzip())
				.pipe(gulp.dest(login_web_b_deploy_path));
			gulp.src(login_web_b_source_path+'/**/*.htm')
				.pipe(debug())
				.pipe(htmlmin({collapseWhitespace: true,minifyCSS: true}))
				.pipe(gzip())
				.pipe(gulp.dest(login_web_b_deploy_path));
			//css清理=>gzip
			gulp.src(login_web_b_source_path+'/**/*.css')
				.pipe(debug())
				.pipe(cleancss({compatibility: 'ie9'}))
				.pipe(gzip())
				.pipe(gulp.dest(login_web_b_deploy_path));
			//js压缩=>gzip
			gulp.src(login_web_b_source_path+'/**/*.js')
				.pipe(debug())
				.pipe(uglify())
				.pipe(gzip())
				.pipe(gulp.dest(login_web_b_deploy_path));
			//图片压缩=>gzip
			gulp.src(login_web_b_source_path+'/**/*.png')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(login_web_b_deploy_path));
			gulp.src(login_web_b_source_path+'/**/*.jpg')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(login_web_b_deploy_path));
			gulp.src(login_web_b_source_path+'/**/*.gif')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(login_web_b_deploy_path));
			//ico=>gzip
			gulp.src(login_web_b_source_path+'/**/*.ico')
				.pipe(debug())
				.pipe(gzip())
				.pipe(gulp.dest(login_web_b_deploy_path));
			//manifest=>gzip
			gulp.src(login_web_b_source_path+'/**/*.appcache')
				.pipe(debug())
				.pipe(gzip())
				.pipe(gulp.dest(login_web_b_deploy_path));
			console.log('b端登录系统--打包结束');
		});
};

//C端系统打包发布
var web_c_build = function web_c_build() {
		return new Promise((reslove,reject)=>{
			console.log('c端系统--打包开始');
			//html清理=>gzip
			gulp.src(web_c_source_path+'/**/*.html')
				.pipe(debug())
				.pipe(htmlmin({collapseWhitespace: true,minifyCSS: true}))
				.pipe(gzip())
				.pipe(gulp.dest(web_c_deploy_path));
			gulp.src(web_c_source_path+'/**/*.htm')
				.pipe(debug())
				.pipe(htmlmin({collapseWhitespace: true,minifyCSS: true}))
				.pipe(gzip())
				.pipe(gulp.dest(web_c_deploy_path));
			//css清理=>gzip
	    gulp.src(web_c_source_path+'/**/*.css')
	      .pipe(debug())
	      .pipe(cleancss({compatibility: 'ie9'}))
	      .pipe(gzip())
				.pipe(gulp.dest(web_c_deploy_path));
			//js压缩=>gzip
			gulp.src(web_c_source_path+'/**/*.js')
				.pipe(debug())
				.pipe(uglify())
				.pipe(gzip())
				.pipe(gulp.dest(web_c_deploy_path));
			//图片压缩=>gzip
			gulp.src(web_c_source_path+'/**/*.png')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(web_c_deploy_path));
			gulp.src(web_c_source_path+'/**/*.jpg')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(web_c_deploy_path));
			gulp.src(web_c_source_path+'/**/*.gif')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(web_c_deploy_path));
			console.log('c端系统--打包结束');
		});
};

//sso_web打包发布
var sso_web_build = function sso_web_build() {
		return new Promise((reslove,reject)=>{
			console.log('sso_web--打包开始');
			//html清理=>gzip
			gulp.src(sso_web_source_path+'/**/*.html')
				.pipe(debug())
				.pipe(htmlmin({collapseWhitespace: true,minifyCSS: true}))
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			gulp.src(sso_web_source_path+'/**/*.htm')
				.pipe(debug())
				.pipe(htmlmin({collapseWhitespace: true,minifyCSS: true}))
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			//css清理=>gzip
		  gulp.src(sso_web_source_path+'/**/*.css')
		    .pipe(debug())
		    .pipe(cleancss({compatibility: 'ie9'}))
		    .pipe(gzip())
		    .pipe(gulp.dest(sso_web_deploy_path));
			//js压缩=>gzip,AngularJS编写的js文件需要使用完整构造才能使用压缩
			gulp.src(sso_web_source_path+'/**/*.js')
				.pipe(debug())
				//.pipe(ngAnnotate())
				//.pipe(uglify({mangle: false}))
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			//图片压缩=>gzip
			gulp.src(sso_web_source_path+'/**/*.png')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			gulp.src(sso_web_source_path+'/**/*.jpg')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			gulp.src(sso_web_source_path+'/**/*.gif')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			gulp.src(sso_web_source_path+'/**/*.svg')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			//字体，不能做任何处理，gzip后火狐会报404错
			gulp.src(sso_web_source_path+'/**/*.woff')
				.pipe(gulp.dest(sso_web_deploy_path));
			gulp.src(sso_web_source_path+'/**/*.ttf')
				.pipe(gulp.dest(sso_web_deploy_path));
			gulp.src(sso_web_source_path+'/**/*.woff2')
				.pipe(gulp.dest(sso_web_deploy_path));
			gulp.src(sso_web_source_path+'/**/*.ttf')
				.pipe(gulp.dest(sso_web_deploy_path));
			//map文件，不能做任何处理，gzip后火狐会报404错
			gulp.src(sso_web_source_path+'/**/*.map')
				.pipe(gulp.dest(sso_web_deploy_path));
			//coffeescript，不做任何处理
			gulp.src(sso_web_source_path+'/**/*.coffee')
				.pipe(gulp.dest(sso_web_deploy_path));
			//properties文件，gzip
			gulp.src(sso_web_source_path+'/**/*.properties')
				.pipe(debug())
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			//bcmap文件,gzip
			gulp.src(sso_web_source_path+'/**/*.bcmap')
				.pipe(debug())
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			//bcmap文件,gzip
			gulp.src(sso_web_source_path+'/**/*.cur')
				.pipe(debug())
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			//bcmap文件,gzip
			gulp.src(sso_web_source_path+'/**/*.pdf')
				.pipe(debug())
				.pipe(gzip())
				.pipe(gulp.dest(sso_web_deploy_path));
			console.log('sso_web--打包结束');
		});

}

//iccard_web打包发布,给微信用的静态界面，仅打包/static/css,/static/js,/statis/images
var iccard_web_build = function iccard_web_build() {
		return new Promise((reslove,reject)=>{
			console.log('iccard_web--打包开始');
			//css清理=>gzip
		  gulp.src(iccard_web_source_path+'/static/css/**/*.css')
		    .pipe(debug())
		    .pipe(cleancss({compatibility: 'ie9'}))
		    .pipe(gzip())
		    .pipe(gulp.dest(iccard_web_deploy_path+'/static/css'));
			//js压缩=>gzip
			gulp.src(iccard_web_source_path+'/static/js/**/*.js')
				.pipe(debug())
				//.pipe(ngAnnotate())
				.pipe(uglify())//uglify({mangle: false})
				.pipe(gzip())
				.pipe(gulp.dest(iccard_web_deploy_path+'/static/js'));
			//图片压缩=>gzip
			gulp.src(iccard_web_source_path+'/static/images/**/*.png')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(iccard_web_deploy_path+'/static/images'));
			gulp.src(iccard_web_source_path+'/static/images/**/*.jpg')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(iccard_web_deploy_path+'/static/images'));
			gulp.src(iccard_web_source_path+'/static/images/**/*.gif')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(iccard_web_deploy_path+'/static/images'));
			gulp.src(iccard_web_source_path+'/static/images/**/*.svg')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(iccard_web_deploy_path+'/static/images'));
			//css目录下的图片
			gulp.src(iccard_web_source_path+'/static/css/**/*.png')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(iccard_web_deploy_path+'/static/css'));
			gulp.src(iccard_web_source_path+'/static/css/**/*.jpg')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(iccard_web_deploy_path+'/static/css'));
			gulp.src(iccard_web_source_path+'/static/css/**/*.gif')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(iccard_web_deploy_path+'/static/css'));
			gulp.src(iccard_web_source_path+'/static/css/**/*.svg')
				.pipe(debug())
				.pipe(imagemin())
				.pipe(gzip())
				.pipe(gulp.dest(iccard_web_deploy_path+'/static/css'));
			//Flash文件
			gulp.src(iccard_web_source_path+'/**/*.swf')
				.pipe(gzip())
				.pipe(gulp.dest(iccard_web_deploy_path));
			console.log('iccard_web--打包结束');
		});

}
var build_all = function build_all(){
	//开始构建
	Promise.all([login_web_b_build(),web_c_build(),sso_web_build(),iccard_web_build()]).then(v=>{
		console.log('success');
	})

}
build_all();
// login_web_b_build();
// web_c_build();
// sso_web_build();
// iccard_web_build();