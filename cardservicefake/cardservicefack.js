//'use strict';
const http = require('http');
//var soap = require('soap');
var soap = require('strong-soap').soap;
//const url = 'http://172.18.4.114:9000/';



var cardTransSvr = {
    cardTransSvr: {
        cardTransSvr : {
            opdcard: function(args, cb, soapHeader, req) {
              console.log('opdcard');
                return {
                    name: headers.Token
                };
            },
        }
    }
};
//SajtIssueInvoiceService
//var xml = require('fs').readFileSync('SajtIssueInvoiceService.wsdl', 'utf8');
var xml = require('fs').readFileSync('cardTransSvr.wsdl', 'utf8');
//console.log(xml);
//http server example
var server = http.createServer(function(request, response) {
    //console.log(request);
    response.end("404: Not Found: " + request.url);
});
server.listen(9200);
var soapserver = soap.listen(server, '/', cardTransSvr, xml);
soapserver.log = function(type, data) {
    // type is 'received' or 'replied'
    if(type=='error'){
      console.log('type:', 'error');
    }else{
      console.log('type:', type, 'data:', data);
    }

};
soapserver.on("request",function(request, methodName){
  console.log('request:',request,'methodName',methodName);
});
soapserver.on("headers",function(headers, methodName) {
    // It is possible to change the value of the headers
    // before they are handed to the service method.
    // It is also possible to throw a SOAP Fault
    console.log('headers:',headers,'methodName',methodName);
  });
//console.log(myService);