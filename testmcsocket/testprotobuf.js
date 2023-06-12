'use strict';
const fs = require("fs");
const zlib = require('zlib');
const gzip = zlib.createGzip({level: 9});
const protobuf = require("protobufjs");

module.exports.genPcDeal = function genPcDeal() {

    return new Promise((resolve, reject) => {
        protobuf.load("./mc-center.proto", function(err, root) {

            let payload = {
                uid: 1,
                createtime: '2017-4-14 19:00',
                posTtc: 3,
                posTermId: '100100030400001',
                posTermBat: '000085',
                posTermSsn: '000001',
                oilType: '1030',
                oilLitter: '0.36',
                transAmt: '2.00',
                compNo: '100110000025',
                cardNo: '1001311200000000106',
                transType: 0,
                transDt: '20151228',
                transTm: '170923',
                operatorNo: '000100',
                primaryKey: '000000000000',
                nozzle: 13,
                shiftId: '000000000113',
                shiftNo: '000000000000',
                shiftSerial: '000000000000',
                price: '5.49',
                paymentType: 2,
                pumpNo: '143.73',
                printStatus: 1,
                transferFlag: 1,
                remark: '操作成功!',
                nodeNo: '10010003',
                deductFlag: 2,
                sucTag: 1,
                acqProvnid: '31',
                merchId: '1001',
                disAmt: '0',
                getTime: '2016-08-26 10:42:27',
                transDatetime: '2015-10-17 15:30:46',
                bal: '9996.49',
                ctc: '0',
                ds: '0',
                gmac: '00000000',
                psamTac: '00000000',
                psamAsn: '00000000000000000000',
                psamTid: '100100000014',
                psamTtc: 0
            }

            if (err) {
                console.log(`error:${err}`);
            }
            let WorkSchedule = root.lookupType("sapcis.protobuf.mc.WorkSchedule");
            let PcDeal = root.lookupType("sapcis.protobuf.mc.PcDeal");
            console.log('payload:', payload);

            // 检验下格式是否合理
            var errMsg = PcDeal.verify(payload);
            if (errMsg)
                throw Error(errMsg);

            console.log(3);

            let message = PcDeal.create(payload); // or use .fromObject if conversion is necessary

            let buffer = PcDeal.encode(message).finish();
            // console.log(buffer);
            // console.log(`protobuf len:${buffer.length}`);
            // let _bytebuff = zlib.gzipSync(buffer, {
            //     level: zlib.Z_BEST_COMPRESSION
            // });
            // console.log(`gz protobuf len:${_bytebuff.length}`);
            // console.log(`json len:${JSON.stringify(payload).length}`);
            // let _bytebuff2 = zlib.gzipSync(JSON.stringify(payload), {
            //     level: zlib.Z_BEST_COMPRESSION
            // });
            // console.log(`gz json len:${_bytebuff2.length}`);

            // let decmessage = PcDeal.decode(buffer);
            // let decobject = PcDeal.toObject(decmessage, {
            //     longs: String,
            //     enums: String,
            //     bytes: String,
            //     // see ConversionOptions
            // });

            //console.log("decode obj:",decobject);

            resolve(buffer);
        });
    });

}

module.exports.genWorkSchedule = function genWorkSchedule() {

    return new Promise((resolve, reject) => {
        protobuf.load("./mc-center.proto", function(err, root) {

            let payload = {
                type: "data",
                tableName: "work_schedule",
                data: [
                    {
                        id: 1,
                        nodeNo: "10010003",
                        teamId: 1,
                        shiftId: 1,
                        workTeamName: "abc",
                        workShiftName: "def",
                        scheduleDate: "2017-02-21",
                        actStartTime: "2017-02-21 07:00:00",
                        actEndTime: "2017-02-21 19:00:00",
                        statusId: 2,
                        transferFlag: 0
                    }
                ]
            };

            if (err) {
                console.log(`error:${err}`);
            }
            let WorkSchedulePacket = root.lookupType("sapcis.protobuf.mc.WorkSchedulePacket");
            console.log('payload:', payload);

            // 检验下格式是否合理
            var errMsg = WorkSchedulePacket.verify(payload);
            if (errMsg)
                throw Error(errMsg);
            console.log(3);
            let message = WorkSchedulePacket.create(payload); // or use .fromObject if conversion is necessary
            console.log('message:', message);
            let buffer = WorkSchedulePacket.encode(message).finish();
            console.log(buffer.toString('hex'));
            console.log(`protobuf len:${buffer.length}`);
            // let _bytebuff = zlib.gzipSync(buffer, {
            //     level: zlib.Z_BEST_COMPRESSION
            // });
            // console.log(`gz protobuf len:${_bytebuff.length}`);
            // console.log(`json len:${JSON.stringify(payload).length}`);
            // let _bytebuff2 = zlib.gzipSync(JSON.stringify(payload), {
            //     level: zlib.Z_BEST_COMPRESSION
            // });
            // console.log(`gz json len:${_bytebuff2.length}`);

            let decmessage = WorkSchedulePacket.decode(buffer);
            let decobject = WorkSchedulePacket.toObject(decmessage, {
                longs: String,
                enums: String,
                bytes: String,
                // see ConversionOptions
            });

            console.log("decode obj:", decobject);

            resolve(buffer);
        });
    });

}

