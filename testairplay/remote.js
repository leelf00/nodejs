// remote video
var browser = require('airplay2').createBrowser();
browser.on('deviceOn', function(device) {
    device.play('http://remotehost/video.mp4', 0, function() {
        console.info('video playing...');
    });
});
browser.start();