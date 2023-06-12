const net = require('net');
const crc = require('./crc');
const cluster = require('cluster');
const fa = require('./fa');
//var numCPUs = require('os').cpus().length;
console.log('[Cloud测试程序]启动');
//网点号
var node_no = '10010003';
// fork-join 模式
// 管理节点
if (cluster.isMaster) {
  // 加入工作线程.numCPUs
  for (let i = 0; i < 1; i++) {
    cluster.fork();
    node_no+=1;
  }
  cluster.on('fork', (worker) => {
    worker.id = node_no++;
    //console.log(worker.id);
  });
  //工作线程监听
  cluster.on('listening',(worker,address) => {
    console.log('[Cloud测试程序]监听: 工作线程 ' + worker.process.pid +', Address: '+address.address+":"+address.port);
  });
  //工作线程退出
  cluster.on('exit', (worker, code, signal) => {
    console.log('[Cloud测试程序]工作线程线程 ' + worker.process.pid + ' 退出');
    //尝试启动一个新的工作进程
    //cluster.fork();
  });

}
// 工作节点
else {


  //console.log(cluster.worker.id);

  function testcloud() {

    // let _testobj =


    let client = net.createConnection({port: 8007,host:'127.0.0.1'}, () => {

      // client.write(fa.heartbeat(node_no,1),function(){
      //   client.write(fa.twob(node_no,2,genObj(_termTraNo)));
      //   _termTraNo++;
      // });
      let _termTraNo = 1;
      client.write(fa.heartbeat(node_no,1));
      // fa.deal(node_no,1,{}).then(v=>{
      //   client.write(v);
      // });
      // fa.twoc(node_no,1,{}).then(v=>{
      //   client.write(v);
      // });
      // fa.twob(node_no,1,{}).then(v=>{
      //   client.write(v);
      // });

      //client.write(fa.twob(node_no,2,genObj(_termTraNo)));
      //console.time('insert Time');
      // for(var i = 2;i<1000000;i++){
      //   client.write(fa.heartbeat(node_no,1));
      //   //client.write(fa.heartbeat(node_no,i%249));
      //   //client.write(fa.twob(node_no,i%249,genObj(_termTraNo)));
      //   //client.write(fa.twoc(node_no,i%249,gentwoc()));

      //   //_termTraNo++;
      // }
      //console.timeEnd('insert Time');
      //client.end();


      //写出
      //固定间隔发送心跳
      setInterval(function(){
         //heartbeat(node_no+cluster.worker.id)
         client.write(fa.heartbeat(node_no,1),function(){
           // client.write(fa.twob(node_no,2,genObj(_termTraNo)));
           // _termTraNo++;
         });
      
      },10);

      //固定间隔发送交易记录
      // setInterval(function(){
      //
      // },1000);

    });
    // let pack;
    // client.on('data', (data) => {
    //   console.log(data.toString('hex'));
    //   //console.log(data.length);
    //   pack += data;
    //   //client.end();
    // });
    client.on('end', () => {
      //console.log(pack.length);
      console.log('disconnected from server');
    });
  }



  testcloud();

}

//模拟mc生成发送的班次信息
function gentwoc(){
  return {
    "type":"data",
    "table_name":"work_schedule",
    "data":[
      {
        "id":"1",
        "node_no":"10010003",
        "team_id":"1",
        "shift_id":"1",
        "schedule_date":"2017-02-21",
        "act_start_time":"2017-02-21 07:00:00",
        "act_end_time":"2017-02-21 19:00:00",
        "status_id":"2"
        //"transfer_flag":"0"
      }
    ]
  };
}

//模拟mc生成发送的班次信息
function gendeal(){
  return {
    uid : 1 ,
    createtime : '2017-4-14 19:00',
    posTtc: 3,
    posTermId:'100100030400001',
    posTermBat:'000085',
    posTermSsn:'000001',
    oilType:'1030',
    oilLitter:'0.36',
    transAmt:'2.00',
    compNo:'100110000025',
    cardNo:'1001311200000000106',
    transType:0,
    transDt:'20151228',
    transTm:'170923',
    operatorNo:'000100',
    primaryKey:'000000000000',
    nozzle:13,
    shiftId:'000000000113',
    shiftNo:'000000000000',
    shiftSerial:'000000000000',
    price:'5.49',
    paymentType:2,
    pumpNo:'143.73',
    printStatus:1,
    transferFlag:1,
    remark:'操作成功!',
    nodeNo:'10010003',
    deductFlag:2,
    sucTag:1,
    acqProvnid:'31',
    merchId:'1001',
    disAmt:'0',
    getTime:'2016-08-26 10:42:27',
    transDatetime:'2015-10-17 15:30:46',
    bal:'9996.49',
    ctc:'0',
    ds:'0',
    gmac:'00000000',
    psamTac:'00000000',
    psamAsn:'00000000000000000000',
    psamTid:'100100000014',
    psamTtc:0,
  };
}

//
function genObj(termTraNo){
  return {
    "type":"data",
    "bussiness_type":"pos",
    "data":[
      {
        "termTraNo":"",
        "termPrimaryKey":termTraNo+"",
        "termBatNo":"100100040001",
        "termPosTTC":"",
        "termChannel":"03",
        "term_id":"",
        "node_no":"10010004",
        "comp_no":"",
        "member_no":"100000000002",
        "member_points_i":"567",
        "member_points_bal":"0",
        "operator_no":"000001",
        "trans_datetime":"2016-10-13 11:30:00",
        "trans_amt":"567.00",
        "order_dis_amt":"0.00",
        "dis_amt":"0.00",
        "suc_tag":"1",
        "print_status":"1",
        "schedule_id":"1",
        "order_type":"0",
        "trans_detail":[
          {
            "term_detail_no":"10010004000101",
            "termShopPrimaryKey":"10010004000101",
            "sku_id":"241",
            "sku_code":"1040",
            "bar_code":"6933453800078",
            "trans_amt":"567.00",
            "discount_amt":"0.00",
            "sales_count":"100.00",
            "price":"5.67",
            "nzn":"001",
            "isManual":"",
            "pos_ttc":"1",
            "pos_term_bat":"",
            "pos_term_ssn":"",
            "t_type":"",
            "pump_no":"1000",
            "time":"2016-10-13 11:30:00"
          }
        ],
        "payment_detail":[
          {
            "termSlaveTraNo":"1001000400010002",
            "termSlavePrimaryKey":"10010004000101",
            "payment_type":"1",
            "card_no":"1001311200000000106",
            "deduct_flag":"0",
            "suc_tag":"1",
            "bal":"",
            "ctc":"",
            "ds":"",
            "gmac":"",
            "psam_tac":"",
            "psam_asn":"",
            "psam_tid":"",
            "psam_ttc":"",
            "out_trade_no":"22222",
            "amt":"67.00",
            "pay_datetime":"2016-10-13 11:29:00",
            "trans_type":"0",
            "payment_type_sub":""
          }
        ]
      }
    ]
  };
}
