/* ============================================================
   Part 2: the city — blocks, buildings, props, destinations
   ============================================================ */

const HOUSE_COLS = [0xd8d2c4, 0xc9c1ae, 0xb8b0a0, 0xdfdacd, 0xa89e8c, 0xc6bba6];
const ROOF_COLS  = [0x39424f, 0x4a4038, 0x5b6270, 0x2f3a44, 0x6b4f3f];
const TOWER_COLS = [0xb9c2cb, 0xa9b3bf, 0xc8cfd6, 0x99a5b2, 0xd2d6da];
const NEON_COLS  = [0xff4d6d, 0x35d0ff, 0xffd447, 0x8affc1, 0xff8a3d, 0xc77dff];
const SHOP_COLS  = [0xa8564c, 0xc0964e, 0x5b7683, 0x776685, 0xb0745c, 0x51705f];
const PINE_COLS  = [0x2f4a2e, 0x35532f, 0x28422a, 0x3d5a35, 0x24392a];
const LEAF_COLS  = [0x556d40, 0x627a4a, 0x4a6238, 0x6d8353, 0x415733];

const buildings = [];   // {x,z,w,d,h,type,name,deliver}
const colliders = [];   // AABB {x,z,hw,hd,h}
const destinations = [];

const SHOP_NAMES = ['Bear Books', 'Bright Laundry', 'Marlow Hardware', 'The Cat Café', 'Hillside Deli',
  'Blue Door Barbers', 'Moon Records', 'Blossom Florist', 'Ashby Bicycles', 'Summit Photo', 'Corner Stores',
  'Rainy Day Umbrellas', 'Woodland Tea Rooms', 'Threadbare Tailors', 'Salt & Flour Bakery'];
const OFFICE_NAMES = ['Han Tower', 'Halloran Holdings Fl.9', 'Sandford Print Works', 'Northway Shipping',
  'Blue Heron Design', 'Kirkwood Legal', 'Cranebridge Insurance', 'Meridian Games Fl.14', 'Westhill Broadcasting'];
const HOUSE_NAMES = ['the Whitlock house', 'the Averill house', 'apartment 3B', 'the Deane place',
  'the corner house', 'the Fairbrother family', 'apartment 12F', 'the Sandoval house', 'the blue-gate house',
  'the Hartley place', 'apartment 7C', 'the house with the plum tree'];

function districtOf(x, z) {
  const dCity = Math.hypot(x - 120, z - 30);
  const dMtn = Math.hypot(x - MTN.x, z - MTN.z);
  if (dMtn < MTN.r + 130) return 'rural';
  if (dCity < 210) return 'downtown';
  if (dCity < 380) return 'town';
  return 'rural';
}

function generateCity(instancers) {
  const step = 24;
  for (let x = -BOUND_X + 30; x < BOUND_X - 30; x += step) {
    for (let z = -BOUND_Z + 30; z < BOUND_Z - 30; z += step) {
      const px = x + rr(-6, 6), pz = z + rr(-6, 6);
      if (Math.hypot(px - MTN.x, pz - MTN.z) < MTN.r + 16) continue;
      if (Math.abs(px) > CITY_X) continue;        // the town stops at the plate
      const road = nearestRoadInfo(px, pz);
      if (road.d < road.road.w + 12) continue;              // road + sidewalk
      let onDirt = false;
      for (const d of DIRT) if (pathDist(px, pz, d).d < d.w + 6) { onDirt = true; break; }
      if (onDirt) continue;
      if (Math.hypot(px - HQ.x, pz - HQ.z) < 30) continue;   // shop plot
      if (Math.hypot(px - HQ.x, pz - (HQ.z - 13)) < 24) continue;   // forecourt

      const dist = districtOf(px, pz);
      const nearRoad = road.d < road.road.w + 48;
      const roll = rnd();

      // Parks and empty lots keep the city breathing
      if ((dist === 'rural' && roll < 0.55) || (dist === 'town' && roll < 0.24) || (dist === 'downtown' && roll < 0.07)) {
        scatterGreen(px, pz, instancers, dist);
        continue;
      }

      let type;
      if (dist === 'downtown') type = roll < 0.46 ? 'tower' : (roll < 0.78 ? 'shop' : 'block');
      else if (dist === 'town') type = roll < 0.42 ? 'shop' : (roll < 0.56 ? 'block' : 'house');
      else type = roll < 0.86 ? 'house' : 'shop';
      if (type === 'shop' && !nearRoad) type = 'house';

      addBuilding(px, pz, type, road, instancers);
    }
  }

  // roadside furniture
  for (const r of ROADS) lampsAlong(r, instancers, true);
  for (const d of DIRT) lampsAlong(d, instancers, false);
  for (const r of ROADS) utilityLine(r, instancers);
}

