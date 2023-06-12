//webservice接口测试程序
const soap = require('soap');
const url = 'http://172.18.55.97:9001';
//命令
var args = {chargecard: `<?xml version="1.0" encoding="UTF-8"?><request> <sign>BBBBBBBC</sign><biz_content>{'msg_type':'ICCHDXX1','trans_chnl':'0002','trans_time':'20150408170800','attach_acc':'13681812141','order_no':'10000000000000000000001', 'version':'1.0'}</biz_content></request>`};
soap.createClient(url,function(err, client) {
  if (err) {
    console.log(err);
  }
  //覆盖掉航天金税错误的endpoint地址
  client.setEndpoint('http://172.18.55.97:9001');
  client.saveDocument(args, function(err, result) {
    if (err) {
      console.log(err);
    }
    //输出返回结果
    console.log(result.return);
  });
});