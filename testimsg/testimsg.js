var messages = require('osa-imessage');

messages.send('我测试下是不是还能', 'leelf_00@126.com', function(){
  console.log('s');
});

let _now = new Date();
require('./email.js').sendMail({
  to: 'llf@s-ap.com',
  subject: '【自动测试程序】'+_now.toLocaleDateString('zh-CN')+' '+_now.toLocaleTimeString('zh-CN'),
  text: '',
  html: '<p>【自动测试程序】系统通知：'+_now.toLocaleDateString('zh-CN')+' '+_now.toLocaleTimeString('zh-CN')+'</p>'
});