var anyBody = require("body/form");

function judgeurl(u, us) {
    for (let _u of us) {
        if (u.startsWith(_u)) {
            return true;
        }
    }
    return false;
}

//非白名单有权限请求记录访问日志
exports.logAccess = function logAccess(proxyRes, req, res,_menulist){
  if(judgeurl(req.url,_menulist)){
    console.log('now in if:',req.url);
    console.log('body:',req.body);
    console.log('method',req.method);
   var bodys2 = [];
   var bodys =  res.split("@");
   console.log(bodys);
   //TODO
  }

}