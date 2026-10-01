/* ============================================================
   Part 3: cars, drivetrain, physics, camera, sound
   ============================================================ */

/* shape: len, wid, hgt(body), cabinLen, cabinOff, cabinH, nose(taper), wheelbase,
   track, wheelR, wheelW, wing (0 none,1 lip,2 duckbill,3 GT), pop (pop-up lights) */
/* Each car is specified by feel — top speed, 0-100 time, gear count — and the
   gearing and torque curve are solved to match, rather than tuned by hand. */
const CARS = [
  { id: 0, lvl: 6, name: 'Vanguard GT-X',
    blurb: 'Boxy, all-wheel drive, endlessly forgiving. The shop car.',
    mass: 1480, grip: 1.24, stab: 1.10, drive: 'awd', gears: 5, topKmh: 236, accel: 3.9,
    redline: 8000, idle: 900, peakTq: 436, peakRpm: 4400, nitroReady: true,
    shape: { len: 4.55, wid: 1.76, hgt: 0.72, cabLen: 2.0, cabOff: -0.1, cabH: 0.58, nose: 0.86, wb: 2.6, track: 1.5, wr: 0.36, ww: 0.26, wing: 2 },
    col: 0x2f4f7f },
  { id: 1, lvl: 2, name: 'Sable 200 Turbo',
    blurb: 'Light, rear-drive and sharper than the shop car in every direction.',
    mass: 1210, grip: 1.05, stab: 0.95, drive: 'rwd', gears: 5, topKmh: 196, accel: 5.2,
    redline: 7800, idle: 850, peakTq: 284, peakRpm: 4200, nitroReady: false,
    shape: { len: 4.5, wid: 1.69, hgt: 0.66, cabLen: 1.9, cabOff: -0.15, cabH: 0.5, nose: 0.7, wb: 2.47, track: 1.44, wr: 0.34, ww: 0.24, wing: 1, pop: true },
    col: 0xf2ede2 },
  { id: 2, lvl: 1, name: 'Kestrel 1600 Coupe',
    blurb: 'Barely any weight and a screaming rebuild. Turns in like nothing else so far.',
    mass: 950, grip: 1.00, stab: 0.95, drive: 'rwd', gears: 5, topKmh: 185, accel: 5.6,
    redline: 8200, idle: 900, peakTq: 187, peakRpm: 5200, nitroReady: false,
    shape: { len: 4.2, wid: 1.63, hgt: 0.62, cabLen: 1.8, cabOff: -0.05, cabH: 0.5, nose: 0.62, wb: 2.4, track: 1.36, wr: 0.32, ww: 0.21, wing: 1, pop: true },
    col: 0xf5f5f2 },
  { id: 3, lvl: 5, name: 'Corsair Rotary R3',
    blurb: 'Rotary revs, a low nose, and the first car with a nitrous bottle.',
    mass: 1270, grip: 1.20, stab: 1.02, drive: 'rwd', gears: 5, topKmh: 228, accel: 4.2,
    redline: 8200, idle: 950, peakTq: 356, peakRpm: 5000, nitroReady: true,
    shape: { len: 4.28, wid: 1.76, hgt: 0.58, cabLen: 1.75, cabOff: -0.2, cabH: 0.46, nose: 0.5, wb: 2.42, track: 1.48, wr: 0.35, ww: 0.27, wing: 2, pop: true },
    col: 0xd8dde2 },
  { id: 4, lvl: 4, offroad: 1.9, name: 'Talon Rally IV',
    blurb: 'All-wheel drive that claws its way out of dirt. Made for the cut-throughs.',
    mass: 1360, grip: 1.16, stab: 1.16, drive: 'awd', gears: 5, topKmh: 220, accel: 4.5,
    redline: 7800, idle: 950, peakTq: 362, peakRpm: 3800, nitroReady: true,
    shape: { len: 4.35, wid: 1.77, hgt: 0.78, cabLen: 2.1, cabOff: 0, cabH: 0.62, nose: 0.9, wb: 2.51, track: 1.51, wr: 0.35, ww: 0.25, wing: 3 },
    col: 0xe4e9ee },
  { id: 5, lvl: 10, driftCtrl: false, name: 'Halcyon V10 Circuit',
    blurb: 'A V10 that revs to nine and sounds like nothing else on the island.',
    mass: 1480, grip: 1.5, stab: 1.45, drive: 'rwd', gears: 6, topKmh: 288, accel: 2.8,
    redline: 9000, idle: 950, peakTq: 730, peakRpm: 6800, nitroReady: true,
    shape: { len: 4.51, wid: 1.9, hgt: 0.64, cabLen: 1.8, cabOff: -0.2, cabH: 0.5, nose: 0.56, wb: 2.61, track: 1.58, wr: 0.37, ww: 0.31, wing: 2 },
    col: 0xf2f2f0 },
  { id: 6, lvl: 3, name: 'Meridian Sprint V6',
    blurb: 'Mid-engined balance. The most precise thing in the lock-up.',
    mass: 1270, grip: 1.10, stab: 1.06, drive: 'rwd', gears: 6, topKmh: 210, accel: 4.8,
    redline: 8500, idle: 1000, peakTq: 282, peakRpm: 5300, nitroReady: false,
    shape: { len: 4.43, wid: 1.81, hgt: 0.54, cabLen: 1.6, cabOff: 0.15, cabH: 0.44, nose: 0.44, wb: 2.53, track: 1.52, wr: 0.35, ww: 0.3, wing: 2, pop: true },
    col: 0xe8d24a },
  { id: 7, lvl: 8, name: 'Vanguard GT-X Series II',
    blurb: 'The GT-X grown up: stiffer, faster, still happy to be thrown around.',
    mass: 1560, grip: 1.36, stab: 1.22, drive: 'awd', gears: 6, topKmh: 252, accel: 3.4,
    redline: 8200, idle: 950, peakTq: 511, peakRpm: 4400, nitroReady: true,
    shape: { len: 4.6, wid: 1.79, hgt: 0.74, cabLen: 2.0, cabOff: -0.1, cabH: 0.56, nose: 0.8, wb: 2.67, track: 1.55, wr: 0.37, ww: 0.31, wing: 3 },
    col: 0x9fb6c9 },
  { id: 8, lvl: 7, name: 'Sable 250 Fox',
    blurb: 'Shop-built drift car. Huge steering angle and a bottle to match.',
    mass: 1240, grip: 1.28, stab: 1.00, drive: 'rwd', gears: 6, topKmh: 244, accel: 3.7,
    redline: 8600, idle: 1000, peakTq: 405, peakRpm: 4200, nitroReady: true,
    shape: { len: 4.44, wid: 1.72, hgt: 0.62, cabLen: 1.85, cabOff: -0.15, cabH: 0.48, nose: 0.56, wb: 2.53, track: 1.5, wr: 0.34, ww: 0.29, wing: 3, angle: 1.35 },
    col: 0xe8622a },
  { id: 9, lvl: 9, driftCtrl: false, name: 'Vanguard Apex Courier-spec',
    blurb: 'The reward car. Delivers a tray at 280 and keeps the broth level.',
    mass: 1740, grip: 1.44, stab: 1.38, drive: 'awd', gears: 6, topKmh: 268, accel: 3.0,
    redline: 7100, idle: 850, peakTq: 771, peakRpm: 3600, nitroReady: true,
    shape: { len: 4.67, wid: 1.9, hgt: 0.7, cabLen: 1.95, cabOff: -0.05, cabH: 0.54, nose: 0.62, wb: 2.78, track: 1.6, wr: 0.38, ww: 0.33, wing: 3 },
    col: 0x36414d }
];

/* First gear should be short enough that you actually use the gearbox. */
const GEAR_FIRST_KMH = 38;
function buildGearing(c) {
  c.wr0 = c.shape.wr;                       // drivetrain uses the unscaled wheel
  const k = c.redline / 60 * TAU * c.wr0;
  const tot1 = k / (GEAR_FIRST_KMH / 3.6);  // total reduction for first
  const totN = k / (c.topKmh / 3.6 * 1.02); // ...and for top gear
  c.final = totN / 0.78;
  c.ratios = [];
  for (let i = 0; i < c.gears; i++) {
    const t = i / (c.gears - 1);
    c.ratios.push((tot1 * Math.pow(totN / tot1, t)) / c.final);
  }
}
CARS.forEach(buildGearing);

const PAINTS = [0x2f4f7f, 0xc8453c, 0xf7ecd6, 0x1e232b, 0x82a25c, 0xf3b545, 0xe8622a, 0x7a5a8c,
  0x2e7d76, 0xd8dde2, 0x8a3b52, 0x3b5f3b];
const RIMS = [0xd7d2c6, 0x3a3f47, 0xc9a227, 0xa8b2bd, 0xc8453c, 0x1a1d22];

/* ============================================================
   Optional glTF / GLB car models
   Files are fetched relative to the page; a missing file falls back to the
   built-in bodywork. Per entry: rotY, scale, upZ, paint, alt.
   ============================================================ */

/* Credits for third-party models, shown in the in-game credits panel. Subject
   is the model's own title, which is what the licences require to be credited.
   An empty artist or licence is flagged in the panel rather than omitted.

   Several models are NonCommercial: this build must stay free of advertising,
   sponsorship and payment. Three are also ShareAlike, so a modified copy of
   those files (a compressed or simplified version) must be published under the
   same licence. */
const MODEL_CREDITS = [
  { file: 'car-kestrel-1600.glb',    subject: 'Toyota Corolla AE86 Trueno',
    artist: 'Lexyc16', licence: 'CC BY 4.0', url: 'https://skfb.ly/o8CNI' },
  { file: 'car-sable-200.glb',       subject: 'Nissan Silvia S13 [Updated]',
    artist: 'Lexyc16', licence: 'CC BY-NC 4.0', url: '' },
  { file: 'car-meridian-sprint.glb', subject: 'Honda NSX 1990',
    artist: 'Lexyc16', licence: 'CC BY 4.0', url: 'https://skfb.ly/6WFwI' },
  { file: 'car-talon-rally.glb',     subject: '2006 Mitsubishi Lancer Evolution IX MR',
    artist: 'Ddiaz Design', licence: 'CC BY-NC-SA 4.0', url: '' },
  { file: 'car-corsair-r3.glb',      subject: 'Mazda RX-7 FD',
    artist: 'Lexyc16', licence: 'CC BY 4.0', url: 'https://skfb.ly/6SKZr' },
  { file: 'car-vanguard-gtx.glb',    subject: 'Nissan Skyline (R32) GT-R',
    artist: 'Lexyc16', licence: 'CC BY-NC 4.0', url: 'https://sketchfab.com/3d-models/nissan-skyline-r32-gt-r-8810e677eca543a6b840cf67dd064aa4' },
  { file: 'car-sable-250.glb',       subject: '2002 Nissan Silvia S15 Spec R Aero',
    artist: 'Ddiaz Design', licence: 'CC BY-NC-SA 4.0', url: 'https://skfb.ly/pA6yn' },
  { file: 'car-vanguard-gtx-ii.glb', subject: 'Nissan Skyline R34 GT-R',
    artist: 'Lexyc16', licence: 'CC BY 4.0', url: 'https://skfb.ly/6TxFX' },
  { file: 'car-vanguard-apex.glb',   subject: '2017 Nissan Aimgain GT R35 GT-R Type 2',
    artist: 'Outlaw Games', licence: 'CC BY-NC 4.0', url: 'https://skfb.ly/p9KQu' },
  { file: 'car-halcyon-v10.glb',     subject: '2012 Lexus LFA Nurburgring Package',
    artist: 'Ddiaz Design', licence: 'CC BY-NC-SA 4.0', url: 'https://skfb.ly/prwLy' },
  { file: 'roads-tileset.glb',       subject: 'Roads & bridges tileset pack',
    artist: '', licence: '', url: '' }
];

/* Software the game is built on, credited the same way. */
const SOFTWARE_CREDITS = [
  { subject: 'three.js (r128)', artist: 'mrdoob and contributors', licence: 'MIT', url: 'https://threejs.org' }
];

const CAR_MODELS = {
  // Drop these .glb files next to the page and serve over http (npx serve .).
  // Files live in models/. Options per entry: rotY (radians), scale (number or
  // 'auto'), upZ (force the up-axis fix), paint (regex for the body material).
  0: { url: 'car-vanguard-gtx.glb' },
  1: { url: 'car-sable-200.glb' },
  2: { url: 'car-kestrel-1600.glb' },
  3: { url: 'car-corsair-r3.glb' },
  4: { url: 'car-talon-rally.glb' },
  5: { url: 'car-halcyon-v10.glb' },
  6: { url: 'car-meridian-sprint.glb' },
  7: { url: 'car-vanguard-gtx-ii.glb' },
  8: { url: 'car-sable-250.glb' },
  9: { url: 'car-vanguard-apex.glb' }
};

const CAR_MODEL_CACHE = {};
let gltfLoader = null;

/* Fetch the model before handing bytes to the loader. Doing it this
   way means we can tell a 404 from a CORS block from an HTML error page being
   served in place of the file, instead of reporting "could not load". */
/* Models live in one place: a models/ folder beside the page. */
const MODEL_DIR = 'models/';
function modelPath(url) { return MODEL_DIR + url.split('/').pop(); }

