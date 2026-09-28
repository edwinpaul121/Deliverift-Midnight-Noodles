/* ============================================================
   Midnight Noodles — a delivery/drift game for Han
   Part 1: world data, terrain, surfaces, city generation
   ============================================================ */
'use strict';


/* Tuning constants. Press T in dev mode to adjust them live; "Copy JSON"
   returns a replacement for this block. */
const TUNE = {
  grip: {
    base: 1.95, front: 0.56, rear: 0.67, downforce: 0.35,
    stiffFront: 62, stiffRear: 72,
    falloffFront: 0.16, falloffRear: 0.5
  },
  steer: { lockLow: 0.46, lockHigh: 0.24, lockFade: 26, rate: 9, counterRate: 14 },
  drift: {
    redirect: 3.0, scrub: 0.05, recover: 4, recoverBand: 0.55,
    coastCarry: 0, coastDrag: 0, slideGrip: 0.26, slideSlip: 0.18,
    ctrlEnter: 0.26, ctrlExit: 0.12, ctrlTurn: 1.1, ctrlUnwind: 1.6,
    ctrlAngle: 0.5, ctrlHold: 3, ctrlYawRate: 6, ctrlBlend: 0.9, ctrlSettle: 0.2,
    visCounter: 1.25, visTurn: 1.1, visRate: 9, yawDamp: 0.9,
    autoSettle: 4.5, counterTrust: 0.02, liftHold: 0.55,
    maxYawDiv: 5, maxYawFloor: 1.6, maxYawCeil: 2.6,
    catchAngle: 0.95, catchStrength: 2.6, handbrakeRear: 0.3
  },
  power: { torqueScale: 1, brakeForce: 15, dragCd: 0.36, rollResist: 1.1, reverseMax: 11, slopeGravity: 1 },
  surface: { road: 1, dirt: 0.76, grass: 0.58, walk: 0.8, rock: 0.64 },
  camera: { dist: 11.2, height: 3.6, lookHeight: 2.5, fov: 60, lag: 7, shake: 1,
            speedPull: 0.12, fovGain: 5, fpHeight: 0.95, fpFovGain: 3,
            driftLean: 0.16, bodyRoll: 0.45, mouseSpeed: 0.9, recentre: 3.2 },
  look: { exposure: 1.14, sun: 1.85, ambient: 0.46, fog: 0.00122, windows: 1.05, neon: 1.5,
          timeOfDay: 9.5, dayLength: 420 },
  game: { fare: 1, timeAllowance: 1, driftScore: 2.6, driftXp: 0.2, driftCash: 1.0 },
  world: { carScale: 2.0, minimapSpan: 520, railBreak: 17 },
  nitro: { power: 1.55, drain: 0.42, refill: 0.055, driftGain: 0.00035 }
};
const TUNE_DEFAULTS = JSON.parse(JSON.stringify(TUNE));

/* Materials the look sliders need to reach. */
const MATS = { windows: [], neon: [] };

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
let seed = 20260909;
function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
const rr = (a, b) => a + (b - a) * rnd();
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = arr => arr[Math.floor(rnd() * arr.length)];

/* ---------- world constants ---------- */
const BOUND_X = 2150, BOUND_Z = 700;
const CITY_X = 780;        // the street plate; open country lies east of it
const MTN = {
  x: 1475, z: -60, r: 627, h: 220, topR: 40,
  roadW: 11           // half-width of the drivable shelf
};

/* Fox Mountain.
   Path data is traced from a reference sketch, then rebuilt with a hard limit
   on heading change so no corner is tighter than 16 m. The left-hand loop of
   the sketch becomes the race circuit. */
const MTN_TRACE = {
  pass: [[872.8,-58],[884.1,-61.9],[896.9,-77.2],[907.7,-81.8],[922.6,-76.8],[933.2,-64.9],[936.5,-57.7],[937.8,-45.8],[924.3,4.3],[924.5,32.2],[931,59.4],[938.3,78],[946.4,91.8],[957.1,103.7],[973,115.7],[991,124.3],[1068.6,143.5],[1098.7,154.5],[1126.8,169.7],[1141.6,183],[1147.7,193.3],[1150.1,209],[1136.8,250.8],[1136.3,266.7],[1145.5,288.6],[1162.2,305.7],[1194.4,321.5],[1282.5,347.8],[1399,390.1],[1453.9,400.7],[1477.9,401],[1497.7,398.5],[1528.6,390.1],[1562.1,377],[1598.3,360],[1636.6,338.4],[1674.9,309.7],[1687.9,294.5],[1696,280.7],[1700,261.3],[1695.7,241.8],[1681.9,222.4],[1653.7,200],[1645.8,191],[1640.5,176.1],[1642.5,164.3],[1652.2,151.8],[1670,142.9],[1689.4,138.3],[1729.3,135.3],[1748.4,129.7],[1760.2,119.2],[1762.6,103.8],[1755.4,89.7],[1738.5,79.3],[1715.1,74.1],[1675.2,71.8],[1664,67.8],[1655.3,59.7],[1652.9,52.2],[1654.4,44.4],[1659.4,38.1],[1677.5,30.1],[1701.2,26.6],[1831.3,48],[1859.3,49.7],[1891.1,46.9],[1918.4,40.6],[1943.9,29.2],[1966.6,12.9],[1982.2,-5.3],[1993.6,-30.7],[1996.3,-58.5],[1976.5,-205.1],[1968.4,-231.8],[1957.9,-248.8],[1943.1,-262.1],[1925,-270.3],[1893.3,-274.2],[1837.8,-267.5],[1813.8,-267.5],[1746.4,-276.7],[1682.6,-280.3],[1612.1,-294.8],[1588.2,-296.7],[1560.6,-292.4],[1488.3,-269],[1417.1,-259],[1393.8,-253.2],[1379.3,-246.5],[1367,-236.3],[1357.9,-223.2],[1354.4,-211.8],[1356.4,-196.1],[1373.8,-174.4],[1377.1,-167.1],[1377.5,-155.2],[1374.1,-148],[1368.6,-142.3],[1357.9,-136.9],[1318.5,-130.2],[1303.4,-125],[1297.1,-120.1],[1291.7,-109.5],[1292,-101.6],[1298.8,-91.9],[1330.9,-76.4],[1334.9,-65.3],[1332.7,-57.7],[1327.1,-52],[1316.4,-46.8],[1289,-41.3],[1229.1,-40.8],[1210,-46.6],[1193.8,-58.1],[1179.6,-77.4],[1171.3,-99.9],[1167.6,-123.5],[1165.5,-171.5],[1158.5,-194.3],[1148.4,-206.6],[1137.7,-211.6],[1125.7,-211.6],[1115.1,-206.2],[1107,-197.4],[1101.5,-186.8],[1095,-159.7],[1095.5,-127.7],[1102,-92.4],[1112.5,-62.1],[1126.4,-37.9],[1145.2,-17.3],[1167.9,-0.9],[1189.7,9],[1212.8,15.4],[1244.6,19.1],[1284.6,20.1],[1320.5,18.9],[1348.1,14.3],[1418.8,-13.4],[1434.3,-17.1],[1458.1,-14.7],[1468.9,-9.6],[1477.8,-1.6],[1486.4,11.8],[1488.3,23.6],[1486.3,35.4],[1479,49.6],[1461.8,66.2],[1395.9,111.6]],
  track: [[1644.2,-553.4],[1654.7,-568.4],[1659.8,-581],[1657.3,-598.9],[1650.6,-610.9],[1638.5,-624.5],[1623.7,-635.4],[1581.1,-652],[1531,-659.3],[1439.3,-651.6],[1403.3,-643.8],[1343.7,-618.7],[1272.2,-576.3],[1254.6,-561.3],[1242.7,-547.2],[1233.4,-531.1],[1228,-513.5],[1231.1,-490.8],[1237.6,-484.3],[1246.3,-481.6],[1259.1,-486],[1271.7,-504.9],[1290.9,-517.3],[1303.8,-521.8],[1316.8,-517.9],[1323.8,-506.3],[1323,-497.1],[1306.5,-475.1],[1303.6,-461.6],[1309.3,-449.3],[1317.4,-445],[1326.5,-444.8],[1334.4,-449.2],[1390.3,-515.5],[1425.6,-544.4],[1461.6,-564.2],[1479.4,-568.2],[1493,-566.3],[1502.1,-556.3],[1502,-542.6],[1496.5,-535.1],[1479.9,-527.4],[1469.2,-518.7],[1460.8,-507.6],[1453.1,-490.8],[1456.4,-473],[1468.5,-459.1],[1502,-444],[1511,-443],[1523.1,-449],[1537.1,-472.3],[1560.8,-493.5],[1573.7,-498.3],[1582.8,-497.6],[1590.5,-492.7],[1597.7,-489.1],[1603.8,-488.2],[1609.1,-489.5],[1613.6,-492.9],[1617.5,-497.9],[1621.1,-504.2],[1624.5,-511.6],[1627.8,-519.8],[1631.2,-528.3],[1635,-537],[1639.3,-545.5]],
  trackClosed: true,
  link: [[1558.3,-302.7],[1556.1,-322.6],[1557.3,-338.5],[1566.9,-360.3],[1585.5,-381.2],[1647.8,-437.4],[1661.6,-462.9],[1670.5,-498.9],[1671.7,-537.7],[1665.2,-596.4]],
  trackH: 138.6
};


/* Traced from the notebook map: solid strokes = sealed roads,
   dashed strokes = dirt cut-throughs, triangle = Fox Mountain. */
