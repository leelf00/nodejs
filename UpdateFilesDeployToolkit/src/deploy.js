/* =========================================================
	站级更新包工具集合主程序
	@author
	@version 20160913
	@update 20160913 by fei 首次提交 MC，MC工具集，安卓POS apk更新包程序
 * ========================================================= */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const redis = require('redis');
const redis_c = redis.createClient({
    host:'172.18.4.114',
    port:6379
});
const download_root = 'https://172.18.4.114/file_update';
const file_root = '/home/file_update';
//const file_root = '/home/file_update';

var version_json = {
  "version":0,
  "version_date":'1970-01-01 00:00:00',
  "apps":[]

}

//计算某个值的md5
module.exports.genMD5 = function genMD5(filename,data){
  return new Promise((resolve,reject)=>{
    console.time('md5计算');
    let hash = crypto.createHash('md5').update(data).digest('hex');
    console.timeEnd('md5计算');
    let _obj = {};
    _obj[filename] = hash;
    resolve(_obj);
  });
}

//获取某个文件夹下的文件或目录,一般情况是/home/file_update/,下面一般有mc,mc_tools,android_pos,mobile_pos几个目录
module.exports.listFiles = function listFiles(dir){
  return new Promise((resolve,reject)=>{
    fs.readdir(dir, (err, filenames)=>{
        resolve(filenames);
    });
  });
}

//异步读取文件字节码
module.exports.readFileAsync = function readFileAsync(path){
  return new Promise((resolve,reject)=>{
    // let _path = new Buffer(path);
    // console.log(_path);
    fs.readFile(path, (err, data) => {
      if (err) throw err;
      resolve(data);
    });
  });
}

//计算每个app的filelist
module.exports.genAppConfig = function genAppConfig(dir,appname){
  return new Promise((resolve,reject)=>{
    this.listFiles(dir+appname+'/').then(downloadfiles=>{
      let asynworks = [];
      downloadfiles.forEach(o=>{
        asynworks.push(this.readFileAsync(dir+appname+'/'+o).then(filedata=>{return this.genMD5(download_root+'/'+appname+'/'+o,filedata);}));
      })
      //计算md5,多线程同步计算
      Promise.all(asynworks).then(values=>{
        resolve({app:appname,filelist:values});
      });
    })

  });
}

module.exports.writeVersionFile = function writeVersionFile(callback){
  //fs.writeFile(file_root+'/version.json',JSON.stringify(version_json), (err) => {
    //callback();
    //console.log('write end');
  //});
  //console.log(version_json);
  fs.writeFile(file_root+'/version.json',JSON.stringify(version_json),callback);


}

//递归生成文件
module.exports.genVersionFile = function genVersionFile(){
  this.listFiles(file_root+'/').then(dirs=>{
    let asynworks = [];
    dirs.forEach(dir=>{
      if(dir!='version.json') console.log(dir);
      if(dir!='version.json') asynworks.push(this.genAppConfig(file_root+'/',dir));
    });
    Promise.all(asynworks).then(values=>{
      console.log(values);
      let _now = new Date();
      version_json['version'] = _now.getFullYear()*100000000+(_now.getMonth()+1)*1000000+_now.getDate()*10000+_now.getHours()*100+_now.getMinutes();
      version_json['version_date'] = _now.getFullYear()+'-'+(_now.getMonth()<9?'0':'')+(_now.getMonth()+1)+'-'+(_now.getDate()<10?'0':'')+_now.getDate()+' '+(_now.getHours()<10?'0':'')+_now.getHours()+':'+(_now.getMinutes()<10?'0':'')+_now.getMinutes()+':'+(_now.getSeconds()<10?'0':'')+_now.getSeconds();
      values.forEach(_app=>{
        let _app_c = {
          app_name:_app.app,
          desc:'mc,hehe',
          file_list:_app.filelist,
          exec:['update.sh']
        };
        version_json.apps.push(_app_c);
      })
      this.writeVersionFile(function(){
        console.log('write end');
        redis_c.set('C_file_update_version',version_json['version'],(err)=>{
          if (err) console.log(err);
          redis_c.quit();
          console.log('redis write');
          //resolve(values);
        });
      });



    });
  });

}

//test
console.time('测试计算');
this.genVersionFile();
console.timeEnd('测试计算');
// this.genAppConfig(file_root+'/','mc').then(v2=>{
//   console.timeEnd('测试计算');
//   // "version":,
//   // "version_date":new Date(),
//   let _now = new Date();
//   version_json['version'] = _now.getFullYear()*100000000+(_now.getMonth()+1)*1000000+_now.getDate()*10000+_now.getHours()*100+_now.getMinutes();
//   version_json['version_date'] = _now.getFullYear()+'-'+(_now.getMonth()<9?'0':'')+(_now.getMonth()+1)+'-'+(_now.getDate()<10?'0':'')+_now.getDate()+' '+(_now.getHours()<10?'0':'')+_now.getHours()+':'+(_now.getMinutes()<10?'0':'')+_now.getMinutes()+':'+(_now.getSeconds()<10?'0':'')+_now.getSeconds();
//   let _mc = {
//     app_name:'mc',
//     desc:'mc,hehe',
//     filelist:v2,
//     exec:['update.sh']
//   }
//   version_json.apps.push(_mc);
//   this.writeVersionFile();
//   console.log(JSON.stringify(version_json));
// })