function fetchModelBytes(cfg) {
  const tried = [];
  const list = [modelPath(cfg.url)];
  let i = 0;
  function next() {
    if (i >= list.length) return Promise.resolve({ error: true, tried });
    const url = list[i++];
    const abs = new URL(url, location.href).href;
    return fetch(url).then(res => {
      if (!res.ok) { tried.push(url + ' -> HTTP ' + res.status); return next(); }
      return res.arrayBuffer().then(buf => {
        const head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
        const magic = String.fromCharCode.apply(null, head);
        const isJson = /\.gltf($|\?)/i.test(url) || magic.trim().charAt(0) === '{';
        if (magic !== 'glTF' && !isJson) {
          tried.push(url + ' -> not a model (server sent ' +
            (res.headers.get('content-type') || 'unknown type') + ', ' + buf.byteLength + ' bytes)');
          return next();
        }
        return { buf, url, abs, isJson, size: buf.byteLength };
      });
    }).catch(e => { tried.push(url + ' -> ' + e.message); return next(); });
  }
  return next();
}

function getGltfLoader() {
  if (!gltfLoader) {
    gltfLoader = new THREE.GLTFLoader();
    if (typeof THREE.DRACOLoader === 'function') {
      const draco = new THREE.DRACOLoader();
      // Served from our own origin by default so the page needs no third-party
      // requests and can run under a strict content-security policy. The
      // single-file build overrides this with a CDN path.
      draco.setDecoderPath(typeof window !== 'undefined' && window.DRACO_PATH ? window.DRACO_PATH : 'vendor/draco/');
      gltfLoader.setDRACOLoader(draco);
    }
  }
  return gltfLoader;
}

/* Pull the straight road tile out of the pack and bake it into our axes. */
function loadTileset() {
  if (!TILESET.url || typeof THREE.GLTFLoader !== 'function') return Promise.resolve(false);
  if (location.protocol === 'file:') return Promise.resolve(false);
  return fetchModelBytes({ url: TILESET.url }).then(got => {
    if (!got || got.error) {
      console.warn('[noodles] tileset paths tried:\n  ' + (got ? got.tried.join('\n  ') : ''));
      modelProblem('tileset "' + TILESET.url + '" not found — keeping the painted roads');
      return false;
    }
    const dir = got.url.slice(0, got.url.lastIndexOf('/') + 1);
    return new Promise(resolve => {
      getGltfLoader().parse(got.isJson ? new TextDecoder().decode(got.buf) : got.buf, dir, gltf => {
        const tiles = {};
        gltf.scene.traverse(o => { if (o.isMesh) tiles[o.name] = o; });
        const t = tiles[TILESET.road];
        if (!t) {
          modelProblem('tile "' + TILESET.road + '" is not in the pack (' +
            Object.keys(tiles).length + ' tiles found)');
          console.info('[noodles] tiles in pack:', Object.keys(tiles));
          resolve(false);
          return;
        }
        TILE_GEO = t.geometry.clone();
        TILE_GEO.rotateX(-Math.PI / 2);      // the pack is Z-up
        TILE_MAT = t.material;
        if (TILE_MAT.map) { TILE_MAT.map.encoding = THREE.sRGBEncoding; }
        TILE_MAT.envMap = ENV;
        TILE_MAT.envMapIntensity = 0.35;
        TILE_MAT.roughness = TILE_MAT.roughness === undefined ? 0.85 : TILE_MAT.roughness;
        TILE_MAT.needsUpdate = true;
        console.info('[noodles] tileset loaded: ' + Object.keys(tiles).length + ' tiles, using ' + TILESET.road);
        resolve(true);
      }, err => {
        modelProblem('tileset could not be parsed: ' + ((err && err.message) || err));
        resolve(false);
      });
    });
  });
}

function loadCarModel(id) {
  const cfg = CAR_MODELS[id];
  if (!cfg) return Promise.resolve(null);
  if (typeof THREE.GLTFLoader !== 'function') {
    modelProblem('GLTFLoader script did not load — check the <script> tags below three.js.');
    return Promise.resolve(null);
  }
  if (location.protocol === 'file:') {
    modelProblem('Page opened from file://. Models cannot load this way — run "npx serve ." and open the localhost address.');
    return Promise.resolve(null);
  }
  if (CAR_MODEL_CACHE[id]) return Promise.resolve(CAR_MODEL_CACHE[id]);

  getGltfLoader();

  return fetchModelBytes(cfg).then(got => {
    if (!got || got.error) {
      console.warn('[noodles] model not found. Paths tried, relative to ' + location.href + ':\n  ' +
        got.tried.join('\n  '));
      if (typeof CAR_MODEL_PRESENT !== 'undefined') CAR_MODEL_PRESENT[cfg.url] = false;
      modelProblem('Model not found: ' + MODEL_DIR + cfg.url +
        ' — check the file is in the models/ folder and the name matches.');
      return null;
    }
    console.info('[noodles] fetched ' + got.abs + ' (' + (got.size / 1e6).toFixed(2) + ' MB)');
    // remember which files actually arrived, so the credits list matches
    if (typeof CAR_MODEL_PRESENT !== 'undefined') CAR_MODEL_PRESENT[cfg.url] = true;
    const dir = got.url.slice(0, got.url.lastIndexOf('/') + 1);
    return new Promise(resolve => {
      try {
        gltfLoader.parse(got.isJson ? new TextDecoder().decode(got.buf) : got.buf, dir,
          gltf => { CAR_MODEL_CACHE[id] = gltf.scene; resolve(gltf.scene); },
          err => {
            const msg = (err && (err.message || err)) + '';
            modelProblem('file loaded but could not be parsed: ' + msg.slice(0, 90));
            console.warn('[noodles] parse failed', err);
            resolve(null);
          });
      } catch (e) {
        modelProblem('parser threw: ' + e.message.slice(0, 90));
        console.warn('[noodles]', e);
        resolve(null);
      }
    });
  });
}

/* Surface model problems on screen — nobody thinks to open the console. */
function modelProblem(msg) {
  console.warn('[noodles] ' + msg);
  if (typeof toast === 'function') toast('Model: ' + msg, 'bad');
}

/* Print the node tree of a loaded model. Call dumpCarModel(0) from the console
   when the wheels aren't being found and you need to see the actual names. */
function dumpCarModel(id) {
  const root = CAR_MODEL_CACHE[id === undefined ? S.carId : id];
  if (!root) { console.log('[noodles] no model loaded for that car'); return; }
  const box = new THREE.Box3(), v = new THREE.Vector3();
  const rows = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    preciseBox(o, box); box.getSize(v);
    rows.push({
      node: o.name || '(unnamed)',
      material: (o.material && o.material.name) || '',
      tris: o.geometry && o.geometry.index ? o.geometry.index.count / 3 : '?',
      size: `${v.x.toFixed(2)} x ${v.y.toFixed(2)} x ${v.z.toFixed(2)}`
    });
  });
  console.table(rows);
  return rows;
}

const WHEEL_RE = /wheel|tire|tyre|rim|hub|brake|caliper|disc|rotor|rubber|rueda|roue|reifen/i;

/* Build a geometry containing only the given triangles, with its own vertex
   buffers, so its bounding box describes just that piece. */
function compactGeometry(geo, indices) {
  const out = new THREE.BufferGeometry();
  const remap = new Map();
  const newIndex = new Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const old = indices[i];
    let n = remap.get(old);
    if (n === undefined) { n = remap.size; remap.set(old, n); }
    newIndex[i] = n;
  }
  const order = new Array(remap.size);
  remap.forEach((n, old) => { order[n] = old; });
  Object.keys(geo.attributes).forEach(name => {
    const src = geo.attributes[name];
    const size = src.itemSize;
    const arr = new Float32Array(order.length * size);
    for (let i = 0; i < order.length; i++) {
      const o = order[i];
      for (let c = 0; c < size; c++) arr[i * size + c] = src.array[o * size + c];
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size, src.normalized));
  });
  out.setIndex(new THREE.BufferAttribute(
    order.length > 65535 ? new Uint32Array(newIndex) : new Uint16Array(newIndex), 1));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

const CALIPER_RE = /caliper|calliper|pad|shield|dust/i;

/* An object's true extent, taken from its vertices. Box3.setFromObject expands
   each geometry's own box by the node transform, which overshoots badly on
   models whose parts are rotated: one car measured 8.7 m tall with nothing
   above knee height. */
const _pbV = new THREE.Vector3();
function preciseBox(obj, target) {
  const box = target || new THREE.Box3();
  box.makeEmpty();
  obj.updateMatrixWorld(true);
  obj.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const p = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(p.count / 3000));
    for (let i = 0; i < p.count; i += step) {
      _pbV.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      box.expandByPoint(_pbV);
    }
    if (p.count) {
      _pbV.fromBufferAttribute(p, p.count - 1).applyMatrix4(o.matrixWorld);
      box.expandByPoint(_pbV);
    }
  });
  // nothing readable (a geometry without position data): fall back
  if (box.min.x > box.max.x) box.setFromObject(obj);
  return box;
}

/* Car paint is a clearcoat over pigment, not metal. Metalness tints reflections
   with the base colour and drops the diffuse term, which reads as brushed
   metal; a dielectric surface with low roughness reflects the sky cleanly and
   keeps its own colour. */
function paintFinish(mat, cz) {
  const matte = cz.finish === 'matte', pearl = cz.finish === 'pearl';
  mat.color = new THREE.Color(cz.body);
  mat.metalness = matte ? 0.04 : (pearl ? 0.22 : 0.06);
  mat.roughness = matte ? 0.55 : (pearl ? 0.13 : 0.08);
  mat.envMap = ENV;
  mat.envMapIntensity = matte ? 0.55 : (pearl ? 2.0 : 1.7);
  mat.needsUpdate = true;
  return mat;
}

/* Rim spokes, hub caps and brake detail are often named nothing like a wheel,
   so they stay on the body and sit still while the tyre turns. Anything left
   over that lies inside a wheel is claimed by it. */
function claimWheelStrays(root, wheels, info) {
  if (!wheels.length) return;
  const seats = wheels.map(w => ({
    w: w,
    p: new THREE.Vector3().setFromMatrixPosition(w.hub.matrixWorld),
    r: (w.hub.userData.radius || 0.3) * 0.92
  }));
  const loose = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    for (let n = o.parent; n; n = n.parent) if (n.userData.isWheel) return;   // already on a wheel
    loose.push(o);
  });
  let claimed = 0;
  const c = new THREE.Vector3();
  const sz = new THREE.Vector3();
  loose.forEach(o => {
    const box = preciseBox(o);
    box.getCenter(c);
    box.getSize(sz);
    const seat = seats.find(s => c.distanceTo(s.p) < s.r);
    if (!seat) return;
    // must actually fit in the wheel: a fender or arch liner can be centred on
    // the wheel and would then spin with it
    if (Math.max(sz.y, sz.z) > seat.r * 2.1 || sz.x > seat.r * 1.6) return;
    (CALIPER_RE.test(o.name || '') ? seat.w.steer : seat.w.straight).attach(o);
    claimed++;
  });
  if (claimed) info.notes.push('claimed ' + claimed + ' loose part(s) into the wheels');
}

/* Wheel detection. Names are unreliable across models, so candidates are found
   by name where possible and otherwise by shape: round profile, narrow across
   the car, and clustered symmetrically at four corners. */
function wheelMeshKind(mesh, carBox, carSize) {
  const geo = mesh.geometry;
  if (!geo || !geo.attributes || !geo.attributes.position) return null;
  const bb = preciseBox(mesh);
  const s = bb.getSize(new THREE.Vector3());
  const c = bb.getCenter(new THREE.Vector3());
  const carC = carBox.getCenter(new THREE.Vector3());
  const lowLimit = carBox.min.y + carSize.y * 0.5;
  const dia = carSize.z;

  // one wheel: round in the length/height plane, thin across the car, low down
  const round = Math.min(s.y, s.z) > 1e-4 && Math.max(s.y, s.z) / Math.min(s.y, s.z) < 1.4;
  if (round && s.x < Math.max(s.y, s.z) * 0.85 &&
      s.y > dia * 0.06 && s.y < dia * 0.30 && c.y < lowLimit) {
    return 'single';
  }

  // four merged wheels: spans the car, but its low geometry forms four
  // balanced, compact, circular corner clusters
  if (s.x < carSize.x * 0.5 || s.z < carSize.z * 0.3) return null;
  const pos = geo.attributes.position, idx = geo.index;
  const n = idx ? idx.count : pos.count;
  if (n < 60) return null;
  mesh.updateMatrixWorld(true);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Vector3();
  const q = { LF: [], RF: [], LB: [], RB: [] };
  let low = 0;
  for (let i = 0; i < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld);
    cc.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld);
    const y = (a.y + b.y + cc.y) / 3;
    if (y > lowLimit) continue;
    low++;
    const x = (a.x + b.x + cc.x) / 3, z = (a.z + b.z + cc.z) / 3;
    q[(x < carC.x ? 'L' : 'R') + (z < carC.z ? 'B' : 'F')].push(x, y, z);
  }
  if (low < 60) return null;
  const keys = ['LF', 'RF', 'LB', 'RB'];
  let ok = true;
  keys.forEach(k => {
    const arr = q[k];
    if (arr.length / 3 < low * 0.12) { ok = false; return; }      // balanced corners
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < arr.length; i += 3) {
      x0 = Math.min(x0, arr[i]); x1 = Math.max(x1, arr[i]);
      y0 = Math.min(y0, arr[i + 1]); y1 = Math.max(y1, arr[i + 1]);
      z0 = Math.min(z0, arr[i + 2]); z1 = Math.max(z1, arr[i + 2]);
    }
    const h = y1 - y0, d = z1 - z0, w = x1 - x0;
    if (h < dia * 0.05 || h > dia * 0.32) ok = false;              // wheel-sized
    if (Math.max(h, d) / Math.max(Math.min(h, d), 1e-4) > 1.7) ok = false;  // round
    if (w > Math.max(h, d) * 1.1) ok = false;                      // narrow across
  });
  return ok ? 'merged' : null;
}