const ROADS = [
  { id: 'r00', name: 'Harbour Road', w: 11, pts: [[708,-6],[708,23],[672,297],[667,309],[650,313],[621,313],[308,306],[281,305],[277,302]] },
  { id: 'r01', name: 'Mill Street', w: 10.4, pts: [[-188,-436],[426,-411],[437,-407]] },
  { id: 'r02', name: 'Kingsway', w: 10.4, pts: [[708,-8],[705,-35],[631,-370],[623,-376],[597,-382],[439,-407]] },
  { id: 'r03', name: 'Foundry Lane', w: 10.3, pts: [[-707,176],[-703,203],[-617,421],[-608,434],[-597,435],[-586,430],[-511,322],[-507,308]] },
  { id: 'r04', name: 'Lamplight Row', w: 10.2, pts: [[-164,-356],[217,-328],[227,-327],[235,-318]] },
  { id: 'r05', name: 'Ashgrove Avenue', w: 10.2, pts: [[-613,-187],[-631,-181],[-635,-172],[-706,146],[-707,175]] },
  { id: 'r06', name: 'Cannery Road', w: 11, pts: [[353,-20],[359,-16],[707,-7]] },
  { id: 'r07', name: 'Bridgewater Street', w: 10, pts: [[-20,292],[-14,295],[255,304],[277,302]] },
  { id: 'r08', name: 'Old Quarry Road', w: 11, pts: [[-147,-274],[-144,-242],[-143,22]] },
  { id: 'r09', name: 'Ironworks Way', w: 10, pts: [[147,-271],[137,-279],[-146,-278]] },
  { id: 'r10', name: 'Marlow Street', w: 11, pts: [[179,171],[178,-82],[177,-111],[171,-117]] },
  { id: 'r11', name: 'Pemberton Road', w: 11, pts: [[-424,289],[-145,292]] },
  { id: 'r12', name: 'Saltmarsh Lane', w: 10.2, pts: [[353,-24],[358,-30],[359,-45],[432,-269],[435,-295]] },
  { id: 'r13', name: 'Weaver Street', w: 10.8, pts: [[305,220],[311,215],[348,5],[348,-12],[352,-20]] },
  { id: 'r14', name: 'Northgate', w: 10.3, pts: [[12,-36],[18,-59],[130,-244],[147,-259]] },
  { id: 'r15', name: 'Eastgate', w: 10.2, pts: [[-190,-436],[-225,-432],[-387,-398],[-400,-391],[-405,-377]] },
  { id: 'r16', name: 'Southgate', w: 10.6, pts: [[-612,-188],[-605,-208],[-452,-348],[-430,-368],[-406,-376]] },
  { id: 'r17', name: 'Westgate', w: 10, pts: [[-411,-176],[-607,-183],[-612,-187]] },
  { id: 'r18', name: 'Clockhouse Lane', w: 10.2, pts: [[236,-317],[275,-322],[302,-320],[435,-295]] },
  { id: 'r19', name: 'Printers Row', w: 10, pts: [[-405,-376],[-401,-367],[-407,-235],[-406,-183]] },
  { id: 'r20', name: 'Draper Street', w: 10.3, pts: [[170,-117],[148,-105],[89,-13],[70,-11],[12,-36]] },
  { id: 'r21', name: 'Baker Hill', w: 10.6, pts: [[352,-24],[331,-31],[203,-129],[180,-135]] },
  { id: 'r22', name: 'Cooper Lane', w: 10, pts: [[95,170],[95,108],[89,94],[66,91],[-6,98]] },
  { id: 'r23', name: 'Tanner Street', w: 10, pts: [[-146,173],[-299,168]] },
  { id: 'r24', name: 'Brewhouse Road', w: 11, pts: [[-451,166],[-299,168]] },
  { id: 'r25', name: 'Candle Lane', w: 11, pts: [[-143,174],[4,173]] },
  { id: 'r26', name: 'Herring Way', w: 11, pts: [[-144,25],[-144,172]] },
  { id: 'r27', name: 'Anchor Street', w: 10, pts: [[-507,307],[-511,295],[-574,189],[-579,164]] },
  { id: 'r28', name: 'Crane Road', w: 10.6, pts: [[-436,91],[-295,102]] },
  { id: 'r29', name: 'Dockside Way', w: 10.4, pts: [[-284,34],[-422,19]] },
  { id: 'r30', name: 'Ferryman Lane', w: 10.2, pts: [[-282,34],[-145,24]] },
  { id: 'r31', name: 'Granary Street', w: 10.3, pts: [[-280,-220],[-271,-230],[-173,-269],[-148,-274]] },
  { id: 'r32', name: 'Hollow Road', w: 10.2, pts: [[-280,-219],[-280,-192],[-294,-85]] },
  { id: 'r33', name: 'Juniper Avenue', w: 10, pts: [[-578,163],[-454,165]] },
  { id: 'r34', name: 'Kestrel Way', w: 10.8, pts: [[148,-259],[158,-250],[179,-136]] },
  { id: 'r35', name: 'Larkspur Lane', w: 10.2, pts: [[-281,-220],[-305,-217],[-379,-186],[-405,-182]] },
  { id: 'r36', name: 'Maple Terrace', w: 10, pts: [[-21,292],[-145,292]] },
  { id: 'r37', name: 'Nightingale Road', w: 10.3, pts: [[179,172],[285,216],[303,220]] },
  { id: 'r38', name: 'Orchard Street', w: 10.8, pts: [[-584,161],[-706,175]] },
  { id: 'r39', name: 'Pinewood Avenue', w: 10.4, pts: [[-452,167],[-449,194],[-427,268],[-425,288]] },
  { id: 'r40', name: 'Quarrymans Walk', w: 10.2, pts: [[-475,11],[-500,5],[-523,8],[-545,54],[-550,80]] },
  { id: 'r41', name: 'Rookery Lane', w: 11, pts: [[-412,-79],[-294,-85]] },
  { id: 'r42', name: 'Sycamore Road', w: 10.8, pts: [[-283,33],[-294,-85]] },
  { id: 'r43', name: 'Thistle Street', w: 10.1, pts: [[-21,291],[-18,266],[3,199],[5,174]] },
  { id: 'r44', name: 'Union Street', w: 10, pts: [[-145,292],[-145,175]] },
  { id: 'r45', name: 'Vine Court', w: 10, pts: [[-28,23],[-142,23]] },
  { id: 'r46', name: 'Willow Bank', w: 10, pts: [[438,-406],[438,-299],[435,-295]] },
  { id: 'r47', name: 'Yewtree Lane', w: 10.8, pts: [[-422,18],[-414,-78]] },
  { id: 'r48', name: 'Alder Road', w: 11, pts: [[-410,-175],[-413,-80]] },
  { id: 'r49', name: 'Bellrope Lane', w: 10.5, pts: [[235,-317],[225,-302],[161,-282],[149,-271]] },
  { id: 'r50', name: 'Chandler Street', w: 10, pts: [[94,171],[7,172]] },
  { id: 'r51', name: 'Dovecote Road', w: 10, pts: [[96,171],[178,172]] },
  { id: 'r52', name: 'Elmfield Way', w: 10.2, pts: [[-551,81],[-558,86],[-577,129],[-583,160]] },
  { id: 'r53', name: 'Fairwater Road', w: 10, pts: [[304,221],[299,246],[282,277],[277,302]] },
  { id: 'r54', name: 'Gasworks Lane', w: 10.2, pts: [[-426,289],[-485,305],[-506,307]] },
  { id: 'r55', name: 'Hatters Row', w: 10.4, pts: [[-189,-435],[-177,-375],[-166,-356]] },
  { id: 'r56', name: 'Inkwell Street', w: 10.3, pts: [[-165,-355],[-147,-278]] },
  { id: 'r57', name: 'Jubilee Road', w: 10, pts: [[-27,24],[-12,90],[-6,98]] },
  { id: 'r58', name: 'Kilnside', w: 10.2, pts: [[6,171],[4,148],[-4,124],[-6,98]] },
  { id: 'r59', name: 'Lantern Street', w: 10, pts: [[-441,92],[-453,164]] },
  { id: 'r60', name: 'Mariners Way', w: 10, pts: [[-436,90],[-423,20]] },
  { id: 'r61', name: 'Newbridge Road', w: 10.4, pts: [[-490,83],[-487,60],[-477,33],[-475,13]] },
  { id: 'r62', name: 'Oakhanger Lane', w: 10.2, pts: [[-283,35],[-290,94],[-294,102]] },
  { id: 'r63', name: 'Paternoster Row', w: 10, pts: [[-294,103],[-299,168]] },
  { id: 'r64', name: 'Riverside Drive', w: 10, pts: [[-27,23],[-2,-26],[12,-36]] },
  { id: 'r65', name: 'Steepleton Road', w: 10.8, pts: [[-549,81],[-490,83]] },
  { id: 'r66', name: 'Tinsmith Lane', w: 10, pts: [[-424,18],[-474,12]] },
  { id: 'r67', name: 'Underhill Road', w: 10.2, pts: [[-442,91],[-490,83]] },
  /* Link out of town to Fox Mountain, which sits off the edge of the plate. */
  { id: 'mountain-approach', name: 'Foothill Approach', w: 11,
    pts: [[708,-6],[760,-16],[810,-30],[845,-45],[872.8,-58]] }
];
const DIRT = [];   // the new plate has no unsealed tracks yet

/* Road width relative to buildings. Applied before city generation so that
   building clearances follow it. */
const ROAD_SCALE = 1.0;
if (ROAD_SCALE !== 1) {
  ROADS.forEach(r => { r.w *= ROAD_SCALE; });
  DIRT.forEach(r => { r.w *= ROAD_SCALE; });
}

/* ---------- geometry helpers ---------- */
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = clamp(t, 0, 1);
  const qx = ax + dx * t, qz = az + dz * t;
  return { d: Math.hypot(px - qx, pz - qz), t, x: qx, z: qz };
}
function pathDist(px, pz, path) {
  let best = 1e9, seg = 0, tt = 0;
  for (let i = 0; i < path.pts.length - 1; i++) {
    const a = path.pts[i], b = path.pts[i + 1];
    const r = segDist(px, pz, a[0], a[1], b[0], b[1]);
    if (r.d < best) { best = r.d; seg = i; tt = r.t; }
  }
  return { d: best, seg, t: tt };
}
function nearestRoadInfo(x, z) {
  let best = null;
  for (const r of ROADS) {
    const p = pathDist(x, z, r);
    if (!best || p.d < best.d) best = { d: p.d, road: r, seg: p.seg, t: p.t };
  }
  return best;
}
function pointOnPath(path, seg, t) {
  const a = path.pts[seg], b = path.pts[Math.min(seg + 1, path.pts.length - 1)];
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}
function pathHeading(path, seg) {
  const a = path.pts[seg], b = path.pts[Math.min(seg + 1, path.pts.length - 1)];
  return Math.atan2(b[0] - a[0], b[1] - a[1]);
}

/* ---------- mountain: terraced spiral so the road is drivable ---------- */
/* The pass climbs at a constant gradient. Terrain height near the road is
   driven by the road itself and relaxes back to a cone further out; tying road
   height to radius instead would force either cusped hairpins or extreme
   gradients. */
let MROAD = null, MGRID = null;
const MCELL = 26;

/* Viewpoint at the top of the climb: a level plaza where the road ends. */
const PLAZA = { x: 0, z: 0, r: 30, h: 0, dir: 0 };
/* Level ground for buildings that sit beside the circuit. */
const FLAT_PADS = [];
/* The circuit's dressing, worked out from its own shape. */
let CIRCUIT = null;
const PIT = { offset: 25, halfW: 6.5, taper: 55, length: 210 };
/* The constructed platform the circuit stands on: a grid of how far each cell
   is from level ground at track height (0 = on the platform). */
let PLAT = null;
const PLAT_STEP = 4, PLAT_BLEND = 14, PLAT_MARGIN = 22;
let MPATHS = null;
function buildMountainRoad() {
  const mk = (pts, heightFn, w) => {
    const out = pts.map(p => ({ x: p[0], z: p[1], h: 0 }));
    let len = 0;
    const cum = [0];
    for (let i = 1; i < out.length; i++) {
      len += Math.hypot(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z);
      cum.push(len);
    }
    out.forEach((p, i) => { p.h = heightFn(cum[i] / Math.max(len, 1e-6)); });
    return { pts: out, w: w, len: len };
  };
  // the climb: height spread along the road so the gradient stays even
  const pass = mk(MTN_TRACE.pass, t => t * MTN.h, MTN.roadW);
  // the circuit: level, at whatever height the climb has where they meet, so
  // wherever it is drawn it joins the road flush
  const tpts = MTN_TRACE.track.slice();
  if (MTN_TRACE.trackClosed && tpts.length > 2) tpts.push(tpts[0].slice());
  /* The circuit sits level at the height of the climb where you turn off it:
     at the foot of the access road if there is one, otherwise wherever the
     loop itself comes closest to the climb. */
  const joinPts = (MTN_TRACE.link && MTN_TRACE.link.length > 1) ? [MTN_TRACE.link[0]] : tpts;
  if (tpts.length > 1) {
    let best = 1e9, bh = MTN_TRACE.trackH;
    joinPts.forEach(q => pass.pts.forEach(p => {
      const d = Math.hypot(p.x - q[0], p.z - q[1]);
      if (d < best) { best = d; bh = p.h; }
    }));
    MTN_TRACE.trackH = Math.round(bh * 10) / 10;
  }
  const track = mk(tpts, () => MTN_TRACE.trackH, MTN.roadW + 2);
  MPATHS = tpts.length > 1 ? [pass, track] : [pass];
  FLAT_PADS.length = 0;
  CIRCUIT = null;
  if (MPATHS.length > 1 && MTN_TRACE.trackClosed) {
    CIRCUIT = planCircuit(track);
    if (CIRCUIT && CIRCUIT.pit) MPATHS.push(CIRCUIT.pit);
  }
  // one road in from the climb to the circuit
  if (MTN_TRACE.link && MTN_TRACE.link.length > 1) {
    const link = mk(MTN_TRACE.link, () => MTN_TRACE.trackH, MTN.roadW);
    link.link = true;
    MPATHS.push(link);
  }
  PLAT = CIRCUIT ? buildPlatform() : null;
  const e = pass.pts[pass.pts.length - 1], e0 = pass.pts[Math.max(0, pass.pts.length - 3)];
  PLAZA.dir = Math.atan2(e.x - e0.x, e.z - e0.z);
  PLAZA.x = e.x + Math.sin(PLAZA.dir) * (PLAZA.r - 6);
  PLAZA.z = e.z + Math.cos(PLAZA.dir) * (PLAZA.r - 6);
  PLAZA.h = e.h;
  MROAD = pass.pts;
  MTN.roadLen = pass.len;

  MGRID = new Map();
  MPATHS.forEach((path, pi) => {
    for (let i = 0; i < path.pts.length - 1; i++) {
      const a = path.pts[i], b = path.pts[i + 1];
      const x0 = Math.floor(Math.min(a.x, b.x) / MCELL) - 2, x1 = Math.floor(Math.max(a.x, b.x) / MCELL) + 2;
      const z0 = Math.floor(Math.min(a.z, b.z) / MCELL) - 2, z1 = Math.floor(Math.max(a.z, b.z) / MCELL) + 2;
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
        const k = cx * 7919 + cz;
        let arr = MGRID.get(k);
        if (!arr) { arr = []; MGRID.set(k, arr); }
        arr.push({ p: pi, i: i });
      }
    }
  });
  return MROAD;
}
buildMountainRoad();

function mountainPath(step) { return mountainPaths()[0]; }
function mountainPaths() {
  return MPATHS.map((p, i) => ({
    id: i === 0 ? 'mountain-pass' : (p.pit ? 'pit-lane' : (p.link ? 'circuit-access' : 'circuit')),
    name: i === 0 ? 'Fox Mountain Pass' : (p.pit ? 'Pit lane' : (p.link ? 'Circuit access' : 'Fox Mountain Circuit')),
    // no footpaths up here, so the tarmac runs the full width of the shelf
    w: p.w,
    // the circuit, pit lane and access road draw their own race surfaces
    custom: i > 0 && !!CIRCUIT,
    pts: p.pts.map(q => [q.x, q.z])
  }));
}


/* How far a road pulls the hillside toward its own height. The falloff reaches
   zero inside the lookup radius so the blend stays continuous across grid
   cells. */
const MTN_INFLUENCE = 46;
const MTN_SHOULDER = 2.2;

