// local video (by HLS)
var hls = require('airplay2').createHLS();
hls.start(7001);
hls.open('144.mp4', function(info) {
    console.info('video opened: ', info);
});

var browser = require('airplay2').createBrowser();
browser.on('deviceOn', function(device) {
    device.play(hls.getURI(), 0, function() {
        console.info('video playing...');
    });
});
browser.start();