/* Wheelbase measured off the model, which is a far better scale reference than
   the bounding box: plenty of models carry stray geometry that inflates the box. */
/* Quadrant centres of a mesh that holds all four wheels at once, so a merged
   model can be measured the same way a separate-wheel one is. */
function mergedWheelCentres(mesh, carBox, carSize) {
  const carC = carBox.getCenter(new THREE.Vector3());
  const lowLimit = carBox.min.y + carSize.y * 0.5;
  const pos = mesh.geometry.attributes.position, idx = mesh.geometry.index;
  const n = idx ? idx.count : pos.count;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const acc = {};
  mesh.updateMatrixWorld(true);
  for (let i = 0; i < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
    a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld);
    const y = (a.y + b.y + c.y) / 3;
    if (y > lowLimit) continue;
    const x = (a.x + b.x + c.x) / 3, z = (a.z + b.z + c.z) / 3;
    const k = (x < carC.x ? 'L' : 'R') + (z < carC.z ? 'B' : 'F');
    const e = acc[k] || (acc[k] = { x: 0, y: 0, z: 0, n: 0 });
    e.x += x; e.y += y; e.z += z; e.n++;
  }
  return Object.keys(acc).map(k => {
    const e = acc[k];
    return new THREE.Vector3(e.x / e.n, e.y / e.n, e.z / e.n);
  });
}

function detectWheelbase(root, carBox, carSize) {
  const cands = [];
  const centres = [];
  let minYExtra = 1e9;
  root.traverse(o => {
    if (!o.isMesh) return;
    const kind = wheelMeshKind(o, carBox, carSize);
    if (kind === 'single') cands.push(o);
    else if (kind === 'merged') {
      mergedWheelCentres(o, carBox, carSize).forEach(v => centres.push(v));
      minYExtra = Math.min(minYExtra, preciseBox(o).min.y);
    }
  });
  if (cands.length < 3 && centres.length >= 3) {
    const carC = carBox.getCenter(new THREE.Vector3());
    const f = centres.filter(v => v.z > carC.z), bk = centres.filter(v => v.z <= carC.z);
    if (!f.length || !bk.length) return null;
    const avg = (arr, key) => arr.reduce((s, v) => s + v[key], 0) / arr.length;
    const wb = Math.abs(avg(f, 'z') - avg(bk, 'z'));
    if (wb < carSize.z * 0.5 || wb > carSize.z * 0.8) return null;
    return { wb: wb, groundY: minYExtra, midX: avg(centres, 'x'), midZ: avg(centres, 'z') };
  }
  if (cands.length < 3) return null;
  const carC = carBox.getCenter(new THREE.Vector3());
  const zs = [];
  let minY = 1e9, sumX = 0;
  cands.forEach(o => {
    const bb = preciseBox(o);
    const c = bb.getCenter(new THREE.Vector3());
    zs.push(c.z);
    minY = Math.min(minY, bb.min.y);
    sumX += c.x;
  });
  const front = zs.filter(z => z > carC.z), back = zs.filter(z => z <= carC.z);
  if (!front.length || !back.length) return null;
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const wb = Math.abs(avg(front) - avg(back));
  // A car's wheelbase is a predictable fraction of its length. Outside this band
  // the "wheels" are something else and the measurement can't be trusted.
  if (wb < carSize.z * 0.5 || wb > carSize.z * 0.8) return null;
  return { wb: wb, groundY: minY, midX: sumX / cands.length, midZ: avg(zs) };
}

function splitMergedWheels(root, spec, info) {
  const carBox = preciseBox(root);
  const carC = carBox.getCenter(new THREE.Vector3());
  const carSize = carBox.getSize(new THREE.Vector3());
  const yLimit = carBox.min.y + carSize.y * 0.55;

  const corners = { LF: [], RF: [], LB: [], RB: [] };
  const meshes = [];
  root.traverse(o => { if (o.isMesh) meshes.push(o); });

  // name first, geometry second — geometry is what saves the models that call
  // everything Material.003
  const named = meshes.filter(o => WHEEL_RE.test((o.name || '') + ' ' + ((o.material && o.material.name) || '')));
  const shaped = meshes.filter(o => wheelMeshKind(o, carBox, carSize));
  // A name match can land on trim that happens to contain "disc" or "rim", so
  // sanity-check the wheelbase it implies and take the shape-based set instead
  // when the names produce something a car could not have.
  const plausible = list => {
    if (!list.length) return false;
    let fz = [], bz = [];
    list.forEach(o => {
      const c = preciseBox(o).getCenter(new THREE.Vector3());
      (c.z > carC.z ? fz : bz).push(c.z);
    });
    if (!fz.length || !bz.length) return false;
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    const wb = Math.abs(avg(fz) - avg(bz));
    return wb > carSize.z * 0.45 && wb < carSize.z * 0.85;
  };
  let cands, how;
  if (plausible(named)) { cands = named; how = 'by name'; }
  else if (plausible(shaped)) { cands = shaped; how = 'by shape'; }
  else if (named.length) { cands = named; how = 'by name (unverified)'; }
  else { cands = shaped; how = 'by shape (unverified)'; }
  if (cands.length) info.notes.push('wheels found ' + how);

  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  cands.forEach(mesh => {
    const box = preciseBox(mesh);
    const size = box.getSize(new THREE.Vector3());
    const merged = size.x > carSize.x * 0.5 && size.z > carSize.z * 0.3;
    if (!merged) {
      const ctr = box.getCenter(new THREE.Vector3());
      corners[(ctr.x < carC.x ? 'L' : 'R') + (ctr.z < carC.z ? 'B' : 'F')].push(mesh);
      return;
    }

    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const index = geo.index;
    const n = index ? index.count : pos.count;
    const buckets = { LF: [], RF: [], LB: [], RB: [] };
    const keep = [];
    mesh.updateMatrixWorld(true);
    for (let i = 0; i < n; i += 3) {
      const i0 = index ? index.getX(i) : i;
      const i1 = index ? index.getX(i + 1) : i + 1;
      const i2 = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld);
      const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3;
      if (cy > yLimit) { keep.push(i0, i1, i2); continue; }
      buckets[(cx < carC.x ? 'L' : 'R') + (cz < carC.z ? 'B' : 'F')].push(i0, i1, i2);
    }

    let made = 0;
    Object.keys(buckets).forEach(key => {
      const list = buckets[key];
      if (list.length < 3) return;
      const g2 = compactGeometry(geo, list);
      const piece = new THREE.Mesh(g2, mesh.material);
      piece.name = (mesh.name || 'wheel') + '_' + key;
      piece.castShadow = true;
      piece.frustumCulled = false;
      piece.position.copy(mesh.position);
      piece.quaternion.copy(mesh.quaternion);
      piece.scale.copy(mesh.scale);
      mesh.parent.add(piece);
      corners[key].push(piece);
      made++;
    });

    if (made) {
      info.notes.push('split ' + ((mesh.material && mesh.material.name) || mesh.name) + ' into ' + made);
      if (keep.length >= 3) {
        geo.setIndex(new THREE.BufferAttribute(new Uint32Array(keep), 1));
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
      } else if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
    }
  });
  return corners;
}

/* Plenty of models are posed with the front wheels turned. Steering then rotates
   from that baked angle and the wheels sit permanently cocked. A wheel is
   narrowest across the car when it points straight ahead, so find the rotation
   that minimises its width and bake the opposite in. */
function wheelPoseAngle(hub) {
  // Measure the largest piece only — the tyre. Calipers and brackets are
  // lopsided and drag the estimate around.
  let big = null, bigCount = 0;
  hub.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const n = o.geometry.attributes.position.count;
    if (n > bigCount) { bigCount = n; big = o; }
  });
  if (!big || bigCount < 60) return 0;
  hub.updateMatrixWorld(true);
  const origin = hub.getWorldPosition(new THREE.Vector3());
  const p = big.geometry.attributes.position;
  const step = Math.max(1, Math.floor(p.count / 400));
  const xs = [], zs = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += step) {
    v.fromBufferAttribute(p, i).applyMatrix4(big.matrixWorld);
    xs.push(v.x - origin.x); zs.push(v.z - origin.z);
  }
  const widthAt = a => {
    const ca = Math.cos(a), sa = Math.sin(a);
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i] * ca - zs[i] * sa;
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
    return hi - lo;
  };
  const flat = widthAt(0);
  let bestA = 0, bestW = flat;
  for (let a = -0.8; a <= 0.8001; a += 0.02) {
    const w = widthAt(a);
    if (w < bestW) { bestW = w; bestA = a; }
  }
  // only trust it if straightening genuinely narrows the wheel
  return (bestW < flat * 0.9) ? bestA : 0;
}

/* Plenty of models are posed with the front wheels turned. Steering then rotates
   from that baked angle and the wheels sit permanently cocked. Wheels on one
   axle are always posed together, so average the pair: measuring each corner
   independently gave the two sides different angles and they visibly disagreed. */
function straightenWheels(wheels, info) {
  [true, false].forEach(front => {
    const axle = wheels.filter(w => w.front === front);
    if (!axle.length) return;
    const angles = axle.map(w => wheelPoseAngle(w.straight || w.hub));
    const avg = angles.reduce((a, b) => a + b, 0) / angles.length;
    if (Math.abs(avg) < 0.05) return;
    axle.forEach(w => { (w.straight || w.hub).rotation.y = avg; });
    info.notes.push((front ? 'front' : 'rear') + ' wheels were posed ' +
      (avg * 57.3).toFixed(0) + ' deg off, straightened');
  });
}


/* Garage options applied to a loaded model: rims, stance, wing, underglow and
   the number plate. Paint and finish are handled where the materials are
   walked. */
function plateTexture(text) {
  const c = cnv(256, 64), x = c.getContext('2d');
  x.fillStyle = '#f4f1e6'; x.fillRect(0, 0, 256, 64);
  x.strokeStyle = '#1d1d20'; x.lineWidth = 5; x.strokeRect(3, 3, 250, 58);
  x.fillStyle = '#1d1d20';
  x.font = 'bold 38px ui-monospace, Menlo, monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(text || '').slice(0, 9), 128, 36);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function applyGarageToModel(g, model, spec, cz, wheels, info) {
  const scale = TUNE.world.carScale || 1;

  // ---- rims ----
  const rimCol = new THREE.Color(cz.rim);
  let rims = 0;
  wheels.forEach(w => {
    // The rim sits inside the tyre, so size tells them apart on models whose
    // parts are unnamed and uniformly black — which is most of them.
    const bbAll = preciseBox(w.hub);
    const dia = Math.max(bbAll.getSize(new THREE.Vector3()).y, 0.001);
    w.hub.traverse(o => {
      if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.geometry) return;
      const nm = ((o.material.name || '') + ' ' + (o.name || '')).toLowerCase();
      if (/tire|tyre|rubber|caliper|disc|rotor|brake/.test(nm)) return;
      const named = /rim|wheel|alloy|spoke|hub|barrel/.test(nm);
      const bb = preciseBox(o);
      const s = bb.getSize(new THREE.Vector3());
      const inside = Math.max(s.y, s.z) < dia * 0.88;      // tucked within the tyre
      if (!named && !inside) return;
      o.material = o.material.clone();
      // a black texture cannot be tinted, so a dark textured rim loses its map
      const col = o.material.color;
      const lum = col ? col.r * 0.3 + col.g * 0.6 + col.b * 0.1 : 1;
      if (o.material.map && lum < 0.2) o.material.map = null;
      o.material.color = rimCol.clone();
      o.material.metalness = 0.86;
      o.material.roughness = cz.rimStyle === 'mesh' ? 0.22 : 0.34;
      o.material.needsUpdate = true;
      rims++;
    });
  });
  info.rims = rims;

  // ---- stance: drop the shell on its wheels, and add camber ----
  const drop = cz.stance === 'low' ? -0.06 : (cz.stance === 'raised' ? 0.09 : 0);
  model.position.y += drop * scale;
  g.userData.bodyDrop = drop * scale;
  const camber = cz.stance === 'low' ? 0.09 : 0.02;
  wheels.forEach(w => { w.hub.rotation.z = -w.side * camber; });

  const bb = preciseBox(model);
  const size = bb.getSize(new THREE.Vector3());
  const mid = bb.getCenter(new THREE.Vector3());

  // ---- wing: only when one is chosen; "auto" leaves the car's own ----
  if (cz.wing === 'gt' || cz.wing === 'duck' || cz.wing === 'lip') {
    const trim = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.42, metalness: 0.5, envMap: ENV });
    // const paint = new THREE.MeshStandardMaterial({ color: cz.body, roughness: 0.26, metalness: 0.5, envMap: ENV });
    const paint = paintFinish(new THREE.MeshStandardMaterial({}), cz);
    const wingG = new THREE.Group();
    const W = size.x * 0.96, rear = bb.min.z + 0.22 * scale;
    if (cz.wing === 'gt') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(W, 0.07 * scale, 0.42 * scale), trim);
      blade.position.set(mid.x, bb.max.y + 0.16 * scale, rear);
      wingG.add(blade);
      [-1, 1].forEach(side => {
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.36 * scale, 0.3 * scale), trim);
        stand.position.set(mid.x + side * W * 0.36, bb.max.y - 0.03 * scale, rear);
        wingG.add(stand);
      });
    } else if (cz.wing === 'duck') {
      const duck = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.13 * scale, 0.34 * scale), paint);
      duck.position.set(mid.x, bb.min.y + size.y * 0.72, rear);
      duck.rotation.x = 0.2;
      wingG.add(duck);
    } else {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.88, 0.07 * scale, 0.22 * scale), paint);
      lip.position.set(mid.x, bb.min.y + size.y * 0.66, rear);
      wingG.add(lip);
    }
    wingG.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(wingG);
  }

  // ---- number plate, front and back ----
  if (cz.plate) {
    const tex = plateTexture(cz.plate);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
    const pw = Math.min(size.x * 0.34, 0.52 * scale), ph = pw * 0.25;
    [[bb.min.z - 0.01, Math.PI], [bb.max.z + 0.01, 0]].forEach(([z, rot]) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
      p.position.set(mid.x, bb.min.y + size.y * 0.30, z);
      p.rotation.y = rot;
      g.add(p);
    });
    g.userData.plateTex = tex;
  }

  // ---- underglow ----
  if (cz.glow !== 'off') {
    const gl = new THREE.PointLight(cz.glow === 'pink' ? 0xff5ea8 : (cz.glow === 'blue' ? 0x4aa8ff : 0x7dff9a), 1.5, 12 * scale, 2);
    gl.position.y = 0.12 * scale;
    g.add(gl);
    g.userData.glow = gl;
  }
}

