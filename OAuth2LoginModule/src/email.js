/* =========================================================
	电子邮件
	@author fei
	@version 20160728
	@update 20160728 by fei 首次提交
  @update 20160818 by fei 修正问题
 * ========================================================= */
'use strict';
const nodemailer = require('nodemailer');﻿
var transporter = nodemailer.createTransport('smtps://lee%40holala.top:Zxc123456@smtp.mxhichina.com');

// var mailOptions = {
//     from: '登录系统 <llf@s-ap.com>',
//     to: 'llf@s-ap.com',//,hao.li@s-ap.com
//     subject: '【加油气站营销云平台】'+_now.toLocaleDateString('zh-CN')+' '+_now.toLocaleTimeString('zh-CN')+'用户账号【李浩】因异常登录锁定',
//     text: '',
//     html: '<p>【加油气站营销云平台】系统通知：'+_now.toLocaleDateString('zh-CN')+' '+_now.toLocaleTimeString('zh-CN')+'用户账号【李浩】因错误多次输入用户名密码锁定,最后登陆ip地址：</p>'
// };
module.exports.sendMail = function sendMail(mailOptions){

  let _now = new Date();
  mailOptions.from = '【加油气站营销云平台】 <lee@holala.top>';
  mailOptions.subject = '【加油气站营销云平台】'+ _now.toLocaleDateString('zh-CN')+' '+_now.toLocaleTimeString('zh-CN') + mailOptions.subject;
  //发送邮件
  transporter.sendMail(mailOptions, function(error, info){
      if(error){
          return console.error(`[email]发送电子邮件发生异常${error}`);
      }
      console.log('邮件已发送: ' + info.response);
  });

}