/* Timber poles down one side of each road, with crossarms and strung cable.
   Cheap, and it does more for a street's silhouette than another building would. */
function utilityLine(path, inst) {
  const poles = [];
  const spacing = 46;
  for (let i = 0; i < path.pts.length - 1; i++) {
    const a = path.pts[i], b = path.pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.floor(len / spacing));
    const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const px = lerp(a[0], b[0], t), pz = lerp(a[1], b[1], t);
      const off = path.w + 6.5;
      const x = px - dz * off, z = pz + dx * off;
      if (Math.hypot(x - MTN.x, z - MTN.z) < MTN.r + 4) continue;
      if (Math.abs(x) > BOUND_X || Math.abs(z) > BOUND_Z) continue;
      // A traced network has roads meeting at all angles, and a pole offset
      // blindly from one road lands in the middle of another.
      let onRoad = false;
      for (const other of ROADS) {
        if (pathDist(x, z, other).d < paveHalf(other.w) * 0.92) { onRoad = true; break; }
      }
      if (onRoad) continue;
      const rot = Math.atan2(dx, dz);
      inst.utility.push({ x, y: pavementH(x, z), z, rot, sx: 1, sy: 1, sz: 1, colIdx: 0 });
      const py = pavementH(x, z);
      inst.crossarm.push({ x, y: py + 9.5, z, rot, sx: 3.2, sy: 0.16, sz: 0.16, colIdx: 0 });
      inst.crossarm.push({ x, y: py + 8.3, z, rot, sx: 2.4, sy: 0.14, sz: 0.14, colIdx: 0 });
      colliders.push({ x, z, hw: 0.5, hd: 0.5, h: 11, soft: true });
      poles.push({ x, z, rot, hy: py + 9.5 });
    }
  }
  inst._poleRuns = inst._poleRuns || [];
  inst._poleRuns.push(poles);
}

/* A door number from how far along its street the building stands: odd numbers
   on one side, even on the other, the way a real street is numbered. */
function streetAddress(x, z, path) {
  const r = pathDist(x, z, path);
  let along = 0;
  for (let i = 0; i < r.seg; i++) along += Math.hypot(path.pts[i + 1][0] - path.pts[i][0], path.pts[i + 1][1] - path.pts[i][1]);
  const a = path.pts[r.seg], b = path.pts[r.seg + 1];
  along += Math.hypot(b[0] - a[0], b[1] - a[1]) * r.t;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = (b[1] - a[1]) / L, nz = -(b[0] - a[0]) / L;
  const side = ((x - a[0]) * nx + (z - a[1]) * nz) > 0 ? 1 : 0;
  const n = Math.max(1, Math.round(along / 11) * 2 + side + 1);
  return n + ' ' + path.name;
}

