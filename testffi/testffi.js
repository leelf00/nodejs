var ffi = require('ffi');

var libxlsx = ffi.Library('sapcisxlsx', {
  'WriteExcel': [ 'string', [ 'string','string' ] ]
});
libxlsx.WriteExcel('d:/','test'); // 2