function mountainSample(x, z) {
  const dx = x - MTN.x, dz = z - MTN.z;
  const r = Math.hypot(dx, dz);
  if (r > MTN.r + 8) return null;

  const cone = MTN.h * clamp((MTN.r - r) / (MTN.r - MTN.topR), 0, 1);
  const rim = r > MTN.r - 10 ? smooth(clamp((MTN.r + 8 - r) / 18, 0, 1)) : 1;

  // the summit plaza is level and drivable
  const pd = Math.hypot(x - PLAZA.x, z - PLAZA.z);
  if (pd < PLAZA.r) return { h: PLAZA.h, road: true, r: r, plaza: true };

  const cx = Math.floor(x / MCELL), cz = Math.floor(z / MCELL);
  let dMin = 1e9, hNear = 0, wNear = MTN.roadW, sw = 0, sh = 0;
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    const arr = MGRID.get((cx + i) * 7919 + (cz + j));
    if (!arr) continue;
    for (let k = 0; k < arr.length; k++) {
      const path = MPATHS[arr[k].p];
      const a = path.pts[arr[k].i], b = path.pts[arr[k].i + 1];
      const s = segDist(x, z, a.x, a.z, b.x, b.z);
      const hh = lerp(a.h, b.h, s.t);
      if (s.d < dMin) { dMin = s.d; hNear = hh; wNear = path.w; }
      if (s.d < MTN_INFLUENCE) {
        const f = 1 - s.d / MTN_INFLUENCE;
        const w = f * f / (s.d * s.d + 9);
        sw += w; sh += w * hh;
      }
    }
  }
  if (dMin < wNear) return { h: hNear, road: true, r: r, shelf: true };

  const pdist = platDist(x, z);
  if (pdist === 0) return { h: PLAT.H, road: false, r: r, platform: true };

  let h = cone;
  if (sw > 0) {
    const roadH = sh / sw;
    const infl = smooth(clamp(1 - (dMin - wNear) / (MTN_INFLUENCE - wNear), 0, 1));
    h = lerp(cone, roadH, infl);
  }
  // the plaza pulls its surroundings level too
  if (pd < PLAZA.r + 40) h = lerp(h, PLAZA.h, smooth(clamp(1 - (pd - PLAZA.r) / 40, 0, 1)));
  // and so do the pads under the circuit's buildings
  for (let i = 0; i < FLAT_PADS.length; i++) {
    const p = FLAT_PADS[i];
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r) { h = p.h; continue; }
    if (d < p.r + 16) h = lerp(h, p.h, smooth(clamp(1 - (d - p.r) / 16, 0, 1)));
  }

  /* A short flat shoulder, then the bank may climb. Without it the terrain mesh
     interpolates from the road edge straight up to the bank and those triangles
     cut across the carriageway. */
  const out = dMin - wNear;
  if (out < MTN_SHOULDER + 18) {
    const cap = hNear - 0.25 + Math.max(0, out - MTN_SHOULDER) * 0.9;
    if (h > cap) h = cap;
  }
  for (let i = 0; i < FLAT_PADS.length; i++) {
    const p = FLAT_PADS[i];
    if (Math.hypot(x - p.x, z - p.z) < p.r) return { h: p.h, road: false, r: r, pad: true };
  }
  // the platform's embankment runs down (or up) to meet the natural hillside
  if (pdist < PLAT_BLEND) {
    h = lerp(h * rim, PLAT.H, smooth(1 - pdist / PLAT_BLEND));
    return { h: h, road: false, r: r, bank: true };
  }
  return { h: h * rim, road: false, r: r };
}

/* Roads are polylines, and asking every one of them for a distance on every
   terrain query is too slow, so bucket the segments once and look up nine cells. */
const RCELL = 60;
let RGRID = null;
function buildRoadGrid() {
  RGRID = new Map();
  ROADS.forEach(r => {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const reach = paveHalf(r.w) + 4;
      const x0 = Math.floor((Math.min(a[0], b[0]) - reach) / RCELL), x1 = Math.floor((Math.max(a[0], b[0]) + reach) / RCELL);
      const z0 = Math.floor((Math.min(a[1], b[1]) - reach) / RCELL), z1 = Math.floor((Math.max(a[1], b[1]) + reach) / RCELL);
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
        const k = cx * 6151 + cz;
        let arr = RGRID.get(k);
        if (!arr) { arr = []; RGRID.set(k, arr); }
        arr.push({ r: r, a: a, b: b });
      }
    }
  });
}

/* Height of the footway at a point: flat on the carriageway, ramping up over the
   kerb, level across the pavement. Mounting one should feel like a step. */
function pavementH(x, z) {
  if (!RGRID) return 0;
  const cx = Math.floor(x / RCELL), cz = Math.floor(z / RCELL);
  let best = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const arr = RGRID.get((cx + i) * 6151 + (cz + j));
    if (!arr) continue;
    for (let k = 0; k < arr.length; k++) {
      const s = arr[k];
      const d = segDist(x, z, s.a[0], s.a[1], s.b[0], s.b[1]).d;
      // Any carriageway wins outright. Near a junction one road's footway band
      // crosses another road's surface, and without this the kerb height bled
      // out across the tarmac.
      if (d <= s.r.w + 0.3) return 0;
      const outer = paveHalf(s.r.w);
      if (d >= outer) continue;
      const t = clamp((d - s.r.w - 0.3) / 2.6, 0, 1);   // gentler ramp up the kerb
      const h = KERB_H * smooth(t);
      if (h > best) best = h;
    }
  }
  return best;
}
const KERB_H = 0.42;

function terrainH(x, z) {
  const m = mountainSample(x, z);
  if (m) return Math.max(0, m.h);
  return pavementH(x, z);
}
function terrainNormal(x, z) {
  const e = 1.6;
  const hL = terrainH(x - e, z), hR = terrainH(x + e, z);
  const hD = terrainH(x, z - e), hU = terrainH(x, z + e);
  const n = new THREE.Vector3(hL - hR, 2 * e, hD - hU);
  n.normalize();
  return n;
}

/* ---------- surface classification ---------- */
/* rear: how much extra the back axle gives up on this surface — loose ground
   should rotate the car, not just push it wide */
const SURF = {
  road:  { grip: 1.00, roll: 0.988, rear: 1.00, name: 'road',  dust: null },
  dirt:  { grip: 0.76, roll: 0.930, rear: 0.95, name: 'dirt',  dust: 0xa8834e },
  grass: { grip: 0.58, roll: 0.885, rear: 0.92, name: 'grass', dust: 0x7d8f58 },
  rock:  { grip: 0.64, roll: 0.915, rear: 0.93, name: 'rock',  dust: 0x9c9384 },
  walk:  { grip: 0.80, roll: 0.955, rear: 0.95, name: 'pavement', dust: 0xb8b2a2 }
};
function surfaceAt(x, z) {
  const m = mountainSample(x, z);
  if (m) return m.road ? SURF.road : SURF.rock;
  if (Math.hypot(x - HQ.x, z - (HQ.z - 13)) < 19) return SURF.road;   // the shop forecourt
  for (const r of ROADS) {
    const dd = pathDist(x, z, r).d;
    if (dd < r.w) return SURF.road;
    if (dd < paveHalf(r.w)) return SURF.walk;   // up on the kerb
  }
  for (const d of DIRT) if (pathDist(x, z, d).d < d.w) return SURF.dirt;
  return SURF.grass;
}
function onAnyPath(x, z, pad) {
  for (const r of ROADS) if (pathDist(x, z, r).d < r.w + pad) return true;
  for (const d of DIRT) if (pathDist(x, z, d).d < d.w + pad * 0.5) return true;
  return false;
}

/* ============================================================
   Scene, sky and lighting
   ============================================================ */
let renderer, scene, camera, sunLight, hemiLight, world, skyMesh;
const COL = {
  grass: 0x7c8a5e, grassDark: 0x616e48, road: 0x1f2126, roadEdge: 0x9c968a,
  walk: 0xc0b8a4, dirt: 0xac8b5c, rock: 0x6c6a5f, rockTop: 0x7b7864,
  line: 0xefe6cd, cream: 0xf7ecd6, lamp: 0xffcf72
};


/* Push the tuning values into everything that caches them. */
let lastCarScale = null;
function applyTune() {
  // Cars are described at real-world size; the roads are much wider than that,
  // so a scale factor keeps the car looking right against the tile art.
  if (typeof CARS !== 'undefined') {
    const k = TUNE.world.carScale;
    CARS.forEach(c => {
      if (!c.shape0) c.shape0 = Object.assign({}, c.shape);
      const s = c.shape0;
      c.shape = Object.assign({}, s, {
        len: s.len * k, wid: s.wid * k, hgt: s.hgt * k,
        cabLen: s.cabLen * k, cabOff: s.cabOff * k, cabH: s.cabH * k,
        wb: s.wb * k, track: s.track * k, wr: s.wr * k, ww: s.ww * k
      });
    });
    if (lastCarScale !== null && lastCarScale !== k && typeof selectCar === 'function' && carObj) {
      selectCar(S.carId);
    }
    lastCarScale = k;
  }
  SURF.road.grip = TUNE.surface.road;
  SURF.dirt.grip = TUNE.surface.dirt;
  SURF.grass.grip = TUNE.surface.grass;
  SURF.walk.grip = TUNE.surface.walk;
  SURF.rock.grip = TUNE.surface.rock;
  if (renderer) renderer.toneMappingExposure = TUNE.look.exposure;
  if (sunLight) sunLight.intensity = TUNE.look.sun;
  if (hemiLight) hemiLight.intensity = TUNE.look.ambient;
  if (scene && scene.fog) scene.fog.density = TUNE.look.fog;
  MATS.windows.forEach(m => { m.emissiveIntensity = TUNE.look.windows; });
  MATS.neon.forEach(m => { m.emissiveIntensity = TUNE.look.neon; });
}

/* ============================================================
   Procedural textures — drawn to canvases at load, so the game stays
   a single file with no external image requests.
   ============================================================ */
const TEX = {};
function cnv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h || w;
  return c;
}
function finishTex(c, rx, ry) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx || 1, ry || rx || 1);
  t.anisotropy = 4;
  return t;
}
function speckle(x, size, cell, cols, aLo, aHi) {
  for (let i = 0; i < size; i += cell) for (let j = 0; j < size; j += cell) {
    x.fillStyle = cols[Math.floor(Math.random() * cols.length)];
    x.globalAlpha = aLo + Math.random() * (aHi - aLo);
    x.fillRect(i, j, cell, cell);
  }
  x.globalAlpha = 1;
}
function blobs(x, size, n, rLo, rHi, cols, alpha) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = cols[Math.floor(Math.random() * cols.length)];
    x.globalAlpha = alpha;
    x.beginPath();
    x.arc(Math.random() * size, Math.random() * size, rLo + Math.random() * (rHi - rLo), 0, TAU);
    x.fill();
  }
  x.globalAlpha = 1;
}

function buildTextures() {
  const S = 256;
  let c, x;

  // asphalt: dark aggregate with lengthwise wear
  c = cnv(S); x = c.getContext('2d');
  x.fillStyle = '#212328'; x.fillRect(0, 0, S, S);
  speckle(x, S, 2, ['#1a1c20', '#2a2d33', '#1e2024', '#303339'], 0.25, 0.75);
  blobs(x, S, 26, 6, 26, ['#1c1e22', '#2b2e34'], 0.3);
  x.globalAlpha = 0.14;
  for (let i = 0; i < 40; i++) {
    x.fillStyle = Math.random() < 0.5 ? '#17191c' : '#34373d';
    x.fillRect(Math.random() * S, 0, 1 + Math.random() * 2, S);
  }
  x.globalAlpha = 1;
  TEX.asphalt = finishTex(c, 3, 1);

  // race kerb: alternating red and white blocks, one pair per texture repeat
  c = cnv(128, 32); x = c.getContext('2d');
  x.fillStyle = '#d8342c'; x.fillRect(0, 0, 64, 32);
  x.fillStyle = '#f2f0ea'; x.fillRect(64, 0, 64, 32);
  x.globalAlpha = 0.18; x.fillStyle = '#000';
  x.fillRect(0, 0, 128, 3); x.fillRect(62, 0, 2, 32); x.fillRect(126, 0, 2, 32);
  x.globalAlpha = 1;
  TEX.kerbStripe = finishTex(c, 1, 1);

  // run-off apron: pale poured concrete in bays with expansion joints
  c = cnv(S); x = c.getContext('2d');
  x.fillStyle = '#a9a69f'; x.fillRect(0, 0, S, S);
  speckle(x, S, 2, ['#9f9c95', '#b4b1aa', '#a3a099'], 0.2, 0.6);
  blobs(x, S, 14, 10, 40, ['#9a978f', '#b6b3ac'], 0.18);
  x.fillStyle = '#7f7c76';
  x.fillRect(0, 0, S, 2); x.fillRect(0, 0, 2, S);
  TEX.apron = finishTex(c, 1, 1);

  // paving: square slabs, a little weathered
  c = cnv(S); x = c.getContext('2d');
  x.fillStyle = '#8f8a80'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = 128 + Math.floor(Math.random() * 18) - 9;
    x.fillStyle = 'rgb(' + (v + 12) + ',' + (v + 8) + ',' + v + ')';
    x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
  }
  speckle(x, S, 2, ['#77736b', '#9d988e'], 0.08, 0.3);
  TEX.paving = finishTex(c, 1, 1);

  // grass
  c = cnv(S); x = c.getContext('2d');
  x.fillStyle = '#6b7f4e'; x.fillRect(0, 0, S, S);
  blobs(x, S, 90, 8, 40, ['#5f7446', '#778b58', '#586b40', '#7d9160'], 0.5);
  speckle(x, S, 3, ['#5c7043', '#788c59', '#657949'], 0.2, 0.55);
  TEX.grass = finishTex(c, 1, 1);

  // dirt with ruts
  c = cnv(S); x = c.getContext('2d');
  x.fillStyle = '#a6875a'; x.fillRect(0, 0, S, S);
  blobs(x, S, 60, 5, 26, ['#9a7c50', '#b39566', '#8d7048'], 0.45);
  speckle(x, S, 2, ['#8f7248', '#bb9d70', '#7d6440'], 0.15, 0.5);
  x.globalAlpha = 0.2;
  for (let i = 0; i < 14; i++) { x.fillStyle = '#8a6e45'; x.fillRect(Math.random() * S, 0, 2 + Math.random() * 5, S); }
  x.globalAlpha = 1;
  TEX.dirt = finishTex(c, 2, 1);

  // sidewalk concrete with panel joints
  c = cnv(S); x = c.getContext('2d');
  x.fillStyle = '#bcb5a3'; x.fillRect(0, 0, S, S);
  speckle(x, S, 3, ['#b3ac9a', '#c6bfad', '#aaa392'], 0.2, 0.5);
  x.strokeStyle = 'rgba(120,114,102,.55)'; x.lineWidth = 2;
  for (let i = 0; i <= S; i += S / 4) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke();
  }
  TEX.walk = finishTex(c, 2, 1);

  // mountain rock
  c = cnv(S); x = c.getContext('2d');
  x.fillStyle = '#6d6a5f'; x.fillRect(0, 0, S, S);
  blobs(x, S, 70, 6, 34, ['#5f5d53', '#7a7769', '#656256'], 0.5);
  speckle(x, S, 3, ['#5a5850', '#807d6f'], 0.2, 0.5);
  TEX.rock = finishTex(c, 1, 1);

  // facades: window grid plus an emissive mask of which panes are lit
  function facade(cols, rows, wall, frame, glass, litRatio) {
    const W = 256, H = 256;
    const cc = cnv(W, H), xx = cc.getContext('2d');
    const ec = cnv(W, H), ex = ec.getContext('2d');
    xx.fillStyle = wall; xx.fillRect(0, 0, W, H);
    speckle(xx, W, 4, [wall, frame], 0.06, 0.18);
    ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
    const cw = W / cols, ch = H / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const px = i * cw + cw * 0.18, py = j * ch + ch * 0.16;
      const pw = cw * 0.64, ph = ch * 0.6;
      xx.fillStyle = frame; xx.fillRect(px - 2, py - 2, pw + 4, ph + 4);
      const lit = Math.random() < litRatio;
      xx.fillStyle = lit ? '#ffe3ad' : glass;
      xx.fillRect(px, py, pw, ph);
      if (lit) {
        const warm = Math.random();
        ex.fillStyle = warm < 0.7 ? '#ffd79a' : (warm < 0.88 ? '#cfe4ff' : '#ffb46a');
        ex.globalAlpha = 0.55 + Math.random() * 0.45;
        ex.fillRect(px, py, pw, ph);
        ex.globalAlpha = 1;
      }
    }
    return { map: finishTex(cc, 1, 1), emissive: finishTex(ec, 1, 1) };
  }
  TEX.towerTall = facade(6, 15, '#8e97a2', '#6d7580', '#39434f', 0.34);
  TEX.towerMid = facade(5, 8, '#96a0aa', '#727a85', '#3d4653', 0.30);
  TEX.towerLow = facade(4, 4, '#9aa3ad', '#757d88', '#404a56', 0.28);
  TEX.shopFront = facade(3, 2, '#9c8f7d', '#6f6558', '#3a3630', 0.72);

  // plaster for houses — no grid, so nothing stretches oddly
  c = cnv(S); x = c.getContext('2d');
  x.fillStyle = '#ddd4c2'; x.fillRect(0, 0, S, S);
  speckle(x, S, 3, ['#d4cbb8', '#e6ddcb', '#cabfa9'], 0.15, 0.45);
  blobs(x, S, 24, 8, 30, ['#d2c8b4', '#e8e0ce'], 0.25);
  TEX.plaster = finishTex(c, 2, 2);

  // roof tiles
  c = cnv(S); x = c.getContext('2d');
  x.fillStyle = '#454c57'; x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(28,32,38,.6)'; x.lineWidth = 3;
  for (let j = 0; j < S; j += 14) { x.beginPath(); x.moveTo(0, j); x.lineTo(S, j); x.stroke(); }
  speckle(x, S, 4, ['#3e444e', '#4d545f'], 0.12, 0.4);
  TEX.roof = finishTex(c, 3, 3);
}

