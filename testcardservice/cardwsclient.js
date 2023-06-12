//card webservice接口测试程序
const soap = require('soap');
const url = 'http://127.0.0.1:9200/';

//命令
//卡充值
var card_charge_packet = {
  merch_id : '1001',
  acq_provnid: '00',
  node_no: '10010003',
  msg_type: 'ICHDXXX1',
  trans_chnl: '01',
  trans_src:'0101',
  node_type:'02',
  card_no:'1001311100000000090',
  card_sign_flag:'1',
  trans_amt:'000000100000',
  dis_amt:'000000000100',
  pay_type:'01000000',
  create_user_name:'李浩',
  product_num:'',
  operator_tm:'201702141529',
  trans_dt:'20170214',
  trans_tm:'141529',
  operator_no:'0001'
};

soap.createClient(url,function(err, client) {
  if (err) {
    console.log('error:',err);
  }
  console.log(client);
  //client.setEndpoint('http://127.0.0.1:9200/');
  client.opdcard({requestJson:JSON.stringify(card_charge_packet)}, function(err, result) {
    if (err) {
      console.log(err);
    }
    //输出返回结果
    console.log(result);
  });
});