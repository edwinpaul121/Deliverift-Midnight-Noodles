global.self=global;
const THREE=require('/home/claude/node_modules/three/build/three.js'); global.THREE=THREE;
function anyObj(){return new Proxy(function(){},{get:(t,k)=>(k in t?t[k]:anyObj()),apply:()=>anyObj(),set:(t,k,v)=>(t[k]=v,true)});}
function fakeImg(){const l={};return{style:{},width:4,height:4,addEventListener(t,f){(l[t]=l[t]||[]).push(f);},removeEventListener(){},set src(v){setTimeout(()=>(l.load||[]).forEach(f=>f({target:this})),0);},get src(){return 'f';}};}
const cv=()=>({style:{},width:0,height:0,getContext:()=>anyObj()});
global.document={createElementNS:(n,t)=>t==='img'?fakeImg():cv(),createElement:t=>t==='img'?fakeImg():cv()};
URL.createObjectURL=()=>'blob:f';URL.revokeObjectURL=()=>{};
global.TextDecoder=require('util').TextDecoder;global.performance=global.performance||{now:()=>Date.now()};
require('/home/claude/node_modules/three/examples/js/loaders/GLTFLoader.js');
const fs=require('fs');
const src=['game1.js','game2.js','game3.js'].map(f=>fs.readFileSync('/home/claude/'+f,'utf8')).join('\n').replace("'use strict';","");
const body=`
TUNE.world.carScale=2.0; applyTune();
const files={0:'1789023652737_r32-gtr.glb',1:'nissan_silvia_s13_updated.glb',2:'toyota_corolla_ae86_trueno.glb',3:'mazda_rx-7_fd.glb',4:'mitsubishi_lancer_evo_x.glb',5:'2012_lexus_lfa_nurburgring_package.glb',6:'honda_nsx_1990.glb',7:'nissan_skyline_r34_gt-r.glb',8:'nissan_silvia_s15_custom.glb',9:'nissan_skyline_gtr_r35.glb'};
const loader=new THREE.GLTFLoader();
Object.entries(files).forEach(([id,f])=>{
  const b=fs.readFileSync('/mnt/user-data/uploads/'+f);
  loader.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',gltf=>{
    const stock={body:0x2f4f7f,rim:0xd7d2c6,finish:'gloss',livery:'none',rimStyle:'mesh',stance:'stock',wing:'auto',glow:'off',plate:'EAST 32'};
    const tuned={body:0xc8453c,rim:0xf3b545,finish:'matte',livery:'none',rimStyle:'star',stance:'low',wing:'gt',glow:'pink',plate:'FOX 11'};
    const a=adaptCarModel(gltf.scene.clone(true), CARS[id], stock, {url:f});
    const b2=adaptCarModel(gltf.scene.clone(true), CARS[id], tuned, {url:f});
    const rimCount=(o,hex)=>{let n=0;o.userData.wheels.forEach(w=>w.hub.traverse(m=>{if(m.isMesh&&m.material&&!Array.isArray(m.material)&&m.material.color&&m.material.color.getHex()===hex)n++;}));return n;};
    
    const count=(o,pred)=>{let n=0;o.traverse(m=>{if(pred(m))n++;});return n;};
    console.log(CARS[id].name+':');
    console.log('   stock  rim-coloured parts '+rimCount(a,0xd7d2c6)+'  ride height change '+a.userData.bodyDrop.toFixed(2)+'m'+'  plates '+count(a,m=>m.isMesh&&m.material&&m.material.map&&m.material.map.image&&m.material.map.image.width===256)+
      '  lights '+count(a,m=>m.isPointLight)+'  camber '+a.userData.wheels[0].hub.rotation.z.toFixed(2));
    console.log('   tuned  rim-coloured parts '+rimCount(b2,0xf3b545)+'  ride height change '+b2.userData.bodyDrop.toFixed(2)+'m'+'  plates '+count(b2,m=>m.isMesh&&m.material&&m.material.map&&m.material.map.image&&m.material.map.image.width===256)+
      '  lights '+count(b2,m=>m.isPointLight)+'  camber '+b2.userData.wheels[0].hub.rotation.z.toFixed(2)+'  extra meshes '+(count(b2,m=>m.isMesh)-count(a,m=>m.isMesh)));
  },e=>console.log('fail',e));
});
`;
eval(src+'\n'+body);
