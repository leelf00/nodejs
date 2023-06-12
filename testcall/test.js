function abc(){
  console.log('xap');
}
abc();
var abcc=function(){
  console.log('xap2');

}
abcc();
var abcd = () =>{
  console.log('xap3');
}
abcd();

var _now = new Date();

console.log(typeof abcc);

//console.log(instanceof _now);

const a=1;
var b=2;
let c=3;

var xapObj = {

  name:'aaa',
  name2:'aaa2',

  do:function(){

    console.log('aaa');
  }

}
xapObj.do();
console.log(xapObj.name);
console.log(xapObj['name']);

for(let _a of xapObj){
  console.log(_a);
}