/* Rebuild a loaded model into the structure the game drives: origin on the
   ground between the wheels, nose along +Z, scaled by wheelbase, with wheels
   split into steerable groups. */
function adaptCarModel(source, spec, cz, cfg) {
  const info = { meshes: 0, materials: 0, textures: 0, wheels: 0, notes: [] };
  const g = new THREE.Group();
  const model = source.clone(true);

  const upFix = new THREE.Group(); upFix.add(model);
  const yawFix = new THREE.Group(); yawFix.add(upFix);
  const place = new THREE.Group(); place.add(yawFix);
  g.add(place);

  // give this instance its own materials, and fix colour space on the textures
  model.traverse(o => {
    if (!o.isMesh) return;
    info.meshes++;
    o.castShadow = true;
    o.receiveShadow = false;
    o.frustumCulled = false;          // a bad bounding sphere can cull the whole car
    if (!o.material) return;
    o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      info.materials++;
      if (m.map) { m.map.encoding = THREE.sRGBEncoding; info.textures++; }
      if (m.emissiveMap) m.emissiveMap.encoding = THREE.sRGBEncoding;
      if (m.isMeshStandardMaterial) { m.envMap = ENV; m.envMapIntensity = 0.9; }

      /* Exporters often mark opaque bodywork as blended, sometimes with a
   transmission extension. Treat a material flagged transparent but fully opaque
   as opaque, and restore depth writing. */
      const glassy = /glass|window|windscreen|windshield|screen/i.test((m.name || '') + ' ' + (o.name || ''));
      if (m.transmission) { m.transmission = 0; if (!glassy) { m.transparent = false; m.opacity = 1; } }
      if (m.transparent && !glassy && (m.opacity === undefined || m.opacity > 0.98) &&
          !m.alphaMap && !(m.alphaTest > 0)) {
        m.transparent = false;
        info.deblended = (info.deblended || 0) + 1;
      }
      // Exporters turn depth writing off alongside blending. Leaving it off on a
      // an opaque material that never writes depth leaves the car see-through
      if (!m.transparent) m.depthWrite = true;
      m.needsUpdate = true;           // encoding changes need a shader rebuild
    });
  });

  const measure = () => {
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(place);
    return { box: b, size: b.getSize(new THREE.Vector3()), centre: b.getCenter(new THREE.Vector3()) };
  };

  /* Studio models often ship a ground plane. Flat sheets much larger than the
   car are dropped before anything is measured, since they distort both scale
   and placement. */
  {
    const boxes = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      const bb = preciseBox(o);
      const s = bb.getSize(new THREE.Vector3());
      boxes.push({ o: o, max: Math.max(s.x, s.y, s.z), min: Math.min(s.x, s.y, s.z) });
    });
    if (boxes.length > 3) {
      // Compare against the largest real panels, not the median. On a model built
      // from hundreds of small LOD pieces the median is tiny, and a median-based
      // threshold would delete the bodywork.
      const sorted = boxes.map(b => b.max).sort((a, b) => a - b);
      const p90 = sorted[Math.floor(sorted.length * 0.9)] || 1;
      // Only flat sheets. "Unusually large" catches real bodywork on models built
      // from many small LOD pieces, and removing the roof is worse than keeping a
      // backdrop. A floor is always a plane.
      const stage = boxes.filter(b => b.min < b.max * 0.02 && b.max > p90 * 1.2);
      // If this wants to remove a large slice of the model it has misread the
      // model rather than found a backdrop, so leave it alone.
      if (stage.length && stage.length <= Math.max(4, boxes.length * 0.06)) {
        stage.forEach(b => { if (b.o.parent) b.o.parent.remove(b.o); });
        info.notes.push('dropped ' + stage.length + ' backdrop/floor mesh(es)');
      }
    }
  }

  let m = measure();
  if (!isFinite(m.size.x) || m.size.x <= 0) {
    info.notes.push('model has no measurable geometry');
    throw new Error('empty model');
  }
  info.raw = `${m.size.x.toFixed(2)} x ${m.size.y.toFixed(2)} x ${m.size.z.toFixed(2)}`;

  // Blender and 3ds Max export Z-up: the car arrives standing on its nose.
  const zUp = cfg.upZ !== undefined ? cfg.upZ : (m.size.y > Math.max(m.size.x, m.size.z) * 1.05);
  if (zUp) { upFix.rotation.x = -Math.PI / 2; info.notes.push('rotated from Z-up'); m = measure(); }

  // a car is longer than it is wide, so the long axis is the one that faces forward
  let yaw = cfg.rotY || 0;
  if (cfg.rotY === undefined && m.size.x > m.size.z * 1.05) {
    yaw = Math.PI / 2;
    info.notes.push('turned to face +Z');
  }
  yawFix.rotation.y = yaw;
  m = measure();

  // Scale from the wheelbase where it can be measured. Stray geometry — a ground
  // plane, a backdrop, a mirrored underbody — inflates the bounding box and
  // makes length-based scaling wrong, but the wheels never lie.
  let k;
  const stats = detectWheelbase(model, m.box, m.size);
  if (cfg.scale !== undefined && cfg.scale !== 'auto') {
    k = cfg.scale;
  } else if (stats) {
    k = spec.shape.wb / stats.wb;                 // cosmetic size, matching the road
    info.notes.push('scaled from a ' + stats.wb.toFixed(2) + ' unit wheelbase');
  } else {
    k = spec.shape.len / Math.max(m.size.z, 0.001);
    info.notes.push('scaled from overall length');
  }
  place.scale.setScalar(k);
  info.scale = k;
  m = measure();

  // Origin on the ground between the wheels. Using the bounding box would hang
  // the car off whatever stray geometry reaches lowest or widest.
  const post = stats ? detectWheelbase(model, m.box, m.size) : null;
  place.position.x -= post ? post.midX : m.centre.x;
  place.position.z -= post ? post.midZ : m.centre.z;
  place.position.y -= post ? post.groundY : m.box.min.y;
  m = measure();
  info.fitted = `${m.size.x.toFixed(2)} x ${m.size.y.toFixed(2)} x ${m.size.z.toFixed(2)}`;

  // Some models ship a backdrop plane or a mirrored underbody that reaches far
  // outside the car. Anything well beyond a car-and-a-half is not the car.
  if (stats) {
    const envelope = spec.shape.wb * 1.6;
    const strays = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      const bb = preciseBox(o);
      if (bb.max.y > envelope || bb.min.y < -envelope * 0.5 ||
          Math.abs(bb.max.x) > envelope || Math.abs(bb.max.z) > envelope * 1.3) strays.push(o);
    });
    strays.forEach(o => { if (o.parent) o.parent.remove(o); });
    if (strays.length) info.notes.push('dropped ' + strays.length + ' stray mesh(es)');
  }

  // ---- wheels ----
  g.updateMatrixWorld(true);
  const corners = splitMergedWheels(model, spec, info);
  const wheels = [];
  const median = arr => {
    const s = arr.slice().sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  let rejected = 0;
  Object.keys(corners).forEach(key => {
    let list = corners[key];
    if (!list.length) return;

    /* A corner collects anything that matched, and not all matches are wheels:
   parking brakes and steering wheels can match by name. The hub centre is the
   median of the pieces so a single outlier cannot move it. */
    const boxes = list.map(o => {
      const bb = preciseBox(o);
      return { o: o, c: bb.getCenter(new THREE.Vector3()), s: bb.getSize(new THREE.Vector3()) };
    });
    /* Calipers sit off to one side of the wheel, so including them drags the
       centre with them and the wheel then rotates about a point beside itself.
       Locate the centre from the round parts alone. */
    const round = boxes.filter(b => !CALIPER_RE.test(b.o.name || ''));
    const forMid = round.length >= 2 ? round : boxes;
    const mid = new THREE.Vector3(
      median(forMid.map(b => b.c.x)), median(forMid.map(b => b.c.y)), median(forMid.map(b => b.c.z)));
    /* Size the filter from the car's own wheel radius. Deriving it from the
   matched pieces lets a corner full of small parts exclude the actual wheel. */
    const rExp = spec.shape.wr;
    const keep = boxes.filter(b =>
      b.c.distanceTo(mid) < rExp * 1.5 &&                  // near the wheel centre
      Math.max(b.s.x, b.s.y, b.s.z) < rExp * 2.8);         // not an axle or a steering wheel
    rejected += boxes.length - keep.length;
    if (!keep.length) return;
    list = keep.map(b => b.o);

    const keepRound = keep.filter(b => !CALIPER_RE.test(b.o.name || ''));
    const centreFrom = keepRound.length >= 2 ? keepRound : keep;
    /* A wheel is a disc, so the axle is the middle of its extent however the
       parts are split up. Averaging or taking medians of piece centres biases
       toward whichever side has more geometry, and the wheel then wobbles. */
    const span = new THREE.Box3();
    centreFrom.forEach(b => span.union(preciseBox(b.o)));
    const spanSize = span.getSize(new THREE.Vector3());
    /* If one piece spans the whole wheel it is the tyre, and its centre is the
       axle — better than the union, which a protruding badge or mudflap can
       drag off centre. Where the wheel is split into many small pieces (spokes
       modelled individually) no piece dominates, and the union is right. */
    const tyre = centreFrom.reduce((a, b) =>
      Math.max(b.s.y, b.s.z) > Math.max(a.s.y, a.s.z) ? b : a, centreFrom[0]);
    const dominant = Math.max(tyre.s.y, tyre.s.z) > Math.max(spanSize.y, spanSize.z) * 0.85;
    const spanMid = dominant ? tyre.c.clone() : span.getCenter(new THREE.Vector3());
    const centre = new THREE.Vector3(
      median(centreFrom.map(b => b.c.x)), spanMid.y, spanMid.z);

    const steer = new THREE.Group();
    steer.position.copy(centre);
    steer.userData.isWheel = true;
    const hub = new THREE.Group();          // camber
    const spin = new THREE.Group();          // road speed
    const straight = new THREE.Group();      // corrects a wheel modelled turned
    hub.add(spin); spin.add(straight);
    steer.add(hub);
    g.add(steer);
    g.updateMatrixWorld(true);

    const bb = new THREE.Box3();
    list.forEach(o => straight.attach(o));
    list.forEach(o => bb.union(preciseBox(o)));
    const bs = bb.getSize(new THREE.Vector3());
    hub.userData.radius = Math.max(bs.y, bs.z) / 2 || spec.shape.wr;
    wheels.push({ steer: steer, hub: hub, spin: spin, straight: straight,
      front: key[1] === 'F', side: key[0] === 'L' ? -1 : 1 });
  });
  if (rejected) info.notes.push('ignored ' + rejected + ' non-wheel part(s) near the hubs');
  wheels.forEach(w => {
    // The disc turns with the wheel; the caliper and its shield are bolted to the
    // upright and must stay put, or the brake visibly spins round the disc.
    w.straight.children.slice().forEach(ch => {
      if (CALIPER_RE.test(ch.name || '')) w.steer.attach(ch);
    });
  });
  claimWheelStrays(g, wheels, info);
  straightenWheels(wheels, info);
  info.wheels = wheels.length;
  if (wheels.length < 4) {
    info.notes.push('only ' + wheels.length + ' wheel groups found — wheels will not turn or spin');
  }
  g.userData.wheels = wheels;

  // ---- paint ----
  const paintRe = cfg.paint || /body|paint|carpaint|exterior|shell|karosserie/i;
  let painted = 0;
  model.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(mm => {
      if (paintRe.test((mm.name || '') + ' ' + (o.name || ''))) {
        paintFinish(mm, cz);
        painted++;
      }
    });
  });
  if (!painted) {
    // nothing named like bodywork: take the material covering the most of the
    // car's upper half, which is normally the paint
    let best = null, bestTris = 0;
    model.traverse(o => {
      if (!o.isMesh || !o.geometry || Array.isArray(o.material)) return;
      const bb = preciseBox(o);
      if (bb.getCenter(new THREE.Vector3()).y < m.box.min.y + m.size.y * 0.45) return;
      const t = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
      if (t > bestTris) { bestTris = t; best = o.material; }
    });
    if (best) {
      paintFinish(best, cz);
      painted = 1;
      info.notes.push('paint applied to the largest body panel');
    }
  }
  info.painted = painted;
  applyGarageToModel(g, model, spec, cz, wheels, info);
  if (!painted) info.notes.push('no bodywork material matched, so the garage colour is ignored');

  // ---- the same furniture the built-in car carries ----
  const head = new THREE.SpotLight(0xffeccc, 0, 90, 0.55, 0.45, 1.4);
  head.position.set(0, spec.shape.hgt + 0.2, spec.shape.len / 2);
  head.target.position.set(0, -0.4, spec.shape.len / 2 + 22);
  g.add(head, head.target);
  g.userData.head = head;
  g.userData.tray = makeTray(spec);
  g.add(g.userData.tray);
  g.add(makeBlobShadow(spec.shape.len));
  g.userData.modelInfo = info;
  LAST_MODEL_INFO = info;

  console.info('[noodles] model adapted:', info);
  return g;
}

