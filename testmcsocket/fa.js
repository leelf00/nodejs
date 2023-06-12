/* =========================================================
	计算组合报文，包含心跳，交易上传等
	@author
	@version 20161018
	@update 20161018 首次提交
 * ========================================================= */
const crc = require('./crc');
const zlib = require('zlib');
const gzip = zlib.createGzip({level: 9});
const testprotobuf = require('./testprotobuf');

exports = module.exports = {};

//发送心跳
module.exports.heartbeat = function heartbeat(node_no, frame) {
    //let _frame = 5;
    var buf = Buffer.allocUnsafe(1 + 3 + 5 + 1 + 4 + 2);
    var crcbuf = Buffer.allocUnsafe(3 + 5 + 1 + 4);
    //00 00
    crcbuf.writeUIntBE(0x0000, 0, 2);
    //帧号 0-249
    crcbuf.writeUInt8(frame & 0xff, 2);
    //报文长度
    crcbuf.writeUIntBE(0x5, 3, 5);
    //命令字
    crcbuf.writeUInt8(0x5, 8);
    //网点编码
    crcbuf.writeUIntBE('0x' + node_no, 9, 4);
    //console.log(crcbuf);
    let _crc = crc.crc(crcbuf);
    //console.log(create(crcbuf).toString('16'));

    //报文头 fa 00 00
    buf.writeUIntBE(0xfa, 0, 1);
    buf.writeUIntBE(0x0000, 1, 2);
    //console.log(_frame & 0xff);
    //帧号
    buf.writeUInt8(frame & 0xff, 3);
    //buf.writeUIntBE(0x1048576,4,4);
    //报文长度
    buf.writeUIntBE(0x5, 4, 5);
    //buf.writeUIntBE(crcbuf.length,4,5);
    //命令字,0x05
    buf.writeUInt8(0x5, 9);
    //网点编码
    buf.writeUIntBE('0x' + node_no, 10, 4);
    //crc
    buf.writeUIntBE(_crc, 14, 2);

    //console.log(buf.toString('hex'));
    return buf;
}

//交易记录0x2b
module.exports.twob = function twob(node_no, frame, obj) {
    return new Promise((resolve, reject) => {
        testprotobuf.genSalesTransLog().then(v => {
            //let _frame = 5;
            //let _json = JSON.stringify(obj);
            //console.log('json', _json);
            let _bytebuff = zlib.gzipSync(v, {level: zlib.Z_BEST_COMPRESSION});
            //console.log('gzip json:', _bytebuff.toString('hex'));
            //console.log('length:', _bytebuff.length)
            var buf = Buffer.allocUnsafe(1 + 3 + 5 + 1 + _bytebuff.length + 2);
            var crcbuf = Buffer.allocUnsafe(3 + 5 + 1 + _bytebuff.length);
            //00 00
            crcbuf.writeUIntBE(0x0000, 0, 2);
            //帧号 0-249
            crcbuf.writeUInt8(frame & 0xff, 2);
            //报文长度
            crcbuf.writeUIntBE('0x' + (_bytebuff.length + 1), 3, 5);
            //命令字
            crcbuf.writeUInt8(0x2b, 8);

            _bytebuff.copy(crcbuf, 9);
            //crcbuf.writeUIntBE(_bytebuff,9,_json.length);

            //网点编码
            //crcbuf.writeUIntBE('0x'+node_no,9,4);
            //console.log(crcbuf);
            let _crc = crc.crc(crcbuf);
            //console.log(create(crcbuf).toString('16'));

            //报文头 fa 00 00
            buf.writeUIntBE(0xfa, 0, 1);
            buf.writeUIntBE(0x0000, 1, 2);
            //console.log(_frame & 0xff);
            //帧号
            buf.writeUInt8(frame & 0xff, 3);
            //buf.writeUIntBE(0x1048576,4,4);
            //报文长度
            //buf.writeUIntBE(0x5,4,5);
            buf.writeUIntBE('0x' + (_bytebuff.length + 1), 4, 5);
            //命令字,0x05
            buf.writeUInt8(0x2b, 9);
            _bytebuff.copy(buf, 10);
            // //网点编码
            // buf.writeUIntBE('0x'+node_no,10,4);
            //crc
            //console.log('crc:', _crc);
            //console.log('crc buff:', crcbuf.toString('hex'));
            buf.writeUIntBE(_crc, 11 + _bytebuff.length - 1, 2); //

            //console.log(buf.toString('hex'));
            buf = addFa(buf);
            //if (frame == 0x7a) console.log(buf.toString('hex'));
            resolve(buf);
        });
    });
}