function addBuilding(x, z, type, road, inst) {
  const face = pathHeading(road.road, road.seg) + (rnd() < 0.5 ? 0 : Math.PI);
  const rot = Math.round(face / (Math.PI / 2)) * (Math.PI / 2) + rr(-0.05, 0.05);
  let w, d, h, name, deliver = false, colIdx;

  if (type === 'tower') {
    w = rr(13, 20); d = rr(13, 20); h = rr(34, 96);
    colIdx = h > 62 ? 2 : 1;              // facade band, not a colour index
    name = pick(OFFICE_NAMES); deliver = true;
  } else if (type === 'block') {
    w = rr(14, 21); d = rr(12, 18); h = rr(14, 26);
    colIdx = 0;
    name = rnd() < 0.5 ? pick(OFFICE_NAMES) : pick(HOUSE_NAMES); deliver = true;
  } else if (type === 'shop') {
    w = rr(11, 17); d = rr(10, 15); h = rr(7, 12);
    colIdx = ri(0, SHOP_COLS.length - 1);
    name = pick(SHOP_NAMES); deliver = true;
  } else {
    w = rr(8, 13); d = rr(8, 12); h = rr(5.5, 8.5);
    colIdx = ri(0, HOUSE_COLS.length - 1);
    name = pick(HOUSE_NAMES); deliver = rnd() < 0.8;
  }

  // every address gets a door number and a street, so no two drops read alike
  const addr = road && road.road ? streetAddress(x, z, road.road) : '';
  if (addr) name = /^the |^apartment /.test(name) ? name + ', ' + addr : name + ', ' + addr;
  const b = { x, z, w, d, h, rot, type, name, colIdx, deliver, addr: addr };
  buildings.push(b);

  const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
  colliders.push({ x, z, hw: (w * c + d * s) / 2, hd: (w * s + d * c) / 2, h });

  // queue instances
  inst.wall[type === 'house' ? 'house' : (type === 'shop' ? 'shop' : 'tower')].push(
    { x, y: h / 2, z, rot, sx: w, sy: h, sz: d, colIdx });

  if (type === 'house' || type === 'shop') {
    inst.roof.push({ x, y: h + (type === 'house' ? 1.9 : 0.5), z, rot: rot + Math.PI / 4,
      sx: w * 1.12, sy: type === 'house' ? 3.8 : 1.0, sz: d * 1.12, colIdx: ri(0, ROOF_COLS.length - 1) });
  } else {
    inst.cap.push({ x, y: h + 0.4, z, rot, sx: w * 0.94, sy: 0.8, sz: d * 0.94, colIdx: 0 });
    if (rnd() < 0.6) inst.aircon.push({ x: x + rr(-3, 3), y: h + 1.6, z: z + rr(-3, 3), rot, sx: 2.4, sy: 1.6, sz: 2.4, colIdx: 0 });
  }
  if (type === 'shop') {
    // awning / awning strip facing the road
    inst.awning.push({ x: x + Math.sin(rot) * (d / 2 + 1.2), y: h * 0.55, z: z + Math.cos(rot) * (d / 2 + 1.2),
      rot, sx: w * 0.9, sy: 0.5, sz: 2.6, colIdx: ri(0, SHOP_COLS.length - 1) });
    // vertical neon board, the thing that reads as a Japanese shopping street at dusk
    if (rnd() < 0.75) {
      const sh = rr(2.2, 4.2);
      inst.neon.push({
        x: x + Math.sin(rot) * (d / 2 + 0.9) + Math.cos(rot) * (w / 2 - 1.2),
        y: h * 0.62 + sh / 2,
        z: z + Math.cos(rot) * (d / 2 + 0.9) - Math.sin(rot) * (w / 2 - 1.2),
        rot, sx: 0.9, sy: sh, sz: 0.32, colIdx: ri(0, NEON_COLS.length - 1)
      });
    }
    if (rnd() < 0.55) inst.vending.push({ x: x + Math.sin(rot) * (d / 2 + 2.6) + rr(-3, 3), y: 1.6,
      z: z + Math.cos(rot) * (d / 2 + 2.6) + rr(-3, 3), rot, sx: 1, sy: 1, sz: 1, colIdx: 0 });
  }
  if (type === 'house') {
    if (rnd() < 0.7) scatterGreen(x + rr(-9, 9), z + rr(-9, 9), inst, 'yard', 1);
    if (rnd() < 0.4) inst.fence.push({ x, y: 0.8, z, rot, sx: w * 1.5, sy: 1.6, sz: 0.3, colIdx: 0 });
  }

  if (deliver) {
    // Drop points sit on the road outside the building, never against a wall or
    // in an interior courtyard you can't reach. Buildings too far from any road
    // take no deliveries.
    const near = nearestRoadInfo(x, z);
    if (near && near.d < 60) {
      const cp = pointOnPath(near.road, near.seg, near.t);
      let vx = x - cp[0], vz = z - cp[1];
      const l = Math.hypot(vx, vz) || 1; vx /= l; vz /= l;
      const off = Math.max(2.4, near.road.w - 3.4);     // just inside the kerb
      let ex = cp[0] + vx * off, ez = cp[1] + vz * off;
      // near a bend the offset can push past the kerb; fall back to the centreline
      if (surfaceAt(ex, ez) !== SURF.road) { ex = cp[0]; ez = cp[1]; }
      if (surfaceAt(ex, ez) === SURF.road && Math.hypot(ex - MTN.x, ez - MTN.z) > MTN.r + 6) {
        destinations.push({ b, name, x: ex, z: ez, type });
      }
    }
  }
}

