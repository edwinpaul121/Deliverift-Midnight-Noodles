global.self=global;
const THREE=require('/home/claude/node_modules/three/build/three.js'); global.THREE=THREE;
function anyObj(){return new Proxy(function(){},{get:(t,k)=>(k in t?t[k]:anyObj()),apply:()=>anyObj(),set:(t,k,v)=>(t[k]=v,true)});}
const cv=()=>({style:{},width:0,height:0,getContext:()=>anyObj()});
global.document={createElementNS:()=>cv(),createElement:()=>cv()};
const fs=require('fs');
const src=['game1.js','game2.js','game3.js'].map(f=>fs.readFileSync('/home/claude/'+f,'utf8')).join('\n').replace("'use strict';","");
eval(src+`
try { buildTextures(); } catch (e) { console.log('textures (canvas stub):', e.message); }
colliders.length=0; RAIL_SEGS.length=0;
const inst=makeInstancers();
const grp=new THREE.Group();
mountainProps(grp, inst);
let meshes=0, tris=0, nan=0, empty=0;
grp.traverse(o=>{ if(!o.isMesh) return; meshes++;
  const p=o.geometry.attributes.position; if(!p||!p.count){empty++;return;}
  for(let i=0;i<p.array.length;i++) if(!isFinite(p.array[i])) { nan++; break; }
  tris += o.geometry.index ? o.geometry.index.count/3 : p.count/3; });
console.log('circuit dressing (real three.js): '+meshes+' meshes, '+Math.round(tris)+' triangles, '+nan+' with NaN, '+empty+' empty');
// the race road: check the kerb strip lies along both edges of the tarmac
const C=CIRCUIT;
console.log('kerbs run the full lap on both sides: '+(C.kerbLength/1000).toFixed(2)+' km');
console.log('platform: '+PLAT.cells+' floor cells');
// which way does each race surface face? A mesh seen from above must face up.
const facing = [];
grp.traverse(o => {
  if (!o.isMesh || !o.geometry.index || o.geometry.type !== 'BufferGeometry') return;
  const map = o.material && o.material.map;
  const name = o.material === undefined ? '?' : (map === TEX.kerbStripe ? 'kerb' : map === TEX.apron ? 'apron floor' : map === TEX.paving ? 'paving floor'
    : (o.material.color && o.material.color.getHex() === 0x3f6b33) ? 'verge' : (o.material.color && o.material.color.getHex() === 0xf2f0ea && !map) ? 'edge line'
    : (map && map.image === TEX.asphalt.image) ? 'asphalt' : null);
  if (!name) return;
  const p = o.geometry.attributes.position, ix = o.geometry.index;
  const a = ix.getX(0), b = ix.getX(1), c = ix.getX(2);
  const ux = p.getX(b) - p.getX(a), uy = p.getY(b) - p.getY(a), uz = p.getZ(b) - p.getZ(a);
  const vx = p.getX(c) - p.getX(a), vy = p.getY(c) - p.getY(a), vz = p.getZ(c) - p.getZ(a);
  const ny = uz * vx - ux * vz;
  facing.push(name + ' faces ' + (ny > 0 ? 'UP' : 'DOWN'));
});
[...new Set(facing)].forEach(f => console.log('  ' + f));

`);