/* Equirectangular sky used as an environment map. This is what makes paint and
   glass read as reflective surfaces instead of flat plastic. */
let ENV = null;
function buildEnvMap() {
  const W = 512, H = 256;
  const c = cnv(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.00, '#1d3f74');
  g.addColorStop(0.34, '#6fa3cf');
  g.addColorStop(0.48, '#cfe0ea');
  g.addColorStop(0.52, '#f3d9b0');
  g.addColorStop(0.62, '#8a8674');
  g.addColorStop(1.00, '#3c3a33');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const sg = x.createRadialGradient(W * 0.22, H * 0.42, 4, W * 0.22, H * 0.42, 90);
  sg.addColorStop(0, 'rgba(255,244,214,1)');
  sg.addColorStop(1, 'rgba(255,214,150,0)');
  x.fillStyle = sg; x.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  ENV = t;
  return t;
}

/* True when a point sits on another road's carriageway: used to break kerbs
   and painted lines at junctions instead of running them straight across. */
function crossesOtherRoad(x, z, selfId) {
  for (const r of ROADS) {
    if (r.id === selfId) continue;
    if (pathDist(x, z, r).d < r.w + 2.2) return true;
  }
  return false;
}

/* ============================================================
   Tileset roads
   ------------------------------------------------------------
   The pack is a modular grid and cannot follow hand-drawn curves, so the tile's
   cross-section is swept along the road splines instead of being placed as
   discrete tiles: same profile, texture and UVs, continuously curved.

   Straight tile profile, measured from the file:
     x -10..-6  footpath top at z = 0
     x  -6..6   carriageway at z = -0.5
     x   6..10  footpath top at z = 0
     slab bottom at z = -2, ends capped so copies butt together
   ============================================================ */
const TILESET = {
  url: 'roads-tileset.glb',
  road: 'RoadForward_Placeable_0',
  bridge: 'RoadForwardBridge_Placeable_0',
  tileLen: 40,        // local units along the tile
  tileHalf: 20,
  carriageway: 12,    // local units between the kerbs
  edgeHalf: 10,       // local units to the outside of the footpath
  deck: -0.5,         // local z of the driving surface
  vScale: 0.85        // vertical squash; drives how tall the kerb stands
};
let TILE_GEO = null, TILE_MAT = null;

/* Footpath width follows the tile profile so the kerb you can feel matches the
   kerb you can see. */
function paveHalf(w) { return w * (TILESET.edgeHalf / (TILESET.carriageway / 2)); }

/* Arc-length sampler over a road polyline. */
function pathSampler(path, follow) {
  const pts = path.pts;
  const tbl = [{ x: pts[0][0], z: pts[0][1], s: 0 }];
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(d / 5));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      s += d / steps;
      tbl.push({ x: lerp(a[0], b[0], t), z: lerp(a[1], b[1], t), s });
    }
  }
  const L = s;
  return {
    L: L,
    at(q) {
      q = clamp(q, 0, L);
      let lo = 0, hi = tbl.length - 1;
      while (lo < hi - 1) { const m = (lo + hi) >> 1; if (tbl[m].s <= q) lo = m; else hi = m; }
      const a = tbl[lo], b = tbl[hi];
      const t = (q - a.s) / Math.max(b.s - a.s, 1e-6);
      const x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t);
      let dx = b.x - a.x, dz = b.z - a.z;
      const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      return { x: x, z: z, nx: -dz, nz: dx, y: follow ? terrainH(x, z) : 0 };
    }
  };
}

/* Repeat the tile along the path, bending each copy onto the spline. */
function sweepTileAlongPath(geo, path, opts) {
  opts = opts || {};
  const sampler = pathSampler(path, opts.follow);
  const wScale = (path.w * 2) / TILESET.carriageway;
  const vScale = opts.vScale === undefined ? TILESET.vScale : opts.vScale;
  const s0 = opts.s0 === undefined ? 0 : opts.s0;
  const s1 = opts.s1 === undefined ? sampler.L : opts.s1;
  const span = s1 - s0;
  if (span <= 1) return null;
  const nominal = TILESET.tileLen * wScale;
  const n = Math.max(1, Math.round(span / nominal));
  const step = span / n;
  const lift = opts.lift || 0;

  const pos = geo.attributes.position, uv = geo.attributes.uv, idx = geo.index;
  const vc = pos.count, ic = idx ? idx.count : 0;
  const outPos = new Float32Array(vc * n * 3);
  const outUv = new Float32Array(vc * n * 2);
  const outIdx = new Uint32Array(ic * n);

  for (let k = 0; k < n; k++) {
    const vbase = k * vc;
    for (let i = 0; i < vc; i++) {
      const lx = pos.getX(i), ly = pos.getY(i), lz = pos.getZ(i);
      const along = s0 + (k + (lz + TILESET.tileHalf) / TILESET.tileLen) * step;
      const p = sampler.at(along);
      const o = (vbase + i) * 3;
      outPos[o] = p.x + p.nx * lx * wScale;
      outPos[o + 1] = p.y + (ly - TILESET.deck) * vScale + 0.02 + lift;
      outPos[o + 2] = p.z + p.nz * lx * wScale;
      const u = (vbase + i) * 2;
      outUv[u] = uv ? uv.getX(i) : 0;
      outUv[u + 1] = uv ? uv.getY(i) : 0;
    }
    for (let t = 0; t < ic; t++) outIdx[k * ic + t] = idx.getX(t) + vbase;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(outUv, 2));
  out.setIndex(new THREE.BufferAttribute(outIdx, 1));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}

/* Junctions. Most crossings here are far from square, so rather than use the
   pack's square crossing tile each one is opened out: the full profile stops
   short of the junction and both roads run a kerbless carriageway strip through
   it at a shared height. */
function segIntersect(a, b, c, d) {
  const rx = b[0] - a[0], rz = b[1] - a[1];
  const sx = d[0] - c[0], sz = d[1] - c[1];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den;
  const u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a[0] + rx * t, z: a[1] + rz * t };
}
function sharesEndpoint(A, B, x, z, tol) {
  const ends = [A.pts[0], A.pts[A.pts.length - 1], B.pts[0], B.pts[B.pts.length - 1]];
  return ends.some(p => Math.hypot(p[0] - x, p[1] - z) < tol);
}
function findJunctions() {
  const out = [];
  const add = (x, z, roads) => {
    const existing = out.find(q => Math.hypot(q.x - x, q.z - z) < 26);
    if (existing) {
      roads.forEach(r => { if (existing.roads.indexOf(r) < 0) existing.roads.push(r); });
      existing.r = Math.max(existing.r, Math.max.apply(null, existing.roads.map(r => paveHalf(r.w))) * 1.02);
      return;
    }
    out.push({ x: x, z: z, roads: roads.slice(), r: Math.max.apply(null, roads.map(r => paveHalf(r.w))) * 1.02 });
  };

  // roads that cross each other
  for (let i = 0; i < ROADS.length; i++) {
    for (let k = i + 1; k < ROADS.length; k++) {
      const A = ROADS[i], B = ROADS[k];
      for (let m = 0; m < A.pts.length - 1; m++) {
        for (let n = 0; n < B.pts.length - 1; n++) {
          const p = segIntersect(A.pts[m], A.pts[m + 1], B.pts[n], B.pts[n + 1]);
          if (!p) continue;
          if (sharesEndpoint(A, B, p.x, p.z, 20)) continue;
          add(p.x, p.z, [A, B]);
        }
      }
    }
  }

  /* A traced network meets mostly at shared endpoints (T and Y junctions), which
     need opening out as well as crossings. */
  const ends = [];
  ROADS.forEach(r => {
    [r.pts[0], r.pts[r.pts.length - 1]].forEach(p => ends.push({ x: p[0], z: p[1], r: r }));
  });
  const used = new Array(ends.length).fill(false);
  for (let i = 0; i < ends.length; i++) {
    if (used[i]) continue;
    const group = [ends[i]];
    used[i] = true;
    for (let k = i + 1; k < ends.length; k++) {
      if (used[k]) continue;
      if (Math.hypot(ends[k].x - ends[i].x, ends[k].z - ends[i].z) < 26) { group.push(ends[k]); used[k] = true; }
    }
    // a closed circuit meets its own start: that is a loop, not a junction
    const distinct = group.filter((e, k) => group.findIndex(o => o.r === e.r) === k);
    if (group.length < 2 || distinct.length < 2) continue;
    const mx = group.reduce((s, e) => s + e.x, 0) / group.length;
    const mz = group.reduce((s, e) => s + e.z, 0) / group.length;
    add(mx, mz, distinct.map(e => e.r));
  }
  return out;
}

/* Arc-length windows on a path that a junction covers. */
function junctionWindows(path, juncs) {
  const s = pathSampler(path, false);
  const win = [];
  juncs.forEach(j => {
    if (j.roads.indexOf(path) < 0) return;
    // walk the path to find the closest point to the junction centre
    let best = 0, bd = 1e9;
    const steps = Math.ceil(s.L / 4);
    for (let i = 0; i <= steps; i++) {
      const q = s.at((i / steps) * s.L);
      const d = Math.hypot(q.x - j.x, q.z - j.z);
      if (d < bd) { bd = d; best = (i / steps) * s.L; }
    }
    if (bd > j.r * 2) return;
    win.push({ a: Math.max(0, best - j.r), b: Math.min(s.L, best + j.r), s: best, j: j });
  });
  win.sort((p, q) => p.a - q.a);
  return { windows: win, length: s.L };
}

/* Just the carriageway of the tile: everything between the kerbs, no footpath,
   no slab underside. This is what gets run through a junction. */
function tileDeckOnly(geo) {
  const pos = geo.attributes.position, idx = geo.index;
  const half = TILESET.carriageway / 2 + 0.05;
  const keep = [];
  const n = idx ? idx.count : pos.count;
  for (let i = 0; i < n; i += 3) {
    const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
    let ok = true;
    [i0, i1, i2].forEach(v => {
      if (Math.abs(pos.getX(v)) > half) ok = false;
      if (pos.getY(v) < -1.9) ok = false;        // drop the slab underside
    });
    if (ok) keep.push(i0, i1, i2);
  }
  if (keep.length < 3) return null;
  return compactGeometry(geo, keep);
}

/* Raised pavement: a top surface plus a vertical kerb face on each side, so the
   footway reads as a step up from the carriageway rather than a painted stripe. */