let LAST_MODEL_INFO = null;

/* Shared bits so a loaded model gets the same furniture as the built-in one. */
function makeTray(spec) {
  const tray = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.52),
    new THREE.MeshStandardMaterial({ color: 0xd9b98a, roughness: 0.9 }));
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.56),
    new THREE.MeshStandardMaterial({ color: 0xc8453c, roughness: 0.7 }));
  lid.position.y = 0.24;
  tray.add(box, lid);
  tray.position.set(0, spec.shape.wr + spec.shape.hgt * 1.6, -spec.shape.len * 0.34);
  tray.visible = false;
  return tray;
}
function makeBlobShadow(L) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const x = cv.getContext('2d');
  const grd = x.createRadialGradient(32, 32, 3, 32, 32, 31);
  grd.addColorStop(0, 'rgba(0,0,0,.55)');
  grd.addColorStop(0.6, 'rgba(0,0,0,.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = grd; x.fillRect(0, 0, 64, 64);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.5, L * 1.1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.05;
  blob.renderOrder = 2;
  blob.userData.isWheel = true;
  return blob;
}

/* ---------- procedural car model ---------- */
function buildCarMesh(spec, cz) {
  const s = spec.shape;
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
        color: cz.body
  });
  paintFinish(paint, cz);
  const glass = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.06, metalness: 0.85,
    envMap: ENV, envMapIntensity: 1.5, transparent: true, opacity: 0.82 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.85 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.96 });
  const rimMat = new THREE.MeshStandardMaterial({ color: cz.rim, roughness: 0.24, metalness: 0.85,
    envMap: ENV, envMapIntensity: 1.1 });
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff0cf, emissive: 0xffe0a0, emissiveIntensity: 1.4, roughness: 0.3 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xd63a2c, emissive: 0xff2a18, emissiveIntensity: 0.85, roughness: 0.35 });

  const L = s.len, W = s.wid, H = s.hgt;
  const bodyY = s.wr + 0.16;

  // lower body: three stacked slabs give a shoulder line without a modelling package
  const sill = new THREE.Mesh(new THREE.BoxGeometry(W, H * 0.52, L), paint);
  sill.position.y = bodyY + H * 0.26;
  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(W * 0.97, H * 0.5, L * 0.98), paint);
  shoulder.position.y = bodyY + H * 0.72;
  // bonnet wedge
  const nose = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, H * 0.34, L * 0.3), paint);
  nose.position.set(0, bodyY + H * s.nose * 0.62, L * 0.33);
  const boot = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, H * 0.3, L * 0.24), paint);
  boot.position.set(0, bodyY + H * 0.86, -L * 0.36);

  // cabin
  const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, s.cabH, s.cabLen), paint);
  cab.position.set(0, bodyY + H * 0.85 + s.cabH / 2, s.cabOff);
  const greenhouse = new THREE.Mesh(new THREE.BoxGeometry(W * 0.87, s.cabH * 0.66, s.cabLen * 0.94), glass);
  greenhouse.position.copy(cab.position); greenhouse.position.y -= s.cabH * 0.06;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, 0.08, s.cabLen * 0.86), paint);
  roof.position.set(0, cab.position.y + s.cabH / 2, s.cabOff);
  // windscreen rake
  const screen = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, s.cabH * 1.05, 0.14), glass);
  screen.position.set(0, cab.position.y - 0.02, s.cabOff + s.cabLen / 2);
  screen.rotation.x = -0.42;

  g.add(sill, shoulder, nose, boot, cab, greenhouse, roof, screen);

  // bumpers, splitter, mirrors
  const fb = new THREE.Mesh(new THREE.BoxGeometry(W * 1.0, H * 0.3, 0.36), trim);
  fb.position.set(0, bodyY + H * 0.2, L / 2 - 0.05);
  const rb = fb.clone(); rb.position.z = -L / 2 + 0.05;
  const split = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, 0.08, 0.5), trim);
  split.position.set(0, bodyY - 0.06, L / 2 - 0.1);
  g.add(fb, rb, split);
  for (const side of [-1, 1]) {
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.16), trim);
    mir.position.set(side * (W / 2 + 0.1), cab.position.y - s.cabH * 0.2, s.cabOff + s.cabLen * 0.42);
    g.add(mir);
  }

  // lights
  for (const side of [-1, 1]) {
    if (s.pop) {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(W * 0.3, 0.1, 0.42), paint);
      pod.position.set(side * W * 0.29, bodyY + H * s.nose * 0.78, L * 0.42);
      g.add(pod);
    } else {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.3, 0.16, 0.12), lightMat);
      hl.position.set(side * W * 0.3, bodyY + H * 0.5, L / 2 - 0.02);
      g.add(hl);
    }
    // round quad tail lights — the R32 signature
    for (const inout of [0.16, 0.32]) {
      const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 12), tailMat);
      tl.rotation.x = Math.PI / 2;
      tl.position.set(side * W * inout * 2.0 * 0.5 + side * 0.08, bodyY + H * 0.62, -L / 2 - 0.01);
      g.add(tl);
    }
  }
  const headBeamL = new THREE.SpotLight(0xffeccc, 0.0, 90, 0.55, 0.45, 1.4);
  headBeamL.position.set(0, bodyY + 0.35, L / 2);
  headBeamL.target.position.set(0, -0.4, L / 2 + 22);
  g.add(headBeamL, headBeamL.target);
  g.userData.head = headBeamL;

  // livery
  if (cz.livery === 'stripe') {
    const st = new THREE.Mesh(new THREE.BoxGeometry(W * 0.16, 0.02, L * 0.99),
      new THREE.MeshStandardMaterial({ color: 0xf7ecd6, roughness: 0.5 }));
    st.position.set(0, bodyY + H * 0.98, 0); g.add(st);
  } else if (cz.livery === 'twotone') {
    const tt = new THREE.Mesh(new THREE.BoxGeometry(W * 1.005, H * 0.3, L * 0.99),
      new THREE.MeshStandardMaterial({ color: 0x1b1f26, roughness: 0.6 }));
    tt.position.set(0, bodyY + H * 0.16, 0); g.add(tt);
  } else if (cz.livery === 'itasha') {
    for (const side of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.5, H * 0.5),
        new THREE.MeshStandardMaterial({ color: 0xf7ecd6, roughness: 0.6, side: THREE.DoubleSide }));
      d.position.set(side * (W / 2 + 0.01), bodyY + H * 0.6, -0.1);
      d.rotation.y = side * Math.PI / 2;
      g.add(d);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(H * 0.16, 16),
        new THREE.MeshStandardMaterial({ color: 0xc8453c, roughness: 0.5, side: THREE.DoubleSide }));
      dot.position.set(side * (W / 2 + 0.02), bodyY + H * 0.6, -0.1);
      dot.rotation.y = side * Math.PI / 2;
      g.add(dot);
    }
  }

  // wing
  if (cz.wing !== 'none') {
    const wingKind = cz.wing === 'auto' ? s.wing : (cz.wing === 'gt' ? 3 : (cz.wing === 'duck' ? 2 : 1));
    if (wingKind === 3) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, 0.07, 0.42), trim);
      blade.position.set(0, bodyY + H * 1.28, -L / 2 + 0.28);
      g.add(blade);
      for (const side of [-1, 1]) {
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.3), trim);
        stand.position.set(side * W * 0.36, bodyY + H * 1.11, -L / 2 + 0.28);
        g.add(stand);
      }
    } else if (wingKind === 2) {
      const duck = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.13, 0.34), paint);
      duck.position.set(0, bodyY + H * 1.06, -L / 2 + 0.22);
      duck.rotation.x = 0.2; g.add(duck);
    } else {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.07, 0.22), paint);
      lip.position.set(0, bodyY + H * 1.0, -L / 2 + 0.16); g.add(lip);
    }
  }

  // wheels
  const wheels = [];
  const drop = cz.stance === 'low' ? -0.06 : (cz.stance === 'raised' ? 0.09 : 0);
  const camber = cz.stance === 'low' ? 0.09 : 0.02;
  for (let i = 0; i < 4; i++) {
    const front = i < 2, side = (i % 2 === 0) ? -1 : 1;
    const hub = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(s.wr, s.wr, s.ww, 16), rubber);
    tyre.rotation.z = Math.PI / 2;
    tyre.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(s.wr * 0.66, s.wr * 0.66, s.ww + 0.015, cz.rimStyle === 'mesh' ? 16 : 6), rimMat);
    rim.rotation.z = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.CircleGeometry(s.wr * 0.64, cz.rimStyle === 'mesh' ? 18 : 5), rimMat);
    face.rotation.y = side * Math.PI / 2;
    face.position.x = side * (s.ww / 2 + 0.01);
    // camber on the hub, road speed on an inner node, so the two do not compound
    const spin = new THREE.Group();
    spin.add(tyre, rim, face);
    hub.add(spin);
    hub.position.set(side * (s.track / 2), s.wr, front ? s.wb / 2 : -s.wb / 2);
    hub.rotation.z = -side * camber;
    const steer = new THREE.Group();
    steer.position.copy(hub.position);
    hub.position.set(0, 0, 0);
    steer.add(hub);
    steer.userData.isWheel = true;
    g.add(steer);
    wheels.push({ steer, hub, spin, straight: spin, front, side });
  }
  g.userData.wheels = wheels;

  // underglow
  if (cz.glow !== 'off') {
    const gl = new THREE.PointLight(cz.glow === 'pink' ? 0xff5ea8 : (cz.glow === 'blue' ? 0x4aa8ff : 0x7dff9a), 1.5, 12, 2);
    gl.position.y = 0.12;
    g.add(gl);
    g.userData.glow = gl;
  }

  // noodle tray on the parcel shelf
  const tray = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.52),
    new THREE.MeshStandardMaterial({ color: 0xd9b98a, roughness: 0.9 }));
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.56),
    new THREE.MeshStandardMaterial({ color: 0xc8453c, roughness: 0.7 }));
  lid.position.y = 0.24;
  tray.add(box, lid);
  tray.position.set(0, bodyY + H * 1.05, -L * 0.34);
  tray.visible = false;
  g.add(tray);
  g.userData.tray = tray;

  // Contact shadow: a soft dark disc pinned to the ground. Cheap, and without it the
  // car reads as hovering whenever the real shadow falls out of the shadow-map box.
  const shCv = document.createElement('canvas');
  shCv.width = shCv.height = 64;
  const shx = shCv.getContext('2d');
  const shg = shx.createRadialGradient(32, 32, 3, 32, 32, 31);
  shg.addColorStop(0, 'rgba(0,0,0,.55)');
  shg.addColorStop(0.6, 'rgba(0,0,0,.22)');
  shg.addColorStop(1, 'rgba(0,0,0,0)');
  shx.fillStyle = shg; shx.fillRect(0, 0, 64, 64);
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(L * 1.5, L * 1.1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shCv), transparent: true, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.05;
  blob.renderOrder = 2;
  blob.userData.isWheel = true;          // keep it off the chassis so ride height doesn't lift it
  g.add(blob);

  // everything that isn't a wheel rides on the chassis, so ride height moves the body
  const chassis = new THREE.Group();
  g.children.filter(c => !c.userData.isWheel).forEach(c => { g.remove(c); chassis.add(c); });
  chassis.position.y = drop;
  g.add(chassis);

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return g;
}

/* ---------- vehicle physics ---------- */
const V = {
  x: HQ.x + 4, z: HQ.z - 24, y: 0,
  yaw: Math.PI / 2, vx: 0, vz: 0, yawRate: 0,
  vLong: 0, vLat: 0,
  gear: 1, rpm: 900, clutch: 0, steer: 0, steerCmd: 0,
  surface: SURF.road, slip: 0, airborne: false, vy: 0, aLong: 0, aLat: 0,
  launching: false, burnout: false, gripRMem: 0, spPrev: 0, driftCtl: false, driftDir: 0, steerVis: 0,
  nitro: 1, boosting: false,
  driftAngle: 0, wheelSpin: 0, health: 1
};
/* The roster is ordered by id for stable save data, but progression follows lvl. */
function carForLevel(l) { return CARS.find(c => c.lvl === l); }
const STARTER = CARS.find(c => c.lvl === 1).id;
let spec = CARS[STARTER];

