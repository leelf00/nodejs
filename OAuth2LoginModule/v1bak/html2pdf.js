/* =========================================================
	html 转换 pdf
	@author fei
	@version 20160729
	@update 20160729 by fei 首次提交
  @update 20160801 by fei 部分参数可从上端传递过来
 * ========================================================= */
"use strict";
﻿var pdf = require('html-pdf');
var utf8 = require('utf8');
var anyBody = require("body/any");
//默认参数
var options = {
    //format: 'Letter'

    // "height": "10.5in",        // allowed units: mm, cm, in, px
    // "width": "8in",            // allowed units: mm, cm, in, px
    // 宽和高属性与纸张规格 二选一
    "format": "A4", // allowed units: A3, A4, A5, Legal, Letter, Tabloid
    "orientation": "landscape",
    //"orientation": "portrait",
    // File options
    "type": "pdf", // allowed file types: png, jpeg, pdf
    "quality": "100", // only used for types png & jpeg

    // Script options
    "phantomPath": "/usr/bin/phantomjs", //./node_modules/phantomjs/bin/phantomjs    // PhantomJS binary which should get downloaded automatically
    "phantomArgs": ["--disk-cache=true"], // array of strings used as phantomjs args e.g. ["--ignore-ssl-errors=yes"]
    //"script": '/url',           // Absolute path to a custom phantomjs script, use the file in lib/scripts as example
    "timeout": 30000,
};

//处理转换html到pdf
module.exports.handleHtml2Pdf = function handleHtml2Pdf(server) {

    var doWork = function doWork(req, res, body, err, downloadable){
      if (err) console.log(`handleHtml2Pdf error`);
      let params = body;
      console.time('[工具模块]html转换pdf耗时');
      let _options = Object.assign({}, options);
      //phantom路径
      _options.phantomPath = params.phantomPath || options.phantomPath;
      //纸张格式 A3, A4, A5, Legal, Letter, Tabloid
      _options.format = params.format || options.format;
      //横向-landscape，纵向-portrait
      _options.orientation = params.orientation || options.orientation;
      //自定义宽度和高度情况，删除掉纸张规格定义
      if(typeof params.width != 'undefined' && typeof params.height != 'undefined' ){
        _options.width = params.width;
        _options.height = params.height;
        delete _options.format;
      }
      if(typeof downloadable != 'undefined'){
        let report_name = params.reportName || '加油卡发售日报表';
        //下载的情况，非下载不用写
        res.setHeader('Content-disposition', 'attachment; filename=' + utf8.encode(report_name) + '.pdf');
      }
      pdf.create(params.html, _options).toBuffer(function(err, buffer) {
          if(err) console.log('[工具模块]html转换pdf发生异常:',err);
          res.setHeader('Content-type', 'application/pdf');
          res.setHeader('Content-Length', buffer.length);
          res.write(buffer);
          res.end();
          console.timeEnd('[工具模块]html转换pdf耗时');
      });
    }

    //文件下载情况
    server.all('/html2pdf/download', function(req, res) {
        anyBody(req, function(err, body) {
            doWork(req, res, body, err,'1');
        });
    });

    //文件查看情况
    server.all('/html2pdf/view', function(req, res) {
        anyBody(req, function(err, body) {
            doWork(req, res, body, err);
        });
    });

}