function pavement(path, inner, outer, h) {
  const pts = path.pts;
  const pos = [], uv = [], idx = [];
  let v = 0, dist = 0;
  for (const side of [-1, 1]) {
    dist = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
      let dx = next[0] - prev[0], dz = next[1] - prev[1];
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const nx = -dz, nz = dx;
      if (i > 0) dist += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const iw = side * inner, ow = side * outer;
      // kerb bottom, kerb top, pavement outer top, pavement outer bottom
      pos.push(p[0] + nx * iw, 0.02, p[1] + nz * iw);
      pos.push(p[0] + nx * iw, h, p[1] + nz * iw);
      pos.push(p[0] + nx * ow, h, p[1] + nz * ow);
      pos.push(p[0] + nx * ow, 0.02, p[1] + nz * ow);
      const u = dist / 6;
      uv.push(0, u, 0.06, u, 1, u, 1.06, u);
      if (i < pts.length - 1) {
        const nxt = pts[i + 1];
        const mx = (p[0] + nxt[0]) / 2 + nx * side * (inner + outer) / 2;
        const mz = (p[1] + nxt[1]) / 2 + nz * side * (inner + outer) / 2;
        if (!crossesOtherRoad(mx, mz, path.id)) {
          for (let k = 0; k < 3; k++) {
            const a = v + k, b = v + k + 1, c = v + 4 + k, d2 = v + 5 + k;
            if (side > 0) idx.push(a, c, b, b, c, d2);
            else idx.push(a, b, c, b, d2, c);
          }
        }
      }
      v += 4;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    color: 0xd8d2c2, map: TEX.walk || null, roughness: 0.9, metalness: 0,
    side: THREE.DoubleSide
  }));
  m.receiveShadow = true;
  return m;
}

/* Solid painted lines just inside each road edge — the strongest cue that you are
   on the sealed surface, and the thing you aim at when you're sliding. */
function edgeLines(path, offset, width, y, color, follow) {
  const pos = [], idx = [];
  const pts = path.pts;
  let v = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
      let dx = next[0] - prev[0], dz = next[1] - prev[1];
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const nx = -dz, nz = dx;
      const o1 = side * offset - width / 2, o2 = side * offset + width / 2;
      const y1 = follow ? terrainH(p[0] + nx * o1, p[1] + nz * o1) + y : y;
      const y2 = follow ? terrainH(p[0] + nx * o2, p[1] + nz * o2) + y : y;
      pos.push(p[0] + nx * o1, y1, p[1] + nz * o1, p[0] + nx * o2, y2, p[1] + nz * o2);
      if (i < pts.length - 1) {
        const nxt = pts[i + 1];
        const mx = (p[0] + nxt[0]) / 2 + nx * side * offset;
        const mz = (p[1] + nxt[1]) / 2 + nz * side * offset;
        if (follow || !crossesOtherRoad(mx, mz, path.id)) idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      }
      v += 2;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: color, transparent: true, opacity: 0.8,
    polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -2
  }));
}

function initRenderer() {
  const canvas = document.getElementById('scene');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.85));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = TUNE.look.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xb9c8d6, TUNE.look.fog);

  camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 4200);
  camera.position.set(0, 20, 40);

  hemiLight = new THREE.HemisphereLight(0xbcd8f2, 0x4d5836, TUNE.look.ambient);
  scene.add(hemiLight);

  sunLight = new THREE.DirectionalLight(0xffd2a0, TUNE.look.sun);
  sunLight.position.set(-260, 300, -180);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  const sc = sunLight.shadow.camera;
  sc.near = 40; sc.far = 900; sc.left = -130; sc.right = 130; sc.top = 130; sc.bottom = -130;
  sunLight.shadow.bias = -0.0012;
  sunLight.shadow.normalBias = 0.6;
  scene.add(sunLight);
  scene.add(sunLight.target);

  const rim = new THREE.DirectionalLight(0x9fc4ff, 0.28);
  rim.position.set(220, 140, 260);
  scene.add(rim);
}

function buildSky() {
  skyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2600, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x2f5f9e) },
        mid: { value: new THREE.Color(0x9fc6e4) },
        low: { value: new THREE.Color(0xf6d5a8) },
        horizon: { value: new THREE.Color(0xf8ead0) }
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'varying vec3 vP; uniform vec3 top, mid, low, horizon;',
        'void main(){',
        '  float h = normalize(vP).y;',
        '  vec3 c = mix(horizon, low, smoothstep(-0.06, 0.08, h));',
        '  c = mix(c, mid, smoothstep(0.05, 0.35, h));',
        '  c = mix(c, top, smoothstep(0.30, 0.85, h));',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n')
    })
  );
  skyMesh.renderOrder = -1;
  scene.add(skyMesh);

  // cumulus: two instanced puff sets drifting as one sky
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xf4f1ea, transparent: true, opacity: 0.72, fog: false });
  const shadeMat = new THREE.MeshBasicMaterial({ color: 0xc4ccd8, transparent: true, opacity: 0.62, fog: false });
  const puffGeo = new THREE.SphereGeometry(1, 9, 7);
  const lit = [], shade = [];
  for (let i = 0; i < 16; i++) {
    const a = rr(0, TAU), d = rr(700, 2100);
    const cx = Math.cos(a) * d, cy = rr(300, 560), cz = Math.sin(a) * d;
    const scale = rr(0.7, 1.9);
    const puffs = ri(5, 9);
    for (let p = 0; p < puffs; p++) {
      const rad = rr(26, 52) * scale;
      const dark = p % 3 === 2;
      (dark ? shade : lit).push({
        x: cx + rr(-90, 90) * scale,
        y: cy + rr(-9, 9) * scale + (dark ? -rad * 0.35 : 0),
        z: cz + rr(-40, 40) * scale,
        r: rad, ry: rr(0.5, 0.78)
      });
    }
  }
  const clouds = new THREE.Group();
  const m4c = new THREE.Matrix4();
  [[lit, cloudMat], [shade, shadeMat]].forEach(([list, mat]) => {
    const im = new THREE.InstancedMesh(puffGeo, mat, list.length);
    list.forEach((p, i) => {
      m4c.makeScale(p.r, p.r * p.ry, p.r);
      m4c.setPosition(p.x, p.y, p.z);
      im.setMatrixAt(i, m4c);
    });
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    clouds.add(im);
  });
  scene.add(clouds);
  return clouds;
}

/* ============================================================
   Ribbon meshes for roads / paths
   ============================================================ */
function ribbon(path, halfW, y, color, opts) {
  opts = opts || {};
  const pts = path.pts;
  const pos = [], col = [], uv = [], idx = [];
  const c = new THREE.Color(color), c2 = new THREE.Color(opts.edge || color);
  const vScale = opts.vScale || 9;
  let v = 0, dist = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next[0] - prev[0], dz = next[1] - prev[1];
    const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    const nx = -dz, nz = dx;
    if (i > 0) dist += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    const yy = (opts.follow ? terrainH(p[0], p[1]) : 0) + y;
    // 4 vertices across: edge, inner, inner, edge (edge slightly lower for a lip)
    const across = [-halfW, -halfW * 0.86, halfW * 0.86, halfW];
    for (let k = 0; k < 4; k++) {
      const w = across[k];
      pos.push(p[0] + nx * w, yy - (k === 0 || k === 3 ? 0.06 : 0), p[1] + nz * w);
      const cc = (k === 0 || k === 3) ? c2 : c;
      col.push(cc.r, cc.g, cc.b);
      uv.push((w / halfW) * 0.5 + 0.5, dist / vScale);
    }
    if (i < pts.length - 1) {
      for (let k = 0; k < 3; k++) {
        const a = v + k, b = v + k + 1, d = v + 4 + k, e = v + 5 + k;
        idx.push(a, d, b, b, d, e);
      }
    }
    v += 4;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, map: opts.map || null, envMap: opts.env ? ENV : null,
    envMapIntensity: 0.28,
    roughness: opts.rough === undefined ? 0.92 : opts.rough,
    metalness: 0, polygonOffset: true, polygonOffsetFactor: opts.po || -1, polygonOffsetUnits: -1
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  return mesh;
}

function centerLines(path, y, follow) {
  const pos = [], idx = [];
  const pts = path.pts;
  let v = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.floor(len / 16));
    let dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
    const nx = -dz * 0.24, nz = dx * 0.24;
    for (let k = 0; k < n; k++) {
      const t0 = (k + 0.28) / n, t1 = (k + 0.72) / n;
      const x0 = lerp(a[0], b[0], t0), z0 = lerp(a[1], b[1], t0);
      const x1 = lerp(a[0], b[0], t1), z1 = lerp(a[1], b[1], t1);
      const ya = follow ? terrainH(x0, z0) + y : y;
      const yb = follow ? terrainH(x1, z1) + y : y;
      pos.push(x0 - nx, ya, z0 - nz, x0 + nx, ya, z0 + nz, x1 + nx, yb, z1 + nz, x1 - nx, yb, z1 - nz);
      idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    color: 0xe8dcb8, transparent: true, opacity: 0.6,
    polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -2
  }));
  return m;
}

/* ============================================================
   Terrain meshes
   ============================================================ */
function buildGround() {
  const g = new THREE.PlaneGeometry(BOUND_X * 2 + 700, BOUND_Z * 2 + 700, 120, 96);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  const colors = [];
  const a = new THREE.Color(COL.grass), b = new THREE.Color(COL.grassDark), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const n = (Math.sin(x * 0.021) * Math.cos(z * 0.017) + Math.sin(x * 0.006 + z * 0.009)) * 0.5 + 0.5;
    tmp.copy(a).lerp(b, clamp(n, 0, 1) * 0.85);
    const far = clamp((Math.hypot(x, z) - 700) / 700, 0, 1);
    tmp.lerp(new THREE.Color(0x7d9a6a), far * 0.5);
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  // clone: the verge ribbons share TEX.grass and need their own repeat
  const gtex = TEX.grass ? TEX.grass.clone() : null;
  if (gtex) { gtex.needsUpdate = true; gtex.wrapS = gtex.wrapT = THREE.RepeatWrapping; gtex.repeat.set(120, 90); }
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    vertexColors: true, map: gtex || null, roughness: 0.97, metalness: 0
  }));
  m.receiveShadow = true;
  m.position.y = -0.02;
  return m;
}

/* A square grid: cells must stay narrower than the road, or single triangles
   span tarmac and bank and cut through the carriageway. */
const MTN_MESH_STEP = 4;
function buildMountain() {
  const step = MTN_MESH_STEP;
  const R = MTN.r + 10;
  const n = Math.ceil(R * 2 / step) + 1;
  const x0 = MTN.x - R, z0 = MTN.z - R;
  const pos = new Float32Array(n * n * 3);
  const col = new Float32Array(n * n * 3);
  const uv = new Float32Array(n * n * 2);
  const inside = new Uint8Array(n * n);
  const rock = new THREE.Color(COL.rock), rockTop = new THREE.Color(COL.rockTop);
  const road = new THREE.Color(0x45454c), green = new THREE.Color(0x5a7644), c = new THREE.Color();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i;
    const x = x0 + i * step, z = z0 + j * step;
    const s = mountainSample(x, z);
    const h = s ? Math.max(0, s.h) : 0;
    inside[k] = s ? 1 : 0;
    // tuck the terrain a touch under anything drivable so the road always wins
    pos[k * 3] = x; pos[k * 3 + 1] = h - (s && s.road ? 0.12 : 0); pos[k * 3 + 2] = z;
    if (s && s.road) c.copy(road).lerp(rock, 0.15);
    else {
      c.copy(rock).lerp(rockTop, clamp(h / MTN.h, 0, 1));
      c.lerp(green, clamp(1 - h / (MTN.h * 0.85), 0, 1) * 0.7);
      c.multiplyScalar(0.93 + (((i * 7 + j * 13) % 11) / 110));
    }
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    uv[k * 2] = x / 28; uv[k * 2 + 1] = z / 28;
  }
  const idx = [];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
    if (!(inside[a] || inside[b] || inside[d] || inside[e])) continue;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(n * n > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    vertexColors: true, map: TEX.rock || null, roughness: 0.95, metalness: 0
  }));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.grid = { n: n, step: step, x0: x0, z0: z0, pos: pos };
  return mesh;
}


/* Circuit planning. Positions are derived from the loop's own shape rather
   than hard-coded: corners are where heading changes quickly, the pit straight
   is the stretch that changes least, and buildings go on whichever side has
   room. */