/* Per-car upgrades bought in the garage. */
const UPG = {};
function upgradeLevel(id, kind) { const u = UPG[id]; return (u && u[kind]) || 0; }
function upgradesFor(id) {
  if (!UPG[id]) UPG[id] = { turbo: 0, tyres: 0, nitro: 0 };
  return UPG[id];
}

/* Engine upgrades and nitrous both multiply torque. */
function powerMult() {
  let m = 1 + 0.07 * upgradeLevel(spec.id, 'turbo');
  if (V.boosting) m *= TUNE.nitro.power;
  return m;
}
function torqueAt(rpm) {
  const p = spec.peakRpm, rl = spec.redline;
  let f;
  if (rpm < p) f = 0.55 + 0.45 * (rpm / p);
  else f = 1 - 0.42 * Math.pow((rpm - p) / (rl - p), 1.7);
  if (rpm > rl) f *= Math.max(0, 1 - (rpm - rl) / 420);
  return spec.peakTq * TUNE.power.torqueScale * powerMult() * Math.max(0, f);
}
// the drivetrain must not change when the car is scaled for looks
function wheelRadius() { return spec.wr0 || spec.shape.wr; }
function gearRatio(g) { return g <= 0 ? -3.5 : spec.ratios[g - 1]; }
function speedToRpm(vLong, g) {
  const r = Math.abs(gearRatio(g)) * spec.final;
  return Math.abs(vLong) * r / wheelRadius() * 60 / TAU;
}
function rpmToSpeed(rpm, g) {
  const r = Math.abs(gearRatio(g)) * spec.final;
  return rpm * TAU / 60 * wheelRadius() / r;
}

/* Tyre curve: linear up to the peak, then a falloff. The falling tail is what makes a
   slide hold instead of snapping straight — the rear gives up more of it than the front,
   so counter-steer still has something to bite on. */
function tyreForce(slip, C, grip, falloff) {
  const s = Math.abs(slip);
  const peak = grip / C;
  let F;
  if (s <= peak) F = C * s;
  else F = grip * (1 - falloff * clamp((s - peak) / (peak * 3.5), 0, 1));
  return -Math.sign(slip) * F;
}

const input = { thr: 0, brk: 0, left: 0, right: 0, hand: false, clutch: false, boost: false };
let autoBox = false;

function shiftUp() {
  if (V.gear < spec.ratios.length) { V.gear++; V.clutch = 0.16; sfx.shift(); }
}
function shiftDown() {
  if (V.gear > -1) {
    if (V.gear === 1 && Math.abs(V.vLong) > 2) return;
    V.gear--; if (V.gear === 0 && Math.abs(V.vLong) > 2) V.gear = 1; else V.clutch = 0.13;
    sfx.shift();
  }
}

function resetCar(toHQ) {
  if (toHQ) { V.x = HQ.x + 4; V.z = HQ.z - 24; V.yaw = Math.PI / 2; }
  else {
    const near = nearestRoadInfo(V.x, V.z);
    const p = pointOnPath(near.road, near.seg, near.t);
    V.x = p[0]; V.z = p[1];
    V.yaw = pathHeading(near.road, near.seg);
  }
  V.vx = V.vz = V.vLong = V.vLat = V.yawRate = V.vy = 0;
  V.y = terrainH(V.x, V.z); V.gear = 1; V.rpm = spec.idle;
}

