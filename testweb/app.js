/**
  使用Express JS构建的简易的服务端


**/
const express = require('express');
var app = express();

//静态文件夹地址，这里为目录下的static ，比如我在static文件夹下放了report.html，访问地址为 http://127.0.0.1:3000/static/report.html
app.use('/static',express.static(__dirname + '/static'));

//动态地址，可以有get post all几种模式，all = post / get，访问地址为 http://127.0.0.1:3000/test
app.all('/test', function(req, res){
  let _resVar = { id:1,name:'test',value:'hehe' };
  //输出为JSON格式数据
  res.send(JSON.stringify(_resVar));
});
//动态地址
app.all('/test2', function(req, res){
  let _resVar = { id:1,name:'test',value:'hehe' };
  //输出为JSON格式数据
  res.send(JSON.stringify(_resVar));
});

//监听3000端口，根据需要修改，偷懒的话改成80
app.listen(3000);