function planCircuit(track) {
  const W = track.w;
  const H = track.pts[0].h;
  // resample the loop evenly
  const src = track.pts.map(p => [p.x, p.z]);
  const S = [];
  let total = 0;
  for (let i = 0; i < src.length - 1; i++) {
    const a = src[i], b = src[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(L / 4));
    for (let k = 0; k < n; k++) S.push({ x: a[0] + (b[0] - a[0]) * k / n, z: a[1] + (b[1] - a[1]) * k / n, s: total + L * k / n });
    total += L;
  }
  const N = S.length;
  const at = i => S[((i % N) + N) % N];
  S.forEach((p, i) => {
    const a = at(i - 1), b = at(i + 1);
    const hd = Math.atan2(b.x - a.x, b.z - a.z);
    p.hd = hd;
    p.nx = Math.cos(hd); p.nz = -Math.sin(hd);      // the car's right-hand side
  });
  // curvature, smoothed over a few samples: signed turn per metre
  S.forEach((p, i) => {
    let t = 0;
    for (let k = -3; k <= 3; k++) {
      const a = at(i + k - 1), b = at(i + k);
      t += Math.atan2(Math.sin(b.hd - a.hd), Math.cos(b.hd - a.hd));
    }
    p.k = t / (7 * 4);
  });

  // the join with the climb, and anywhere the loop runs close to itself, are no-go
  const busy = S.map(p => {
    let d = 1e9;
    MPATHS[0].pts.forEach(q => { d = Math.min(d, Math.hypot(q.x - p.x, q.z - p.z)); });
    let self = 1e9;
    S.forEach(q => { if (Math.abs(q.s - p.s) > 60 && Math.abs(q.s - p.s) < total - 60) self = Math.min(self, Math.hypot(q.x - p.x, q.z - p.z)); });
    return d < W * 3.5 || self < W * 3.5;
  });

  /* Corners: runs where the car turns faster than about 1 in 110 m. Kerbs go on
     the inside at the apex and on the outside at the exit, as on a real track. */
  const kerbs = [];
  let i0 = -1;
  for (let i = 0; i <= N; i++) {
    const hot = i < N && Math.abs(S[i].k) > 1 / 110 && !busy[i];
    if (hot && i0 < 0) i0 = i;
    if (!hot && i0 >= 0) {
      if (i - i0 >= 3) {
        // a rising heading turns toward the car's right here, so +k is a
        // right-hander and its inside is the right-hand edge
        const sign = Math.sign(S[Math.floor((i0 + i) / 2)].k);
        kerbs.push({ from: i0, to: i, side: sign, apex: true });                                   // inside
        kerbs.push({ from: Math.floor((i0 + i) / 2), to: Math.min(N - 1, i + 4), side: -sign });   // exit
      }
      i0 = -1;
    }
  }

  // the straightest window long enough for the pit lane
  const winN = Math.round((PIT.length + PIT.taper * 2) / 4);
  let best = -1, bestCurv = 1e9;
  for (let i = 0; i < N; i++) {
    let c = 0, ok = true;
    for (let k = 0; k < winN; k++) { const p = at(i + k); if (busy[((i + k) % N)]) { ok = false; break; } c += Math.abs(p.k); }
    if (ok && c < bestCurv) { bestCurv = c; best = i; }
  }
  if (best < 0) return { kerbs, S, total, W, H };

  // pits go on whichever side has room, clear of every other road
  const clearance = side => {
    let worst = 1e9;
    for (let k = 0; k < winN; k += 3) {
      const p = at(best + k);
      for (const off of [PIT.offset, PIT.offset + 22]) {
        const x = p.x + p.nx * off * side, z = p.z + p.nz * off * side;
        if (Math.hypot(x - MTN.x, z - MTN.z) > MTN.r - 25) worst = -1;
        MPATHS[0].pts.forEach(q => { worst = Math.min(worst, Math.hypot(q.x - x, q.z - z)); });
        S.forEach(q => { if (Math.abs(q.s - p.s) > 40) worst = Math.min(worst, Math.hypot(q.x - x, q.z - z)); });
      }
    }
    return worst;
  };
  const side = clearance(1) >= clearance(-1) ? 1 : -1;

  // pit lane: peel off, run parallel, rejoin
  const pitPts = [];
  const tapN = Math.round(PIT.taper / 4);
  for (let k = 0; k <= winN; k += 2) {
    const p = at(best + k);
    let f = 1;
    if (k < tapN) f = smooth(k / tapN);
    else if (k > winN - tapN) f = smooth((winN - k) / tapN);
    const off = lerp(W - PIT.halfW * 0.6, PIT.offset, f) * side;
    pitPts.push({ x: p.x + p.nx * off, z: p.z + p.nz * off, h: H });
  }
  let pitLen = 0;
  for (let k = 1; k < pitPts.length; k++) pitLen += Math.hypot(pitPts[k].x - pitPts[k - 1].x, pitPts[k].z - pitPts[k - 1].z);
  const pit = { pts: pitPts, w: PIT.halfW, len: pitLen, pit: true };

  // garages behind the pit lane, and a level pad under each
  const garages = [];
  for (let k = tapN + 2; k <= winN - tapN - 2; k += 4) {
    const p = at(best + k);
    const off = (PIT.offset + PIT.halfW + 7.5) * side;
    garages.push({ x: p.x + p.nx * off, z: p.z + p.nz * off, hd: p.hd, side: side, h: H });
  }
  garages.forEach(g => FLAT_PADS.push({ x: g.x, z: g.z, r: 11, h: H }));

  /* Grandstands. Outside a corner is the natural place, but much of this
     circuit runs along the hill's edge where the outside is thin air, so each
     candidate tries the outside first and then the infield. */
  const stands = [];
  const tryStand = (centre, side2, len) => {
    const pts = [];
    const off = (W + 20) * side2;
    for (let k = -Math.round(len / 8); k <= Math.round(len / 8); k += 2) {
      const p = at(centre + k);
      pts.push({ x: p.x + p.nx * off, z: p.z + p.nz * off, hd: p.hd });
    }
    for (const q of pts) {
      if (Math.hypot(q.x - MTN.x, q.z - MTN.z) > MTN.r - 18) return false;
      for (const path of MPATHS) for (const r of path.pts) if (Math.hypot(r.x - q.x, r.z - q.z) < path.w + 12) return false;
      for (const r of S) if (Math.hypot(r.x - q.x, r.z - q.z) < W + 12) return false;
      for (const r of pitPts) if (Math.hypot(r.x - q.x, r.z - q.z) < PIT.halfW + 14) return false;
      for (const g of garages) if (Math.hypot(g.x - q.x, g.z - q.z) < 22) return false;
      for (const s of stands) for (const o of s.pts) if (Math.hypot(o.x - q.x, o.z - q.z) < 30) return false;
    }
    // the seating faces the track, so a stand on the infield faces outward
    stands.push({ pts: pts, side: side2, faceIn: true });
    pts.forEach(q => FLAT_PADS.push({ x: q.x, z: q.z, r: 12, h: H }));
    return true;
  };
  const candidates = [];
  candidates.push({ c: best + Math.round(winN / 2), outside: -side, weight: 1e6 });   // the main straight
  kerbs.filter(k => k.apex).forEach(k => candidates.push({
    c: Math.floor((k.from + k.to) / 2), outside: -k.side, weight: k.to - k.from }));
  // long sweeps between corners are good viewing too
  for (let i = 0; i < N; i += 12) if (!busy[i] && Math.abs(S[i].k) < 1 / 300) candidates.push({ c: i, outside: 1, weight: 1, either: true });
  candidates.sort((a, b) => b.weight - a.weight);
  for (const cand of candidates) {
    if (stands.length >= 4) break;
    for (const len of [96, 64]) {
      if (tryStand(cand.c, cand.outside, len) || tryStand(cand.c, -cand.outside, len)) break;
    }
  }
  return { kerbs, S, total, W, H, pit, pitWin: { from: best, n: winN, taper: tapN }, side, garages, stands,
    startIdx: (best + Math.round(winN / 2)) % N };
}



/* Race surfaces, built from the paths rather than the city tile: plain asphalt
   with no centre line, a white edge line, continuous red/white kerbs both
   sides, then a green verge. */
function stripMesh(pts, closed, inner, outer, y0, y1, mat, uLen, bothSides) {
  const n = pts.length;
  const pos = [], uv = [], idx = [];
  // arc length along the path
  const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  const normal = i => {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return [(b.z - a.z) / L, -(b.x - a.x) / L];
  };
  const sides = bothSides ? [1, -1] : [1];
  sides.forEach(side => {
    const base = pos.length / 3;
    const count = closed ? n + 1 : n;
    for (let k = 0; k < count; k++) {
      const i = k % n;
      const [nx, nz] = normal(i);
      const p = pts[i], h = p.h !== undefined ? p.h : 0;
      const sAt = k === n ? s[n - 1] + Math.hypot(pts[0].x - pts[n - 1].x, pts[0].z - pts[n - 1].z) : s[i];
      const a = inner * side, b = outer * side;
      pos.push(p.x + nx * a, h + y0, p.z + nz * a, p.x + nx * b, h + y1, p.z + nz * b);
      uv.push(sAt / uLen, 0, sAt / uLen, 1);
      if (k > 0) {
        /* Wound so each face points up; back faces are culled. */
        const v = base + k * 2;
        if (side > 0) idx.push(v - 2, v, v - 1, v - 1, v, v + 1);
        else idx.push(v - 2, v - 1, v, v - 1, v + 1, v);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  return m;
}

function raceMaterials() {
  const off = (m, f) => { m.polygonOffset = true; m.polygonOffsetFactor = f; m.polygonOffsetUnits = f; return m; };
  const asphalt = TEX.asphalt ? TEX.asphalt.clone() : null;
  if (asphalt) { asphalt.needsUpdate = true; asphalt.repeat.set(1, 1); }
  return {
    asphalt: off(new THREE.MeshStandardMaterial({ color: 0xffffff, map: asphalt, roughness: 0.9 }), -3),
    line: off(new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.6 }), -4),
    kerb: off(new THREE.MeshStandardMaterial({ color: 0xffffff, map: TEX.kerbStripe || null, roughness: 0.55 }), -5),
    verge: off(new THREE.MeshStandardMaterial({ color: 0x3f6b33, roughness: 0.95 }), -2)
  };
}

function raceRoad(g, path, closed, opts) {
  const M = opts.mats;
  const pts = path.pts, W = path.w;
  const kerbW = opts.kerbs ? 1.4 : 0;
  const lineW = 0.3;
  const edge = W - kerbW;
  // the track stands clear of the floor: 8 cm, kerbs higher still
  g.add(stripMesh(pts, closed, -edge, edge, 0.08, 0.08, M.asphalt, 12, false));
  g.add(stripMesh(pts, closed, edge - lineW - 0.15, edge - 0.15, 0.095, 0.095, M.line, 1e6, true));
  if (opts.kerbs) {
    // kerbs rise slightly toward the outside, as a real kerb is profiled
    g.add(stripMesh(pts, closed, edge, W, 0.10, 0.16, M.kerb, 3, true));
    g.add(stripMesh(pts, closed, W, W + 1.8, 0.07, 0.07, M.verge, 1e6, true));
  }
}

/* Level flooring over the platform: concrete run-off beside the tarmac, paving
   across the rest. Built from the same grid that levels the terrain. */
function buildFlooring() {
  const P = PLAT, g = new THREE.Group();
  const mk = (map, col) => {
    const m = new THREE.MeshStandardMaterial({ color: col, map: map || null, roughness: 0.92 });
    m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1;
    return m;
  };
  [[1, mk(TEX.apron, 0xffffff)], [2, mk(TEX.paving, 0xffffff)]].forEach(([kind, mat]) => {
    const pos = [], uv = [], idx = [];
    const hs = P.step / 2;
    for (let j = 0; j < P.nz; j++) for (let i = 0; i < P.nx; i++) {
      const k = j * P.nx + i;
      if (!P.on[k] || P.kind[k] !== kind) continue;
      const x = P.x0 + i * P.step, z = P.z0 + j * P.step, v = pos.length / 3;
      pos.push(x - hs, P.H + 0.012, z - hs, x + hs, P.H + 0.012, z - hs, x - hs, P.H + 0.012, z + hs, x + hs, P.H + 0.012, z + hs);
      const s = kind === 1 ? 12 : 6;
      uv.push((x - hs) / s, (z - hs) / s, (x + hs) / s, (z - hs) / s, (x - hs) / s, (z + hs) / s, (x + hs) / s, (z + hs) / s);
      idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    }
    if (!idx.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, q) => q % 3 === 1 ? 1 : 0), 3));
    geo.setIndex(new THREE.BufferAttribute(pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    g.add(mesh);
  });
  return g;
}


/* Timing: start/finish gantry with a live screen, plus checkpoint arches.
   Lap progress is measured along the circuit centreline from the start line,
   in the direction the loop is drawn. */
const LAP_CHECKPOINTS = 3;

function circuitProgress(x, z, hint) {
  const C = CIRCUIT, S = C.S, N = S.length;
  // search near the last known position first; fall back to the whole lap
  let bi = -1, bd = 1e9;
  const scan = (from, to) => {
    for (let k = from; k <= to; k++) {
      const i = ((k % N) + N) % N, p = S[i];
      const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < bd) { bd = d; bi = i; }
    }
  };
  if (hint !== undefined && hint >= 0) scan(hint - 12, hint + 12);
  if (bi < 0 || bd > 30 * 30) scan(0, N - 1);
  const p = S[bi];
  const along = ((p.s - S[C.startIdx].s) % C.total + C.total) % C.total;
  return { i: bi, d: Math.sqrt(bd), p: along };
}

function textPanel(w, h, draw) {
  const c = cnv(w, h);
  const x = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  const api = { canvas: c, ctx: x, tex: t, text: null,
    set(text) { if (text === api.text) return; api.text = text; draw(x, w, h, text); t.needsUpdate = true; } };
  return api;
}

