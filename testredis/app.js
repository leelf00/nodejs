// 目前bluebird性能比原生的高一些
const Promise = require('bluebird');
const redisClient = require("./redis");



module.exports.test = function () {
  return new Promise((resolve,reject) => {
    redisClient.getClient().hget("C_tbl_card_inf","1000111210010000040",function(err, reply){
      resolve(true);
    });
  })
}

console.time('aaa');
for(var i=0;i<1;i++){
  this.test().then(v=>{
    console.timeEnd('aaa');
  });
}
