var thrift = require('thrift');
const RPCConvService = require("./RPCConvService");
const ttypes = require("./rpcconv_types");
var Html2PdfRes = require("./rpcconv_types").Html2PdfRes;
const assert = require('assert');

//var transport = thrift.TBufferedTransport;
var transport = thrift.TFramedTransport;
var protocol = thrift.TBinaryProtocol;



var connection = thrift.createConnection("127.0.0.1", 9090, {
  transport : transport,
  protocol : protocol
});

connection.on('error', function(err) {
  assert(false, err);
});

// Create a Calculator client with the connection
var client = thrift.createClient(RPCConvService, connection);

var req = new ttypes.Html2PdfReq();
req.format="A4";
req.orientation="landscape";
req.html="<html><head></head><body></body></html>";


client.Html2Pdf(req, function(err, message) {
  console.log('1');


  connection.end();
});