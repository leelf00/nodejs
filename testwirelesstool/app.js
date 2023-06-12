var hostapd = require('wireless-tools/hostapd');

var options = {
  channel: 6,
  driver: 'rtl871xdrv',
  hw_mode: 'n',
  interface: 'wlan0',
  ssid: 'lilingfei',
  wpa: 2,
  wpa_passphrase: 1234
};

hostapd.enable(options, function(err) {
  // the access point was created
  if(err) console.log(err);
  console.log('ssid created');
});