function scatterGreen(x, z, inst, kind, forceCount) {
  const n = forceCount || (kind === 'rural' ? ri(3, 7) : ri(1, 4));
  for (let i = 0; i < n; i++) {
    const px = x + rr(-11, 11), pz = z + rr(-11, 11);
    if (onAnyPath(px, pz, 5)) continue;
    if (Math.hypot(px - MTN.x, pz - MTN.z) < MTN.r + 8) continue;
    const roll = rnd();
    if (roll < 0.62) {
      const s = rr(0.75, 1.6);
      inst.trunk.push({ x: px, y: 2.6 * s, z: pz, rot: 0, sx: s, sy: s, sz: s, colIdx: 0 });
      inst.leaf.push({ x: px, y: 6.4 * s, z: pz, rot: rr(0, TAU), sx: s, sy: s * rr(0.85, 1.2), sz: s,
        colIdx: ri(0, LEAF_COLS.length - 1) });
      colliders.push({ x: px, z: pz, hw: 0.9 * s, hd: 0.9 * s, h: 6 * s, soft: true });
    } else if (roll < 0.86) {
      const s = rr(0.7, 1.5);
      inst.bush.push({ x: px, y: 0.8 * s, z: pz, rot: rr(0, TAU), sx: s, sy: s, sz: s, colIdx: ri(0, LEAF_COLS.length - 1) });
    } else {
      inst.rock.push({ x: px, y: 0.5, z: pz, rot: rr(0, TAU), sx: rr(0.7, 1.6), sy: rr(0.5, 1.1), sz: rr(0.7, 1.6), colIdx: 0 });
    }
  }
}

function lampsAlong(path, inst, sealed) {
  const spacing = sealed ? 24 : 55;
  for (let i = 0; i < path.pts.length - 1; i++) {
    const a = path.pts[i], b = path.pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(len / spacing);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const px = lerp(a[0], b[0], t), pz = lerp(a[1], b[1], t);
      let dx = b[0] - a[0], dz = b[1] - a[1];
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      // stand them in the middle of the footway, not at the kerb line
      const off = sealed ? (path.w + paveHalf(path.w)) / 2 : path.w + 3.4;
      const side = (k % 2 === 0 ? 1 : -1) * off;
      const x = px - dz * side, z = pz + dx * side;
      if (Math.hypot(x - MTN.x, z - MTN.z) < MTN.r + 4) continue;
      // a junction has no footway, so a post there stands in the carriageway
      if (sealed && crossesOtherRoad(x, z, path.id)) continue;
      const rot = Math.atan2(dz * side, -dx * side);
      if (sealed) {
        const pole = { x, y: pavementH(x, z), z, rot, sx: 1, sy: 1, sz: 1, colIdx: 0 };
        const bulb = { x, y: pavementH(x, z) + 8.4, z, rot, sx: 1, sy: 1, sz: 1, colIdx: 0 };
        inst.lamp.push(pole);
        inst.bulb.push(bulb);
        colliders.push({ x, z, hw: 0.45, hd: 0.45, h: 9, soft: true, parts: [pole, bulb] });
      } else {
        inst.post.push({ x, y: 0, z, s: 1 });
      }
    }
  }
}

