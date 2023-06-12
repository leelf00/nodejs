'use strict';
const fs = require("fs");
const zlib = require('zlib');
const gzip = zlib.createGzip({
    level: 9
});
const protobuf = require("protobufjs");




function genPcDeal(){

  let payload = {
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
  }

  protobuf.load("./mc-center.proto", function(err, root) {
      if (err) {
        console.log(`error:${err}`);
      }
      let WorkSchedule = root.lookupType("sapcis.protobuf.mc.WorkSchedule");
      let PcDeal = root.lookupType("sapcis.protobuf.mc.PcDeal");

      let payload2 = {
          id: 1,
          nodeNo: '10010003',
          teamId: 3,
          shiftId: 4,
          workTeamName: '甲班',
          workShiftName: '早班',
          scheduleDate: '2017-4-14',
          actStartTime: '2017-4-14 7:00:00',
          actEndTime: '2017-4-14 19:00:00',
          statusId: 1,
          transferFlag: 1
      };

      console.log('payload:',payload);

      // 检验下格式是否合理
      var errMsg = PcDeal.verify(payload);
      if (errMsg)
          throw Error(errMsg);

      let message = PcDeal.create(payload); // or use .fromObject if conversion is necessary

      let buffer = PcDeal.encode(message).finish();
      console.log(buffer);
      console.log(`protobuf len:${buffer.length}`);
      let _bytebuff = zlib.gzipSync(buffer, {
          level: zlib.Z_BEST_COMPRESSION
      });
      console.log(`gz protobuf len:${_bytebuff.length}`);
      console.log(`json len:${JSON.stringify(payload).length}`);
      let _bytebuff2 = zlib.gzipSync(JSON.stringify(payload), {
          level: zlib.Z_BEST_COMPRESSION
      });
      console.log(`gz json len:${_bytebuff2.length}`);

      let decmessage = PcDeal.decode(buffer);
      let decobject = PcDeal.toObject(decmessage, {
          longs: String,
          enums: String,
          bytes: String,
          // see ConversionOptions
      });

      console.log("decode obj:",decobject);

      return _bytebuff;

  });

}

genPcDeal();
