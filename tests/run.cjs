// Headless smoke test: stub just enough of three.js to run world-gen + physics.
class V3 {
  setScalar(v) { this.x = this.y = this.z = v; return this; }
  fromBufferAttribute(a, i) { this.x = a.getX(i); this.y = a.getY(i); this.z = a.getZ(i); return this; }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  applyMatrix4() { return this; }
  // the stub has no real matrices; world position is carried on the object
  setFromMatrixPosition(m) { const p = (m && m.__pos) || { x: 0, y: 0, z: 0 }; return this.set(p.x, p.y, p.z); }
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { return this.set(v.x, v.y, v.z); }
  clone() { return new V3(this.x, this.y, this.z); }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  normalize() { const l = Math.hypot(this.x, this.y, this.z) || 1; return this.multiplyScalar(1 / l); }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
  project() { return this; }
}
class Col {
  setHex(h) { this.r = ((h >> 16) & 255) / 255; this.g = ((h >> 8) & 255) / 255; this.b = (h & 255) / 255; return this; }
  constructor(c = 0) { this.r = ((c >> 16) & 255) / 255; this.g = ((c >> 8) & 255) / 255; this.b = (c & 255) / 255; }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  clone() { const n = new Col(); return n.copy(this); }
  lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; }
  multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
}
/* A real-enough Box3: walks the hierarchy applying rotation and scale, so the
   orientation auto-fix can actually be verified rather than assumed. */
const M = {
  id: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
  rotX: t => [1, 0, 0, 0, Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t)],
  rotY: t => [Math.cos(t), 0, Math.sin(t), 0, 1, 0, -Math.sin(t), 0, Math.cos(t)],
  rotZ: t => [Math.cos(t), -Math.sin(t), 0, Math.sin(t), Math.cos(t), 0, 0, 0, 1],
  scale: (x, y, z) => [x, 0, 0, 0, y, 0, 0, 0, z],
  mul: (a, b) => {
    const o = new Array(9);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
    return o;
  },
  apply: (m, v) => ({
    x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
    y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
    z: m[6] * v.x + m[7] * v.y + m[8] * v.z
  })
};
class Box3 {
  constructor() { this.min = new V3(1e9, 1e9, 1e9); this.max = new V3(-1e9, -1e9, -1e9); }
  makeEmpty() { this.min = new V3(1e9, 1e9, 1e9); this.max = new V3(-1e9, -1e9, -1e9); return this; }
  expandByPoint(p) {
    this.min.x = Math.min(this.min.x, p.x); this.min.y = Math.min(this.min.y, p.y); this.min.z = Math.min(this.min.z, p.z);
    this.max.x = Math.max(this.max.x, p.x); this.max.y = Math.max(this.max.y, p.y); this.max.z = Math.max(this.max.z, p.z);
    return this;
  }
  union(b) { this.expandByPoint(b.min); this.expandByPoint(b.max); return this; }
  setFromObject(o) {
    this.min = new V3(1e9, 1e9, 1e9); this.max = new V3(-1e9, -1e9, -1e9);
    return this.expandByObject(o);
  }
  // three works in world space here, so ancestors have to be accounted for
  _ancestor(o) {
    const chain = [];
    let n = o.parent;
    while (n) { chain.unshift(n); n = n.parent; }
    let mtx = M.id(), off = { x: 0, y: 0, z: 0 };
    chain.forEach(a => {
      const wp = M.apply(mtx, a.position || { x: 0, y: 0, z: 0 });
      off = { x: off.x + wp.x, y: off.y + wp.y, z: off.z + wp.z };
      const r = a.rotation || {};
      if (r.x) mtx = M.mul(mtx, M.rotX(r.x));
      if (r.y) mtx = M.mul(mtx, M.rotY(r.y));
      if (r.z) mtx = M.mul(mtx, M.rotZ(r.z));
      const sc = a.scale || { x: 1, y: 1, z: 1 };
      if (sc.x !== 1 || sc.y !== 1 || sc.z !== 1) mtx = M.mul(mtx, M.scale(sc.x, sc.y, sc.z));
    });
    return { mtx, off };
  }
  _pt(p) {
    this.min.x = Math.min(this.min.x, p.x); this.max.x = Math.max(this.max.x, p.x);
    this.min.y = Math.min(this.min.y, p.y); this.max.y = Math.max(this.max.y, p.y);
    this.min.z = Math.min(this.min.z, p.z); this.max.z = Math.max(this.max.z, p.z);
  }
  expandByObject(root) {
    const walk = (n, mtx, off) => {
      const lp = n.position || { x: 0, y: 0, z: 0 };
      const wp = M.apply(mtx, lp);
      const org = { x: off.x + wp.x, y: off.y + wp.y, z: off.z + wp.z };
      let m2 = mtx;
      const r = n.rotation || {};
      if (r.x) m2 = M.mul(m2, M.rotX(r.x));
      if (r.y) m2 = M.mul(m2, M.rotY(r.y));
      if (r.z) m2 = M.mul(m2, M.rotZ(r.z));
      const sc = n.scale || { x: 1, y: 1, z: 1 };
      if (sc.x !== 1 || sc.y !== 1 || sc.z !== 1) m2 = M.mul(m2, M.scale(sc.x, sc.y, sc.z));
      const geo = n.geometry;
      if (geo && geo.attributes && geo.attributes.position) {
        const pa = geo.attributes.position;
        const idx = geo.index;
        const cnt = idx ? idx.count : pa.count;
        for (let q = 0; q < cnt; q++) {
          const vi = idx ? idx.getX(q) : q;
          const p = M.apply(m2, { x: pa.getX(vi), y: pa.getY(vi), z: pa.getZ(vi) });
          this._pt({ x: org.x + p.x, y: org.y + p.y, z: org.z + p.z });
        }
      }
      const sz = n.userData && n.userData.size;
      if (sz) {
        for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) for (const dz of [-0.5, 0.5]) {
          const c = M.apply(m2, { x: sz.x * dx, y: sz.y * dy, z: sz.z * dz });
          this._pt({ x: org.x + c.x, y: org.y + c.y, z: org.z + c.z });
        }
      }
      (n.children || []).forEach(c => walk(c, m2, org));
    };
    const a = this._ancestor(root);
    walk(root, a.mtx, a.off);
    return this;
  }
  getCenter(v) { v.set((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2, (this.min.z + this.max.z) / 2); return v; }
  getSize(v) { v.set(this.max.x - this.min.x, this.max.y - this.min.y, this.max.z - this.min.z); return v; }
}