//班次上传0x2c
module.exports.twoc = function twoc(node_no, frame, obj) {

    return new Promise((resolve, reject) => {
        testprotobuf.genWorkSchedule().then(v => {

            let _bytebuff = zlib.gzipSync(v, {level: zlib.Z_BEST_COMPRESSION});
            //console.log('gzip json:', _bytebuff.toString('hex'));
            //console.log('length:', _bytebuff.length)
            var buf = Buffer.allocUnsafe(1 + 3 + 5 + 1 + _bytebuff.length + 2);
            var crcbuf = Buffer.allocUnsafe(3 + 5 + 1 + _bytebuff.length);
            //00 00
            crcbuf.writeUIntBE(0x0000, 0, 2);
            //帧号 0-249
            crcbuf.writeUInt8(frame & 0xff, 2);
            //报文长度
            crcbuf.writeUIntBE('0x' + (_bytebuff.length + 1), 3, 5);
            //命令字
            crcbuf.writeUInt8(0x2c, 8);

            _bytebuff.copy(crcbuf, 9);
            //crcbuf.writeUIntBE(_bytebuff,9,_json.length);

            //网点编码
            //crcbuf.writeUIntBE('0x'+node_no,9,4);
            //console.log(crcbuf);
            let _crc = crc.crc(crcbuf);
            //console.log(create(crcbuf).toString('16'));

            //报文头 fa 00 00
            buf.writeUIntBE(0xfa, 0, 1);
            buf.writeUIntBE(0x0000, 1, 2);
            //console.log(_frame & 0xff);
            //帧号
            buf.writeUInt8(frame & 0xff, 3);
            //buf.writeUIntBE(0x1048576,4,4);
            //报文长度
            //buf.writeUIntBE(0x5,4,5);
            buf.writeUIntBE('0x' + (_bytebuff.length + 1), 4, 5);
            //命令字,0x05
            buf.writeUInt8(0x2c, 9);
            _bytebuff.copy(buf, 10);
            // //网点编码
            // buf.writeUIntBE('0x'+node_no,10,4);
            //crc
            //console.log('crc:', _crc);
            //console.log('crc buff:', crcbuf.toString('hex'));
            buf.writeUIntBE(_crc, 11 + _bytebuff.length - 1, 2); //

            console.log('buffer:', buf.toString('hex'));
            buf = addFa(buf);
            //if (frame == 0x7a) console.log(buf.toString('hex'));
            resolve(buf);
        });

    });
}

//班次上传0x2c
module.exports.deal = function deal(node_no, frame, obj) {
    //let _frame = 5;
    return new Promise((resolve, reject) => {
        console.log(1);
        testprotobuf.genPcDeal().then(v => {
            console.log(2);
            //console.log('json', _json);
            let _bytebuff = zlib.gzipSync(v, {level: zlib.Z_BEST_COMPRESSION});
            //console.log('gzip json:', _bytebuff.toString('hex'));
            //console.log('length:', _bytebuff.length)
            var buf = Buffer.allocUnsafe(1 + 3 + 5 + 1 + _bytebuff.length + 2);
            var crcbuf = Buffer.allocUnsafe(3 + 5 + 1 + _bytebuff.length);
            //00 00
            crcbuf.writeUIntBE(0x0000, 0, 2);
            //帧号 0-249
            crcbuf.writeUInt8(frame & 0xff, 2);
            //报文长度
            crcbuf.writeUIntBE('0x' + (_bytebuff.length + 1), 3, 5);
            //命令字
            crcbuf.writeUInt8(0x06, 8);

            _bytebuff.copy(crcbuf, 9);
            //crcbuf.writeUIntBE(_bytebuff,9,_json.length);

            //网点编码
            //crcbuf.writeUIntBE('0x'+node_no,9,4);
            //console.log(crcbuf);
            let _crc = crc.crc(crcbuf);
            //console.log(create(crcbuf).toString('16'));

            //报文头 fa 00 00
            buf.writeUIntBE(0xfa, 0, 1);
            buf.writeUIntBE(0x0000, 1, 2);
            //console.log(_frame & 0xff);
            //帧号
            buf.writeUInt8(frame & 0xff, 3);
            //buf.writeUIntBE(0x1048576,4,4);
            //报文长度
            //buf.writeUIntBE(0x5,4,5);
            buf.writeUIntBE('0x' + (_bytebuff.length + 1), 4, 5);
            //命令字,0x05
            buf.writeUInt8(0x06, 9);
            _bytebuff.copy(buf, 10);
            // //网点编码
            // buf.writeUIntBE('0x'+node_no,10,4);
            //crc
            //console.log('crc:', _crc);
            //console.log('crc buff:', crcbuf.toString('hex'));
            buf.writeUIntBE(_crc, 11 + _bytebuff.length - 1, 2); //

            console.log('buffer:', buf.toString('hex'));
            buf = addFa(buf);
            //if (frame == 0x7a) console.log(buf.toString('hex'));
            resolve(buf);
        });

    });

}