function stepPhysics(dt) {
  const aStart = Math.atan2(V.vx, V.vz);
  const s = spec.shape;
  // Handling is driven by the car's real dimensions, not the cosmetic scale, so
  // the size slider changes how it looks and nothing about how it drives.
  const s0 = spec.shape0 || s;
  const mass = spec.mass, Iz = mass * 1.42;
  const a = s0.wb * 0.48, b = s0.wb * 0.52;   // CG to axles

  // steering: less lock the faster you go, more lock on drift-spec cars
  const speed = Math.hypot(V.vx, V.vz);
  const lockMax = TUNE.steer.lockLow * (s0.angle || 1);
  const lock = lerp(lockMax, TUNE.steer.lockHigh, clamp(speed / TUNE.steer.lockFade, 0, 1));
  const cmd = (input.left - input.right);   // +yaw turns left with forward = (sin,cos)
  const rate = (Math.sign(cmd) !== Math.sign(V.steerCmd) && cmd !== 0) ? TUNE.steer.counterRate : TUNE.steer.rate;
  V.steerCmd = lerp(V.steerCmd, cmd, clamp(dt * rate, 0, 1));
  V.steer = V.steerCmd * lock;

  const surf = surfaceAt(V.x, V.z);
  V.surface = surf;
  // Rally cars keep far more of their grip on loose ground, up to but never
  // beyond what they would have on tarmac. spec.offroad is 1 for a road car.
  const loose = surf === SURF.road ? 1 : Math.min(spec.offroad || 1, 1 / Math.max(surf.grip, 0.01));
  const mu = TUNE.grip.base * spec.grip * (1 + 0.035 * upgradeLevel(spec.id, 'tyres')) * surf.grip * loose;
  // Downforce: without it, high-speed cornering is capped at about 1g and the
  // car feels like it refuses to turn above 120 km/h.
  const vSq = V.vLong * V.vLong;
  const load = mass * 9.81 * (1 + TUNE.grip.downforce * vSq / 1000);

  // forward / lateral velocities in body frame
  const fx = Math.sin(V.yaw), fz = Math.cos(V.yaw);
  V.vLong = V.vx * fx + V.vz * fz;
  V.vLat = V.vx * fz - V.vz * fx;

  // Handbrake at a standstill holds the car for a launch, and the clutch stays
  // out so the revs build. Throttle plus brake together is a line-lock burnout:
  // the fronts hold, the rears light up.
  const stopped = Math.abs(V.vLong) < 1.2;
  const launching = input.hand && stopped && input.thr > 0.1;
  const burnout = !launching && input.thr > 0.4 && input.brk > 0.4 && Math.abs(V.vLong) < 14;
  if (V.launching && !launching && input.thr > 0.5) V.launchSlip = 0.55;   // dumped it
  V.launchSlip = Math.max(0, (V.launchSlip || 0) - dt);
  V.launching = launching;
  V.burnout = burnout;

  // engine + gearbox
  const idle = spec.idle;
  const wheelRpm = speedToRpm(V.vLong, V.gear === 0 ? 1 : V.gear);
  V.clutch = Math.max(0, V.clutch - dt);
  const engaged = V.clutch <= 0 && !input.clutch && V.gear !== 0 && !launching && !burnout;
  if (engaged && V.launchSlip <= 0) V.rpm = lerp(V.rpm, Math.max(idle, wheelRpm), clamp(dt * 12, 0, 1));
  else if (V.launchSlip > 0) V.rpm = lerp(V.rpm, Math.max(wheelRpm, spec.redline * 0.82), clamp(dt * 6, 0, 1));
  else if (launching || burnout) {
    const target = idle + input.thr * (spec.redline * (launching ? 0.86 : 0.92) - idle);
    V.rpm = lerp(V.rpm, target, clamp(dt * 4.5, 0, 1));
  }
  else V.rpm = lerp(V.rpm, idle + input.thr * (spec.redline * 0.92 - idle), clamp(dt * 3.2, 0, 1));
  V.rpm = clamp(V.rpm, idle * 0.7, spec.redline * 1.06);

  if (autoBox && engaged) {
    if (V.rpm > spec.redline * 0.93 && V.gear < spec.ratios.length) shiftUp();
    else if (V.gear > 1 && speedToRpm(V.vLong, V.gear - 1) < spec.redline * 0.62) shiftDown();
    if (V.gear === 0) V.gear = 1;
  }

  // drive force
  let drive = 0;
  if ((engaged || V.launchSlip > 0) && V.gear !== 0) {
    const gr = gearRatio(V.gear) * spec.final;
    const limiter = V.rpm > spec.redline ? 0.25 : 1;
    drive = torqueAt(V.rpm) * gr / wheelRadius() * input.thr * 0.92 * limiter;
    if (V.gear < 0) drive = -Math.abs(drive) * 0.6;
  }
  // nitrous: burns the bottle for a torque multiplier, refills slowly and from drifting
  const hasNitro = upgradeLevel(spec.id, 'nitro') > 0;
  const cap = 1 + 0.35 * (upgradeLevel(spec.id, 'nitro') - 1);
  if (hasNitro && input.boost && V.nitro > 0.01 && Math.abs(V.vLong) > 2) {
    V.boosting = true;
    V.nitro = clamp(V.nitro - TUNE.nitro.drain / Math.max(cap, 0.2) * dt, 0, 1);
  } else {
    V.boosting = false;
    if (hasNitro) V.nitro = clamp(V.nitro + TUNE.nitro.refill * dt, 0, 1);
  }

  // engine braking
  if (engaged && input.thr < 0.05) drive -= Math.sign(V.vLong) * (spec.peakTq * 0.09) * Math.abs(gearRatio(V.gear)) * spec.final / wheelRadius() * 0.1;

  // brakes — a burnout only holds with the front axle, so half the force
  let braking = input.brk * mass * TUNE.power.brakeForce;
  if (burnout) braking *= 0.45;
  if (Math.abs(V.vLong) > 0.4) drive -= Math.sign(V.vLong) * braking;
  else if (input.brk > 0.1) { V.vLong *= 0.86; }

  // handbrake locks the rear
  const hand = input.hand ? 1 : 0;
  if (hand && !launching) drive -= Math.sign(V.vLong) * mass * 3.2;

  // longitudinal traction limit — spin the wheels on dirt
  // weight shifts rearward on a dumped clutch, so there is briefly more to push against
  const squat = V.launchSlip > 0 ? 1.18 : 1;
  // Loose ground puts a hard ceiling on how much power reaches the ground: a
  // road car simply spins its wheels, a rally car puts it down.
  const looseDrive = surf === SURF.road ? 1 : clamp(0.46 + 0.6 * ((spec.offroad || 1) - 1), 0.46, 1.1);
  const maxDrive = mu * load * (spec.drive === 'awd' ? 0.85 : 0.46) * squat * looseDrive;
  const wanted = drive;
  drive = clamp(drive, -maxDrive, maxDrive);
  V.wheelSpin = lerp(V.wheelSpin, clamp((Math.abs(wanted) - maxDrive) / (maxDrive + 1), 0, 1.4), clamp(dt * 8, 0, 1));
  if (burnout) V.wheelSpin = Math.max(V.wheelSpin, 0.6 + input.thr * 0.6);

  // slip angles (bicycle model)
  const u = Math.max(Math.abs(V.vLong), 2.5) * Math.sign(V.vLong || 1);
  const af = Math.atan2(V.vLat + V.yawRate * a, Math.abs(u)) - V.steer * Math.sign(u);
  const ar = Math.atan2(V.vLat - V.yawRate * b, Math.abs(u));

  // Cornering stiffness sized so each axle peaks at ~8 deg of slip. Softer than this
  // and the tyres deform too long before making force, which reads as floaty.
  const Cf = TUNE.grip.stiffFront * mass, Cr = TUNE.grip.stiffRear * mass;
  // front gives up before the rear: the car pushes wide rather than
  // snapping around, so a slide is something you ask for, not something you're handed
  let gripF = mu * load * TUNE.grip.front;
  // A car's own stability: how planted its rear axle is. The heavy all-wheel-drive
  // cars should not be as eager to step out as a shop-built drift car.
  const stab = spec.stab || 1;
  /* Tarmac gives up some grip once the car is genuinely sideways, so a road
   drift holds its angle instead of gripping up. Scaled by how much grip the
   surface has to start with, and by the car's stability. */
  const slipPre = Math.abs(Math.atan2(V.vLat, Math.max(Math.abs(V.vLong), 0.5)));
  const looseGate = clamp((slipPre - TUNE.drift.slideSlip) / 0.28, 0, 1) *
    clamp(surf.grip, 0, 1) / stab;
  const loosen = 1 - (1 - TUNE.drift.slideGrip) * clamp(looseGate, 0, 1);
  let gripR = mu * load * TUNE.grip.rear * stab * surf.rear *
    (hand ? TUNE.drift.handbrakeRear : 1) * (1 - clamp(V.wheelSpin * 0.42, 0, 0.5));
  // Friction circle: grip spent driving the wheels isn't available for cornering.
  // This is what lets you hold a slide on the throttle and tighten it by lifting.
  const rearShare = spec.drive === 'awd' ? 0.45 : 1;
  const frontShare = spec.drive === 'awd' ? 0.55 : 0;
  const fxRear = Math.abs(drive) * rearShare + (input.brk > 0 ? braking * 0.4 : 0);
  const fxFront = Math.abs(drive) * frontShare + (input.brk > 0 ? braking * 0.6 : 0);
  gripF *= loosen;
  gripR *= loosen;
  gripR = Math.sqrt(Math.max(gripR * gripR * 0.09, gripR * gripR - fxRear * fxRear));
  // Lifting restores rear grip instantly, which snaps a drift straight the moment
  // you breathe off. Remember the lowest recent value and let it return slowly,
  // so you can feather the throttle and hold the angle.
  if (gripR < (V.gripRMem || 1e9)) V.gripRMem = gripR;
  else V.gripRMem = lerp(V.gripRMem || gripR, gripR, clamp(dt / Math.max(TUNE.drift.liftHold, 0.01), 0, 1));
  gripR = Math.min(gripR, V.gripRMem);
  gripF = Math.sqrt(Math.max(gripF * gripF * 0.16, gripF * gripF - fxFront * fxFront));
  let Fyf = tyreForce(af, Cf, gripF, TUNE.grip.falloffFront);
  let Fyr = tyreForce(ar, Cr, gripR, TUNE.grip.falloffRear / stab);
  if (V.airborne) { Fyf *= 0.05; Fyr *= 0.05; drive *= 0.05; }

  // aero: Cd ~0.36 over a frontal area of roughly track x 1.25 m
  const frontal = (spec.shape0 ? spec.shape0.wid : s.wid) * 1.25;
  const aLong = drive / mass + V.yawRate * V.vLat
    - Math.sign(V.vLong) * (0.5 * 1.2 * TUNE.power.dragCd * frontal * V.vLong * V.vLong) / mass
    - Math.sign(V.vLong) * Math.abs(V.vLat) * TUNE.drift.scrub
    - V.vLong * (1 - surf.roll) / (spec.offroad || 1) * TUNE.power.rollResist;
  const aLat = (Fyf * Math.cos(V.steer) + Fyr) / mass - V.yawRate * V.vLong;
  const yawAcc = (a * Fyf * Math.cos(V.steer) - b * Fyr) / Iz;

  // A slide bleeds energy because the tyres destroy the sideways velocity. Feed
  // part of that back along the car so a drift carries speed.
  const slipNow = Math.abs(Math.atan2(V.vLat, Math.max(Math.abs(V.vLong), 0.5)));
  // Forwards only. Reversing puts the car at a permanent huge slip angle, so
  // feeding scrub back along the car pumped reverse speed without limit — turn
  // the wheel while backing up and you accelerated for ever.
  if (slipNow > 0.08 && V.vLong > 3) {
    /* Sideways speed is traded for forward speed, never added: the total is
   clamped so a series of flicks cannot pump the car past its top speed. */
    const sp0 = Math.hypot(V.vLong, V.vLat);
    const tyreLat = Math.abs((Fyf * Math.cos(V.steer) + Fyr) / mass);
    const w = smooth(clamp((slipNow - 0.08) / TUNE.drift.recoverBand, 0, 1));
    const onPower = TUNE.drift.coastCarry + (1 - TUNE.drift.coastCarry) * clamp(input.thr, 0, 1);
    V.vLong += tyreLat * TUNE.drift.recover * w * onPower * dt;
    if (input.thr < 0.15) V.vLong -= tyreLat * TUNE.drift.coastDrag * w * dt;
    const sp1 = Math.hypot(V.vLong, V.vLat);
    if (sp1 > sp0 && sp1 > 1e-6) {
      const k = sp0 / sp1;
      V.vLong *= k;
      V.vLat *= k;
    }
  }

  V.aLong = aLong; V.aLat = aLat;
  V.vLong += aLong * dt;
  V.vLat += aLat * dt;
  V.yawRate += yawAcc * dt;
  /* A spin and a drift look identical to a damper, so they are told apart by the
   input: steering into the slide is a spin, opposite lock is a drift. */
  // Compare the steering with which way the car is SLIDING, not which way it is
  // rotating: yaw rate flips sign the instant the car starts coming back, so a
  // driver holding opposite lock got read as having given up.
  // The deadzone matters: steering input decays smoothly, so "hands off" still
  // leaves a sliver of command. Without a threshold that sliver reads as
  // deliberate opposite lock and the car helpfully lets you spin.
  const counterSteering = Math.abs(V.vLat) > 1.5 && Math.abs(V.steerCmd) > 0.15 &&
    Math.sign(V.steerCmd) !== Math.sign(V.vLat);
  const trust = counterSteering ? TUNE.drift.counterTrust : 1;
  V.yawRate *= (1 - (TUNE.drift.yawDamp + TUNE.drift.autoSettle * trust) * dt);

  // slope: gravity component along the hill
  const n = terrainNormal(V.x, V.z);
  // Real gravity. It was once multiplied by 1.9 so cars would slide off steep
  // cone flanks; on a road climb that nearly doubled the pull backwards and made
  // every car feel short of power going uphill.
  const slopeF = new THREE.Vector3(n.x, 0, n.z).multiplyScalar(9.81 * TUNE.power.slopeGravity);
  V.vLong += (slopeF.x * fx + slopeF.z * fz) * dt;
  V.vLat += (slopeF.x * fz - slopeF.z * fx) * dt;

  /* Drift stabiliser: rotates velocity toward the nose to keep speed through a
   slide, limits yaw rate, and catches the car short of a spin. */
  const spNow = Math.hypot(V.vLong, V.vLat);
  if (spNow > 3.5) {
    const slipMag = Math.abs(Math.atan2(V.vLat, Math.abs(V.vLong)));

    // Rotate the velocity vector toward where the nose points. A true rotation,
    // so speed is preserved through a slide.
    if (V.vLong > 0 && !V.driftCtl) {
      // Quadratic, so a deliberate 20-40 deg drift is barely corrected while a
      // 60 deg spin is caught hard.
      const rate = clamp(slipMag / 0.9, 0, 1) * clamp(slipMag / 0.9, 0, 1)
        * (0.55 + surf.grip * 0.75) * TUNE.drift.redirect;
      const d = Math.min(rate * dt, slipMag);
      const c = Math.cos(d), sn = Math.sin(d) * Math.sign(V.vLat);
      const nl = V.vLong * c + V.vLat * sn;
      const nt = V.vLat * c - V.vLong * sn;
      V.vLong = nl; V.vLat = nt;
    }

    // Never rotate faster than the car's speed can justify. The floor matters:
    // set it too low and the cap also strangles low-speed manoeuvring.
    const maxYaw = clamp(spNow / TUNE.drift.maxYawDiv, TUNE.drift.maxYawFloor, TUNE.drift.maxYawCeil);
    V.yawRate = clamp(V.yawRate, -maxYaw, maxYaw);

    // past ~55 deg a slide stops being recoverable and just spins: pull it back
    if (slipMag > TUNE.drift.catchAngle) {
      const over = clamp((slipMag - TUNE.drift.catchAngle) / 0.5, 0, 1);
      V.yawRate -= Math.sign(V.yawRate) * over * TUNE.drift.catchStrength * trust * dt;
      V.vLat -= V.vLat * over * 2.2 * dt;
    }
  }

  V.spPrev = Math.hypot(V.vLong, V.vLat);

  /* Drift controller (cars with driftCtrl). Past a threshold slip angle,
   steering sets how fast the path turns rather than the wheel angle: more lock
   turns harder, centred holds the angle and runs on, opposite lock unwinds. */
  if (spec.driftCtrl !== false && V.vLong > 6) {
    const spdC = Math.hypot(V.vLong, V.vLat);
    const slipC = Math.atan2(V.vLat, Math.abs(V.vLong));
    V.driftCool = Math.max(0, (V.driftCool || 0) - dt);
    // just after a drift ends, it takes a deliberate slide to start another,
    // so the car does not swing straight back into one on its own
    const enter = TUNE.drift.ctrlEnter * (V.driftCool > 0 ? 1.8 : 1);
    const on = V.driftCtl ? Math.abs(slipC) > TUNE.drift.ctrlExit : Math.abs(slipC) > enter;
    if (on && !V.driftCtl) V.driftDir = -Math.sign(slipC);   // which way the corner goes
    if (!on && V.driftCtl) {
      /* The tyres bite as the drift ends: the rotation that was unwinding the
         car stops there, instead of carrying it past straight and into a slide
         the other way. */
      V.yawRate *= TUNE.drift.ctrlSettle;
      V.driftCool = 0.35;
    }
    V.driftCtl = on;
    if (on) {
      const dir = V.driftDir || -Math.sign(slipC);
      const tIn = clamp(V.steerCmd * dir, -1, 1);            // + into the corner, - counter
      // the path turns only as hard as you ask it to
      const wMax = TUNE.drift.ctrlTurn * clamp(spdC / 20, 0.7, 1.3);
      const pathRate = dir * Math.max(0, tIn) * wMax;
      // the angle is held at a target: throttle opens it, counter-steer closes it
      const thr = clamp(input.thr, 0, 1);
      const counter = Math.max(0, -tIn);                     // 0..1 of opposite lock
      const targetSlip = TUNE.drift.ctrlAngle * (0.55 + 0.45 * thr) * Math.max(0, 1 - counter * 1.6);
      // signed in the drift's own sense: goes negative if the car swings past
      // straight, so the correction always pushes back toward the target rather
      // than further round (an unsigned angle pushed the wrong way after overshoot)
      const slipMag = -slipC * dir;
      // opposite lock should close the angle decisively, not drift out of it
      const hold = TUNE.drift.ctrlHold * (1 + counter * TUNE.drift.ctrlUnwind);
      const bodyTarget = pathRate + dir * hold * (targetSlip - slipMag);
      V.yawRate = lerp(V.yawRate, bodyTarget, clamp(dt * TUNE.drift.ctrlYawRate, 0, 1));
      /* The controller owns the direction of travel: it is last frame's heading plus
   the requested turn, not the tyres' result plus a correction. */
      const aWant = aStart + pathRate * dt;
      let bWant = aWant - V.yaw;
      bWant = Math.atan2(Math.sin(bWant), Math.cos(bWant));
      const beta = Math.atan2(V.vLat, V.vLong);
      let db = bWant - beta;
      db = Math.atan2(Math.sin(db), Math.cos(db));
      const b2 = beta + db * TUNE.drift.ctrlBlend;
      V.vLong = spdC * Math.cos(b2);
      V.vLat = spdC * Math.sin(b2);
    }
  } else {
    V.driftCtl = false;
  }

  /* Visual steering angle for the front wheels. In a sustained slide they sit
     on opposite lock; while the car is rotating they come back to straight. */
  {
    const slipS = Math.atan2(V.vLat, Math.max(Math.abs(V.vLong), 0.5));
    const lockVis = TUNE.steer.lockLow * 1.15;
    const counter = clamp(slipS * TUNE.drift.visCounter, -lockVis, lockVis);
    const turning = clamp(Math.abs(V.yawRate) / TUNE.drift.visTurn, 0, 1);
    const gate = smooth(clamp((Math.abs(slipS) - 0.1) / 0.22, 0, 1)) * (V.vLong > 2 ? 1 : 0);
    const target = lerp(V.steer, counter * (1 - turning * 0.9), gate);
    V.steerVis += (target - V.steerVis) * clamp(dt * TUNE.drift.visRate, 0, 1);
  }

  // reverse is geared short and speed-limited, like a real gearbox
  if (V.vLong < 0) {
    const revCap = TUNE.power.reverseMax;
    if (-V.vLong > revCap) V.vLong = -revCap;
  }

  V.yaw += V.yawRate * dt;
  V.vx = V.vLong * fx + V.vLat * fz;
  V.vz = V.vLong * fz - V.vLat * fx;

  const nx = V.x + V.vx * dt, nz = V.z + V.vz * dt;
  V.x = nx; V.z = nz;

  // vertical: follow terrain, allow small air time off crests
  const ground = terrainH(V.x, V.z);
  if (V.y > ground + 0.12 || V.vy > 0) {
    V.vy -= 26 * dt;
    V.y += V.vy * dt;
    V.airborne = V.y > ground + 0.25;
    if (V.y <= ground) { 
      if (V.vy < -9) sfx.thud(clamp(-V.vy / 26, 0, 1));
      V.y = ground; V.vy = 0; V.airborne = false;
    }
  } else {
    const climb = ground - V.y;
    if (climb > 0.55 && Math.abs(V.vLong) > 6) {   // hit a wall of rock
      V.vLong *= 0.55;
    }
    V.y = lerp(V.y, ground, clamp(dt * 34, 0, 1));
    const dropRate = (ground - V.y) / Math.max(dt, 0.001);
    if (dropRate < -14) { V.vy = -2; }
    V.airborne = false;
  }

  // world bounds
  if (Math.abs(V.x) > BOUND_X) { V.x = Math.sign(V.x) * BOUND_X; V.vx *= -0.3; V.vLong *= 0.6; }
  if (Math.abs(V.z) > BOUND_Z) { V.z = Math.sign(V.z) * BOUND_Z; V.vz *= -0.3; V.vLong *= 0.6; }

  // drift bookkeeping
  const sp = Math.hypot(V.vx, V.vz);
  V.slip = sp > 2.5 ? Math.abs(Math.atan2(V.vLat, Math.abs(V.vLong))) : 0;
  V.driftAngle = V.slip;

  // below walking pace with no throttle, stop integrating tiny forces: they only
  // produce a shimmer on a stationary car
  if (launching) {
    // the handbrake holds it: bleed off any creep so revs can build cleanly
    V.vLong *= 0.55; V.vLat *= 0.55;
    V.vx = V.vLong * fx + V.vLat * fz;
    V.vz = V.vLong * fz - V.vLat * fx;
  }
  if (Math.abs(V.vLong) < 0.25 && Math.abs(V.vLat) < 0.25 && input.thr < 0.05) {
    V.vx = 0; V.vz = 0; V.vLong = 0; V.vLat = 0; V.yawRate *= 0.5;
  }

  collide(dt);
}