function buildTiming(g) {
  const C = CIRCUIT, S = C.S, H = C.H;
  const legOff = C.W + 3.2;
  const red = new THREE.MeshStandardMaterial({ color: 0xc8453c, roughness: 0.6 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.5, metalness: 0.4 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.6 });

  const arch = (i, height, beamDepth, mat) => {
    const p = S[i];
    const grp = new THREE.Group();
    [-1, 1].forEach(side => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.4, height, 1.4), mat);
      leg.position.set(side * legOff, height / 2, 0);
      grp.add(leg);
      const lx = p.x + p.nx * legOff * side, lz = p.z + p.nz * legOff * side;
      colliders.push({ x: lx, z: lz, hw: 1.1, hd: 1.1, h: H + height, y0: H });
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(legOff * 2 + 1.4, beamDepth, 1.4), mat);
    beam.position.y = height - beamDepth / 2;
    grp.add(beam);
    grp.position.set(p.x, H, p.z);
    // A rotation of the heading itself maps the group's x axis onto the road's
    // right-hand normal, so the beam spans the road and the legs stand off it.
    grp.rotation.y = p.hd;
    grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(grp);
    return grp;
  };

  // start / finish gantry with a timing screen on each face
  const gantry = arch(C.startIdx, 11, 2.4, steel);
  const screen = textPanel(512, 128, (x, w, h, text) => {
    x.fillStyle = '#0b0d12'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#c8453c'; x.fillRect(0, 0, w, 6); x.fillRect(0, h - 6, w, 6);
    x.fillStyle = '#f3b545'; x.font = 'bold 26px monospace'; x.textAlign = 'left';
    x.fillText('KITSUNE CIRCUIT', 18, 38);
    const parts = String(text).split('|');
    x.fillStyle = '#f7ecd6'; x.font = 'bold 58px monospace'; x.textAlign = 'right';
    x.fillText(parts[0] || '', w - 18, 104);
    x.fillStyle = '#8fd0ff'; x.font = '22px monospace'; x.textAlign = 'left';
    x.fillText(parts[1] || '', 18, 104);
  });
  screen.set('0:00:000|BEST 0:00:000');
  const scrMat = new THREE.MeshBasicMaterial({ map: screen.tex });
  [0.75, -0.75].forEach((dz, k) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), scrMat);
    panel.position.set(0, 11 - 1.2, dz);
    if (k === 1) panel.rotation.y = Math.PI;
    gantry.add(panel);
  });
  // chequered band along the beam
  const band = new THREE.Mesh(new THREE.BoxGeometry(legOff * 2 + 1.6, 0.5, 1.5), white);
  band.position.y = 11 + 0.25;
  gantry.add(band);
  C.screen = screen;

  // checkpoints at even fractions of the lap
  C.checkpoints = [];
  for (let n = 1; n <= LAP_CHECKPOINTS; n++) {
    const target = C.total * n / (LAP_CHECKPOINTS + 1);
    let bi = 0, bd = 1e9;
    S.forEach((p, i) => {
      const along = ((p.s - S[C.startIdx].s) % C.total + C.total) % C.total;
      if (Math.abs(along - target) < bd) { bd = Math.abs(along - target); bi = i; }
    });
    const a = arch(bi, 8, 1.1, red);
    const banner = textPanel(256, 64, (x, w, h, text) => {
      x.fillStyle = '#c8453c'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#f7ecd6'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center';
      x.fillText(text, w / 2, 43);
    });
    banner.set('CHECKPOINT ' + n);
    const bm = new THREE.MeshBasicMaterial({ map: banner.tex });
    [0.72, -0.72].forEach((dz, k) => {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.0), bm);
      pl.position.set(0, 8 - 0.55, dz);
      if (k === 1) pl.rotation.y = Math.PI;
      a.add(pl);
    });
    C.checkpoints.push({ i: bi, at: ((S[bi].s - S[C.startIdx].s) % C.total + C.total) % C.total });
  }
}

/* ------------------------------------------------------------------
   Dressing the circuit: kerbs, barriers, pit wall, garages, grandstands.
   ------------------------------------------------------------------ */
function dressCircuit(inst) {
  const C = CIRCUIT, S = C.S, N = S.length, H = C.H;
  const at = i => S[((i % N) + N) % N];
  const g = new THREE.Group();
  const edge = C.W - 0.3;                       // edge of the tarmac

  // the race surfaces: circuit with kerbs all the way round, plain pit lane and access road
  const mats = raceMaterials();
  const loop = S.map(p => ({ x: p.x, z: p.z, h: H }));
  raceRoad(g, { pts: loop, w: C.W }, true, { mats: mats, kerbs: true });
  MPATHS.forEach(p => { if (p.pit || p.link) raceRoad(g, p, false, { mats: mats, kerbs: false }); });
  C.kerbLength = C.total * 2;
  if (PLAT) g.add(buildFlooring());
  buildTiming(g);

  // pit window: which samples the pit lane runs beside
  const pw = C.pitWin;
  const inPitWin = i => {
    if (!pw) return false;
    const rel = ((i - pw.from) % N + N) % N;
    return rel <= pw.n;
  };
  const busyNear = (x, z, selfS) => {
    // any other stretch of road, or the climb, too close for a barrier here
    for (const r of MPATHS[0].pts) if (Math.hypot(r.x - x, r.z - z) < MPATHS[0].w + 3) return true;
    for (const r of S) {
      if (Math.abs(r.s - selfS) < 30 || Math.abs(r.s - selfS) > C.total - 30) continue;
      if (Math.hypot(r.x - x, r.z - z) < C.W + 3) return true;
    }
    if (C.pit) for (const r of C.pit.pts) if (Math.hypot(r.x - x, r.z - z) < PIT.halfW + 2) return true;
    // leave the mouth of the access road open
    for (const p of MPATHS) {
      if (!p.link) continue;
      for (let i = 0; i < p.pts.length - 1; i++) {
        const a = p.pts[i], b = p.pts[i + 1];
        if (segDist(x, z, a.x, a.z, b.x, b.z).d < p.w + 3) return true;
      }
    }
    return false;
  };

  // armco both sides, breakable, broken off where another road runs close
  const SPAN = 6;
  C.railSegs = 0;
  let sAcc = 0;
  for (let i = 0; i < N; i++) {
    const p = at(i), q = at(i + 1);
    const L = Math.hypot(q.x - p.x, q.z - p.z);
    for (let s = sAcc; s < L; s += SPAN) {
      const t = s / L;
      const cx = lerp(p.x, q.x, t), cz = lerp(p.z, q.z, t);
      [-1, 1].forEach(side => {
        // the pit side of the pit straight gets a wall instead
        if (C.pit && side === C.side && inPitWin(i)) return;
        const off = (C.W + 6) * side;
        const x = cx + p.nx * off, z = cz + p.nz * off;
        if (busyNear(x, z, p.s)) return;
        const hh = H;
        // the beams face the track, which lies back across the centreline
        const parts = railSection(inst, x, z, hh, p.hd, -p.nx * side, -p.nz * side, SPAN);
        const seg = { parts: parts, cols: [] };
        const col = { x: x, z: z, hw: 1.1, hd: 1.1, h: hh + 1.4, y0: hh, rail: true, seg: seg };
        seg.cols.push(col); colliders.push(col); RAIL_SEGS.push(seg);
        C.railSegs++;
      });
    }
    sAcc = (sAcc + Math.ceil((L - sAcc) / SPAN) * SPAN) - L;
    if (sAcc < 0) sAcc = 0;
  }

  const concrete = new THREE.MeshStandardMaterial({ color: 0xc9c5bc, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.7 });

  // pit wall between the track and the pit lane, along the parallel run
  if (C.pit && pw) {
    const wallOff = (C.W + (PIT.offset - PIT.halfW - C.W) * 0.5) * C.side;
    for (let k = pw.taper; k <= pw.n - pw.taper; k++) {
      const p = at(pw.from + k), q = at(pw.from + k + 1);
      const x = (p.x + q.x) / 2 + p.nx * wallOff, z = (p.z + q.z) / 2 + p.nz * wallOff;
      const L = Math.hypot(q.x - p.x, q.z - p.z);
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, L + 0.2), concrete);
      w.position.set(x, H + 0.55, z);
      w.rotation.y = p.hd;
      w.castShadow = true;
      g.add(w);
      if (k % 2 === 0) colliders.push({ x: x, z: z, hw: 1, hd: 1, h: H + 1.1, y0: H });
    }
  }

  // garages, open to the pit lane, in a row of team colours
  const TEAM = [0xc8453c, 0x2f6fb0, 0xf3b545, 0x3f8f5c, 0x8a4fb0, 0xe07a2e, 0x2a9d9d];
  (C.garages || []).forEach((gr, n) => {
    const box = new THREE.Group();
    const walls = new THREE.MeshStandardMaterial({ color: 0xe6e2da, roughness: 0.85 });
    const team = new THREE.MeshStandardMaterial({ color: TEAM[n % TEAM.length], roughness: 0.6 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 0.5), walls);
    back.position.set(0, 3.5, -6);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.5, 13), walls);
    roof.position.set(0, 7.2, 0);
    const band = new THREE.Mesh(new THREE.BoxGeometry(14.4, 1.2, 0.3), team);
    band.position.set(0, 6.4, 6.4);
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(12.4, 2, 0.15), dark);
    shutter.position.set(0, 5.4, 6.3);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.1, 12), dark);
    floor.position.set(0, 0.05, 0);
    box.add(back, roof, band, shutter, floor);
    [-7, 7].forEach(o => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 12.5), walls);
      side.position.set(o, 3.5, 0);
      box.add(side);
    });
    box.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    box.position.set(gr.x, H, gr.z);
    // open face toward the pit lane
    box.rotation.y = gr.hd + (gr.side > 0 ? -Math.PI / 2 : Math.PI / 2);
    g.add(box);
    // the back and sides are solid; the front is open
    const bx = gr.x + Math.cos(gr.hd) * 5 * gr.side, bz = gr.z - Math.sin(gr.hd) * 5 * gr.side;
    colliders.push({ x: bx, z: bz, hw: 4, hd: 4, h: H + 7, y0: H });
  });

  // grandstands: stepped tiers rising away from the track, roofed, with a crowd
  C.seats = 0;
  const stand = new THREE.MeshStandardMaterial({ color: 0x8e949c, roughness: 0.85 });
  const roofM = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.6 });
  (C.stands || []).forEach(st => {
    // thin out points that bunch up on the inside of a tight bend
    const pts = [];
    st.pts.forEach(q => { if (!pts.length || Math.hypot(q.x - pts[pts.length - 1].x, q.z - pts[pts.length - 1].z) > 7) pts.push(q); });
    st.built = pts.length;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      const hd = Math.atan2(b.x - a.x, b.z - a.z);
      // away from the track: the stand was offset on side st.side
      const ax = Math.cos(hd) * st.side, az = -Math.sin(hd) * st.side;
      const tiers = 6;
      for (let t = 0; t < tiers; t++) {
        const d = t * 1.7;
        const block = new THREE.Mesh(new THREE.BoxGeometry(L + 0.3, 0.9 * (t + 1), 1.7), stand);
        block.position.set(mx + ax * d, H + 0.45 * (t + 1), mz + az * d);
        block.rotation.y = hd;
        block.castShadow = true; block.receiveShadow = true;
        g.add(block);
        // spectators: a scatter of colours along each tier
        for (let s = -L / 2 + 0.6; s < L / 2; s += 1.1) {
          if (rnd() < 0.3) continue;
          const fx = Math.sin(hd), fz = Math.cos(hd);
          inst.crowd.push({ x: mx + ax * d + fx * s, y: H + 0.9 * (t + 1) + 0.45, z: mz + az * d + fz * s,
            rot: hd, sx: 0.55, sy: 0.9, sz: 0.5, colIdx: ri(0, 7) });
          C.seats++;
        }
      }
      const rx = mx + ax * (tiers * 1.7) * 0.5, rz = mz + az * (tiers * 1.7) * 0.5;
      const rf = new THREE.Mesh(new THREE.BoxGeometry(L + 0.6, 0.3, tiers * 1.7 + 2.5), roofM);
      rf.position.set(rx, H + 0.9 * tiers + 3.4, rz);
      rf.rotation.y = hd;
      rf.castShadow = true;
      g.add(rf);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.9 * tiers + 3.4, 6), dark);
      col.position.set(mx + ax * (tiers * 1.7), H + (0.9 * tiers + 3.4) / 2, mz + az * (tiers * 1.7));
      g.add(col);
      colliders.push({ x: mx + ax * 4, z: mz + az * 4, hw: L / 2 + 1, hd: L / 2 + 1, h: H + 6, y0: H });
    }
  });

  // chequered start line across the track, midway down the pit straight
  if (pw) {
    const p = at(pw.from + Math.round(pw.n / 2));
    const cells = 16, cw = (edge * 2) / cells;
    for (let r = 0; r < 2; r++) for (let c = 0; c < cells; c++) {
      const o = -edge + cw * (c + 0.5);
      const fwd = (r - 0.5) * 1.2;
      inst.kerb.push({ x: p.x + p.nx * o + Math.sin(p.hd) * fwd, y: H + 0.07, z: p.z + p.nz * o + Math.cos(p.hd) * fwd,
        rot: p.hd, sx: cw, sy: 0.04, sz: 1.2, colIdx: ((c + r) % 2) === 0 ? 1 : 2 });
    }
    C.startLine = { x: p.x, z: p.z, hd: p.hd };
  }
  return g;
}


/* The circuit platform: the lap interior, a margin around it, the pits and the
   access road are levelled at track height. Cells near the climb are excluded,
   since levelling ground beside a road at a different height pushes terrain
   through the tarmac. */