/* ---------- instanced mesh assembly ---------- */
function makeInstancers() {
  return {
    wall: { house: [], shop: [], tower: [] },
    roof: [], cap: [], aircon: [], awning: [], vending: [], fence: [], neon: [],
    trunk: [], leaf: [], bush: [], rock: [], lamp: [], bulb: [], post: [],
    utility: [], crossarm: [], rail: [], railPost: [], pineTrunk: [], pine: [], kerb: [], crowd: []
  };
}

function commitInstances(inst) {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const v3 = new THREE.Vector3(), s3 = new THREE.Vector3();

  function build(list, geo, colors, opts) {
    opts = opts || {};
    // bucket by colour: one instanced mesh per colour
    const buckets = {};
    for (const it of list) {
      const k = it.colIdx || 0;
      (buckets[k] = buckets[k] || []).push(it);
    }
    for (const k in buckets) {
      const items = buckets[k];
      const tex = opts.texSet ? opts.texSet[k % opts.texSet.length] : opts.tex;
      const mat = new THREE.MeshStandardMaterial({
        color: colors[k % colors.length],
        map: tex ? (tex.map || tex) : null,
        emissiveMap: tex && tex.emissive ? tex.emissive : null,
        envMap: opts.env ? ENV : null,
        envMapIntensity: opts.envI === undefined ? 0.4 : opts.envI,
        roughness: opts.rough === undefined ? 0.88 : opts.rough,
        metalness: opts.metal || 0,
        emissive: tex && tex.emissive ? 0xffffff
          : (opts.glowSelf ? colors[k % colors.length] : (opts.emissive || 0x000000)),
        emissiveIntensity: (tex && tex.emissive) || opts.glowSelf ? (opts.ei === undefined ? 1 : opts.ei) : (opts.ei || 0),
        flatShading: !!opts.flat
      });
      if (tex && tex.emissive) MATS.windows.push(mat);
      if (opts.glowSelf) MATS.neon.push(mat);
      const im = new THREE.InstancedMesh(geo, mat, items.length);
      im.castShadow = opts.cast !== false;
      im.receiveShadow = opts.receive !== false;
      items.forEach((it, i) => {
        it.im = im; it.idx = i;
        e.set(0, it.rot || 0, 0); q.setFromEuler(e);
        v3.set(it.x, it.y, it.z);
        s3.set(it.sx || 1, it.sy || 1, it.sz || 1);
        m4.compose(v3, q, s3);
        im.setMatrixAt(i, m4);
      });
      im.instanceMatrix.needsUpdate = true;
      world.add(im);
    }
  }

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  build(inst.wall.house, unitBox, HOUSE_COLS, { rough: 0.92, tex: TEX.plaster });
  build(inst.wall.shop, unitBox, SHOP_COLS, { rough: 0.72, tex: TEX.shopFront, ei: 0.9, env: true, envI: 0.2 });
  build(inst.wall.tower, unitBox, [0xffffff], {
    rough: 0.52, metal: 0.18, env: true, envI: 0.55, ei: 1.05,
    texSet: [TEX.towerLow, TEX.towerMid, TEX.towerTall]
  });
  build(inst.roof, new THREE.ConeGeometry(0.72, 1, 4), ROOF_COLS, { rough: 0.85, flat: true, tex: TEX.roof });
  build(inst.cap, unitBox, [0x8d939c], { rough: 0.7, metal: 0.2, env: true, envI: 0.35 });
  build(inst.aircon, unitBox, [0x8d9299], { rough: 0.7, metal: 0.3 });
  build(inst.awning, unitBox, SHOP_COLS, { rough: 0.65 });
  build(inst.vending, new THREE.BoxGeometry(1.5, 3.2, 1), [0xdd4b3e], { rough: 0.4, emissive: 0xff8a5c, ei: 0.35 });
  build(inst.fence, unitBox, [0x9a8a72], { rough: 0.95 });
  build(inst.trunk, new THREE.CylinderGeometry(0.42, 0.62, 5.4, 6), [0x6b4d35], { rough: 1 });
  build(inst.leaf, new THREE.SphereGeometry(3.5, 8, 6), LEAF_COLS, { rough: 1, flat: true });
  build(inst.bush, new THREE.SphereGeometry(1.5, 7, 5), LEAF_COLS, { rough: 1, flat: true });
  build(inst.rock, new THREE.DodecahedronGeometry(1.2, 0), [0x8b8578], { rough: 1, flat: true });
  build(inst.post, new THREE.CylinderGeometry(0.16, 0.2, 2.2, 5), [0xd8d2c2], { rough: 0.9, receive: false });

  // lamp posts: pole + arm baked into one geometry
  const poleG = new THREE.CylinderGeometry(0.2, 0.28, 8.6, 6);
  poleG.translate(0, 4.3, 0);
  build(inst.lamp, poleG, [0x4b5361], { rough: 0.75, metal: 0.25 });
  build(inst.bulb, new THREE.SphereGeometry(0.62, 8, 6), [0xffe0a0],
    { emissive: COL.lamp, ei: 1.35, cast: false, receive: false, rough: 0.4 });

  // neon shop boards
  build(inst.neon, unitBox, NEON_COLS, { rough: 0.35, cast: false, glowSelf: true, ei: 1.5 });

  // timber utility poles with crossarms — Han's overhead clutter
  const utilG = new THREE.CylinderGeometry(0.22, 0.3, 11, 6);
  utilG.translate(0, 5.5, 0);
  build(inst.utility, utilG, [0x6b5847], { rough: 0.95 });
  build(inst.crossarm, unitBox, [0x5f4d3d], { rough: 0.95, cast: false });

  // mountain guardrail
  // guard rails: galvanised steel
  build(inst.rail, unitBox, [0xd4d8dd], { rough: 0.26, metal: 0.92, env: true, envI: 1.25, cast: false });
  build(inst.railPost, unitBox, [0x8d939a], { rough: 0.4, metal: 0.85, env: true, envI: 0.9, cast: false });

  // mountain pines: a slim trunk under three stacked cones, so they read as
  // conifers, distinct from the town's broadleaf trees
  build(inst.pineTrunk, new THREE.CylinderGeometry(0.22, 0.38, 4.2, 6), [0x5a3f2b], { rough: 1 });
  build(inst.pine, pineGeometry(), PINE_COLS, { rough: 0.95, flat: true });

  // circuit kerbs (red, white, and black for the start line) and the crowd
  build(inst.kerb, unitBox, [0xd8342c, 0xf4f2ee, 0x1c1c1f], { rough: 0.7, cast: false });
  build(inst.crowd, unitBox, [0xc8453c, 0x2f6fb0, 0xf3b545, 0xf4f2ee, 0x3f8f5c, 0xe07a2e, 0x8a4fb0, 0x222428],
    { rough: 0.9, cast: false });
}