/* ---------- collisions against buildings, trees, posts ---------- */
const CAR_R = 1.5;
let lastCrash = 0;

/* colliders are bucketed into cells: a query tests a dozen boxes, not thousands */
const CELL = 60;
const cellMap = new Map();
const cellKey = (cx, cz) => cx * 10007 + cz;
function buildColliderGrid() {
  cellMap.clear();
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const x0 = Math.floor((c.x - c.hw - 4) / CELL), x1 = Math.floor((c.x + c.hw + 4) / CELL);
    const z0 = Math.floor((c.z - c.hd - 4) / CELL), z1 = Math.floor((c.z + c.hd + 4) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const k = cellKey(cx, cz);
      let arr = cellMap.get(k);
      if (!arr) { arr = []; cellMap.set(k, arr); }
      arr.push(c);
    }
  }
}
const _near = [];
function nearbyColliders(x, z) {
  _near.length = 0;
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const arr = cellMap.get(cellKey(cx + i, cz + j));
    if (arr) for (let k = 0; k < arr.length; k++) if (_near.indexOf(arr[k]) < 0) _near.push(arr[k]);
  }
  return _near;
}

/* Knock a lamp post down: instanced geometry can't be deleted, so the instance
   is collapsed to nothing and its collider retired. */
const _zeroM = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);
function breakProp(c) {
  c.broken = true;
  c.parts.forEach(p => {
    if (!p.im) return;
    p.im.setMatrixAt(p.idx, _zeroM);
    p.im.instanceMatrix.needsUpdate = true;
  });
  sfx.crash(0.45);
  if (typeof puff === 'function') {
    for (let i = 0; i < 6; i++) puff(c.x + rr(-1, 1), 1 + Math.random() * 2, c.z + rr(-1, 1));
  }
}

function breakRail(seg) {
  if (seg.broken) return;
  seg.broken = true;
  seg.cols.forEach(c => { c.broken = true; });
  seg.parts.forEach(p => {
    if (!p.im) return;
    p.im.setMatrixAt(p.idx, _zeroM);
    p.im.instanceMatrix.needsUpdate = true;
  });
  sfx.crash(0.7);
  if (typeof puff === 'function') {
    const c = seg.cols[0];
    for (let i = 0; i < 8; i++) puff(c.x + rr(-1.5, 1.5), (c.y0 || 0) + 1 + Math.random() * 2, c.z + rr(-1.5, 1.5), 0xb9b3a4);
  }
}

function collide(dt) {
  const r = CAR_R + spec.shape.len * 0.22;
  const list = nearbyColliders(V.x, V.z);
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (c.broken) continue;
    // On the mountain, laps stack above each other: a rail on the road above
    // must not stop a car driving along the road below it.
    if (c.y0 !== undefined && V.y + 1.5 < c.y0) continue;
    const dx = V.x - c.x, dz = V.z - c.z;
    if (Math.abs(dx) > c.hw + r + 2 || Math.abs(dz) > c.hd + r + 2) continue;
    if (V.y > c.h) continue;
    // closest point on AABB
    const cx = clamp(V.x, c.x - c.hw, c.x + c.hw);
    const cz2 = clamp(V.z, c.z - c.hd, c.z + c.hd);
    let ox = V.x - cx, oz = V.z - cz2;
    let d = Math.hypot(ox, oz);
    if (d > r) continue;
    if (d < 0.0001) { ox = dx || 1; oz = dz; d = Math.hypot(ox, oz); }
    const nxr = ox / d, nzr = oz / d;
    const vn = V.vx * nxr + V.vz * nzr;
    // Guard rails hold a car that brushes them and give way to one that hits
    // them hard, taking a good bite out of its speed on the way through.
    if (c.rail && vn < 0 && -vn > TUNE.world.railBreak) {
      breakRail(c.seg);
      V.vx *= 0.72; V.vz *= 0.72;
      const fxr = Math.sin(V.yaw), fzr = Math.cos(V.yaw);
      V.vLong = V.vx * fxr + V.vz * fzr;
      V.vLat = V.vx * fzr - V.vz * fxr;
      onImpact(-vn * 0.6, false);
      continue;
    }
    if (c.soft) {
      // saplings, bushes, lamp posts: they scrub speed and shake the car, never trap it
      if (vn < 0) {
        const impact = -vn;
        V.vx *= 0.99; V.vz *= 0.99;
        const fxs = Math.sin(V.yaw), fzs = Math.cos(V.yaw);
        V.vLong = V.vx * fxs + V.vz * fzs;
        V.vLat = V.vx * fzs - V.vz * fxs;
        if (c.parts && impact > 5) breakProp(c);
        if (impact > 9 && performance.now() - lastCrash > 320) {
          lastCrash = performance.now();
          sfx.crash(0.25); onImpact(impact * 0.35, true);
        }
      }
      continue;
    }
    const push = r - d;
    V.x += nxr * push; V.z += nzr * push;
    if (vn < 0) {
      const impact = -vn;
      V.vx -= 1.34 * vn * nxr;
      V.vz -= 1.34 * vn * nzr;
      V.vx *= 0.72; V.vz *= 0.72;
      const fx = Math.sin(V.yaw), fz = Math.cos(V.yaw);
      V.vLong = V.vx * fx + V.vz * fz;
      V.vLat = V.vx * fz - V.vz * fx;
      V.yawRate *= 0.5;
      if (impact > 5 && performance.now() - lastCrash > 180) {
        lastCrash = performance.now();
        sfx.crash(clamp(impact / 26, 0.15, 1));
        onImpact(impact, false);
      }
    }
  }
}

/* ---------- camera ---------- */
const CAM = {
  mode: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), shake: 0,
  orbitYaw: 0, orbitPitch: 0, dragging: false, lookBack: false
};
function updateCamera(dt, carObj) {
  const sp = Math.hypot(V.vx, V.vz);
  // draw from the interpolated pose, not the raw physics state
  const cx = typeof VIEW !== 'undefined' ? VIEW.x : V.x;
  const cy = typeof VIEW !== 'undefined' ? VIEW.y : V.y;
  const cz = typeof VIEW !== 'undefined' ? VIEW.z : V.z;
  const cyaw = typeof VIEW !== 'undefined' ? VIEW.yaw : V.yaw;
  const fx = Math.sin(cyaw), fz = Math.cos(cyaw);
  if (CAM.mode === 2) { // bonnet
    const eye = cy + spec.shape.hgt * 0.55 + TUNE.camera.fpHeight;
    const p = new THREE.Vector3(cx - fx * 0.1, eye, cz - fz * 0.1);
    camera.position.lerp(p, clamp(dt * 22, 0, 1));
    CAM.look.set(cx + fx * 30, eye + 0.2, cz + fz * 30);
    camera.lookAt(CAM.look);
    camera.fov = lerp(camera.fov, 68 + clamp(sp / 12, 0, TUNE.camera.fpFovGain), clamp(dt * 4, 0, 1));
  } else {
    const far = CAM.mode === 1;
    const dist = (far ? TUNE.camera.dist * 1.52 : TUNE.camera.dist)
      + clamp(sp * 0.035, 0, TUNE.camera.speedPull);
    const baseHgt = (far ? TUNE.camera.height * 1.53 : TUNE.camera.height) + clamp(sp * 0.02, 0, 1.2);
    // A little of the car's sideways velocity swings the camera round to
    // its flank, which reads as the tail whipping out. Keep it subtle: the camera
    // sits behind the car and the nose does the turning.
    const driftLean = clamp(V.vLat * 0.05 * TUNE.camera.driftLean, -0.3, 0.3);
    // free look springs back once you let go; look-back is held
    if (!CAM.dragging) {
      const back = clamp(dt * TUNE.camera.recentre, 0, 1);
      CAM.orbitYaw = lerp(CAM.orbitYaw, 0, back);
      CAM.orbitPitch = lerp(CAM.orbitPitch, 0, back);
    }
    const camYaw = cyaw + driftLean + CAM.orbitYaw + (CAM.lookBack ? Math.PI : 0);
    /* Orbiting keeps the same distance from the car: pitch swings the camera up
       and in along a sphere rather than simply raising it. */
    const horiz = dist * Math.cos(CAM.orbitPitch);
    const want = new THREE.Vector3(
      cx - Math.sin(camYaw) * horiz,
      cy + baseHgt + dist * Math.sin(CAM.orbitPitch),
      cz - Math.cos(camYaw) * horiz
    );
    want.y = Math.max(want.y, terrainH(want.x, want.z) + 1.6);
    camera.position.lerp(want, clamp(dt * (far ? TUNE.camera.lag * 0.65 : TUNE.camera.lag), 0, 1));
    /* Aim ahead of the car when driving, but at the car itself while looking
       around, so it turns on the spot instead of swinging about its nose. */
    const orbiting = clamp((Math.abs(CAM.orbitYaw) + Math.abs(CAM.orbitPitch)) / 0.3, 0, 1);
    const ahead = 8 * (1 - Math.max(orbiting, CAM.lookBack ? 1 : 0));
    CAM.look.lerp(new THREE.Vector3(cx + fx * ahead, cy + TUNE.camera.lookHeight, cz + fz * ahead),
      clamp(dt * 8, 0, 1));
    camera.lookAt(CAM.look);
    camera.fov = lerp(camera.fov, TUNE.camera.fov + clamp(sp / 9, 0, TUNE.camera.fovGain) + V.slip * 4,
      clamp(dt * 3.4, 0, 1));
  }
  if (CAM.shake > 0.001) {
    camera.position.x += rr(-1, 1) * CAM.shake;
    camera.position.y += rr(-1, 1) * CAM.shake * 0.6;
    CAM.shake *= Math.pow(0.02, dt);
  }
  camera.updateProjectionMatrix();
}

/* ---------- audio ---------- */
const sfx = (() => {
  let ac = null, engineOsc, engineOsc2, engineGain, engineFilter,
    skidSrc, skidGain, skidFilter, windGain, ready = false;
  function noiseBuffer() {
    const len = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function init() {
    if (ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC(); ready = true;
    engineGain = ac.createGain(); engineGain.gain.value = 0;
    engineFilter = ac.createBiquadFilter();
    engineFilter.type = 'lowpass'; engineFilter.frequency.value = 900; engineFilter.Q.value = 3;
    engineOsc = ac.createOscillator(); engineOsc.type = 'sawtooth';
    engineOsc2 = ac.createOscillator(); engineOsc2.type = 'square';
    const g2 = ac.createGain(); g2.gain.value = 0.35;
    engineOsc.connect(engineFilter); engineOsc2.connect(g2); g2.connect(engineFilter);
    engineFilter.connect(engineGain); engineGain.connect(ac.destination);
    engineOsc.start(); engineOsc2.start();

    skidSrc = ac.createBufferSource(); skidSrc.buffer = noiseBuffer(); skidSrc.loop = true;
    skidFilter = ac.createBiquadFilter(); skidFilter.type = 'bandpass';
    skidFilter.frequency.value = 1700; skidFilter.Q.value = 1.6;
    skidGain = ac.createGain(); skidGain.gain.value = 0;
    skidSrc.connect(skidFilter); skidFilter.connect(skidGain); skidGain.connect(ac.destination);
    skidSrc.start();

    const windSrc = ac.createBufferSource(); windSrc.buffer = noiseBuffer(); windSrc.loop = true;
    const wf = ac.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 420;
    windGain = ac.createGain(); windGain.gain.value = 0;
    windSrc.connect(wf); wf.connect(windGain); windGain.connect(ac.destination);
    windSrc.start();
  }
  function blip(freq, dur, type, vol) {
    if (!ready) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur + 0.02);
  }
  return {
    init,
    get on() { return ready; },
    update(rpm, thr, slipAmt, speed, muted) {
      if (!ready) return;
      const base = 26 + (rpm / 60) * 1.9;
      engineOsc.frequency.setTargetAtTime(base, ac.currentTime, 0.03);
      engineOsc2.frequency.setTargetAtTime(base * 0.5, ac.currentTime, 0.03);
      engineFilter.frequency.setTargetAtTime(500 + rpm * 0.28 + thr * 900, ac.currentTime, 0.05);
      engineGain.gain.setTargetAtTime(muted ? 0 : 0.055 + thr * 0.05, ac.currentTime, 0.08);
      skidGain.gain.setTargetAtTime(muted ? 0 : clamp(slipAmt, 0, 1) * 0.13, ac.currentTime, 0.05);
      skidFilter.frequency.setTargetAtTime(1200 + clamp(slipAmt, 0, 1) * 1400, ac.currentTime, 0.1);
      windGain.gain.setTargetAtTime(muted ? 0 : clamp(speed / 90, 0, 1) * 0.06, ac.currentTime, 0.1);
    },
    shift() { blip(220, 0.06, 'square', 0.05); },
    crash(v) { 
      if (!ready) return;
      const o = ac.createBufferSource(); o.buffer = noiseBuffer();
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + v * 900;
      const g = ac.createGain(); g.gain.setValueAtTime(0.16 * v, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.34);
      o.connect(f); f.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.36);
    },
    thud(v) { blip(90, 0.12, 'sine', 0.1 * v); },
    chime() { blip(880, 0.16, 'triangle', 0.09); setTimeout(() => blip(1320, 0.22, 'triangle', 0.08), 110); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.28, 'triangle', 0.09), i * 120)); },
    horn() { blip(392, 0.28, 'sawtooth', 0.06); blip(494, 0.28, 'sawtooth', 0.05); }
  };
})();