class Obj {
  constructor() { this.children = []; this.position = new V3(); this.rotation = { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; } };
    this.scale = new V3(1, 1, 1); this.userData = {}; this.matrixWorld = {};
    this.quaternion = { copy() { return this; } }; }
  copy(v) { this.position.copy(v); return this; }
  add(...o) { o.forEach(c => { if (c.parent) c.parent.remove(c); c.parent = this; this.children.push(c); }); return this; }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) { this.children.splice(i, 1); o.parent = null; } }
  traverse(f) { f(this); this.children.forEach(c => c.traverse && c.traverse(f)); }
  clone(deep) {
    const n = new Obj();
    n.name = this.name; n.isMesh = this.isMesh; n.material = this.material;
    n.geometry = this.geometry;
    n.position = this.position.clone();
    n.userData = Object.assign({}, this.userData);
    if (deep) this.children.forEach(c => { const k = c.clone(true); k.parent = n; n.children.push(k); });
    return n;
  }
  rotateZ() { } rotateX() { } updateMatrixWorld() { }
  attach(o) { if (o.parent) o.parent.remove(o); o.parent = this; this.children.push(o); return this; }
}
class Geo {
  constructor() { this.attributes = { position: { count: 64, getX: () => 0, getY: () => 0, getZ: () => 0 } }; this.index = null; }
  setAttribute(n, a) { this.attributes[n] = a; return this; }
  setIndex(a) { this.index = a; return this; }
  computeBoundingSphere() { }
  computeBoundingBox() { }
  toNonIndexed() {
    const g = new Geo();
    g.attributes = { position: { array: new Float32Array(9), count: 3 }, normal: { array: new Float32Array(9), count: 3 } };
    return g;
  }
  computeVertexNormals() { } rotateX() { } translate() { } dispose() { } }
const Mat = function (o) {
  Object.assign(this, o || {});
  // three converts these to Color instances; the stub must too
  ['color', 'emissive', 'specular'].forEach(k => {
    if (typeof this[k] === 'number') this[k] = new Col(this[k]);
  });
};
class InstancedMesh extends Obj {
  constructor(g, m, n) { super(); this.count = n; this.instanceMatrix = { needsUpdate: false }; this.isInstancedMesh = true; }
  setMatrixAt() { }
}
class Mesh extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; this.isMesh = true; } }