module.exports.genSalesTransLog = function genSalesTransLog() {

    return new Promise((resolve, reject) => {
        protobuf.load("./mc-center.proto", function(err, root) {

            let payload = {
                "type": "data",
                "bussinessType": "pos",
                "data": [
                    {
                        "termTraNo": "000001",
                        "termPrimaryKey": "100100030100001000000132835",
                        "TermId":"100100030100001",
                        "nodeNo": "10010003",
                        "compNo": "000000000000",
                        "memberNo": "100000000002",
                        "memberPointsI": 567,
                        "memberPointsBal": 0,
                        "operatorNo": "000001",
                        "transDatetime": "2016-10-13 11:30:00",
                        "transAmt": "567.00",
                        "orderDisAmt": "0.00",
                        "disAmt": "0.00",
                        "sucTag": 1,
                        "printStatus": 1,
                        "scheduleId": 1,
                        "orderType": 0,
                        "transDetail": [
                            {
                                "termDetailNo": "10010004000101",
                                "termShopPrimaryKey": "10010004000101",
                                "skuId": 241,
                                "skuCode": "1040",
                                "barCode": "6933453800078",
                                "transAmt": "567.00",
                                "discountAmt": "0.00",
                                "salesCount": "100.00",
                                "price": "5.67",
                                "nzn": 1,
                                "isManual": 1,
                                "posTtc": 1,
                                "posTermBat": "",
                                "posTermSsn": "",
                                "tType": 0,
                                "pumpNo": "1000",
                                "time": "2016-10-13 11:30:00"
                            }
                        ],
                        "paymentDetail": [
                            {
                                "termSlaveTraNo": "1001000400010002",
                                "termSlavePrimaryKey": "10010004000101",
                                "paymentType": 1,
                                "cardNo": "1001311200000000106",
                                "deductFlag": 0,
                                "sucTag": 1,
                                "bal": "",
                                "ctc": "",
                                "ds": "",
                                "gmac": "",
                                "psamTac": "",
                                "psamAsn": "",
                                "psamTid": "",
                                "psamTtc": 1,
                                "outTradeNo": "22222",
                                "amt": "67.00",
                                "payDatetime": "2016-10-13 11:29:00",
                                "transType": 0,
                                "paymentTypeSub": ""
                            }
                        ]
                    }
                ]
            };

            if (err) {
                console.log(`error:${err}`);
            }
            let SalesTransLogPacket = root.lookupType("sapcis.protobuf.mc.SalesTransLogPacket");
            console.log('payload:', payload);

            // 检验下格式是否合理
            var errMsg = SalesTransLogPacket.verify(payload);
            if (errMsg)
                throw Error(errMsg);
            console.log(3);
            let message = SalesTransLogPacket.create(payload); // or use .fromObject if conversion is necessary
            console.log('message:', message);
            let buffer = SalesTransLogPacket.encode(message).finish();
            console.log(buffer.toString('hex'));
            console.log(`protobuf len:${buffer.length}`);
            let _bytebuff = zlib.gzipSync(buffer, {level: zlib.Z_BEST_COMPRESSION});
            console.log(`gz protobuf len:${_bytebuff.length}`);
            console.log(`json len:${JSON.stringify(payload).length}`);
            let _bytebuff2 = zlib.gzipSync(JSON.stringify(payload), {level: zlib.Z_BEST_COMPRESSION});
            console.log(`gz json len:${_bytebuff2.length}`);

            let decmessage = SalesTransLogPacket.decode(buffer);
            let decobject = SalesTransLogPacket.toObject(decmessage, {
                longs: String,
                enums: String,
                bytes: String,
                // see ConversionOptions
            });

            console.log("decode obj:", decobject);

            resolve(buffer);
        });
    });

}

//genPcDeal();