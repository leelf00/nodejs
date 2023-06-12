const net = require('net');
var cluster = require('cluster');
//var numCPUs = require('os').cpus().length;
console.log('[MC测试程序]启动');
// fork-join 模式
// 管理节点
if (cluster.isMaster) {
  // 加入工作线程.numCPUs
  for (let i = 0; i < 40; i++) {
    cluster.fork();
  }
  //工作线程监听
  cluster.on('listening',(worker,address) => {
    console.log('[MC测试程序]监听: 工作线程 ' + worker.process.pid +', Address: '+address.address+":"+address.port);
  });
  //工作线程退出
  cluster.on('exit', (worker, code, signal) => {
    console.log('[MC测试程序]工作线程线程 ' + worker.process.pid + ' 退出');
    //尝试启动一个新的工作进程
    cluster.fork();
  });

}
// 工作节点
else {

  function testmc() {
    let _st = new Date();
    let client = net.createConnection({port: 8008,host:'192.168.0.110'}, () => {
      //'connect' listener
      //console.log('connected to mc server!');
      //心跳报文
      //var _hb = new Buffer("fa00000100000000050510010001695c", "hex");
      //加油机心跳报文
      //fa00005f003130010010003010000400900000000000000000000000000000000000250901f8a9
      //var _hb = new Buffer("fa000000003130010010001030100200000012345678901212345678901200000000000000e4be", "hex");
      var _hb = new Buffer("fa00005f003130010010003010000400900000000000000000000000000000000000250901f8a9", "hex");
      //加油机交易报文
      //var _pc_deal = new Buffer("fa0000700143320000a5070020160811160129010013111000000101640000000000570900000000000000000000000000000000000000000000000010010000000500000000000000100d1030000fa7022c0009a2f234ec97f43b01000000000000000000000000010010003040000100001100058410011000027901000000000108000000155613010100000000104900000000ff21", "hex");
      //var _pc_deal_crcdata = new Buffer("0000700143320000a5070020160811160129010013111000000101640000000000570900000000000000000000000000000000000000000000000010010000000500000000000000100d1030000fa7022c0009a2f234ec97f43b01000000000000000000000000010010003040000100001100058410011000027901000000000108000000155613010100000000104900000000", "hex");
      //pos-ttc 00a50700
      //写出
      client.write(_hb);
      
    });
    let pack;
    client.on('data', (data) => {
      //console.log(data.toString());
      //console.log(data.length);
      //pack += data;
      //client.end();
    });
    client.on('end', () => {
      console.log(Math.random());
      client.end();
      //console.log(pack.length);
      //console.log('disconnected from server');
    });
  }

  const table = [ 0x0000, 0xC0C1, 0xC181, 0x0140, 0xC301, 0x03C0, 0x0280,
        0xC241, 0xC601, 0x06C0, 0x0780, 0xC741, 0x0500, 0xC5C1, 0xC481,
        0x0440, 0xCC01, 0x0CC0, 0x0D80, 0xCD41, 0x0F00, 0xCFC1, 0xCE81,
        0x0E40, 0x0A00, 0xCAC1, 0xCB81, 0x0B40, 0xC901, 0x09C0, 0x0880,
        0xC841, 0xD801, 0x18C0, 0x1980, 0xD941, 0x1B00, 0xDBC1, 0xDA81,
        0x1A40, 0x1E00, 0xDEC1, 0xDF81, 0x1F40, 0xDD01, 0x1DC0, 0x1C80,
        0xDC41, 0x1400, 0xD4C1, 0xD581, 0x1540, 0xD701, 0x17C0, 0x1680,
        0xD641, 0xD201, 0x12C0, 0x1380, 0xD341, 0x1100, 0xD1C1, 0xD081,
        0x1040, 0xF001, 0x30C0, 0x3180, 0xF141, 0x3300, 0xF3C1, 0xF281,
        0x3240, 0x3600, 0xF6C1, 0xF781, 0x3740, 0xF501, 0x35C0, 0x3480,
        0xF441, 0x3C00, 0xFCC1, 0xFD81, 0x3D40, 0xFF01, 0x3FC0, 0x3E80,
        0xFE41, 0xFA01, 0x3AC0, 0x3B80, 0xFB41, 0x3900, 0xF9C1, 0xF881,
        0x3840, 0x2800, 0xE8C1, 0xE981, 0x2940, 0xEB01, 0x2BC0, 0x2A80,
        0xEA41, 0xEE01, 0x2EC0, 0x2F80, 0xEF41, 0x2D00, 0xEDC1, 0xEC81,
        0x2C40, 0xE401, 0x24C0, 0x2580, 0xE541, 0x2700, 0xE7C1, 0xE681,
        0x2640, 0x2200, 0xE2C1, 0xE381, 0x2340, 0xE101, 0x21C0, 0x2080,
        0xE041, 0xA001, 0x60C0, 0x6180, 0xA141, 0x6300, 0xA3C1, 0xA281,
        0x6240, 0x6600, 0xA6C1, 0xA781, 0x6740, 0xA501, 0x65C0, 0x6480,
        0xA441, 0x6C00, 0xACC1, 0xAD81, 0x6D40, 0xAF01, 0x6FC0, 0x6E80,
        0xAE41, 0xAA01, 0x6AC0, 0x6B80, 0xAB41, 0x6900, 0xA9C1, 0xA881,
        0x6840, 0x7800, 0xB8C1, 0xB981, 0x7940, 0xBB01, 0x7BC0, 0x7A80,
        0xBA41, 0xBE01, 0x7EC0, 0x7F80, 0xBF41, 0x7D00, 0xBDC1, 0xBC81,
        0x7C40, 0xB401, 0x74C0, 0x7580, 0xB541, 0x7700, 0xB7C1, 0xB681,
        0x7640, 0x7200, 0xB2C1, 0xB381, 0x7340, 0xB101, 0x71C0, 0x7080,
        0xB041, 0x5000, 0x90C1, 0x9181, 0x5140, 0x9301, 0x53C0, 0x5280,
        0x9241, 0x9601, 0x56C0, 0x5780, 0x9741, 0x5500, 0x95C1, 0x9481,
        0x5440, 0x9C01, 0x5CC0, 0x5D80, 0x9D41, 0x5F00, 0x9FC1, 0x9E81,
        0x5E40, 0x5A00, 0x9AC1, 0x9B81, 0x5B40, 0x9901, 0x59C0, 0x5880,
        0x9841, 0x8801, 0x48C0, 0x4980, 0x8941, 0x4B00, 0x8BC1, 0x8A81,
        0x4A40, 0x4E00, 0x8EC1, 0x8F81, 0x4F40, 0x8D01, 0x4DC0, 0x4C80,
        0x8C41, 0x4400, 0x84C1, 0x8581, 0x4540, 0x8701, 0x47C0, 0x4680,
        0x8641, 0x8201, 0x42C0, 0x4380, 0x8341, 0x4100, 0x81C1, 0x8081,
        0x4040, ];

  /** 计算crc **/
  function create(ary){
  		let crc = 0x0000;
  		for (var b of ary) {
        //console.log(`b:${b}`);
  			crc = (crc >>> 8) ^ table[(crc ^ b) & 0xff];
  		}
  		return crc;
  }

  var _index = 0;

  /** 修改交易记录报文 **/
  function pc_deal(){
    let _frame = 5;
    var buf = Buffer.allocUnsafe(151);
    var crcbuf = Buffer.allocUnsafe(148);
    var _pc_deal = new Buffer("fa0000700143320000a5070020160811160129010013111000000101640000000000570900000000000000000000000000000000000000000000000010010000000500000000000000100d1030000fa7022c0009a2f234ec97f43b01000000000000000000000000ffffffffffffffff00001100058410011000027901000000000108000000155613010100000000104900000000ff21", "hex");
    var _pc_deal_crcdata = new Buffer("0000700143320000a5070020160811160129010013111000000101640000000000570900000000000000000000000000000000000000000000000010010000000500000000000000100d1030000fa7022c0009a2f234ec97f43b01000000000000000000000000ffffffffffffffff00001100058410011000027901000000000108000000155613010100000000104900000000", "hex");

    //pos-ttc
    _pc_deal_crcdata.writeUIntBE(_index,6,4);//0xffffffff

    //智能终端号
    var _term_inf = '0100100010501005';//超过整型大小，分2次写入
    //console.log(_term_inf.substring(0,8));
    //console.log(_term_inf.substring(8,16));
    _pc_deal_crcdata.writeUIntBE('0x'+_term_inf.substring(0,8),103,4);
    _pc_deal_crcdata.writeUIntBE('0x'+_term_inf.substring(8,16),107,4);
    //console.log(_term_inf.toString('16'));
    let _crc = create(_pc_deal_crcdata);
    console.log(create(_pc_deal_crcdata).toString('16'));

    //pos-ttc
    _pc_deal.writeUIntBE(_index,7,4);
    _pc_deal.writeUIntBE('0x'+_term_inf.substring(0,8),104,4);
    _pc_deal.writeUIntBE('0x'+_term_inf.substring(8,16),108,4);
    //crc
    _pc_deal.writeUIntBE(_crc,149,2);
    console.log(_pc_deal.toString('hex'));

    _index++;
    //console.log(buf);
    return _pc_deal;

  }

  //固定间隔发送心跳
  setInterval(function(){
    testmc();
    //pc_deal();
  },1000);

}