function buildPlatform() {
  const C = CIRCUIT, H = C.H, step = PLAT_STEP;
  const loop = C.S;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  loop.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); });
  const pad = PLAT_MARGIN + PLAT_BLEND + 40;
  x0 -= pad; z0 -= pad; x1 += pad; z1 += pad;
  x0 = Math.floor(x0 / step) * step; z0 = Math.floor(z0 / step) * step;
  const nx = Math.ceil((x1 - x0) / step) + 1, nz = Math.ceil((z1 - z0) / step) + 1;
  const on = new Uint8Array(nx * nz), kind = new Uint8Array(nx * nz);

  const inLoop = (x, z) => {                     // even-odd rule
    let c = false;
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const a = loop[i], b = loop[j];
      if (((a.z > z) !== (b.z > z)) && (x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x)) c = !c;
    }
    return c;
  };
  const distTo = (x, z, pts, closed) => {
    let m = 1e9;
    const n = pts.length - (closed ? 0 : 1);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const d = segDist(x, z, a.x, a.z, b.x, b.z).d;
      if (d < m) m = d;
    }
    return m;
  };
  const climb = MPATHS[0];
  const pit = MPATHS.find(p => p.pit), link = MPATHS.find(p => p.link);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * step, z = z0 + j * step;
    if (Math.hypot(x - MTN.x, z - MTN.z) > MTN.r - 14) continue;
    // keep well clear of the climb, which runs at its own heights
    const dc = distTo(x, z, climb.pts, false);
    if (dc < climb.w + PLAT_BLEND + 10) continue;
    const dl = distTo(x, z, loop, true);
    const dp = pit ? distTo(x, z, pit.pts, false) : 1e9;
    const dk = link ? distTo(x, z, link.pts, false) : 1e9;
    const k = j * nx + i;
    // cells wholly under tarmac stay level but get no flooring drawn over them
    const under = dl < C.W - 2.8 || dp < PIT.halfW - 2.8 || dk < (link ? link.w : 0) - 2.8;
    if (dl < C.W + 12 || dp < PIT.halfW + 10) { on[k] = 1; kind[k] = under ? 3 : 1; }   // run-off apron
    else if (inLoop(x, z) || dl < C.W + PLAT_MARGIN || dp < PIT.halfW + 34 || dk < link.w + 10) { on[k] = 1; kind[k] = 2; }  // paving
  }
  // distance outward from the platform edge, for a smooth embankment
  const dist = new Float32Array(nx * nz).fill(1e9);
  for (let k = 0; k < on.length; k++) if (on[k]) dist[k] = 0;
  const D1 = step, D2 = step * Math.SQRT2;
  for (let pass = 0; pass < 2; pass++) {
    const fwd = pass === 0;
    for (let jj = 0; jj < nz; jj++) {
      const j = fwd ? jj : nz - 1 - jj;
      for (let ii = 0; ii < nx; ii++) {
        const i = fwd ? ii : nx - 1 - ii;
        const k = j * nx + i;
        const s = fwd ? -1 : 1;
        const nb = [[i + s, j, D1], [i, j + s, D1], [i + s, j + s, D2], [i - s, j + s, D2]];
        for (const [a, b, dd] of nb) {
          if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
          const v = dist[b * nx + a] + dd;
          if (v < dist[k]) dist[k] = v;
        }
      }
    }
  }
  let cells = 0;
  for (let k = 0; k < on.length; k++) if (on[k]) cells++;
  return { x0: x0, z0: z0, nx: nx, nz: nz, step: step, on: on, kind: kind, dist: dist, H: H, cells: cells };
}

/* Distance (m) from the platform: 0 on it, growing across the embankment. */
function platDist(x, z) {
  if (!PLAT) return 1e9;
  const i = Math.round((x - PLAT.x0) / PLAT.step), j = Math.round((z - PLAT.z0) / PLAT.step);
  if (i < 0 || j < 0 || i >= PLAT.nx || j >= PLAT.nz) return 1e9;
  return PLAT.dist[j * PLAT.nx + i];
}

/* One guard-rail section: a steel post and two horizontal beams, set a little
   toward the road so the beams are what a car meets. A single tall slab read as
   a fence; two rails with a gap between read as armco. */
function railSection(inst, x, z, h, rot, tx, tz, span) {
  const o = 0.16;                                     // beams stand proud of the post
  const bx = x + tx * o, bz = z + tz * o;
  const lower = { x: bx, y: h + 0.58, z: bz, rot: rot, sx: 0.09, sy: 0.27, sz: span + 0.3, colIdx: 0 };
  const upper = { x: bx, y: h + 0.98, z: bz, rot: rot, sx: 0.09, sy: 0.27, sz: span + 0.3, colIdx: 0 };
  const post = { x: x, y: h + 0.62, z: z, rot: rot, sx: 0.17, sy: 1.24, sz: 0.17, colIdx: 0 };
  inst.rail.push(lower, upper);
  inst.railPost.push(post);
  return [lower, upper, post];
}

/* Distance from a point to the nearest mountain road. */
function mtnRoadDist(x, z) {
  const cx = Math.floor(x / MCELL), cz = Math.floor(z / MCELL);
  let best = 1e9, w = MTN.roadW;
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    const arr = MGRID.get((cx + i) * 7919 + (cz + j));
    if (!arr) continue;
    for (let k = 0; k < arr.length; k++) {
      const p = MPATHS[arr[k].p];
      const a = p.pts[arr[k].i], b = p.pts[arr[k].i + 1];
      const d = segDist(x, z, a.x, a.z, b.x, b.z).d;
      if (d < best) { best = d; w = p.w; }
    }
  }
  return { d: best, w: w };
}

/* Guard rails, trees and the summit viewpoint. */
const RAIL_SEGS = [];
function mountainProps(group, instancers) {
  railsAlongMountain(instancers);
  if (CIRCUIT) group.add(dressCircuit(instancers));
  vegetateMountain(instancers);
  group.add(buildViewpoint());
}

/* Rails go on the side that falls away, and only where the drop is worth
   guarding. Each run is a post and beams; posts carry small colliders so the
   barrier follows the road's curve. */
function railsAlongMountain(inst) {
  const SPAN = 7;
  MPATHS.forEach((path, pi) => {
    if (pi > 0) return;              // the circuit has its own barriers
    const pts = path.pts;
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
      for (let s = acc; s < L; s += SPAN) {
        const cx = a.x + dx * s, cz = a.z + dz * s, h = lerp(a.h, b.h, s / L);
        if (Math.hypot(cx - PLAZA.x, cz - PLAZA.z) < PLAZA.r + 4) continue;
        const off = path.w + 1.2;
        [-1, 1].forEach(side => {
          const x = cx - dz * off * side, z = cz + dx * off * side;
          const drop = h - terrainH(x - dz * side * 5, z + dx * side * 5);
          if (drop < 2.2) return;                     // no real drop here
          // no rail across another road
          const other = mtnRoadDist(x, z);
          if (other.d < other.w + 0.5) return;
          const rot = Math.atan2(dx, dz);
          const parts = railSection(inst, x, z, h, rot, dz * side, -dx * side, SPAN);
          const seg = { parts: parts, cols: [] };
          const col = { x: x, z: z, hw: 1.1, hd: 1.1, h: h + 1.4, y0: h, rail: true, seg: seg };
          seg.cols.push(col);
          colliders.push(col);
          RAIL_SEGS.push(seg);
        });
      }
      acc = (acc + Math.ceil((L - acc) / SPAN) * SPAN) - L;
      if (acc < 0) acc = 0;
    }
  });
}

/* Cedar and pine forest on the slopes, thinning toward the summit, never on a
   road or the viewpoint. */
function vegetateMountain(inst) {
  const trees = [], tries = 9000;
  for (let n = 0; n < tries; n++) {
    const a = rr(0, TAU), rad = Math.sqrt(rnd()) * (MTN.r - 12);
    const x = MTN.x + Math.cos(a) * rad, z = MTN.z + Math.sin(a) * rad;
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 10) continue;
    const road = mtnRoadDist(x, z);
    if (road.d < road.w + 6) continue;
    const h = terrainH(x, z);
    // thinner higher up, as the tree line would be
    if (rnd() < h / MTN.h * 0.75) continue;
    const kind = rnd();
    if (kind < 0.58) {
      const s = rr(0.75, 1.55);
      const tall = s * rr(0.95, 1.3);
      inst.pineTrunk.push({ x: x, y: h + 2.1 * tall, z: z, rot: 0, sx: s, sy: tall, sz: s, colIdx: 0 });
      inst.pine.push({ x: x, y: h + 2.6 * tall, z: z, rot: rr(0, TAU), sx: s, sy: tall, sz: s,
        colIdx: ri(0, PINE_COLS.length - 1) });
      colliders.push({ x: x, z: z, hw: 0.7 * s, hd: 0.7 * s, h: h + 11 * tall, y0: h, soft: true });
      trees.push(1);
    } else if (kind < 0.88) {
      const s = rr(0.7, 1.6);
      inst.bush.push({ x: x, y: h + 0.8 * s, z: z, rot: rr(0, TAU), sx: s, sy: s, sz: s,
        colIdx: ri(0, LEAF_COLS.length - 1) });
    } else {
      inst.rock.push({ x: x, y: h + 0.4, z: z, rot: rr(0, TAU),
        sx: rr(0.9, 2.4), sy: rr(0.6, 1.4), sz: rr(0.9, 2.4), colIdx: 0 });
    }
  }
  MTN.trees = trees.length;
}

/* The summit viewpoint: a level plaza with a torii at the entrance, benches,
   lanterns, a vending machine and a perimeter wall. */
function buildViewpoint() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 0.92 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.8 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc8453c, roughness: 0.7 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xf2e2c0, emissive: 0xffa04a, emissiveIntensity: 1.3 });
  const paving = new THREE.MeshStandardMaterial({ color: 0x8c877e, roughness: 0.95 });

  const floor = new THREE.Mesh(new THREE.CircleGeometry(PLAZA.r, 48), paving);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(PLAZA.x, PLAZA.h + 0.04, PLAZA.z);
  floor.receiveShadow = true;
  g.add(floor);

  // low perimeter wall, open where the road arrives
  const gapDir = PLAZA.dir + Math.PI;
  const wallN = 40;
  for (let i = 0; i < wallN; i++) {
    const a = i / wallN * TAU;
    const rel = Math.atan2(Math.sin(a - gapDir), Math.cos(a - gapDir));
    if (Math.abs(rel) < 0.42) continue;
    const x = PLAZA.x + Math.sin(a) * PLAZA.r, z = PLAZA.z + Math.cos(a) * PLAZA.r;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, PLAZA.r * TAU / wallN + 0.2), stone);
    seg.position.set(x, PLAZA.h + 0.45, z);
    seg.rotation.y = a + Math.PI / 2;
    seg.castShadow = true;
    g.add(seg);
    colliders.push({ x: x, z: z, hw: 1.3, hd: 1.3, h: PLAZA.h + 1, y0: PLAZA.h });
  }

  // benches round the far rim, facing out over the view
  for (let i = 0; i < 6; i++) {
    const a = gapDir + Math.PI + (i - 2.5) * 0.34;
    const rr2 = PLAZA.r - 4;
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.8), wood);
    seat.position.y = 0.5;
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 0.12), wood);
    back.position.set(0, 0.9, -0.36);
    bench.add(seat, back);
    [-1.3, 1.3].forEach(o => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.7), stone);
      leg.position.set(o, 0.25, 0);
      bench.add(leg);
    });
    bench.position.set(PLAZA.x + Math.sin(a) * rr2, PLAZA.h, PLAZA.z + Math.cos(a) * rr2);
    bench.rotation.y = a;
    bench.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(bench);
  }

  // stone lanterns
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + 0.26;
    const x = PLAZA.x + Math.sin(a) * (PLAZA.r - 1.8), z = PLAZA.z + Math.cos(a) * (PLAZA.r - 1.8);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1.6, 8), stone);
    base.position.set(x, PLAZA.h + 0.8, z);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), lamp);
    box.position.set(x, PLAZA.h + 1.95, z);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.5, 4), stone);
    cap.position.set(x, PLAZA.h + 2.55, z);
    cap.rotation.y = Math.PI / 4;
    g.add(base, box, cap);
  }

  /* Torii over the entrance: rotated by the road heading so its span crosses the
   road and the legs sit outside the carriageway. */
  const span = MTN.roadW + 2.5;                    // legs clear of the tarmac
  const tx = PLAZA.x + Math.sin(gapDir) * (PLAZA.r - 2), tz = PLAZA.z + Math.cos(gapDir) * (PLAZA.r - 2);
  const torii = new THREE.Group();
  [-span, span].forEach(o => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 13, 12), red);
    leg.position.set(o, 6.5, 0);
    torii.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.8, 12), stone);
    foot.position.set(o, 0.4, 0);
    torii.add(foot);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 6, 1.2, 1.7), red);
  lintel.position.y = 13.4;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 7.5, 0.5, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x2a2521, roughness: 0.8 }));
  cap.position.y = 14.2;
  const lintel2 = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 1, 0.8, 1.3), red);
  lintel2.position.y = 11.4;
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2a2521, roughness: 0.8 }));
  plaque.position.y = 12.4;
  torii.add(lintel, cap, lintel2, plaque);
  torii.position.set(tx, PLAZA.h, tz);
  torii.rotation.y = PLAZA.dir;
  torii.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.add(torii);
  // the legs are solid; the gap between them is the road
  [-span, span].forEach(o => {
    const lx = tx + Math.cos(PLAZA.dir) * o, lz = tz - Math.sin(PLAZA.dir) * o;
    colliders.push({ x: lx, z: lz, hw: 1.1, hd: 1.1, h: PLAZA.h + 13, y0: PLAZA.h });
  });
  PLAZA.gate = { x: tx, z: tz, span: span };

  // vending machine, because there is always one
  const vx = PLAZA.x + Math.sin(gapDir + 1.1) * (PLAZA.r - 3.5), vz = PLAZA.z + Math.cos(gapDir + 1.1) * (PLAZA.r - 3.5);
  const vend = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xdd4b3e, emissive: 0xff8a5c, emissiveIntensity: 0.4 }));
  vend.position.set(vx, PLAZA.h + 1.6, vz);
  vend.rotation.y = gapDir + 1.1;
  g.add(vend);
  colliders.push({ x: vx, z: vz, hw: 1, hd: 1, h: PLAZA.h + 3.2, y0: PLAZA.h });

  const glow = new THREE.PointLight(0xffb066, 1.2, 70, 2);
  glow.position.set(PLAZA.x, PLAZA.h + 6, PLAZA.z);
  g.add(glow);
  return g;
}