/* Three cones merged into one geometry so a pine is still one instance. */
function pineGeometry() {
  const tiers = [[3.3, 5.2, 0], [2.6, 4.6, 2.6], [1.8, 4.0, 5.0]];   // radius, height, base
  const pos = [], nrm = [];
  tiers.forEach(([r, h, y]) => {
    const g = new THREE.ConeGeometry(r, h, 8, 1).toNonIndexed();
    g.translate(0, y + h / 2, 0);
    g.computeVertexNormals();
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nrm.push(n[i]); }
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return out;
}

/* Catenary cables strung between poles. One merged line mesh, one draw call. */
function buildCables(poles) {
  const pos = [];
  for (let i = 0; i < poles.length - 1; i++) {
    const a = poles[i], b = poles[i + 1];
    const span = Math.hypot(b.x - a.x, b.z - a.z);
    if (span > 62) continue;                       // don't bridge across a junction
    const sag = Math.min(1.9, span * 0.045);
    for (const off of [-1.3, 0, 1.3]) {
      const ox = Math.cos(a.rot || 0) * off, oz = -Math.sin(a.rot || 0) * off;
      let px = a.x + ox, py = a.hy, pz = a.z + oz;
      const N = 6;
      for (let s = 1; s <= N; s++) {
        const t = s / N;
        const cx = lerp(a.x, b.x, t) + ox;
        const cz = lerp(a.z, b.z, t) + oz;
        const cy = lerp(a.hy, b.hy, t) - Math.sin(t * Math.PI) * sag;
        pos.push(px, py, pz, cx, cy, cz);
        px = cx; py = cy; pz = cz;
      }
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x23262b, transparent: true, opacity: 0.75 }));
}