global.THREE = {
  Vector3: V3, Color: Col, Group: Obj, Mesh, InstancedMesh,
  BufferGeometry: Geo, BoxGeometry: Geo, ConeGeometry: Geo, SphereGeometry: Geo,
  CylinderGeometry: Geo, PlaneGeometry: Geo, CircleGeometry: Geo, RingGeometry: Geo,
  DodecahedronGeometry: Geo, PointsGeometry: Geo, TorusGeometry: Geo, Box3,
  Float32BufferAttribute: class { constructor(a, i) { this.array = a; this.itemSize = i; this.needsUpdate = false; }
    setXYZ(i, x, y, z) { this.array[i * 3] = x; this.array[i * 3 + 1] = y; this.array[i * 3 + 2] = z; }
    setX(i, v) { this.array[i * this.itemSize] = v; } getX(i) { return this.array[i * this.itemSize]; }
    getY(i) { return this.array[i * 3 + 1]; } getZ(i) { return this.array[i * 3 + 2]; } },
  BufferAttribute: class { constructor(a, i) { this.array = a; this.itemSize = i; this.needsUpdate = false;
      this.count = a.length / i; }
    setXYZ(i, x, y, z) { this.array[i * 3] = x; this.array[i * 3 + 1] = y; this.array[i * 3 + 2] = z; }
    setX(i, v) { this.array[i * this.itemSize] = v; } getX(i) { return this.array[i * this.itemSize]; }
    getY(i) { return this.array[i * 3 + 1]; } getZ(i) { return this.array[i * 3 + 2]; } },
  MeshStandardMaterial: Mat, MeshBasicMaterial: Mat, ShaderMaterial: Mat,
  Matrix4: class { compose() { return this; } makeScale() { return this; } setPosition() { return this; } },
  Quaternion: class { setFromEuler() { return this; } setFromAxisAngle() { return this; }
    setFromUnitVectors() { return this; } multiply() { return this; } slerp() { return this; } },
  Euler: class { set() { return this; } },
  PointLight: Obj, SpotLight: class extends Obj { constructor() { super(); this.target = new Obj(); } },
  DirectionalLight: Obj, HemisphereLight: Obj, Points: Mesh,
  CanvasTexture: class { constructor(c) { this.image = c; this.repeat = { set() { } }; }
    clone() { return new (this.constructor)(this.image); } },
  LineSegments: Mesh, Line: Mesh, LineBasicMaterial: Mat,
  RepeatWrapping: 1000, EquirectangularReflectionMapping: 303,
  FogExp2: class { }, PerspectiveCamera: Obj, Scene: Obj,
  DoubleSide: 2, BackSide: 1, sRGBEncoding: 1, ACESFilmicToneMapping: 1, PCFSoftShadowMap: 1
};


/* ---- minimal DOM so the UI layer can be exercised ---- */
function noop() { }
function anyObj() {
  return new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : (typeof k === 'string' ? () => anyObj() : undefined)),
    set: (t, k, v) => (t[k] = v, true)
  });
}
const ctx2d = anyObj;
function el() {
  const o = {
    style: {}, dataset: {}, children: [], value: '', textContent: '', innerHTML: '',
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild: noop, remove: noop, setAttribute: noop, getAttribute: () => '',
    addEventListener: noop, getContext: ctx2d, onclick: null, oninput: null
  };
  o.firstElementChild = { style: {}, classList: o.classList };
  return new Proxy(o, {
    get: (t, k) => (k in t ? t[k] : noop),
    set: (t, k, v) => (t[k] = v, true)
  });
}
const _els = {};
global.document = {
  createElement: () => el(),
  getElementById: id => (_els[id] = _els[id] || el()),
  querySelector: () => null,
  querySelectorAll: () => []
};
global.addEventListener = noop;
global.innerWidth = 1440; global.innerHeight = 900; global.devicePixelRatio = 2;
global.requestAnimationFrame = noop;
global.setTimeout = (f) => 0;
global.performance = global.performance || { now: () => Date.now() };
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const src = fs.readdirSync(srcDir).filter(f => /^\d\d-.*\.js$/.test(f)).sort()
  .map(f => fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n')
  .replace(/\nboot\(\);\s*$/, '\n');
// strip 'use strict' so we can eval into this scope with vars visible
global.world = new Obj();
global.onImpact = () => { };
const body = fs.readFileSync(path.join(__dirname, 'suite.js'), 'utf8');
eval(src.replace("'use strict';", '') + '\n' + body);