//add FA
function addFa(buf) {
    let offset = 1;
    let _idx;
    let _nbuf = buf;
    let _fas = 0;
    while ((_idx = _nbuf.indexOf(0xfa, offset)) >= 0) {
        _fas++;
        //console.log(_idx);
        //buf扩展一位，idx后一位补充成fa
        let _nnbuf = Buffer.allocUnsafe(_nbuf.length + 1);
        _nbuf.copy(_nnbuf, 0, 0, _idx);
        _nbuf.copy(_nnbuf, _idx + 1, _idx);
        _nnbuf.writeUInt8(0xfa, _idx);
        _nnbuf.writeUInt8(0xfa, 0);
        //_nbuf[_idx+1]=0xfa;
        _nbuf = _nnbuf;
        offset = _idx + 2;
        // console.log('offset:',offset);
        // console.log(_nnbuf.toString('hex'));
    };
    //console.log('fas:',_fas);
    return _nbuf;
}

function test() {
    let _testobj = {
        "type": "data",
        "bussiness_type": "pos",
        "data": [
            {
                "termPrimaryKey": "100100010401001000001000001",
                "termTraNo": "000001",
                "termBatNo": "000001",
                "termPosTTC": "000000000001",
                "termChannel": "04",
                "term_id": "100100010401001",
                "node_no": "10010001",
                "comp_no": "",
                "trans_datetime": "20161001000000",
                "trans_amt": "10",
                "order_dis_amt": "10",
                "trans_detail": [
                    {
                        "term_detail_no": "0000010001",
                        "sku_id": "100000001",
                        "sku_code": "639",
                        "trans_amt": "10",
                        "discount_amt": "0",
                        "sales_count": "1",
                        "price": "10",
                        "nzn": "2",
                        "isManual": "1",
                        "pos_term_bat": "000001",
                        "pos_term_ssn": "000001",
                        "t_type": "0"
                    }, {
                        "term_detail_no": "0000010001",
                        "sku_id": "100000001",
                        "sku_code": "639",
                        "trans_amt": "10",
                        "discount_amt": "0",
                        "sales_count": "1",
                        "price": "10",
                        "nzn": "2",
                        "isManual": "1",
                        "pos_term_bat": "000001",
                        "pos_term_ssn": "000001",
                        "t_type": "0"
                    }, {
                        "term_detail_no": "0000010001",
                        "sku_id": "100000001",
                        "sku_code": "639",
                        "trans_amt": "10",
                        "discount_amt": "0",
                        "sales_count": "1",
                        "price": "10",
                        "nzn": "2",
                        "isManual": "1",
                        "pos_term_bat": "000001",
                        "pos_term_ssn": "000001",
                        "t_type": "0"
                    }, {
                        "term_detail_no": "0000010001",
                        "sku_id": "100000001",
                        "sku_code": "639",
                        "trans_amt": "10",
                        "discount_amt": "0",
                        "sales_count": "1",
                        "price": "10",
                        "nzn": "2",
                        "isManual": "1",
                        "pos_term_bat": "000001",
                        "pos_term_ssn": "000001",
                        "t_type": "0"
                    }, {
                        "term_detail_no": "0000010001",
                        "sku_id": "100000001",
                        "sku_code": "639",
                        "trans_amt": "10",
                        "discount_amt": "0",
                        "sales_count": "1",
                        "price": "10",
                        "nzn": "2",
                        "isManual": "1",
                        "pos_term_bat": "000001",
                        "pos_term_ssn": "000001",
                        "t_type": "0"
                    }, {
                        "term_detail_no": "0000010001",
                        "sku_id": "100000001",
                        "sku_code": "639",
                        "trans_amt": "10",
                        "discount_amt": "0",
                        "sales_count": "1",
                        "price": "10",
                        "nzn": "2",
                        "isManual": "1",
                        "pos_term_bat": "000001",
                        "pos_term_ssn": "000001",
                        "t_type": "0"
                    }, {
                        "term_detail_no": "0000010001",
                        "sku_id": "100000001",
                        "sku_code": "639",
                        "trans_amt": "10",
                        "discount_amt": "0",
                        "sales_count": "1",
                        "price": "10",
                        "nzn": "2",
                        "isManual": "1",
                        "pos_term_bat": "000001",
                        "pos_term_ssn": "000001",
                        "t_type": "0"
                    }
                ],
                "payment_detail": [
                    {
                        "termSlaveTraNo": "000001",
                        "payment_type": "9",
                        "deduct_flag": "0",
                        "suc_tag": "1",
                        "amt": "000000000010"
                    }, {
                        "termSlaveTraNo": "000001",
                        "payment_type": "9",
                        "deduct_flag": "0",
                        "suc_tag": "1",
                        "amt": "000000000010"
                    }, {
                        "termSlaveTraNo": "000001",
                        "payment_type": "9",
                        "deduct_flag": "0",
                        "suc_tag": "1",
                        "amt": "000000000010"
                    }, {
                        "termSlaveTraNo": "000001",
                        "payment_type": "9",
                        "deduct_flag": "0",
                        "suc_tag": "1",
                        "amt": "000000000010"
                    }
                ]
            }
        ]
    }

    //console.log(require('./fa').twob('10010004',2,_testobj));

}

//test();