/* ---------- HQ: the noodle counter ---------- */
const HQ = { x: 60, z: 24, rot: Math.PI + 0.05 };   // a plot just off a central street
function buildHQ(group) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0x3c3128, roughness: 0.85 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5f3c, roughness: 0.8 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xffe6b8, emissive: 0xffb454, emissiveIntensity: 1.1, roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 14), wall);
  body.position.y = 4; body.castShadow = true; body.receiveShadow = true;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(23, 1.2, 17), wood);
  roof.position.y = 8.6; roof.castShadow = true;
  const eave = new THREE.Mesh(new THREE.BoxGeometry(21, 3, 1.2), new THREE.MeshStandardMaterial({ color: 0xc8453c, roughness: 0.7 }));
  eave.position.set(0, 6.4, 8.2);
  const win = new THREE.Mesh(new THREE.BoxGeometry(16, 3.4, 0.6), glow);
  win.position.set(0, 3.2, 7.2);
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 10),
    new THREE.MeshStandardMaterial({ color: 0xf2e2c0, emissive: 0xff9c3c, emissiveIntensity: 1.5, roughness: 0.6 }));
  lantern.position.set(-7.5, 6.2, 8.6);
  const lantern2 = lantern.clone(); lantern2.position.x = 7.5;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 9, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xc8453c, emissive: 0x7a1f18, emissiveIntensity: 0.7, roughness: 0.6 }));
  sign.position.set(11.4, 6, 6);
  g.add(body, roof, eave, win, lantern, lantern2, sign);

  const l = new THREE.PointLight(0xffb066, 1.5, 62, 2);
  l.position.set(0, 7, 9);
  g.add(l);

  g.position.set(HQ.x, 0, HQ.z);
  g.rotation.y = HQ.rot;
  group.add(g);
  colliders.push({ x: HQ.x, z: HQ.z, hw: 11, hd: 8.6, h: 9 });

  // a small forecourt so you can slide in
  const pad = new THREE.Mesh(new THREE.CircleGeometry(19, 24),
    new THREE.MeshStandardMaterial({ color: 0x555a5f, roughness: 0.95 }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(HQ.x, 0.08, HQ.z - 13);
  pad.receiveShadow = true;
  group.add(pad);
}

/* A chunky arrow that floats over the roof and points at wherever you're headed:
   the current drop, or back to the shop when the boot is empty. */
function makeGuideArrow() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf3b545, emissive: 0xf3b545, emissiveIntensity: 0.7,
    roughness: 0.35, metalness: 0.25
  });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.58), mat);
  shaft.position.z = -0.17;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.44, 4), mat);
  head.rotation.x = Math.PI / 2;
  head.rotation.z = Math.PI / 4;
  head.position.z = 0.34;
  g.add(shaft, head);
  g.userData.mat = mat;
  g.visible = false;
  return g;
}

/* ---------- delivery marker (beam + ring) ---------- */
function makeMarker() {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 4.2, 46, 14, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf3b545, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 23;
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.4, 5.6, 28),
    new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3;
  const inner = new THREE.Mesh(new THREE.CircleGeometry(4.3, 28),
    new THREE.MeshBasicMaterial({ color: 0xf3b545, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  inner.rotation.x = -Math.PI / 2; inner.position.y = 0.28;
  g.add(beam, ring, inner);
  g.visible = false;
  return g;
}
