const http = require('http');
const soap = require('soap');
const fs = require('fs');

var cardTransSvr = {
    cardTransSvr: {
        cardTransSvr: {
            MyFunction: function(args) {
                return {
                    name: args.name
                };
            },

            // This is how to define an asynchronous function.
            MyAsyncFunction: function(args, callback) {
                // do some work
                callback({
                    name: args.name
                });
            },

            // This is how to receive incoming headers
            HeadersAwareFunction: function(args, cb, headers) {
                return {
                    name: headers.Token
                };
            },

            // You can also inspect the original `req`
            reallyDetailedFunction: function(args, cb, headers, req) {
                console.log('SOAP `reallyDetailedFunction` request from ' + req.connection.remoteAddress);
                return {
                    name: headers.Token
                };
            }
        }
    }
};

//http server example
var server = http.createServer(function(request,response) {
    response.end("404: Not Found: " + request.url);
});

var xml = fs.readFileSync('cardTransSvr.wsdl', 'utf8');
console.log(xml);
console.log(typeof xml);

server.listen(8000);
soap.listen(server, '/', cardTransSvr, xml);


// soap.listen(server, {
//     // Server options.
//     path: '/wsdl',
//     services: myService,
//     xml: xml,
//
//     // WSDL options.
//     attributesKey: 'theAttrs',
//     valueKey: 'theVal',
//     xmlKey: 'theXml'
// });