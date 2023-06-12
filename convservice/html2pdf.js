/* =========================================================
	html 转换 pdf
	@author fei
	@version 20160729
	@update 20160729 by fei 首次提交
  @update 20160801 by fei 部分参数可从上端传递过来
 * ========================================================= */
"use strict";
const Promise = require('bluebird');
var pdf = require('html-pdf');
var utf8 = require('utf8');
var bodyParser = require('koa-bodyparser');
//默认参数
module.exports.options = {
    //format: 'Letter'

    // "height": "10.5in",        // allowed units: mm, cm, in, px
    // "width": "8in",            // allowed units: mm, cm, in, px
    // 宽和高属性与纸张规格 二选一
    //"format": "A4", // allowed units: A3, A4, A5, Legal, Letter, Tabloid
    "orientation": "landscape",
    //"orientation": "portrait",
    // File options
    "type": "pdf", // allowed file types: png, jpeg, pdf
    "quality": "100", // only used for types png & jpeg
    "footer": {
      "height": "28mm",
      "contents": {
        default: '<div style="width:100%;text-align:center;font-size:10px;">第<span style="color: #000;font-size:10px;">{{page}}</span>页/共<span style="color: #000;font-size:10px;">{{pages}}</span>页</div>', // fallback value
      }
    },
    // Script options
    //全局速度慢于本应用下的，好奇怪
    //"phantomPath":"node_modules\\phantomjs-prebuilt\\lib\\phantom\\bin\\phantomjs.exe",
    //"phantomPath": "/usr/bin/phantomjs", //./node_modules/phantomjs/bin/phantomjs    // PhantomJS binary which should get downloaded automatically
    "phantomArgs": ["--disk-cache=true","--disk-cache-path=/tmp"], // array of strings used as phantomjs args e.g. ["--ignore-ssl-errors=yes"]
    //"script": '/url',           // Absolute path to a custom phantomjs script, use the file in lib/scripts as example
    "timeout": 300000,
};

//处理转换html到pdf
module.exports.handleHtml2Pdf = function handleHtml2Pdf(router) {

    //文件下载情况
    router.all('/html2pdf/download', bodyParser({
      formLimit:'100mb',
      onerror: function (err, ctx) {
        console.log('body parse error',err);
        //ctx.throw('body parse error', 422);
      }
    }),function(ctx, next) {
        //ctx.respond = false;
        ctx.response.set('Content-type', 'application/pdf');
        return doWork(ctx,'1','stream').then((v) => {
            //console.log(v);
            //ctx.body = v;
        });
    });

    //文件查看情况
    router.all('/html2pdf/view', bodyParser({
      formLimit:'100mb',
      onerror: function (err, ctx) {
        console.log('body parse error',err);
        //ctx.throw('body parse error', 422);
      }
    }),function(ctx, next) {
        //ctx.respond = false;
        return doWork(ctx,'0','stream').then(v => {
            //ctx.body = v;
        });
    });

    var doWork = function doWork(ctx,downloadable,mode) {
        return new Promise((resolve, reject) => {
            let params = ctx.request.body;
            console.time('[工具模块]html转换pdf耗时');
            let options = require('./html2pdf').options;
            let _options = Object.assign({}, options);
            //console.log(`params:${params}`);

            //console.log(_options);
            //phantom路径
            _options.phantomPath = params.phantomPath || options.phantomPath;
            //纸张格式 A3, A4, A5, Legal, Letter, Tabloid
            _options.format = params.format || options.format;
            //横向-landscape，纵向-portrait
            _options.orientation = params.orientation || options.orientation;
            //显示页码
            _options.footer = (params.showpage=='true')?options.footer:{};
            //自定义宽度和高度情况，删除掉纸张规格定义
            if (typeof params.width != 'undefined' && typeof params.height != 'undefined') {
                _options.width = params.width;
                _options.height = params.height;
                delete _options.format;
                delete _options.orientation;
                console.log('use custom width:',params.width,',height:',params.height);
            }
            if (downloadable == '1') {
                let report_name = params.reportName || '加油卡发售日报表';
                //下载的情况，非下载不用写
                ctx.response.set('Content-disposition', 'attachment; filename=' + utf8.encode(report_name) + '.pdf');
                //res.setHeader('Content-disposition', 'attachment; filename=' + utf8.encode(report_name) + '.pdf');
            }
            params.html = params.html || '<html></html>';
              //var resstream = ctx.response.body = new Readable();
            // pdf.create(params.html, _options).toBuffer(function(err, buffer) {
            //     if (err) console.log('[工具模块]html转换pdf发生异常:', err);
            //     console.timeEnd('[工具模块]html转换pdf耗时');
            //     resolve(buffer);
            // });
            if(mode=='stream'){
              //stream模式比buffer速度快一点。目前134ms左右
              pdf.create(params.html,_options).toStream(function(err, stream){
                  //ctx.response.body = stream;
                  //stream.pipe(resstream);
                  ctx.body = stream;
                  if (err) console.log('[工具模块]html转换pdf发生异常:', err);
                  console.timeEnd('[工具模块]html转换pdf耗时');
                  resolve();
                  //resolve(stream);
              });
            }
            else if (mode=='buffer'){
              pdf.create(params.html, _options).toBuffer(function(err, buffer) {
                  if (err) console.log('[工具模块]html转换pdf发生异常:', err);
                  console.timeEnd('[工具模块]html转换pdf耗时');
                  resolve(buffer);
              });
            }
        });
    }

}
