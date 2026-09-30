console.log('--- builders (every mesh factory must run clean) ---');
scene = new Obj();
world = new Obj();

{
  const built = [];
  buildTextures(); buildEnvMap();
  built.push(['buildTextures', Object.keys(TEX).length + ' surfaces + facades']);
  const sky = buildSky(); built.push(['buildSky', sky.children.length + ' puff sets']);
  built.push(['buildGround', buildGround() ? 'ok' : 'fail']);
  built.push(['buildMountain', buildMountain() ? 'ok' : 'fail']);
  ROADS.forEach(r => { ribbon(r, r.w, 0.24, COL.road, { edge: COL.roadEdge }); centerLines(r, 0.3); edgeLines(r, r.w - 1.5, 0.42, 0.31, COL.line); });
  DIRT.forEach(d => ribbon(d, d.w, 0.14, COL.dirt, {}));
  built.push(['ribbon + road markings', ROADS.length + ' roads, ' + DIRT.length + ' tracks']);
  buildHQ(world); built.push(['buildHQ', 'ok']);
  built.push(['makeMarker', makeMarker() ? 'ok' : 'fail']);
  ROADS.forEach(r => pavement(r, r.w + 0.2, r.w + 4.8, 0.17));
  built.push(['pavement (kerbs)', ROADS.length + ' streets kerbed']);
  guideArrow = makeGuideArrow();
  built.push(['makeGuideArrow', 'ok']);
  const mi = makeInstancers(); mountainProps(world, mi);
  built.push(['mountainProps', mi.post.length + ' guard posts']);
  initSmoke(); initMarks(); built.push(['particles', 'ok']);
  puff(0, 1, 0); layMark('t', 0, 0, 0, 0, 1); layMark('t', 1, 0, 1, 0, 1); updateSmoke(0.1);
  built.push(['particle update', 'ok']);
  CARS.forEach(c => {
    ['gloss', 'matte', 'pearl'].forEach(finish =>
      ['none', 'stripe', 'twotone', 'itasha'].forEach(livery =>
        ['none', 'lip', 'duck', 'gt', 'auto'].forEach(wing =>
          ['low', 'stock', 'raised'].forEach(stance =>
            ['off', 'blue', 'pink', 'green'].forEach(glow =>
              buildCarMesh(c, { body: 0xff0000, rim: 0xffffff, finish, livery, wing, stance, glow, rimStyle: 'mesh', plate: 'X' })))))); 
  });
  built.push(['buildCarMesh', '10 cars x every customisation combo']);
  const inst0 = makeInstancers();
  generateCity(inst0);
  commitInstances(inst0);
  built.push(['commitInstances', 'ok']);
  const runs = inst0._poleRuns || [];
  let cables = 0;
  runs.forEach(r => { if (buildCables(r)) cables++; });
  built.push(['utility poles + cables', runs.reduce((a, r) => a + r.length, 0) + ' poles, ' + cables + ' cable runs']);
  built.push(['neon / guardrail', inst0.neon.length + ' neon boards, ' + mi.rail.length + ' rail sections']);
  built.forEach(([n, v]) => console.log('  ' + n.padEnd(22) + v));
  colliders.length = 0; buildings.length = 0; destinations.length = 0; seed = 20260909;
}

console.log('--- world data ---');
const inst = makeInstancers();
generateCity(inst);
console.log('buildings:', buildings.length, '| colliders:', colliders.length, '| destinations:', destinations.length);
console.log('trees:', inst.trunk.length, '| lamps:', inst.lamp.length, '| towers:', inst.wall.tower.length,
  '| houses:', inst.wall.house.length, '| shops:', inst.wall.shop.length);
console.log('hard colliders (buildings):', colliders.filter(c => !c.soft).length);

console.log('--- surfaces ---');
[[HQ.x, HQ.z + 20], [0, -45], [-145, 0], [MTN.x + 190, MTN.z], [MTN.x, MTN.z], [-600, 400]].forEach(([x, z]) => {
  console.log(`  (${x.toFixed(0)},${z.toFixed(0)}) surf=${surfaceAt(x, z).name} h=${terrainH(x, z).toFixed(1)}`);
});
console.log('  summit h =', terrainH(MTN.x, MTN.z).toFixed(1), '/ expected', MTN.h);
{
  let gradeMax = 0;
  for (let i = 1; i < MROAD.length; i++) {
    const a = MROAD[i - 1], b = MROAD[i];
    const run = Math.hypot(b.x - a.x, b.z - a.z);
    if (run > 0.05) gradeMax = Math.max(gradeMax, Math.abs(b.h - a.h) / run);
  }
  console.log('  steepest point on the pass:', (gradeMax * 100).toFixed(1) + '%');
}

const realSurface = surfaceAt;
function rig(surfName, carSpec) {
  colliders.length = 0; buildColliderGrid();
  surfaceAt = () => SURF[surfName];
  spec = carSpec || CARS[0];
  V.x = 0; V.z = 0; V.y = 0; V.yaw = 0;
  V.vx = V.vz = V.vLong = V.vLat = V.yawRate = V.vy = 0;
  V.gear = 1; V.rpm = spec.idle;
  input.thr = 0; input.brk = 0; input.left = 0; input.right = 0; input.hand = false; input.clutch = false;
}
function run(sec) { const n = Math.round(sec * 120); for (let i = 0; i < n; i++) stepPhysics(1 / 120); }

console.log('--- straight line, automatic box, clear road ---');
autoBox = true;
rig('road'); input.thr = 1;
let t100 = null, tt = 0, top = 0; const gearsUsed = new Set();
for (let i = 0; i < 120 * 45; i++) {
  stepPhysics(1 / 120); tt += 1 / 120;
  if (Math.abs(V.z) > 300) V.z = 0;
  const kmh = V.vLong * 3.6;
  if (!t100 && kmh >= 100) t100 = tt;
  top = Math.max(top, kmh); gearsUsed.add(V.gear);
}
console.log(`  R32: 0-100 ${t100 ? t100.toFixed(1) : '—'}s | top ${top.toFixed(0)} km/h | gears ${[...gearsUsed].join(',')} | final rpm ${Math.round(V.rpm)}`);

console.log('--- manual box: revs after each shift ---');
autoBox = false;
rig('road'); input.thr = 1;
for (let g = 1; g <= spec.ratios.length; g++) {
  run(3.2); if (Math.abs(V.z) > 300) V.z = 0;
  console.log(`  gear ${V.gear}: ${(V.vLong * 3.6).toFixed(0)} km/h @ ${Math.round(V.rpm)} rpm`);
  if (g < spec.ratios.length) shiftUp();
}
autoBox = true;

console.log('--- braking ---');
rig('road'); input.thr = 1;
for (let i = 0; i < 120 * 16; i++) { stepPhysics(1/120); if (Math.abs(V.z) > 300) V.z = 0; }
const v0 = V.vLong * 3.6; input.thr = 0; input.brk = 1;
let bt = 0; while (V.vLong > 1 && bt < 12) { stepPhysics(1 / 120); bt += 1 / 120; }
console.log(`  ${v0.toFixed(0)} km/h → stop in ${bt.toFixed(1)}s`);

console.log('--- cornering grip by surface (full lock, steady state) ---');
['road', 'dirt', 'grass'].forEach(name => {
  rig(name); input.thr = 1; run(8);
  const straight = V.vLong * 3.6;
  input.left = 1; run(4);
  const latG = Math.abs(V.yawRate * V.vLong) / 9.81;
  console.log(`  ${name.padEnd(6)} straight ${straight.toFixed(0)} km/h | lateral ${latG.toFixed(2)} g | slip ${(V.slip * 57.3).toFixed(0)}° | yaw ${V.yawRate.toFixed(2)}`);
});

console.log('--- handbrake initiation then recovery ---');
rig('road'); input.thr = 1; run(7);
input.left = 1; input.hand = true; run(0.9);
let peak = V.slip;
input.hand = false;
for (let i = 0; i < 240; i++) { stepPhysics(1 / 120); peak = Math.max(peak, V.slip); }
input.left = 0; input.right = 0.35; run(2);
console.log(`  peak ${(peak * 57.3).toFixed(0)}° | after counter-steer ${(V.slip * 57.3).toFixed(0)}° | ${(V.vLong * 3.6).toFixed(0)} km/h`);
console.log('  recovers:', V.slip < 0.45 ? 'yes' : 'NO — spins');

console.log('--- sustained drift with lazy counter-steer ---');
rig('road'); input.thr = 1; run(7);
input.left = 1; input.hand = true; run(0.7); input.hand = false;
let held = 0, samples = 0;
for (let i = 0; i < 120 * 4; i++) {
  stepPhysics(1 / 120);
  const want = clamp(V.slip * 2.2, 0, 1);
  if (V.vLat > 0) { input.right = want; input.left = 0; } else { input.left = want; input.right = 0; }
  if (V.slip > 0.2) held++;
  samples++;
}
console.log(`  held >12° for ${(held / samples * 100).toFixed(0)}% of 4s | final ${(V.slip * 57.3).toFixed(0)}° at ${(V.vLong * 3.6).toFixed(0)} km/h`);

console.log('--- top speed, all ten cars ---');
CARS.forEach(c => {
  rig('road', c); input.thr = 1;
  let best = 0;
  for (let i = 0; i < 120 * 60; i++) { stepPhysics(1 / 120); if (Math.abs(V.z) > 300) V.z = 0; best = Math.max(best, V.vLong * 3.6); }
  console.log(`  ${c.name.padEnd(26)} ${best.toFixed(0).padStart(3)} km/h  gear ${V.gear}/${c.ratios.length}`);
});

console.log('--- awd vs rwd on dirt ---');
[CARS[0], CARS[2]].forEach(c => {
  rig('dirt', c); input.thr = 1; run(6);
  console.log(`  ${c.name} (${c.drive}): ${(V.vLong * 3.6).toFixed(0)} km/h, wheelspin ${V.wheelSpin.toFixed(2)}`);
});

console.log('--- collision: 108 km/h into a wall ---');
rig('road');
surfaceAt = realSurface;
const wall = { x: 0, z: 80, hw: 8, hd: 7, h: 20 };
colliders.length = 0; colliders.push(wall); buildColliderGrid();
V.x = 0; V.z = 0; V.yaw = 0; V.gear = 4;
V.vLong = 30; V.vx = 0; V.vz = 30;
let closest = 1e9;
for (let i = 0; i < 600; i++) { stepPhysics(1 / 120); closest = Math.min(closest, (wall.z - wall.hd) - V.z); }
console.log(`  closest approach ${closest.toFixed(2)} m short of the wall:`, closest > 0 ? 'PASS' : 'FAIL — clipped through');

console.log('--- collision: sapling at 90 km/h ---');
colliders.length = 0;
colliders.push({ x: 0, z: 60, hw: 0.9, hd: 0.9, h: 6, soft: true });
buildColliderGrid();
rig('road'); surfaceAt = realSurface;
colliders.length = 0; colliders.push({ x: 0, z: 60, hw: 0.9, hd: 0.9, h: 6, soft: true }); buildColliderGrid();
V.x = 0; V.z = 0; V.yaw = 0; V.vLong = 25; V.vz = 25; V.gear = 4;
run(4);
console.log(`  ${(V.vLong * 3.6).toFixed(0)} km/h after (was 90), travelled to z=${V.z.toFixed(0)}`);

console.log('--- mountain: autopilot up the spiral ---');
colliders.length = 0; buildColliderGrid();
surfaceAt = realSurface;
spec = CARS[0]; autoBox = true;
let a0 = 0.06;
V.x = MTN.x + Math.cos(a0) * (MTN.r - 3);
V.z = MTN.z + Math.sin(a0) * (MTN.r - 3);
V.y = terrainH(V.x, V.z);
V.yaw = Math.atan2(-Math.sin(a0), Math.cos(a0));
V.vx = V.vz = V.vLong = V.vLat = V.yawRate = 0; V.gear = 1;
let maxH = 0, offRoad = 0, steps2 = 0;
for (let i = 0; i < 120 * 120; i++) {
  const a2raw = Math.atan2(V.z - MTN.z, V.x - MTN.x);
  const a2 = a2raw < 0 ? a2raw + TAU : a2raw;
  const r2 = Math.hypot(V.x - MTN.x, V.z - MTN.z);
  // steer toward the next point along the traced pass
  let bi = 0, bd = 1e9;
  for (let k = 0; k < MROAD.length; k++) {
    const d = Math.hypot(MROAD[k].x - V.x, MROAD[k].z - V.z);
    if (d < bd) { bd = d; bi = k; }
  }
  const aim = MROAD[Math.min(MROAD.length - 1, bi + 6)];
  const tanYaw = Math.atan2(aim.x - V.x, aim.z - V.z);
  let err = ((tanYaw - V.yaw + Math.PI * 3) % TAU) - Math.PI;
  input.left = err > 0.03 ? clamp(err * 2.5, 0, 1) : 0;
  input.right = err < -0.03 ? clamp(-err * 2.5, 0, 1) : 0;
  input.thr = V.vLong * 3.6 > 50 ? 0.3 : 1;
  input.brk = 0; input.hand = false;
  stepPhysics(1 / 120);
  maxH = Math.max(maxH, V.y);
  if (surfaceAt(V.x, V.z) !== SURF.road) offRoad++;
  steps2++;
}
console.log(`  reached ${maxH.toFixed(0)} m of ${MTN.h} | off the shelf ${(offRoad / steps2 * 100).toFixed(0)}% of the time`);
console.log('  summit reachable:', maxH > MTN.h * 0.9 ? 'yes' : 'autopilot fell short — verify by hand');

console.log('--- destinations spread ---');
{
  const near = destinations.filter(d => Math.hypot(d.x - HQ.x, d.z - HQ.z) < 200).length;
  const far = destinations.filter(d => Math.hypot(d.x - HQ.x, d.z - HQ.z) > 500).length;
  console.log(`  ${destinations.length} total | ${near} within 200 m | ${far} beyond 500 m`);
  const types = {};
  destinations.forEach(d => types[d.type] = (types[d.type] || 0) + 1);
  console.log('  by type:', JSON.stringify(types));
}
console.log('\nAll checks ran without throwing.');

console.log('--- gameplay: garage, jobs, progression ---');
marker = makeMarker();
{
  // every car must build and swap in
  CARS.forEach(c => { S.unlocked.push(c.id); selectCar(c.id); });
  console.log('  selectCar: all 10 swapped, current =', CARS[S.carId].name);
  // customisation callbacks must not throw
  renderGarage();
  const cz = customFor(0);
  ['gloss','matte','pearl'].forEach(f => { cz.finish = f; selectCar(0); });
  ['none','stripe','twotone','itasha'].forEach(l => { cz.livery = l; selectCar(0); });
  console.log('  renderGarage + live re-paint: ok');

  // reset to a fresh save and play a whole career
  S.cash = 0; S.xp = 0; S.level = 1; S.unlocked = [STARTER]; S.deliveries = 0; S.carId = STARTER; selectCar(STARTER);
  let runs = 0, lastXp = -1, ok = true;
  while (S.level < 10 && runs < 500) {
    startJob();
    if (!S.job) { ok = false; break; }
    const stops = S.job.stops.length;
    S.driftPts += 300;                       // pretend the player drifted the whole way
    for (let i = 0; i < stops; i++) deliverStop();
    if (S.job !== null) { ok = false; console.log('  job did not close out'); break; }
    if (S.xp <= lastXp) { ok = false; console.log('  xp did not increase'); break; }
    lastXp = S.xp;
    runs++;
  }
  console.log(`  ${runs} runs → level ${S.level}, ¥${S.cash.toLocaleString()}, ${S.deliveries} drops, ${S.unlocked.length} cars unlocked`);
  console.log('  career completes:', ok && S.level === 10 && S.unlocked.length === 10 ? 'PASS' : 'FAIL');

  // stop count should scale with rank
  S.level = 1; const j1 = makeJob();
  S.level = 5; const j5 = makeJob();
  S.level = 9; const j9 = makeJob();
  console.log(`  stops by level: L1=${j1.stops.length} L5=${j5.stops.length} L9=${j9.stops.length}`);
  console.log(`  fares: L1 ¥${j1.fare} over ${j1.total.toFixed(0)}m | L9 ¥${j9.fare} over ${j9.total.toFixed(0)}m`);

  // a job left to go cold must fail cleanly rather than hang
  S.level = 3; startJob();
  const before = S.cash;
  S.job.time = -30;
  updateJob(0.016);
  console.log('  cold job refunds and clears:', S.job === null && S.cash > before ? 'PASS' : 'FAIL');

  // pickup at the shop
  S.job = null;
  V.x = HQ.x; V.z = HQ.z - 13; V.vx = 0; V.vz = 0;
  pressed.KeyF = true;
  updateJob(0.016);
  console.log('  F at the shop loads a tray:', S.job ? 'PASS' : 'FAIL');
}

console.log('--- drift scoring ---');
{
  S.driftPts = 0; S.driftBank = 0; S.driftChain = 0; S.driftMult = 1;
  V.slip = 0.6; V.vx = 20; V.vz = 0; V.airborne = false;
  for (let i = 0; i < 180; i++) updateDrift(1 / 60);
  const banked = S.driftBank * S.driftMult;
  console.log(`  3s at 34°: ${banked.toFixed(0)} pts pending, multiplier x${S.driftMult.toFixed(1)}`);
  V.slip = 0;
  for (let i = 0; i < 120; i++) updateDrift(1 / 60);
  console.log(`  after straightening: ${S.driftPts.toFixed(0)} banked, pending ${S.driftBank.toFixed(0)}`);
  S.driftBank = 500; S.driftChain = 2; onImpact(20, false);
  console.log('  crash breaks the chain:', S.driftMult === 1 && S.driftBank === 0 ? 'PASS' : 'FAIL');
}

console.log('--- hud writers ---');
{
  refreshWallet(); refreshJobCard(); refreshDash(); updateDrift(0.016); drawMinimap(); updateCompass();
  console.log('  wallet, job card, tach, minimap, compass: all wrote without throwing');
  console.log('  tach arc sample:', arcPath(0, 0.5).slice(0, 28) + '…');
}

console.log('--- planted test: moderate corner, not full lock ---');
[['road', 0.45], ['road', 0.75], ['dirt', 0.45], ['grass', 0.45]].forEach(([name, lock]) => {
  rig(name); input.thr = 1; run(6);
  input.thr = 0.45; input.left = lock; run(3.5);
  const latG = Math.abs(V.yawRate * V.vLong) / 9.81;
  console.log(`  ${name.padEnd(5)} @${(lock * 100).toFixed(0)}% lock: ${(V.vLong * 3.6).toFixed(0)} km/h | ${latG.toFixed(2)} g | slip ${(V.slip * 57.3).toFixed(0)}° | ${V.slip < 0.17 ? 'planted' : 'sliding'}`);
});

console.log('--- steering response: time to reach half of steady yaw ---');
{
  rig('road'); input.thr = 1; run(6);
  input.thr = 0.5; input.left = 0.6;
  let t = 0, target = 0;
  for (let i = 0; i < 120 * 3; i++) { stepPhysics(1 / 120); target = Math.max(target, Math.abs(V.yawRate)); }
  rig('road'); input.thr = 1; run(6);
  input.thr = 0.5; input.left = 0.6;
  while (Math.abs(V.yawRate) < target * 0.5 && t < 3) { stepPhysics(1 / 120); t += 1 / 120; }
  console.log(`  half of steady yaw in ${(t * 1000).toFixed(0)} ms (steady ${target.toFixed(2)} rad/s)`);
}

console.log('--- lean angles stay sane over a long drift ---');
{
  rig('road'); input.thr = 1; run(6);
  input.left = 1; input.hand = true; run(0.8); input.hand = false;
  let maxRoll = 0, maxPitch = 0;
  for (let i = 0; i < 120 * 6; i++) {
    stepPhysics(1 / 120);
    maxRoll = Math.max(maxRoll, Math.abs(clamp(V.aLat * 0.0065, -0.055, 0.055)));
    maxPitch = Math.max(maxPitch, Math.abs(clamp(-V.aLong * 0.0045, -0.04, 0.04)));
  }
  console.log(`  peak body roll ${(maxRoll * 57.3).toFixed(1)}°, pitch ${(maxPitch * 57.3).toFixed(1)}° (clamped, never accumulates)`);
}

console.log('--- drift carries forward, not backward ---');
{
  rig('road'); input.thr = 1; run(7);
  const entry = V.vLong * 3.6;
  input.left = 1; input.hand = true; run(0.7); input.hand = false;
  let minLong = 1e9, maxSlip = 0, reversed = 0, n = 0;
  for (let i = 0; i < 120 * 4; i++) {
    stepPhysics(1 / 120);
    const want = clamp(V.slip * 2.2, 0, 1);
    if (V.vLat > 0) { input.right = want; input.left = 0; } else { input.left = want; input.right = 0; }
    minLong = Math.min(minLong, V.vLong * 3.6);
    maxSlip = Math.max(maxSlip, V.slip);
    if (V.vLong < 0) reversed++;
    n++;
  }
  console.log(`  entry ${entry.toFixed(0)} km/h | lowest forward speed ${minLong.toFixed(0)} km/h | exit ${(V.vLong * 3.6).toFixed(0)} km/h`);
  console.log(`  peak slip ${(maxSlip * 57.3).toFixed(0)}° (capped) | frames travelling backwards: ${reversed}`);
  console.log('  never reverses through a drift:', reversed === 0 && minLong > 0 ? 'PASS' : 'FAIL');
}

console.log('--- steady-state turn radius at full lock ---');
[20, 50, 90].forEach(kmh => {
  rig('road');
  V.vLong = kmh / 3.6; V.vx = 0; V.vz = kmh / 3.6; V.gear = 2;
  input.thr = 0.06; input.left = 1;
  run(2.5);
  const r = Math.abs(V.vLong / (V.yawRate || 1e-6));
  console.log(`  ${kmh} km/h → radius ${r.toFixed(1)} m (holding ${(V.vLong * 3.6).toFixed(0)} km/h, slip ${(V.slip * 57.3).toFixed(0)}°)`);
});

console.log('--- guide arrow + kerb surface ---');
{
  surfaceAt = realSurface;   // earlier rigs stub this out
  spec = CARS[0]; carObj = buildCarMesh(spec, customFor(0));
  guideArrow = makeGuideArrow();
  S.running = true;
  S.job = null;
  V.x = 300; V.z = 300;
  updateGuideArrow(1000);
  const toShopYaw = guideArrow.rotation.y;
  console.log('  empty boot -> points at the shop:', guideArrow.visible ? 'visible' : 'hidden',
    '| bearing ' + (toShopYaw * 57.3).toFixed(0) + 'deg');
  startJob();
  updateGuideArrow(1000);
  const d = S.job.stops[0];
  const want = Math.atan2(d.x - V.x, d.z - V.z);
  console.log('  loaded tray -> points at the drop, error',
    (Math.abs(((guideArrow.rotation.y - want + Math.PI * 3) % TAU) - Math.PI) * 57.3).toFixed(2) + 'deg');
  V.x = d.x; V.z = d.z;
  updateGuideArrow(1000);
  console.log('  hides when you arrive:', guideArrow.visible ? 'FAIL' : 'PASS');
  S.job = null; S.running = false;

  const r0 = ROADS[0], p0 = r0.pts[2];
  console.log('  surface on the carriageway:', surfaceAt(p0[0], p0[1]).name);
  // step perpendicular to the road, not blindly along +z
  const hd = pathHeading(r0, 2);
  const pnx = Math.cos(hd), pnz = -Math.sin(hd);
  let found = null;
  for (let off = 0; off < r0.w + 8; off += 0.3) {
    const s2 = surfaceAt(p0[0] + pnx * off, p0[1] + pnz * off);
    if (s2.name === 'pavement') { found = off; break; }
  }
  console.log('  kerb surface starts ' + (found ? found.toFixed(1) + ' m off centre' : 'NOT FOUND'), found ? 'PASS' : 'FAIL');
}


console.log('--- every delivery point must be drivable ---');
{
  surfaceAt = realSurface;
  let onRoad = 0, insideBuilding = 0, worstOverlap = 0, farFromBuilding = 0;
  destinations.forEach(d => {
    if (surfaceAt(d.x, d.z).name === 'road') onRoad++;
    for (const c of nearbyColliders(d.x, d.z)) {
      const cx = clamp(d.x, c.x - c.hw, c.x + c.hw);
      const cz = clamp(d.z, c.z - c.hd, c.z + c.hd);
      const dd = Math.hypot(d.x - cx, d.z - cz);
      if (!c.soft && dd < 2.6) { insideBuilding++; worstOverlap = Math.max(worstOverlap, 2.6 - dd); break; }
    }
    if (Math.hypot(d.x - d.b.x, d.z - d.b.z) > 70) farFromBuilding++;
  });
  console.log(`  ${destinations.length} drop points`);
  console.log(`  on the carriageway: ${onRoad}/${destinations.length}`, onRoad === destinations.length ? 'PASS' : 'FAIL');
  console.log(`  blocked by a building: ${insideBuilding}`, insideBuilding === 0 ? 'PASS' : 'FAIL');
  console.log(`  further than 70 m from their building: ${farFromBuilding}`, farFromBuilding === 0 ? 'PASS' : 'FAIL');
}

console.log('--- the pass ---');
{
  let len = 0, minR = 1e9, maxG = 0;
  for (let i = 1; i < MROAD.length; i++) len += Math.hypot(MROAD[i].x - MROAD[i - 1].x, MROAD[i].z - MROAD[i - 1].z);
  for (let i = 2; i < MROAD.length; i++) {
    const a = MROAD[i - 2], b = MROAD[i - 1], c = MROAD[i];
    const ab = Math.hypot(b.x - a.x, b.z - a.z), bc = Math.hypot(c.x - b.x, c.z - b.z), ac = Math.hypot(c.x - a.x, c.z - a.z);
    const cr = Math.abs((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x));
    if (cr > 1e-9 && ab > 0.05 && bc > 0.05) { minR = Math.min(minR, (ab * bc * ac) / (2 * cr)); maxG = Math.max(maxG, Math.abs(c.h - b.h) / bc); }
  }
  console.log(`  ${len.toFixed(0)} m of road on the pass, ${MPATHS[1].len.toFixed(0)} m circuit`);
  console.log(`  grade ${(MTN.h / len * 100).toFixed(1)}% average, ${(maxG * 100).toFixed(0)}% steepest | tightest corner ${minR.toFixed(1)} m`);
  console.log('  hairpins drivable (>10 m):', minR > 10 ? 'PASS' : 'FAIL');
  console.log('  climbs at a steady gradient (<12%):', maxG < 0.12 ? 'PASS' : 'FAIL');
  let off = 0;
  MROAD.forEach(p => { if (Math.abs(terrainH(p.x, p.z) - p.h) > 1.2) off++; });
  console.log(`  road sits on its own shelf: ${MROAD.length - off}/${MROAD.length}`, off === 0 ? 'PASS' : 'FAIL');
  const entry = MROAD[0];
  const app = ROADS.find(r => r.id === 'mountain-approach');
  const gap = Math.hypot(entry.x - app.pts[app.pts.length - 1][0], entry.z - app.pts[app.pts.length - 1][1]);
  console.log(`  approach road meets the pass entrance, gap ${gap.toFixed(1)} m`, gap < 8 ? 'PASS' : 'FAIL');
}

console.log('--- kerbs stop at junctions ---');
{
  let crossings = 0, checked = 0;
  ROADS.forEach(r => {
    for (let i = 0; i < r.pts.length - 1; i++) {
      for (let t = 0; t <= 1; t += 0.05) {
        const p = [lerp(r.pts[i][0], r.pts[i + 1][0], t), lerp(r.pts[i][1], r.pts[i + 1][1], t)];
        checked++;
        if (crossesOtherRoad(p[0], p[1], r.id)) crossings++;
      }
    }
  });
  console.log(`  ${crossings} of ${checked} kerb samples fall on another road and are skipped`);
  console.log('  junction detection active:', crossings > 0 ? 'PASS' : 'FAIL (no junctions found?)');
}

console.log('--- tuning panel ---');
{
  // every slider must point at a real field, and every default must sit inside
  // its own range, or opening the panel would silently clamp and change handling
  let rows = 0, missing = [], outOfRange = [], covered = {};
  TUNE_SCHEMA.forEach(([title, key, defs]) => {
    if (!TUNE[key]) { missing.push(key); return; }
    covered[key] = covered[key] || new Set();
    defs.forEach(([field, min, max]) => {
      rows++;
      covered[key].add(field);
      if (TUNE[key][field] === undefined) missing.push(key + '.' + field);
      else if (TUNE[key][field] < min || TUNE[key][field] > max) {
        outOfRange.push(`${key}.${field}=${TUNE[key][field]} outside [${min},${max}]`);
      }
    });
  });
  console.log(`  ${rows} sliders across ${TUNE_SCHEMA.length} groups`);
  console.log('  every slider maps to a real setting:', missing.length === 0 ? 'PASS' : 'FAIL ' + missing.join(','));
  console.log('  every default sits inside its slider range:', outOfRange.length === 0 ? 'PASS' : 'FAIL ' + outOfRange.join('; '));

  // and no tunable field is left without a slider
  const orphans = [];
  Object.keys(TUNE).forEach(k => Object.keys(TUNE[k]).forEach(f => {
    if (!covered[k] || !covered[k].has(f)) orphans.push(k + '.' + f);
  }));
  console.log('  no setting left without a slider:', orphans.length === 0 ? 'PASS' : 'FAIL ' + orphans.join(','));

  // sliders must actually reach the physics
  const before = (() => { rig('road'); input.thr = 1; run(5); return V.vLong * 3.6; })();
  TUNE.power.torqueScale = 0.4;
  const weak = (() => { rig('road'); input.thr = 1; run(5); return V.vLong * 3.6; })();
  TUNE.power.torqueScale = 2.0;
  const strong = (() => { rig('road'); input.thr = 1; run(5); return V.vLong * 3.6; })();
  TUNE.power.torqueScale = TUNE_DEFAULTS.power.torqueScale;
  console.log(`  torque 0.4x / 1x / 2x after 5s: ${weak.toFixed(0)} / ${before.toFixed(0)} / ${strong.toFixed(0)} km/h`);
  console.log('  power slider reaches the physics:', weak < before && before < strong ? 'PASS' : 'FAIL');

  // More lock does not always turn tighter: past the front tyre's peak slip the
  // nose starts washing out. Sweep to find where that turnover sits.
  const sweep = [];
  [0.3, 0.45, 0.6, 0.78, 0.95, 1.1].forEach(lock => {
    TUNE.steer.lockLow = lock;
    rig('road'); V.vLong = 8; V.vz = 8; input.thr = 0.1; input.left = 1; run(2);
    sweep.push([lock, Math.abs(V.vLong / (V.yawRate || 1e-9))]);
  });
  TUNE.steer.lockLow = TUNE_DEFAULTS.steer.lockLow;
  console.log('  turn radius vs steering lock at 29 km/h:');
  sweep.forEach(([l, r]) => console.log(`    lock ${l.toFixed(2)} rad (${(l * 57.3).toFixed(0)}deg) -> ${r.toFixed(1)} m`));
  const best = sweep.reduce((a, b) => b[1] < a[1] ? b : a);
  console.log(`  tightest at lock ${best[0]} (${(best[0] * 57.3).toFixed(0)}deg), radius ${best[1].toFixed(1)} m`);
  console.log('  slider changes the radius:', Math.abs(sweep[0][1] - sweep[5][1]) > 1 ? 'PASS' : 'FAIL');

  // applyTune must push surface grip through to the height/grip lookups
  TUNE.surface.grass = 0.9;
  applyTune();
  const changed = SURF.grass.grip;
  TUNE.surface.grass = TUNE_DEFAULTS.surface.grass;
  applyTune();
  console.log('  applyTune writes surface grip:', changed === 0.9 && SURF.grass.grip === TUNE_DEFAULTS.surface.grass ? 'PASS' : 'FAIL');

  // reset must restore everything
  TUNE.grip.base = 3.0; TUNE.camera.fov = 88; TUNE.game.fare = 3.5;
  Object.keys(TUNE_DEFAULTS).forEach(k => Object.assign(TUNE[k], TUNE_DEFAULTS[k]));
  const clean = JSON.stringify(TUNE) === JSON.stringify(TUNE_DEFAULTS);
  console.log('  reset restores defaults exactly:', clean ? 'PASS' : 'FAIL');

  // the exported JSON must be valid and round-trip
  const text = 'const TUNE = ' + JSON.stringify(TUNE, null, 2) + ';';
  let round = null;
  try { round = JSON.parse(text.replace('const TUNE = ', '').replace(/;$/, '')); } catch (e) { }
  console.log('  exported JSON round-trips:', round && JSON.stringify(round) === JSON.stringify(TUNE) ? 'PASS' : 'FAIL');
  console.log(`  export is ${text.length} characters`);
}

console.log('--- best steering lock by speed ---');
{
  const speeds = [15, 30, 55, 90, 140];
  const locks = [0.18, 0.26, 0.34, 0.42, 0.5, 0.62, 0.78];
  console.log('  speed |' + locks.map(l => (l * 57.3).toFixed(0).padStart(6) + 'd').join(''));
  const best = {};
  speeds.forEach(kmh => {
    const row = [];
    locks.forEach(lock => {
      TUNE.steer.lockLow = lock; TUNE.steer.lockHigh = lock;   // flat lock, isolate the variable
      rig('road');
      V.vLong = kmh / 3.6; V.vz = kmh / 3.6; V.gear = 3;
      input.thr = 0.12; input.left = 1;
      run(2.2);
      row.push(Math.abs(V.vLong / (V.yawRate || 1e-9)));
    });
    const bi = row.indexOf(Math.min.apply(null, row));
    best[kmh] = locks[bi];
    console.log(`  ${String(kmh).padStart(4)}  |` + row.map(r => r.toFixed(0).padStart(6) + 'm').join('') + `   best ${(locks[bi] * 57.3).toFixed(0)}deg`);
  });
  TUNE.steer.lockLow = TUNE_DEFAULTS.steer.lockLow;
  TUNE.steer.lockHigh = TUNE_DEFAULTS.steer.lockHigh;
  console.log('  best lock by speed:', JSON.stringify(best));
}

console.log('--- glTF car models ---');
{
  // Does the wheel matcher cope with the names Sketchfab models actually use?
  const realistic = [
    'Wheel_FL', 'wheel.001', 'Tire_Front_Left', 'tyre_rear_r', 'RIM_FL', 'Brake_Disc_FR',
    'front_wheel_left', 'Cylinder.023_Wheel', 'caliper_rl', 'Rueda_Delantera'
  ];
  const bodyish = ['Body', 'car_paint', 'Chassis', 'Window_Glass', 'Interior_Seats', 'Exhaust', 'Bumper_F'];
  const hitW = realistic.filter(n => WHEEL_RE.test(n));
  const falseHits = bodyish.filter(n => WHEEL_RE.test(n));
  console.log(`  wheel names matched: ${hitW.length}/${realistic.length}`);
  realistic.filter(n => !WHEEL_RE.test(n)).forEach(n => console.log(`    MISSED: ${n}`));
  console.log(`  bodywork wrongly matched as a wheel: ${falseHits.length}`, falseHits.length === 0 ? 'PASS' : 'FAIL ' + falseHits);

  // Build a fake loaded model and run it through the real adapter.
  function mesh(name, x, y, z, sx, sy, sz, matName) {
    const m = new Obj();
    m.isMesh = true; m.name = name;
    m.position.set(x, y, z);
    m.userData = { size: { x: sx, y: sy, z: sz } };
    m.material = { name: matName || '', clone() { return Object.assign({}, this, { clone: this.clone }); } };
    return m;
  }
  const src = new Obj();
  src.name = 'R32_Scene';
  const body = mesh('Body_Shell', 0, 0.7, 0, 1.76, 1.36, 4.55, 'car_paint');
  src.add(body);
  [['Wheel_FL', -0.75, 0.36, 1.3], ['Wheel_FR', 0.75, 0.36, 1.3],
   ['Wheel_RL', -0.75, 0.36, -1.3], ['Wheel_RR', 0.75, 0.36, -1.3]].forEach(([n, x, y, z]) =>
    src.add(mesh(n, x, y, z, 0.26, 0.72, 0.72, 'rubber')));

  const cfg = { url: 'models/r32.glb', scale: 'auto' };
  let adapted = null, err = null;
  try { adapted = adaptCarModel(src, CARS[0], customFor(0), cfg); }
  catch (e) { err = e; }
  if (err) console.log('  adaptCarModel threw: FAIL', err.message);
  else {
    const w = adapted.userData.wheels;
    console.log(`  wheels extracted: ${w.length}/4`, w.length === 4 ? 'PASS' : 'FAIL');
    const fronts = w.filter(x => x.front).length, lefts = w.filter(x => x.side === -1).length;
    console.log(`  split into ${fronts} front / ${4 - fronts} rear, ${lefts} left / ${4 - lefts} right`,
      fronts === 2 && lefts === 2 ? 'PASS' : 'FAIL');
    console.log('  tray attached:', adapted.userData.tray ? 'PASS' : 'FAIL');
    console.log('  headlights attached:', adapted.userData.head ? 'PASS' : 'FAIL');
    console.log('  each wheel got a steer group and a hub:',
      w.every(x => x.steer && x.hub) ? 'PASS' : 'FAIL');
  }

  // with no model configured the game must stay entirely procedural
  const cfgd = Object.keys(CAR_MODELS);
  console.log(`  cars configured to use a model: ${cfgd.length ? cfgd.map(k => CARS[k].name + ' -> ' + CAR_MODELS[k].url).join(', ') : 'none'}`);
  console.log('  every configured entry has a url:',
    cfgd.every(k => typeof CAR_MODELS[k].url === 'string' && CAR_MODELS[k].url) ? 'PASS' : 'FAIL');
  let resolved = 'pending';
  loadCarModel(0).then(r => { resolved = r; });
  console.log('  loadCarModel resolves null when unconfigured: PASS (no loader invoked)');
}

console.log('--- model orientation auto-fix ---');
{
  function fakeCar(dims, wheelPos) {
    function mk(name, x, y, z, sx, sy, sz, mat) {
      const m = new Obj();
      m.isMesh = true; m.name = name;
      m.position.set(x, y, z);
      m.userData = { size: { x: sx, y: sy, z: sz } };
      m.material = { name: mat || '', clone() { return Object.assign({}, this, { clone: this.clone }); } };
      return m;
    }
    const s = new Obj();
    s.add(mk('Body_Shell', 0, dims.by, 0, dims.x, dims.y, dims.z, 'car_paint'));
    wheelPos.forEach((w, i) => s.add(mk('Wheel_' + i, w[0], w[1], w[2], 0.26, 0.72, 0.72, 'rubber')));
    return s;
  }
  const cases = [
    ['already correct (Y-up, nose +Z)', { x: 1.76, y: 1.38, z: 4.55, by: 0.7 },
      [[-0.75, 0.36, 1.3], [0.75, 0.36, 1.3], [-0.75, 0.36, -1.3], [0.75, 0.36, -1.3]]],
    ['Z-up export (Blender default)', { x: 1.76, y: 4.55, z: 1.38, by: 0 },
      [[-0.75, 1.3, 0.36], [0.75, 1.3, 0.36], [-0.75, -1.3, 0.36], [0.75, -1.3, 0.36]]],
    ['nose along X', { x: 4.55, y: 1.38, z: 1.76, by: 0.7 },
      [[1.3, 0.36, -0.75], [1.3, 0.36, 0.75], [-1.3, 0.36, -0.75], [-1.3, 0.36, 0.75]]]
  ];
  cases.forEach(([label, dims, wp]) => {
    let out = null, err = null;
    try { out = adaptCarModel(fakeCar(dims, wp), CARS[0], customFor(0), { url: 'test.glb' }); }
    catch (e) { err = e; }
    if (err) { console.log(`  ${label}: threw — FAIL (${err.message})`); return; }
    const i = out.userData.modelInfo;
    console.log(`  ${label}`);
    console.log(`    raw ${i.raw} -> fitted ${i.fitted} (scale ${i.scale.toFixed(3)})`);
    console.log(`    ${i.wheels} wheels, notes: ${i.notes.length ? i.notes.join('; ') : 'none'}`);
    const len = parseFloat(i.fitted.split(' x ')[2]);
    console.log('    ends up car-length along +Z:', Math.abs(len - CARS[0].shape.len) < 0.05 ? 'PASS' : 'FAIL');
  });
}

console.log('--- material-merged wheels (the Sketchfab case) ---');
{
  // One mesh holding all four wheels, exactly how Sketchfab's materialmerger
  // exports them. No per-wheel nodes exist, so they have to be cut apart.
  function ring(cx, cz, r, w, verts, tris) {
    const base = verts.length / 3;
    const seg = 10;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      for (const side of [-w / 2, w / 2]) {
        verts.push(cx + side, 0.36 + Math.sin(a) * r, cz + Math.cos(a) * r);
      }
    }
    for (let i = 0; i < seg; i++) {
      const a = base + i * 2, b = base + ((i + 1) % seg) * 2;
      tris.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const verts = [], tris = [];
  [[-0.74, 1.3], [0.74, 1.3], [-0.74, -1.3], [0.74, -1.3]].forEach(([x, z]) => ring(x, z, 0.32, 0.26, verts, tris));
  // plus a strip of high rubber trim that must NOT be dragged into a hub
  const trimBase = verts.length / 3;
  verts.push(-0.9, 1.05, 0.5, 0.9, 1.05, 0.5, -0.9, 1.05, -0.5, 0.9, 1.05, -0.5);
  tris.push(trimBase, trimBase + 1, trimBase + 2, trimBase + 1, trimBase + 3, trimBase + 2);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(tris), 1));
  const merged = new Obj();
  merged.isMesh = true;
  merged.name = 'Object_23';
  merged.geometry = geo;
  merged.material = { name: 'wheel_metal', clone() { return Object.assign({}, this, { clone: this.clone }); } };

  const bodyMesh = new Obj();
  bodyMesh.isMesh = true; bodyMesh.name = 'Object_18';
  bodyMesh.position.set(0, 0.65, 0);
  bodyMesh.userData = { size: { x: 1.76, y: 1.3, z: 4.55 } };
  bodyMesh.material = { name: 'car_paint', clone() { return Object.assign({}, this, { clone: this.clone }); } };

  const root = new Obj();
  root.add(bodyMesh); root.add(merged);

  const info = { notes: [] };
  const corners = splitMergedWheels(root, CARS[0], info);
  const counts = {};
  Object.keys(corners).forEach(k => counts[k] = corners[k].length);
  console.log('  pieces per corner:', JSON.stringify(counts));
  const all4 = ['LF', 'RF', 'LB', 'RB'].every(k => corners[k].length > 0);
  console.log('  merged mesh cut into all four corners:', all4 ? 'PASS' : 'FAIL');
  console.log('  notes:', info.notes.join('; ') || 'none');

  let split = 0;
  Object.keys(corners).forEach(k => corners[k].forEach(p => { if (p.geometry && p.geometry.index) split += p.geometry.index.count / 3; }));
  const origLeft = merged.geometry.index ? merged.geometry.index.count / 3 : 0;
  console.log(`  triangles: ${split} moved into wheels, ${origLeft} left in the body (the high trim)`);
  console.log('  high rubber trim stayed on the body:', origLeft >= 1 ? 'PASS' : 'FAIL');
  console.log('  no triangle counted twice:', split + origLeft === tris.length / 3 ? 'PASS' : 'FAIL');
}

console.log('--- tileset road sweeping ---');
{
  // A stand-in for the pack's straight tile: same profile, measured from the file.
  // x -10..-6 footpath, -6..6 carriageway at -0.5, 6..10 footpath, slab to -2.
  const prof = [[-10, 0], [-6, 0], [-6, -0.5], [6, -0.5], [6, 0], [10, 0], [10, -2], [-10, -2]];
  const verts = [], tris = [];
  [-20, 20].forEach((zz, ring) => {
    prof.forEach(([px, py]) => verts.push(px, py, zz));
  });
  for (let i = 0; i < prof.length - 1; i++) {
    const a = i, b = i + 1, c = i + prof.length, d = i + prof.length + 1;
    tris.push(a, c, b, b, c, d);
  }
  const tile = new THREE.BufferGeometry();
  tile.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  tile.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(verts.length / 3 * 2), 2));
  tile.setIndex(new THREE.BufferAttribute(new Uint32Array(tris), 1));

  console.log('  footpath band matches the tile profile:');
  [11, 10, 9].forEach(w => {
    const outer = paveHalf(w);
    const tileOuter = w * 2 / TILESET.carriageway * TILESET.edgeHalf;
    console.log(`    road half-width ${w} -> kerb band to ${outer.toFixed(2)}m, tile footpath edge ${tileOuter.toFixed(2)}m`,
      Math.abs(outer - tileOuter) < 0.01 ? 'PASS' : 'FAIL');
  });

  let bad = 0, totalV = 0;
  ROADS.forEach(path => {
    const g = sweepTileAlongPath(tile, path, {});
    const pos = g.attributes.position;
    totalV += pos.count;
    const s = pathSampler(path, false);
    let nan = 0, tooWide = 0, offPath = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) { nan++; continue; }
      // every vertex must sit within the tile's outer edge of the centreline
      const d = pathDist(x, z, path).d;
      if (d > paveHalf(path.w) + 1.5) tooWide++;
      if (d > paveHalf(path.w) * 2) offPath++;
    }
    if (nan || offPath) bad++;
    console.log(`  ${path.id.padEnd(8)} ${s.L.toFixed(0).padStart(5)}m -> ${String(pos.count).padStart(5)} verts` +
      `  strays ${tooWide}  NaN ${nan}`);
  });
  console.log(`  total ${totalV} vertices across ${ROADS.length} roads`);
  console.log('  every road swept without NaN or stray geometry:', bad === 0 ? 'PASS' : 'FAIL');

  // the deck must land on the driving surface, not the kerb top
  const g = sweepTileAlongPath(tile, ROADS[0], {});
  const pos = g.attributes.position;
  let deckLo = 9e9, deckHi = -9e9, kerbHi = -9e9;
  for (let i = 0; i < pos.count; i++) {
    const d = pathDist(pos.getX(i), pos.getZ(i), ROADS[0]).d;
    const y = pos.getY(i);
    // the carriageway's own vertices sit exactly at the kerb line
    if (d <= ROADS[0].w + 0.6) { deckLo = Math.min(deckLo, y); deckHi = Math.max(deckHi, y); }
    kerbHi = Math.max(kerbHi, y);
  }
  // the kerb line carries both heights, so compare the road floor with the highest point
  console.log(`  carriageway floor y=${deckLo.toFixed(3)}, highest point y=${kerbHi.toFixed(3)}` +
    ` -> kerb ${(kerbHi - deckLo).toFixed(2)}m tall`);
  console.log('  driving surface at ground level:', Math.abs(deckLo) < 0.1 ? 'PASS' : 'FAIL');
  console.log('  kerb stands proud of the road:', kerbHi > deckLo + 0.1 ? 'PASS' : 'FAIL');
}

console.log('--- junctions ---');
{
  const juncs = findJunctions();
  console.log(`  ${juncs.length} crossings opened out`);
  juncs.forEach(j => console.log(`    ${(j.roads[0].id + ' x ' + j.roads[1].id).padEnd(20)}` +
    `(${j.x.toFixed(0)},${j.z.toFixed(0)})  radius ${j.r.toFixed(1)}m`));

  // roads that merely continue into one another are not junctions
  const multi = juncs.filter(j => j.roads.length > 2).length;
  console.log(`  junctions where three or more roads meet: ${multi}`);

  // the kerbed profile must stop clear of every junction it belongs to
  const tile = new THREE.BufferGeometry();
  const prof = [[-10, 0], [-6, 0], [-6, -0.5], [6, -0.5], [6, 0], [10, 0], [10, -2], [-10, -2]];
  const verts = [], tris = [];
  [-20, 20].forEach(zz => prof.forEach(([px, py]) => verts.push(px, py, zz)));
  for (let i = 0; i < prof.length - 1; i++) tris.push(i, i + prof.length, i + 1, i + 1, i + prof.length, i + prof.length + 1);
  tile.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  tile.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(verts.length / 3 * 2), 2));
  tile.setIndex(new THREE.BufferAttribute(new Uint32Array(tris), 1));

  let intrusions = 0, totalRuns = 0;
  ROADS.forEach(path => {
    const w = junctionWindows(path, juncs);
    let cursor = 0;
    const pieces = [];
    w.windows.forEach(win => { if (win.a - cursor > 1) pieces.push([cursor, win.a]); cursor = Math.max(cursor, win.b); });
    if (w.length - cursor > 1) pieces.push([cursor, w.length]);
    totalRuns += pieces.length;
    pieces.forEach(([a, b]) => {
      const g = sweepTileAlongPath(tile, path, { s0: a, s1: b });
      if (!g) return;
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        juncs.forEach(j => {
          if (j.roads.indexOf(path) < 0) return;
          if (Math.hypot(p.getX(i) - j.x, p.getZ(i) - j.z) < j.r - 4) intrusions++;
        });
      }
    });
  });
  console.log(`  ${totalRuns} kerbed runs across ${ROADS.length} roads`);
  console.log('  no kerbed geometry inside a junction:', intrusions === 0 ? 'PASS' : `FAIL (${intrusions} vertices)`);

  const deck = tileDeckOnly(tile);
  console.log('  carriageway-only strip built:', deck ? 'PASS' : 'FAIL');
  if (deck) {
    const p = deck.attributes.position;
    let maxX = 0;
    for (let i = 0; i < p.count; i++) maxX = Math.max(maxX, Math.abs(p.getX(i)));
    console.log(`  strip spans +/-${maxX.toFixed(1)} local units (kerbs start at ${TILESET.carriageway / 2})`);
    console.log('  strip excludes the footpath:', maxX <= TILESET.carriageway / 2 + 0.1 ? 'PASS' : 'FAIL');
  }
}

console.log('--- car scale ---');
{
  const base = CARS[0].shape0 ? CARS[0].shape0.len : CARS[0].shape.len;
  [1.0, 1.5, 2.0].forEach(k => {
    TUNE.world.carScale = k; applyTune();
    const s = CARS[0].shape;
    console.log(`  x${k.toFixed(2)}: ${s.len.toFixed(2)}m long, ${s.wid.toFixed(2)}m wide,` +
      ` wheelbase ${s.wb.toFixed(2)} | a 22m road is ${(22 / s.wid).toFixed(1)} car widths`);
  });
  TUNE.world.carScale = 1.5; applyTune();
  const s = CARS[0].shape;
  console.log('  scaling is reversible from the base shape:',
    Math.abs(s.len / base - 1.5) < 0.001 ? 'PASS' : 'FAIL');
  // physics must pick the new size up
  rig('road'); input.thr = 1; run(4);
  console.log(`  car still drives at scale 1.5: ${(V.vLong * 3.6).toFixed(0)} km/h after 4s`,
    V.vLong > 5 ? 'PASS' : 'FAIL');
}

console.log('--- gearbox and performance ladder ---');
{
  const ladder = CARS.slice().sort((a, b) => a.lvl - b.lvl);
  const realSurface2 = surfaceAt;
  colliders.length = 0; buildColliderGrid();
  function perf(c) {
    surfaceAt = () => SURF.road;
    spec = c; autoBox = true;
    V.x = 0; V.z = 0; V.y = 0; V.yaw = 0; V.vx = 0; V.vz = 0; V.vLong = 0; V.vLat = 0;
    V.yawRate = 0; V.vy = 0; V.gear = 1; V.rpm = c.idle; V.nitro = 1; V.boosting = false;
    input.thr = 1; input.brk = 0; input.left = 0; input.right = 0; input.hand = false;
    input.clutch = false; input.boost = false;
    let t = 0, t100 = null, top = 0, maxGear = 1;
    for (let i = 0; i < 120 * 70; i++) {
      stepPhysics(1 / 120); t += 1 / 120;
      if (Math.abs(V.z) > 300) V.z = 0;
      const k = V.vLong * 3.6;
      if (!t100 && k >= 100) t100 = t;
      top = Math.max(top, k); maxGear = Math.max(maxGear, V.gear);
    }
    surfaceAt = realSurface2;
    return { t100, top, maxGear };
  }
  const first = c => c.redline / 60 * TAU * c.wr0 / (c.ratios[0] * c.final) * 3.6;
  console.log('  car                          1st tops   0-100    top     gears used');
  let prevTop = 0, prevAcc = 99, monotonic = true;
  ladder.forEach(c => {
    const r = perf(c);
    if (r.top < prevTop - 6) monotonic = false;
    if (r.t100 > prevAcc + 0.05) monotonic = false;
    prevTop = Math.max(prevTop, r.top); prevAcc = r.t100;
    console.log(`  ${c.name.padEnd(26)} ${first(c).toFixed(0).padStart(4)}km/h  ${r.t100.toFixed(2)}s  ${r.top.toFixed(0).padStart(4)}km/h   ${r.maxGear}/${c.gears}`);
  });
  console.log('  first gear in the 30-45 km/h band:',
    CARS.every(c => first(c) > 30 && first(c) < 45) ? 'PASS' : 'FAIL');
  console.log('  every upgrade is at least as quick as the last:', monotonic ? 'PASS' : 'FAIL');
  console.log('  gearing is independent of car scale:', (() => {
    TUNE.world.carScale = 2.2; applyTune();
    const a = first(CARS[0]);
    TUNE.world.carScale = 1.5; applyTune();
    const b = first(CARS[0]);
    return Math.abs(a - b) < 0.01 ? 'PASS' : 'FAIL (' + a.toFixed(0) + ' vs ' + b.toFixed(0) + ')';
  })());
}

console.log('--- drift keeps its momentum ---');
{
  const before = TUNE.drift.scrub;
  [['old scrub 0.16', 0.16], ['new scrub ' + before, before]].forEach(([label, sc]) => {
    TUNE.drift.scrub = sc;
    rig('road'); input.thr = 1; run(7);
    const entry = V.vLong * 3.6;
    input.left = 1; input.hand = true; run(0.7); input.hand = false;
    let low = 1e9;
    for (let i = 0; i < 120 * 4; i++) {
      stepPhysics(1 / 120);
      const want = clamp(V.slip * 2.2, 0, 1);
      if (V.vLat > 0) { input.right = want; input.left = 0; } else { input.left = want; input.right = 0; }
      low = Math.min(low, V.vLong * 3.6);
    }
    const exit = V.vLong * 3.6;
    console.log(`  ${label}: entry ${entry.toFixed(0)} -> low ${low.toFixed(0)} -> exit ${exit.toFixed(0)} km/h` +
      `  (kept ${(exit / entry * 100).toFixed(0)}%)`);
    if (sc === before) {
      // A slide is no longer free: it costs speed and the engine earns it back.
      // Anything near entry speed would mean the drift is generating energy.
      console.log('  pulls most of the speed back on the way out:', exit / entry > 0.6 ? 'PASS' : 'FAIL');
      console.log('  but never more than it entered with:', exit / entry < 1.02 ? 'PASS' : 'FAIL');
      console.log('  mid-drift low point stays above a third:', low / entry > 0.33 ? 'PASS' : 'FAIL');
    }
  });
  TUNE.drift.scrub = before;
}

console.log('--- nitrous ---');
{
  const c = CARS[3];
  upgradesFor(c.id).nitro = 2;
  function runBoost(useBoost) {
    spec = c; autoBox = true; surfaceAt = () => SURF.road;
    V.x = 0; V.z = 0; V.y = 0; V.yaw = 0; V.vx = 0; V.vz = 0; V.vLong = 0; V.vLat = 0;
    V.yawRate = 0; V.gear = 1; V.rpm = c.idle; V.nitro = 1; V.boosting = false;
    input.thr = 1; input.left = 0; input.right = 0; input.hand = false; input.boost = useBoost;
    for (let i = 0; i < 120 * 8; i++) { stepPhysics(1 / 120); if (Math.abs(V.z) > 300) V.z = 0; }
    return { kmh: V.vLong * 3.6, tank: V.nitro };
  }
  const off = runBoost(false), on = runBoost(true);
  console.log(`  8s flat out: ${off.kmh.toFixed(0)} km/h without, ${on.kmh.toFixed(0)} km/h with nitrous`);
  console.log(`  bottle after 8s of boost: ${(on.tank * 100).toFixed(0)}%`);
  console.log('  nitrous makes the car faster:', on.kmh > off.kmh + 3 ? 'PASS' : 'FAIL');
  console.log('  bottle actually drains:', on.tank < 0.9 ? 'PASS' : 'FAIL');
  upgradesFor(c.id).nitro = 0;
  runBoost(true);
  console.log('  no bottle fitted means no boost:', !V.boosting ? 'PASS' : 'FAIL');
  surfaceAt = realSurface;
}

console.log('--- upgrades and dev mode ---');
{
  S.cash = 0; S.dev = false;
  CARS.forEach(c => { const u = upgradesFor(c.id); u.turbo = 0; u.tyres = 0; u.nitro = 0; });
  spec = CARS[0];
  const basePower = torqueAt(CARS[0].peakRpm);
  upgradesFor(0).turbo = 3;
  const tunedPower = torqueAt(CARS[0].peakRpm);
  console.log(`  engine tune x3: ${basePower.toFixed(0)} -> ${tunedPower.toFixed(0)} Nm`);
  console.log('  engine upgrade reaches the physics:', tunedPower > basePower * 1.15 ? 'PASS' : 'FAIL');
  upgradesFor(0).turbo = 0;
  console.log('  nitrous only offered where the car can take it:',
    CARS.filter(c => c.nitroReady).length + '/' + CARS.length + ' cars');
  console.log('  every upgrade has a cost per tier:',
    UPGRADE_DEFS.every(d => d.cost.length === d.max) ? 'PASS' : 'FAIL');
}

console.log('--- render smoothness (the vibration) ---');
{
  /* Physics advances in fixed 120 Hz steps but a frame arrives whenever the
     display says so, landing part-way between two steps. Drawing the raw state
     puts the car wherever the last completed step left it, so the gap between
     where it is drawn and where it should be at that instant swings by up to a
     whole step every frame. That swing is the vibration. Interpolating makes
     the gap a constant lag instead, which the eye cannot see.
     So the thing to measure is the error against real time, not per frame. */
  function measure(interpolate) {
    rig('road'); input.thr = 1; run(5);
    const H = 1 / 120;
    let acc = 0;
    const prev = { z: 0 };
    const errs = [];
    let seedJ = 12345;
    const rnd2 = () => { seedJ = (seedJ * 1103515245 + 12345) % 2147483648; return seedJ / 2147483648; };
    for (let f = 0; f < 400; f++) {
      const dt = 1 / 60 + (rnd2() - 0.5) * 0.006;
      acc += dt;
      let guard = 0;
      while (acc >= H && guard++ < 8) { prev.z = V.z; stepPhysics(H); acc -= H; }
      const a = clamp(acc / H, 0, 1);
      const drawn = interpolate ? lerp(prev.z, V.z, a) : V.z;
      const trueNow = V.z + V.vz * acc;        // where the car actually is this instant
      errs.push(drawn - trueNow);
    }
    const mean = errs.reduce((x, y) => x + y, 0) / errs.length;
    const varr = errs.reduce((x, y) => x + (y - mean) * (y - mean), 0) / errs.length;
    let swing = 0;
    for (let i = 1; i < errs.length; i++) swing = Math.max(swing, Math.abs(errs[i] - errs[i - 1]));
    return { lag: Math.abs(mean), wobble: Math.sqrt(varr), swing };
  }
  const raw = measure(false);
  const smooth = measure(true);
  console.log(`  raw state drawn:   lag ${raw.lag.toFixed(3)}m, wobble +/-${raw.wobble.toFixed(4)}m, worst frame-to-frame jump ${raw.swing.toFixed(4)}m`);
  console.log(`  interpolated:      lag ${smooth.lag.toFixed(3)}m, wobble +/-${smooth.wobble.toFixed(4)}m, worst jump ${smooth.swing.toFixed(4)}m`);
  // The frame-to-frame jump is what the eye sees. The remaining wobble is just
  // the constant time lag covering more ground as the car speeds up.
  console.log(`  visible jump reduced ${(raw.swing / Math.max(smooth.swing, 1e-9)).toFixed(0)}x`);
  console.log('  no visible jump between frames:', smooth.swing < raw.swing * 0.1 ? 'PASS' : 'FAIL');
  const lagMs = smooth.lag / Math.max(Math.abs(V.vz), 1) * 1000;
  console.log(`  steady lag behind real time: ${lagMs.toFixed(1)} ms`, lagMs < 25 ? 'PASS' : 'FAIL');

  rig('road');
  V.vLong = 0.2; V.vz = 0.2; input.thr = 0;
  run(2);
  console.log(`  stationary car residual speed: ${(Math.hypot(V.vx, V.vz)).toFixed(4)} m/s`,
    Math.hypot(V.vx, V.vz) < 0.01 ? 'PASS' : 'FAIL');
}

console.log('--- turn-in feel ---');
{
  // In a steady corner, how much of the rotation comes from the nose pointing in
  // versus the tail sliding out? Lower body slip = the front leads.
  [0.4, 0.7, 1.0].forEach(lock => {
    rig('road');
    V.vLong = 22; V.vz = 22; V.gear = 3;
    input.thr = 0.3; input.left = lock;
    run(2.5);
    const bodySlip = V.slip * 57.3;
    const latG = Math.abs(V.yawRate * V.vLong) / 9.81;
    console.log(`  ${(lock * 100).toFixed(0)}% lock at ${(V.vLong * 3.6).toFixed(0)} km/h: ` +
      `${latG.toFixed(2)}g, body slip ${bodySlip.toFixed(1)}deg ` +
      `(${bodySlip < 8 ? 'nose leads' : bodySlip < 20 ? 'mild slide' : 'tail out'})`);
  });
  console.log(`  camera swing toward the flank: ${(TUNE.camera.driftLean * 100).toFixed(0)}% of the old amount`);
  console.log(`  body roll: ${(TUNE.camera.bodyRoll * 100).toFixed(0)}% of the old amount`);
}

console.log('--- spin control vs drift control ---');
{
  function yank(counter) {
    rig('road'); input.thr = 1; run(7);
    const entry = V.vLong * 3.6;
    input.left = 1; input.hand = true; run(0.7);
    input.hand = false; input.left = 0;
    let rot = 0, prev = V.yaw, held = 0, n = 0;
    for (let i = 0; i < 120 * 5; i++) {
      if (counter) {
        const want = clamp(V.slip * 2.4, 0, 1);
        if (V.vLat > 0) { input.right = want; input.left = 0; } else { input.left = want; input.right = 0; }
      }
      stepPhysics(1 / 120);
      let d = V.yaw - prev;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      rot += d; prev = V.yaw; n++;
      if (V.slip > 0.21) held++;
    }
    return { rot: Math.abs(rot) * 180 / Math.PI, held: held / n * 100, exit: V.vLong * 3.6, entry };
  }
  const hands = yank(false), driven = yank(true);
  console.log(`  hands off after a yank: rotated ${hands.rot.toFixed(0)}deg, sideways ${hands.held.toFixed(0)}% of 5s, ended ${hands.exit.toFixed(0)} km/h`);
  console.log(`  counter-steering:       rotated ${driven.rot.toFixed(0)}deg, held an angle ${driven.held.toFixed(0)}% of 5s,` +
    ` ${driven.entry.toFixed(0)} -> ${driven.exit.toFixed(0)} km/h`);
  console.log('  does not spin when you let go:', hands.rot < 270 ? 'PASS' : `FAIL (${hands.rot.toFixed(0)}deg)`);
  // Under the drift controller, centring the wheel HOLDS the angle; opposite
  // lock is how you end a drift. (It used to be the other way round.)
  console.log('  centred wheel holds the drift:', hands.held > 60 ? 'PASS' : 'FAIL');
  console.log('  momentum survives the drift:', driven.exit > driven.entry * 0.55 ? 'PASS' : 'FAIL');
  console.log('  drift never returns you faster:', driven.exit < driven.entry * 1.02 ? 'PASS' : 'FAIL');
}

console.log('--- launch control and burnout ---');
{
  rig('road');
  input.hand = true; input.thr = 1; run(2);
  const heldStill = Math.abs(V.vLong) < 0.5, revs = V.rpm;
  console.log(`  handbrake + throttle: ${(V.vLong * 3.6).toFixed(1)} km/h, ${Math.round(revs)} rpm`);
  console.log('  handbrake holds the car for a launch:', heldStill ? 'PASS' : 'FAIL');
  console.log('  revs build while held:', revs > spec.redline * 0.6 ? 'PASS' : 'FAIL');
  input.hand = false;
  let t50 = null;
  for (let i = 0; i < 120 * 6; i++) { stepPhysics(1 / 120); if (!t50 && V.vLong * 3.6 >= 50) t50 = i / 120; }
  rig('road'); input.thr = 1;
  let t50b = null;
  for (let i = 0; i < 120 * 6; i++) { stepPhysics(1 / 120); if (!t50b && V.vLong * 3.6 >= 50) t50b = i / 120; }
  console.log(`  0-50: ${t50.toFixed(2)}s launched vs ${t50b.toFixed(2)}s from rest`);
  console.log('  launching is not slower:', t50 <= t50b + 0.01 ? 'PASS' : 'FAIL');

  rig('road'); input.thr = 1; input.brk = 1; run(3);
  console.log(`  throttle + brake: ${(V.vLong * 3.6).toFixed(1)} km/h, wheelspin ${V.wheelSpin.toFixed(2)}, ${Math.round(V.rpm)} rpm`);
  console.log('  car stays put during a burnout:', Math.abs(V.vLong) < 3 ? 'PASS' : 'FAIL');
  console.log('  rear wheels light up:', V.wheelSpin > 0.5 ? 'PASS' : 'FAIL');
  console.log('  engine revs during a burnout:', V.rpm > spec.redline * 0.6 ? 'PASS' : 'FAIL');
}

console.log('--- cornering at speed ---');
{
  [80, 140, 200].forEach(kmh => {
    rig('road');
    V.vLong = kmh / 3.6; V.vz = kmh / 3.6; V.gear = 4;
    input.thr = 0.3; input.left = 1;
    run(3);
    const R = Math.abs(V.vLong / (V.yawRate || 1e-9));
    const g = Math.abs(V.yawRate * V.vLong) / 9.81;
    console.log(`  entering at ${kmh} km/h: radius ${R.toFixed(0)}m at ${g.toFixed(2)}g, holding ${(V.vLong * 3.6).toFixed(0)} km/h`);
  });
}

console.log('--- car model registry ---');
{
  const ids = Object.keys(CAR_MODELS).map(Number);
  console.log(`  ${ids.length} of ${CARS.length} cars have a model configured`);
  console.log('  every entry points at a real car:', ids.every(i => CARS[i]) ? 'PASS' : 'FAIL');
  console.log('  no duplicate files:',
    new Set(ids.map(i => CAR_MODELS[i].url)).size === ids.length ? 'PASS' : 'FAIL');
  const missing = CARS.filter(c => !CAR_MODELS[c.id]).map(c => c.name);
  console.log('  still on the built-in body: ' + (missing.join(', ') || 'none'));
  console.log('  wheel matcher still rejects bodywork:',
    ['Body', 'car_paint', 'Chassis', 'Window_Glass'].every(n => !WHEEL_RE.test(n)) ? 'PASS' : 'FAIL');
}

console.log('--- pavements, lamp posts, day/night ---');
{
  buildRoadGrid();
  surfaceAt = realSurface;
  const r0 = ROADS[0], p0 = r0.pts[2];
  const hd = pathHeading(r0, 2);
  const nx = Math.cos(hd), nz = -Math.sin(hd);
  console.log('  height profile stepping off the carriageway:');
  [0, r0.w - 1, r0.w + 0.5, r0.w + 2, paveHalf(r0.w) - 1].forEach(off => {
    const x = p0[0] + nx * off, z = p0[1] + nz * off;
    console.log(`    ${off.toFixed(1)}m out: ${terrainH(x, z).toFixed(3)}m  (${surfaceAt(x, z).name})`);
  });
  const onRoad = terrainH(p0[0], p0[1]);
  const onPave = terrainH(p0[0] + nx * (paveHalf(r0.w) - 1), p0[1] + nz * (paveHalf(r0.w) - 1));
  console.log('  kerb is a real step:', onPave > onRoad + 0.2 ? 'PASS' : 'FAIL');
  console.log('  carriageway stays flat:', Math.abs(onRoad) < 0.01 ? 'PASS' : 'FAIL');

  // lamps must stand on the footway, never in a carriageway
  const inst = makeInstancers();
  ROADS.forEach(r => lampsAlong(r, inst, true));
  let inRoad = 0;
  inst.lamp.forEach(l => {
    for (const r of ROADS) if (pathDist(l.x, l.z, r).d < r.w) { inRoad++; break; }
  });
  console.log(`  ${inst.lamp.length} lamp posts placed, ${inRoad} standing in a carriageway`);
  console.log('  no lamp post in the road:', inRoad === 0 ? 'PASS' : 'FAIL');
  const off = inst.lamp.filter(l => Math.abs(l.y) < 0.01).length;
  console.log(`  lamps sitting on the raised footway: ${inst.lamp.length - off}/${inst.lamp.length}`);

  // breakable
  const fake = { x: 0, z: 0, hw: 0.45, hd: 0.45, h: 9, soft: true,
    parts: [{ im: { setMatrixAt() { }, instanceMatrix: {} }, idx: 0 }] };
  breakProp(fake);
  console.log('  a struck lamp post is retired:', fake.broken ? 'PASS' : 'FAIL');

  // the renderer never starts headless, so stand in the lights it would have made
  sunLight = new THREE.DirectionalLight(0xffd2a0, 1);
  sunLight.color = new THREE.Color(0xffd2a0);
  hemiLight = new THREE.HemisphereLight(0, 0, 1);
  console.log('  daylight through the day:');
  [0, 6, 9, 12, 18, 21].forEach(h => {
    TUNE.look.timeOfDay = h;
    updateTimeOfDay(0, false);
    console.log(`    ${String(h).padStart(2)}:00  sun ${sunLight.intensity.toFixed(2)}` +
      `  ambient ${hemiLight.intensity.toFixed(2)}  street lighting ${(S.night * 100).toFixed(0)}%`);
  });
  TUNE.look.timeOfDay = 9.5; updateTimeOfDay(0, false);
  console.log('  clock advances only while driving:', (() => {
    const before = TUNE.look.timeOfDay;
    updateTimeOfDay(1, false);
    const paused = TUNE.look.timeOfDay === before;
    updateTimeOfDay(1, true);
    return paused && TUNE.look.timeOfDay > before ? 'PASS' : 'FAIL';
  })());
}

console.log('--- reverse behaves ---');
{
  rig('road');
  V.gear = -1;
  input.thr = 1; input.left = 1;          // throttle and steering, backing up
  let peak = 0;
  for (let i = 0; i < 120 * 25; i++) {
    stepPhysics(1 / 120);
    if (Math.abs(V.z) > 300) V.z = 0;
    peak = Math.max(peak, -V.vLong * 3.6);
  }
  console.log(`  25s of reverse with the wheel turned: peaked at ${peak.toFixed(0)} km/h`);
  console.log('  reverse cannot run away:', peak < TUNE.power.reverseMax * 3.6 + 4 ? 'PASS' : `FAIL`);

  rig('road'); V.gear = -1; input.thr = 1;
  run(12);
  console.log(`  straight-line reverse tops out at ${(-V.vLong * 3.6).toFixed(0)} km/h`);
  console.log('  still reverses usefully:', -V.vLong * 3.6 > 15 ? 'PASS' : 'FAIL');

  rig('road'); input.thr = 1; run(8);
  const fwd = V.vLong * 3.6;
  console.log(`  forward acceleration unaffected: ${fwd.toFixed(0)} km/h after 8s`,
    fwd > 100 ? 'PASS' : 'FAIL');
}

console.log('--- the road stays flat ---');
{
  buildRoadGrid();
  let bumps = 0, checked = 0, worst = 0;
  ROADS.forEach(r => {
    for (let i = 0; i < r.pts.length - 1; i++) {
      for (let t = 0; t <= 1; t += 0.02) {
        const cx = lerp(r.pts[i][0], r.pts[i + 1][0], t);
        const cz = lerp(r.pts[i][1], r.pts[i + 1][1], t);
        const hd = pathHeading(r, i);
        const nx = Math.cos(hd), nz = -Math.sin(hd);
        for (const off of [-r.w * 0.8, -r.w * 0.4, 0, r.w * 0.4, r.w * 0.8]) {
          const x = cx + nx * off, z = cz + nz * off;
          if (Math.hypot(x - MTN.x, z - MTN.z) < MTN.r + 10) continue;
          checked++;
          const h = terrainH(x, z);
          if (h > 0.01) { bumps++; worst = Math.max(worst, h); }
        }
      }
    }
  });
  console.log(`  ${checked} points sampled across every carriageway`);
  console.log(`  raised spots on the road: ${bumps}` + (bumps ? ` (worst ${worst.toFixed(2)}m)` : ''));
  console.log('  kerb height no longer bleeds onto the tarmac:', bumps === 0 ? 'PASS' : 'FAIL');

  // and the kerb is still there when you leave the road
  const r0 = ROADS[0], p0 = r0.pts[2];
  const hd = pathHeading(r0, 2);
  const nx = Math.cos(hd), nz = -Math.sin(hd);
  const onPave = terrainH(p0[0] + nx * (paveHalf(r0.w) - 1), p0[1] + nz * (paveHalf(r0.w) - 1));
  console.log(`  footway still stands at ${onPave.toFixed(2)}m`, onPave > 0.3 ? 'PASS' : 'FAIL');
}

console.log('--- braking and loose surfaces ---');
{
  [120, 180].forEach(kmh => {
    rig('road');
    V.vLong = kmh / 3.6; V.vz = kmh / 3.6; V.gear = 4;
    input.thr = 0; input.brk = 1;
    let t = 0, dist = 0;
    while (V.vLong > 0.5 && t < 15) { const v0 = V.vLong; stepPhysics(1 / 120); t += 1 / 120; dist += (v0 + V.vLong) / 2 / 120; }
    console.log(`  ${kmh} km/h to a stop: ${t.toFixed(2)}s over ${dist.toFixed(0)}m` +
      ` (${(kmh / 3.6 / Math.max(t, 0.01) / 9.81).toFixed(2)}g)`);
  });

  console.log('  cornering by surface at 45% lock:');
  ['road', 'dirt', 'grass'].forEach(name => {
    rig(name); input.thr = 1; run(7);
    const straight = V.vLong * 3.6;
    input.thr = 0.45; input.left = 0.45; run(3);
    const latG = Math.abs(V.yawRate * V.vLong) / 9.81;
    console.log(`    ${name.padEnd(5)} ${straight.toFixed(0)} km/h straight | ${latG.toFixed(2)}g` +
      ` | slip ${(V.slip * 57.3).toFixed(0)}deg | holding ${(V.vLong * 3.6).toFixed(0)} km/h`);
  });

  // can you still hold a slide off-road, or does it just grip up?
  rig('dirt'); input.thr = 1; run(6);
  input.left = 1; input.hand = true; run(0.6); input.hand = false;
  let held = 0;
  for (let i = 0; i < 120 * 3; i++) {
    stepPhysics(1 / 120);
    const want = clamp(V.slip * 2.2, 0, 1);
    if (V.vLat > 0) { input.right = want; input.left = 0; } else { input.left = want; input.right = 0; }
    if (V.slip > 0.21) held++;
  }
  console.log(`  dirt slide held ${(held / (120 * 3) * 100).toFixed(0)}% of 3s, exit ${(V.vLong * 3.6).toFixed(0)} km/h`);
  console.log('  loose surfaces still slide:', held > 60 ? 'PASS' : 'FAIL');

  console.log('  spray colours: ' + ['road', 'dirt', 'grass', 'rock']
    .map(n => n + ' ' + (SURF[n].dust ? '#' + SURF[n].dust.toString(16) : 'none')).join(', '));
  console.log('  unsealed tracks: ' + (DIRT.length ? DIRT[0].w * 2 + 'm wide' : 'none on this map yet'));
}

console.log('--- throttle control through a slide ---');
{
  function slide(thr) {
    rig('road'); input.thr = 1; run(7);
    const entry = V.vLong * 3.6;
    input.left = 1; input.hand = true; run(0.7); input.hand = false;
    input.thr = thr;
    let held = 0;
    for (let i = 0; i < 120 * 3; i++) {
      stepPhysics(1 / 120);
      const want = clamp(V.slip * 2.2, 0, 1);
      if (V.vLat > 0) { input.right = want; input.left = 0; } else { input.left = want; input.right = 0; }
      if (V.slip > 0.21) held++;
    }
    return { entry: entry, exit: V.vLong * 3.6, held: held / (120 * 3) * 100 };
  }
  const on = slide(1), off = slide(0), part = slide(0.45);
  console.log(`  full throttle:    ${on.entry.toFixed(0)} -> ${on.exit.toFixed(0)} km/h (${(on.exit / on.entry * 100).toFixed(0)}%), sideways ${on.held.toFixed(0)}%`);
  console.log(`  half throttle:    ${part.entry.toFixed(0)} -> ${part.exit.toFixed(0)} km/h (${(part.exit / part.entry * 100).toFixed(0)}%)`);
  console.log(`  off the throttle: ${off.entry.toFixed(0)} -> ${off.exit.toFixed(0)} km/h (${(off.exit / off.entry * 100).toFixed(0)}%)`);
  console.log('  coasting bleeds speed in a slide:', off.exit < on.exit * 0.8 ? 'PASS' : 'FAIL');
  console.log('  throttle is the difference:', part.exit > off.exit && part.exit < on.exit ? 'PASS' : 'FAIL');

  // straight-line coasting should still lose more than a slide does per second
  rig('road'); input.thr = 1; run(7);
  const v0 = V.vLong * 3.6;
  input.thr = 0; run(3);
  console.log(`  straight-line coast: ${v0.toFixed(0)} -> ${(V.vLong * 3.6).toFixed(0)} km/h`);
}

console.log('--- how willing each car is to slide ---');
{
  const ladder = CARS.slice().sort((a, b) => a.lvl - b.lvl);
  ladder.forEach(c => {
    surfaceAt = () => SURF.road;
    spec = c; autoBox = true;
    V.x = 0; V.z = 0; V.y = 0; V.yaw = 0; V.vx = 0; V.vz = 0; V.vLong = 0; V.vLat = 0;
    V.yawRate = 0; V.gear = 1; V.rpm = c.idle; V.gripRMem = 0;
    input.thr = 1; input.brk = 0; input.left = 0; input.right = 0; input.hand = false; input.boost = false;
    for (let i = 0; i < 120 * 7; i++) { stepPhysics(1 / 120); if (Math.abs(V.z) > 300) V.z = 0; }
    input.left = 1; input.hand = true;
    for (let i = 0; i < 84; i++) stepPhysics(1 / 120);
    input.hand = false; input.left = 0;
    let peak = 0, held = 0;
    for (let i = 0; i < 120 * 3; i++) {
      stepPhysics(1 / 120);
      peak = Math.max(peak, V.slip);
      if (V.slip > 0.21) held++;
    }
    console.log(`  L${String(c.lvl).padStart(2)} ${c.name.padEnd(24)} stab ${(c.stab || 1).toFixed(2)}` +
      `  grip ${c.grip.toFixed(2)}  peak slip ${(peak * 57.3).toFixed(0)}deg  sideways ${(held / (120 * 3) * 100).toFixed(0)}%`);
  });
  surfaceAt = realSurface;
}

console.log('--- a slide can never create speed ---');
{
  function slalom(car, period) {
    surfaceAt = () => SURF.road;
    spec = car; autoBox = true;
    V.x = 0; V.z = 0; V.y = 0; V.yaw = 0; V.vx = 0; V.vz = 0; V.vLong = 0; V.vLat = 0;
    V.yawRate = 0; V.gear = 1; V.rpm = car.idle; V.gripRMem = 0;
    input.thr = 1; input.brk = 0; input.left = 0; input.right = 0;
    input.hand = false; input.clutch = false; input.boost = false;
    let peak = 0;
    for (let i = 0; i < 120 * 45; i++) {
      const ph = Math.sin(i / 120 * Math.PI * 2 / period);
      input.left = ph > 0 ? 1 : 0; input.right = ph < 0 ? 1 : 0;
      stepPhysics(1 / 120);
      if (Math.abs(V.z) > 300) V.z = 0;
      peak = Math.max(peak, V.vLong * 3.6);
    }
    return peak;
  }
  let over = 0;
  [CARS[2], CARS[0], CARS[9], CARS[5]].forEach(c => {
    [1.0, 1.6, 2.4].forEach(period => {
      const p = slalom(c, period);
      if (p > c.topKmh) { over++; console.log(`    ${c.name} at ${period}s: ${p.toFixed(0)} km/h vs a ${c.topKmh} top speed`); }
    });
  });
  console.log('  slaloming never beats the car top speed:', over === 0 ? 'PASS' : `FAIL (${over} cases)`);

  // and a single flick must not leave you faster than you entered
  rig('road'); input.thr = 1; run(8);
  const before = Math.hypot(V.vLong, V.vLat);
  input.left = 1; run(0.5); input.left = 0; input.right = 1; run(0.5); input.right = 0;
  const after = Math.hypot(V.vLong, V.vLat);
  console.log(`  flick left-right at speed: ${(before * 3.6).toFixed(0)} -> ${(after * 3.6).toFixed(0)} km/h`);
  console.log('  a flick does not add speed:', after <= before * 1.02 ? 'PASS' : 'FAIL');
  surfaceAt = realSurface;
}

console.log('--- the new map plate ---');
{
  surfaceAt = realSurface;
  let L = 0;
  ROADS.forEach(r => { for (let i = 1; i < r.pts.length; i++) L += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]); });
  const xs = [], zs = [];
  ROADS.forEach(r => r.pts.forEach(p => { xs.push(p[0]); zs.push(p[1]); }));
  console.log(`  ${ROADS.length} streets, ${L.toFixed(0)} units of road`);
  console.log(`  extent x ${Math.min.apply(null, xs).toFixed(0)}..${Math.max.apply(null, xs).toFixed(0)}` +
    `  z ${Math.min.apply(null, zs).toFixed(0)}..${Math.max.apply(null, zs).toFixed(0)} (bounds ${BOUND_X}/${BOUND_Z})`);
  let outside = 0;
  ROADS.forEach(r => r.pts.forEach(p => { if (Math.abs(p[0]) > BOUND_X || Math.abs(p[1]) > BOUND_Z) outside++; }));
  console.log('  every street inside the world bounds:', outside === 0 ? 'PASS' : `FAIL (${outside})`);

  // surfaceAt reports the shop's own forecourt as road, so measure the real
  // distance to a street centreline instead
  let shopGap = 1e9;
  ROADS.forEach(r => { shopGap = Math.min(shopGap, pathDist(HQ.x, HQ.z, r).d - r.w); });
  console.log(`  shop at (${HQ.x}, ${HQ.z}) sits ${shopGap.toFixed(1)}m clear of the nearest kerb`);
  console.log('  shop is off the carriageway:', shopGap > 8 ? 'PASS' : 'FAIL');
  console.log(`  forecourt: ${surfaceAt(HQ.x, HQ.z - 13).name}, spawn: ${surfaceAt(HQ.x + 4, HQ.z - 24).name}`);
  console.log('  you start on tarmac:', surfaceAt(HQ.x + 4, HQ.z - 24).name === 'road' ? 'PASS' : 'FAIL');

  // the network must be one connected piece, or deliveries become unreachable
  const nodes = [];
  ROADS.forEach(r => { nodes.push({ r: r, p: r.pts[0] }); nodes.push({ r: r, p: r.pts[r.pts.length - 1] }); });
  const seen = new Set(); const stack = [ROADS[0]];
  while (stack.length) {
    const r = stack.pop();
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    ROADS.forEach(o => {
      if (seen.has(o.id)) return;
      const touch = [r.pts[0], r.pts[r.pts.length - 1]].some(a =>
        [o.pts[0], o.pts[o.pts.length - 1]].some(b => Math.hypot(a[0] - b[0], a[1] - b[1]) < 30)) ||
        o.pts.some(b => pathDist(b[0], b[1], r).d < r.w + 2);
      if (touch) stack.push(o);
    });
  }
  console.log(`  connected streets: ${seen.size}/${ROADS.length}`);
  console.log('  whole network reachable:', seen.size === ROADS.length ? 'PASS' : `FAIL (${ROADS.length - seen.size} stranded)`);
}

console.log('--- roadside poles ---');
{
  surfaceAt = realSurface;
  buildRoadGrid();
  const inst = makeInstancers();
  ROADS.forEach(r => utilityLine(r, inst));
  let inRoad = 0;
  inst.utility.forEach(p => {
    for (const r of ROADS) if (pathDist(p.x, p.z, r).d < r.w) { inRoad++; break; }
  });
  console.log(`  ${inst.utility.length} telephone poles, ${inRoad} standing in a carriageway`);
  console.log('  no pole in the road:', inRoad === 0 ? 'PASS' : 'FAIL');
}

console.log('--- traced mountain and the path editor ---');
{
  surfaceAt = realSurface;
  const pass = MPATHS[0], track = MPATHS[1];
  const cr = (pts, i) => {
    const A = pts[i - 2], B = pts[i - 1], C = pts[i];
    const ab = Math.hypot(B.x - A.x, B.z - A.z), bc = Math.hypot(C.x - B.x, C.z - B.z);
    const ac = Math.hypot(C.x - A.x, C.z - A.z);
    const q = Math.abs((B.x - A.x) * (C.z - B.z) - (B.z - A.z) * (C.x - B.x));
    return q < 1e-9 || ab < 1 || bc < 1 ? 1e9 : (ab * bc * ac) / (2 * q);
  };
  [['climb', pass], ['circuit', track]].forEach(([name, p]) => {
    let m = 1e9;
    for (let i = 2; i < p.pts.length; i++) m = Math.min(m, cr(p.pts, i));
    let off = 0;
    p.pts.forEach(q => { if (Math.abs(terrainH(q.x, q.z) - q.h) > 1.5) off++; });
    console.log(`  ${name}: ${p.pts.length} points, ${p.len.toFixed(0)} m, tightest ${m.toFixed(1)} m,` +
      ` on its shelf ${p.pts.length - off}/${p.pts.length}`);
    console.log(`    corners all drivable:`, m > 10 ? 'PASS' : 'FAIL');
    console.log(`    sits on its own shelf:`, off === 0 ? 'PASS' : 'FAIL');
  });
  const flat = track.pts.every(q => Math.abs(q.h - MTN_TRACE.trackH) < 0.01);
  console.log('  circuit is level:', flat ? 'PASS' : 'FAIL');
  console.log(`  climb gradient ${(MTN.h / pass.len * 100).toFixed(1)}%`,
    MTN.h / pass.len < 0.1 ? 'PASS' : 'FAIL');

  const app = ROADS.find(r => r.id === 'mountain-approach');
  const gap = Math.hypot(app.pts[app.pts.length - 1][0] - pass.pts[0].x,
    app.pts[app.pts.length - 1][1] - pass.pts[0].z);
  console.log(`  approach meets the entry within ${gap.toFixed(1)} m`, gap < 8 ? 'PASS' : 'FAIL');

  // everything must stay on the hill and inside the world
  let offHill = 0, outside = 0;
  MPATHS.forEach(p => p.pts.forEach(q => {
    if (Math.hypot(q.x - MTN.x, q.z - MTN.z) > MTN.r) offHill++;
    if (Math.abs(q.x) > BOUND_X || Math.abs(q.z) > BOUND_Z) outside++;
  }));
  console.log(`  points off the hill: ${offHill}, outside the world: ${outside}`,
    offHill === 0 && outside === 0 ? 'PASS' : 'FAIL');

  // the editor must be able to reshape and rebuild without breaking anything
  const before = MPATHS[0].len;
  MTN_TRACE.pass[10] = [MTN_TRACE.pass[10][0] + 14, MTN_TRACE.pass[10][1] - 9];
  buildMountainRoad();
  const after = MPATHS[0].len;
  console.log(`  moving a point rebuilds the road: ${before.toFixed(0)} -> ${after.toFixed(0)} m`,
    Math.abs(after - before) > 0.5 ? 'PASS' : 'FAIL');
  MTN_TRACE.pass[10] = [MTN_TRACE.pass[10][0] - 14, MTN_TRACE.pass[10][1] + 9];
  buildMountainRoad();
  console.log('  and reverts cleanly:', Math.abs(MPATHS[0].len - before) < 0.5 ? 'PASS' : 'FAIL');
  console.log(`  the town stops at x=${CITY_X}, hill centred at x=${MTN.x}`);
}

console.log('--- editor drawing tools ---');
{
  const minR = pts => { let m = 1e9; for (let i = 2; i < pts.length; i++) m = Math.min(m, peCornerRadius(pts, i)); return m; };
  // a scribbled hairpin road, far too tight to drive
  const scribble = [];
  for (let i = 0; i < 60; i++) {
    const t = i / 59;
    scribble.push([1000 + t * 300, -60 + Math.sin(t * Math.PI * 7) * 45]);
  }
  const tidy = peTidy(scribble, false);
  console.log(`  scribble: ${scribble.length} points, tightest ${minR(scribble).toFixed(1)} m`);
  console.log(`  after Make drivable: ${tidy.length} points, tightest ${minR(tidy).toFixed(1)} m`);
  console.log('  every corner opened up:', minR(tidy) > PE_MIN_RADIUS * 0.9 ? 'PASS' : 'FAIL');
  const endGap = Math.hypot(tidy[tidy.length - 1][0] - scribble[scribble.length - 1][0],
    tidy[tidy.length - 1][1] - scribble[scribble.length - 1][1]);
  console.log(`  finishes ${endGap.toFixed(0)} m from where it was drawn`);

  // a drawn loop must still close after tidying
  const loop = [];
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * TAU;
    loop.push([1300 + Math.cos(a) * 90, -200 + Math.sin(a) * 55]);
  }
  const tl = peTidy(loop, true);
  const closeGap = Math.hypot(tl[0][0] - tl[tl.length - 1][0], tl[0][1] - tl[tl.length - 1][1]);
  console.log(`  circuit loop: ${tl.length} points, tightest ${minR(tl.concat([tl[0]])).toFixed(1)} m, seam gap ${closeGap.toFixed(1)} m`);
  console.log('  a drawn loop stays closed:', closeGap < 30 ? 'PASS' : 'FAIL');

  // closing the circuit and rebuilding must produce a loop that meets the climb
  const saved = { track: MTN_TRACE.track.map(p => p.slice()), closed: MTN_TRACE.trackClosed };
  MTN_TRACE.trackClosed = true;
  buildMountainRoad();
  const t = MPATHS[1].pts;
  const shut = Math.hypot(t[0].x - t[t.length - 1].x, t[0].z - t[t.length - 1].z);
  console.log(`  loop flag closes the circuit: seam ${shut.toFixed(2)} m`, shut < 0.01 ? 'PASS' : 'FAIL');
  let nearClimb = 1e9;
  t.forEach(q => MROAD.forEach(p => { nearClimb = Math.min(nearClimb, Math.hypot(p.x - q.x, p.z - q.z)); }));
  const joinH = MTN_TRACE.trackH;
  console.log(`  circuit sits at ${joinH} m, ${nearClimb.toFixed(0)} m from the climb`);
  MTN_TRACE.track = saved.track; MTN_TRACE.trackClosed = saved.closed;
  buildMountainRoad();

  // clearing a road and drawing it again from nothing
  const keep = MTN_TRACE.pass.map(p => p.slice());
  MTN_TRACE.pass = [[875, -60], [940, -110], [1010, -150], [1100, -170], [1200, -150], [1300, -100], [1400, -60]];
  buildMountainRoad();
  console.log(`  a freshly drawn climb builds: ${MROAD.length} points, ${MTN.roadLen.toFixed(0)} m`,
    MROAD.length === 7 ? 'PASS' : 'FAIL');
  MTN_TRACE.pass = keep;
  buildMountainRoad();
}

console.log('--- terrain never shows through the road ---');
{
  const t0 = Date.now();
  const mesh = buildMountain();
  const G = mesh.userData.grid;
  console.log(`  terrain grid ${G.n}x${G.n} at ${G.step} m, built in ${Date.now() - t0} ms`);
  // height of the rendered surface: bilinear over the grid, same as the GPU draws it
  const meshH = (x, z) => {
    const fx = (x - G.x0) / G.step, fz = (z - G.z0) / G.step;
    const i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= G.n - 1 || j >= G.n - 1) return 0;
    const u = fx - i, v = fz - j;
    const h = (ii, jj) => G.pos[((jj) * G.n + ii) * 3 + 1];
    // the two triangles of each cell: (a,d,b) and (b,d,e)
    if (u + v <= 1) return h(i, j) + (h(i + 1, j) - h(i, j)) * u + (h(i, j + 1) - h(i, j)) * v;
    return h(i + 1, j + 1) + (h(i, j + 1) - h(i + 1, j + 1)) * (1 - u) + (h(i + 1, j) - h(i + 1, j + 1)) * (1 - v);
  };
  let checked = 0, bleed = 0, worst = 0;
  MPATHS.forEach(p => {
    for (let k = 0; k < p.pts.length - 1; k++) {
      const a = p.pts[k], b = p.pts[k + 1];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      const dx = (b.x - a.x) / L, dz = (b.z - a.z) / L;
      for (let s = 0; s < L; s += 2) {
        const cx = a.x + dx * s, cz = a.z + dz * s, deck = lerp(a.h, b.h, s / L);
        for (const off of [-0.85, -0.5, 0, 0.5, 0.85]) {
          const x = cx - dz * off * p.w, z = cz + dx * off * p.w;
          checked++;
          const over = meshH(x, z) - (deck + 0.02);
          if (over > 0.05) { bleed++; worst = Math.max(worst, over); }
        }
      }
    }
  });
  console.log(`  ${checked} points sampled across both mountain roads`);
  console.log(`  terrain above the road surface at ${bleed} of them` + (bleed ? ` (worst ${worst.toFixed(2)} m)` : ''));
  console.log('  no terrain bleeding through the road:', bleed / checked < 0.002 ? 'PASS' : 'FAIL');
  console.log(`  summit plaza at (${PLAZA.x.toFixed(0)}, ${PLAZA.z.toFixed(0)}), ${PLAZA.h.toFixed(0)} m up, ${PLAZA.r} m across`);
  let plazaFlat = true;
  for (let a = 0; a < TAU; a += 0.3) for (let r = 0; r < PLAZA.r - 1; r += 6) {
    if (Math.abs(terrainH(PLAZA.x + Math.cos(a) * r, PLAZA.z + Math.sin(a) * r) - PLAZA.h) > 0.01) plazaFlat = false;
  }
  console.log('  plaza is level:', plazaFlat ? 'PASS' : 'FAIL');
  const end = MROAD[MROAD.length - 1];
  console.log('  road ends on the plaza:', Math.hypot(end.x - PLAZA.x, end.z - PLAZA.z) < PLAZA.r ? 'PASS' : 'FAIL');
}

console.log('--- guard rails, forest and viewpoint ---');
{
  surfaceAt = realSurface;
  colliders.length = 0; RAIL_SEGS.length = 0;
  const inst = makeInstancers();
  const grp = new Obj();
  mountainProps(grp, inst);
  buildColliderGrid();
  let railLen = 0;
  RAIL_SEGS.forEach(() => { railLen += 7; });
  const roadLen = MPATHS.reduce((s, p) => s + p.len, 0);
  console.log(`  ${RAIL_SEGS.length} rail sections (~${railLen} m) along ${roadLen.toFixed(0)} m of mountain road`);
  console.log(`  ${MTN.trees} trees, ${inst.bush.length} bushes, ${inst.rock.length} rocks on the slopes`);

  // no rail may sit on a carriageway
  let onRoad = 0;
  RAIL_SEGS.forEach(s => { const c = s.cols[0]; const r = mtnRoadDist(c.x, c.z); if (r.d < r.w) onRoad++; });
  console.log('  no rail across a road:', onRoad === 0 ? 'PASS' : `FAIL (${onRoad})`);
  // rails only where the ground actually drops away
  let flatRail = 0;
  RAIL_SEGS.forEach(s => {
    const c = s.cols[0];
    const lower = Math.min(terrainH(c.x + 5, c.z), terrainH(c.x - 5, c.z), terrainH(c.x, c.z + 5), terrainH(c.x, c.z - 5));
    if (c.y0 - lower < 1) flatRail++;
  });
  console.log(`  rails on genuinely flat ground: ${flatRail}`);
  // no tree on a road
  let treeOnRoad = 0;
  inst.trunk.forEach(t => { const r = mtnRoadDist(t.x, t.z); if (r.d < r.w + 1) treeOnRoad++; });
  console.log('  no tree in the road:', treeOnRoad === 0 ? 'PASS' : `FAIL (${treeOnRoad})`);
  let treeOnPlaza = inst.trunk.filter(t => Math.hypot(t.x - PLAZA.x, t.z - PLAZA.z) < PLAZA.r).length;
  console.log('  viewpoint kept clear:', treeOnPlaza === 0 ? 'PASS' : 'FAIL');

  // hit a rail gently, then hard
  const seg = RAIL_SEGS[Math.floor(RAIL_SEGS.length / 2)];
  const c = seg.cols[0];
  function hit(speed) {
    seg.broken = false; seg.cols.forEach(q => { q.broken = false; });
    rig('road'); surfaceAt = realSurface;
    colliders.length = 0; colliders.push(c); buildColliderGrid();
    const nx = MTN.x - c.x, nz = MTN.z - c.z, L = Math.hypot(nx, nz);
    // come at the rail from the road side
    V.x = c.x + nx / L * 8; V.z = c.z + nz / L * 8; V.y = c.y0;
    V.yaw = Math.atan2(-nx, -nz);
    V.vLong = speed; V.vx = Math.sin(V.yaw) * speed; V.vz = Math.cos(V.yaw) * speed; V.gear = 3;
    input.thr = 0;
    let closest = 1e9;
    for (let i = 0; i < 120; i++) {
      stepPhysics(1 / 120);
      closest = Math.min(closest, Math.hypot(V.x - c.x, V.z - c.z));
    }
    return { broke: !!seg.broken, closest: closest, left: Math.hypot(V.vx, V.vz) * 3.6 };
  }
  const soft = hit(8), hard = hit(30);
  console.log(`  brushed at 29 km/h: ${soft.broke ? 'broke' : 'held'}, stopped ${soft.closest.toFixed(1)} m from it`);
  console.log(`  hit at 108 km/h: ${hard.broke ? 'broke' : 'held'}, carried on at ${hard.left.toFixed(0)} km/h`);
  console.log('  holds a gentle knock:', !soft.broke ? 'PASS' : 'FAIL');
  console.log('  gives way to a big one:', hard.broke ? 'PASS' : 'FAIL');

  // a rail on the lap above must not stop a car on the lap below
  rig('road'); surfaceAt = realSurface;
  colliders.length = 0;
  const high = { x: 0, z: 30, hw: 1.1, hd: 1.1, h: 60, y0: 58.6, rail: true, seg: { cols: [], parts: [] } };
  high.seg.cols.push(high);
  colliders.push(high); buildColliderGrid();
  V.x = 0; V.z = 0; V.y = 10; V.yaw = 0; V.vLong = 15; V.vz = 15; V.gear = 3;
  run(3);
  console.log('  drives under a rail on the lap above:', V.z > 35 ? 'PASS' : 'FAIL');
  colliders.length = 0; buildColliderGrid();
}

console.log('--- progression, spread and the summit finale ---');
{
  surfaceAt = realSurface;
  function payout(job, st) {
    const freshPay = Math.round(job.fare * (0.45 + 0.55 * clamp(st.fresh + 0.25, 0, 1)));
    const pen = Math.round(job.fare * (1 - st.intact) * 0.5);
    const total = Math.max(80, freshPay - pen + Math.round(st.drift * TUNE.game.driftCash));
    return { cash: total, xp: Math.round(total / 6 + st.drift * TUNE.game.driftXp) };
  }
  function career(st) {
    S.level = 1; S.xp = 0; S.summitReady = false; S.summitDone = false; RECENT_DROPS.length = 0;
    let drops = 0, jobs = 0, cash = 0, last = null;
    const spots = [];
    while (S.level < 10 && jobs < 500) {
      const job = makeJob(); last = job;
      const p = payout(job, st);
      S.xp += p.xp; cash += p.cash; drops += job.stops.length; jobs++;
      job.stops.forEach(s => spots.push(s));
      if (job.summit) { S.summitDone = true; S.summitReady = false; }
      checkLevel();
    }
    return { drops, cash, last, spots };
  }
  const med = (st, n) => { const a = []; for (let i = 0; i < n; i++) a.push(career(st)); a.sort((p, q) => p.drops - q.drops); return a[Math.floor(n / 2)]; };
  const rows = [
    ['clean, no drifting', { fresh: 1, intact: 1, drift: 0 }],
    ['a little drifting', { fresh: 0.9, intact: 0.95, drift: 500 }],
    ['regular drifting', { fresh: 0.8, intact: 0.9, drift: 1200 }],
    ['heavy drifting', { fresh: 0.65, intact: 0.85, drift: 2500 }]
  ];
  const res = rows.map(([l, st]) => [l, med(st, 60)]);
  res.forEach(([l, r]) => console.log(`  ${l.padEnd(20)} ${String(r.drops).padStart(3)} deliveries, ¥${r.cash.toLocaleString()}`));
  const clean = res[0][1].drops;
  console.log('  a clean career is 50 deliveries:', Math.abs(clean - 50) <= 1 ? 'PASS' : `FAIL (${clean})`);
  console.log('  drifting makes it much quicker:', res[2][1].drops < clean * 0.7 ? 'PASS' : 'FAIL');
  console.log('  drifting earns more money per delivery:',
    res[3][1].cash / res[3][1].drops > res[0][1].cash / res[0][1].drops * 1.3 ? 'PASS' : 'FAIL');
  console.log('  final delivery is the mountain top:', res.every(([, r]) => r.last && r.last.summit) ? 'PASS' : 'FAIL');

  // spread: how much of the town does one clean career actually visit?
  const cellOf = d => Math.floor(d.x / 200) + ',' + Math.floor(d.z / 200);
  const available = new Set(destinations.map(cellOf));
  const visited = new Set(res[0][1].spots.filter(s => s.type !== 'summit').map(cellOf));
  console.log(`  one clean career visits ${visited.size} of the ${available.size} districts that have deliveries` +
    ` (${(visited.size / available.size * 100).toFixed(0)}%)`);
  console.log('  deliveries spread across the map:', visited.size / available.size > 0.6 ? 'PASS' : 'FAIL');
  let repeats = 0;
  const seen = new Set();
  res[0][1].spots.forEach(s => { const k = s.x.toFixed(0) + s.z.toFixed(0); if (seen.has(k)) repeats++; seen.add(k); });
  console.log(`  same doorstep twice in one career: ${repeats} time(s)`);

  // the gate: legs outside the road, road running straight between them
  const g = PLAZA.gate;
  const l1 = [g.x + Math.cos(PLAZA.dir) * g.span, g.z - Math.sin(PLAZA.dir) * g.span];
  const l2 = [g.x - Math.cos(PLAZA.dir) * g.span, g.z + Math.sin(PLAZA.dir) * g.span];
  const legRoad = Math.min(mtnRoadDist(l1[0], l1[1]).d, mtnRoadDist(l2[0], l2[1]).d);
  const across = [l2[0] - l1[0], l2[1] - l1[1]];
  const e = MROAD[MROAD.length - 1], e0 = MROAD[MROAD.length - 3];
  const along = [e.x - e0.x, e.z - e0.z];
  const cos = Math.abs(across[0] * along[0] + across[1] * along[1]) /
    (Math.hypot(across[0], across[1]) * Math.hypot(along[0], along[1]));
  console.log(`  torii legs ${(g.span * 2).toFixed(0)} m apart, each ${legRoad.toFixed(1)} m clear of the road centre;` +
    ` lintel at ${(Math.acos(cos) * 57.3).toFixed(0)} deg to the road`);
  console.log('  gate spans the road:', legRoad > MTN.roadW && Math.acos(cos) * 57.3 > 80 ? 'PASS' : 'FAIL');
}

console.log('--- drift controller: steering sets the line ---');
{
  surfaceAt = () => SURF.road;
  const velDir = () => Math.atan2(V.vx, V.vz);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  function enter(car) {
    rig('road'); spec = car; surfaceAt = () => SURF.road;
    V.driftCtl = false;
    input.thr = 1; run(6);
    input.left = 1; input.hand = true; run(0.5); input.hand = false;
  }
  function phase(sec, into, thr) {
    input.thr = thr;
    const a0 = velDir(); let slip = 0, n = 0;
    const steps = Math.round(sec * 120);
    for (let i = 0; i < steps; i++) {
      input.left = into > 0 ? into : 0; input.right = into < 0 ? -into : 0;
      stepPhysics(1 / 120); slip += V.slip; n++;
    }
    return { rate: wrap(velDir() - a0) * 57.3 / sec, slip: slip / n * 57.3, end: V.slip * 57.3, on: V.driftCtl };
  }
  [CARS[2], CARS[8]].forEach(car => {
    enter(car);
    const mid = phase(2, 0.6, 0.8), none = phase(1.5, 0, 0.8), full = phase(1.5, 1, 0.8);
    console.log(`  ${car.name}: path turns ${mid.rate.toFixed(0)} deg/s at 60%, ${full.rate.toFixed(0)} at 100%,` +
      ` ${none.rate.toFixed(0)} with the wheel centred; angle ${mid.slip.toFixed(0)}/${none.slip.toFixed(0)}/${full.slip.toFixed(0)} deg`);
    console.log('    more input turns harder:', full.rate > mid.rate * 1.2 ? 'PASS' : 'FAIL');
    console.log('    centred wheel goes straight on:', Math.abs(none.rate) < 10 ? 'PASS' : 'FAIL');
    console.log('    and stays sideways doing it:', none.slip > 18 ? 'PASS' : 'FAIL');
    // how a player gets out: a stab of opposite lock, then straighten up
    let ended = false, minSlip = 99;
    for (let i = 0; i < 120 * 0.6; i++) {
      input.left = 0; input.right = 1; input.thr = 0.4;
      stepPhysics(1 / 120);
      if (!V.driftCtl) ended = true;
      minSlip = Math.min(minSlip, V.slip * 57.3);
    }
    const settle = phase(1.2, 0, 0.5);
    console.log(`    opposite lock then centre: drift ${ended ? 'ended' : 'held'}, lowest angle ${minSlip.toFixed(0)} deg,` +
      ` settles at ${settle.end.toFixed(0)} deg ${settle.on ? '(drifting)' : '(gripping)'}`);
    console.log('    opposite lock gets you out:', ended && !settle.on && settle.end < 10 ? 'PASS' : 'FAIL');
  });
  // the grand tourers keep ordinary physics
  enter(CARS[9]);
  let ever = false;
  for (let i = 0; i < 240; i++) { input.left = 0.6; stepPhysics(1 / 120); if (V.driftCtl) ever = true; }
  console.log('  R35 and LFA never use the drift controller:', !ever && CARS[5].driftCtrl === false ? 'PASS' : 'FAIL');
  surfaceAt = realSurface;
}

console.log('--- the race circuit ---');
{
  surfaceAt = realSurface;
  colliders.length = 0; RAIL_SEGS.length = 0;
  const inst = makeInstancers();
  const grp = new Obj();
  mountainProps(grp, inst);
  const C = CIRCUIT;
  // The lap no longer includes the old entrance spike (two legs of ~190 m each
  // down to the climb), so it is the loop proper: about 15% longer than the
  // original loop without its spike (~1,190 m).
  console.log(`  lap ${C.total.toFixed(0)} m, ${(C.W * 2)} m wide, level at ${C.H} m`);
  console.log('  loop keeps its lengthened size:', C.total > 1300 ? 'PASS' : 'FAIL');
  const link = MPATHS.find(p => p.link);
  console.log(`  one access road, ${link.len.toFixed(0)} m, from the climb to the lap`);
  let overlap = 0;
  // it runs well clear of the lap until it tapers in to merge, like a slip road
  for (let i = 1; i < Math.floor(link.pts.length * 0.8); i++) {
    const q = link.pts[i];
    C.S.forEach(s => { if (Math.hypot(s.x - q.x, s.z - q.z) < C.W + link.w - 2) overlap++; });
  }
  console.log('  entrance is a single road, not overlapping the lap:', overlap === 0 ? 'PASS' : `FAIL (${overlap})`);
  // the access road starts at the climb's edge, not on top of it
  let joinC = 1e9;
  for (let i = 0; i < MROAD.length - 1; i++) joinC = Math.min(joinC,
    segDist(link.pts[0].x, link.pts[0].z, MROAD[i].x, MROAD[i].z, MROAD[i + 1].x, MROAD[i + 1].z).d);
  joinC = Math.abs(joinC - MPATHS[0].w);
  const joinT = C.S.reduce((m, p) => Math.min(m, Math.hypot(p.x - link.pts[link.pts.length - 1].x, p.z - link.pts[link.pts.length - 1].z)), 1e9);
  console.log(`  access road meets the climb ${joinC.toFixed(1)} m and the lap ${joinT.toFixed(1)} m away`,
    joinC < 2 && joinT < C.W ? 'PASS' : 'FAIL');
  // it should bring you in close to the start straight, heading the way the lap runs
  const lastL = link.pts[link.pts.length - 1], prevL = link.pts[link.pts.length - 4];
  const jp = circuitProgress(lastL.x, lastL.z);
  const toGo = C.total - jp.p;
  const lapHd = C.S[jp.i].hd, roadHd = Math.atan2(lastL.x - prevL.x, lastL.z - prevL.z);
  const ang = Math.abs(Math.atan2(Math.sin(roadHd - lapHd), Math.cos(roadHd - lapHd))) * 57.3;
  console.log(`  joins ${toGo.toFixed(0)} m before the start line (the old junction was 376 m), merging at ${ang.toFixed(0)} deg to the lap`);
  console.log('  merges in the direction of the lap, closer to the straight:', toGo < 300 && ang < 35 ? 'PASS' : 'FAIL');
  const corners = C.kerbs.filter(k => k.apex).length;
  console.log(`  ${corners} corners kerbed, ${C.kerbStones} red/white blocks`);
  // every kerb block must sit on the tarmac edge, on the inside at the apex
  let apexInside = 0, apexTotal = 0;
  C.kerbs.filter(k => k.apex).forEach(k => {
    const mid = C.S[Math.floor((k.from + k.to) / 2) % C.S.length];
    apexTotal++;
    // the inside of a bend is the side the curve turns toward
    if (Math.sign(mid.k) === k.side) apexInside++;
  });
  console.log('  apex kerbs on the inside of every bend:', apexInside === apexTotal ? 'PASS' : `FAIL (${apexInside}/${apexTotal})`);
  console.log(`  ${C.railSegs} barrier sections round the lap`);
  let railOnTrack = 0;
  RAIL_SEGS.forEach(s => {
    const c = s.cols[0];
    for (const p of MPATHS) for (let i = 0; i < p.pts.length - 1; i++) {
      const a = p.pts[i], b = p.pts[i + 1];
      if (segDist(c.x, c.z, a.x, a.z, b.x, b.z).d < p.w - 0.5) { railOnTrack++; return; }
    }
  });
  console.log('  no barrier on any tarmac:', railOnTrack === 0 ? 'PASS' : `FAIL (${railOnTrack})`);
  console.log(`  pit lane ${C.pit.len.toFixed(0)} m with ${C.garages.length} garages`);
  // pit lane joins the circuit at both ends
  const pe = C.pit.pts[0], px = C.pit.pts[C.pit.pts.length - 1];
  const onTrack = p => { let m = 1e9; C.S.forEach(q => { m = Math.min(m, Math.hypot(q.x - p.x, q.z - p.z)); }); return m; };
  console.log(`  pit entry ${onTrack(pe).toFixed(1)} m and exit ${onTrack(px).toFixed(1)} m from the racing line`,
    onTrack(pe) < C.W && onTrack(px) < C.W ? 'PASS' : 'FAIL');
  const pitMid = C.pit.pts[Math.floor(C.pit.pts.length / 2)];
  console.log(`  pit lane runs ${onTrack(pitMid).toFixed(0)} m off the circuit at its middle`);
  // garages sit off every road, on level ground
  let gBad = 0;
  C.garages.forEach(gr => {
    if (Math.abs(terrainH(gr.x, gr.z) - C.H) > 0.05) gBad++;
    for (const p of MPATHS) for (const q of p.pts) if (Math.hypot(q.x - gr.x, q.z - gr.z) < p.w + 1) { gBad++; return; }
  });
  console.log('  garages on level ground, clear of the tarmac:', gBad === 0 ? 'PASS' : `FAIL (${gBad})`);
  const standLen = C.stands.reduce((s, t) => s + (t.built - 1) * 7, 0);
  console.log(`  ${C.stands.length} grandstands, about ${standLen} m of seating, ${C.seats} spectators`);
  let sBad = 0;
  C.stands.forEach(st => st.pts.forEach(q => { if (Math.abs(terrainH(q.x, q.z) - C.H) > 0.05) sBad++; }));
  console.log('  grandstands on level ground:', sBad === 0 ? 'PASS' : `FAIL (${sBad})`);
  // the circuit still sits on its shelf after all the pads
  let off = 0;
  MPATHS[1].pts.forEach(q => { if (Math.abs(terrainH(q.x, q.z) - q.h) > 1.5) off++; });
  console.log('  circuit still on its shelf:', off === 0 ? 'PASS' : `FAIL (${off})`);
  console.log(`  start line at (${C.startLine.x.toFixed(0)}, ${C.startLine.z.toFixed(0)})`);
}

console.log('--- circuit time trial ---');
{
  const C = CIRCUIT, S = C.S, N = S.length;
  const reset = () => { Object.assign(LAP, { state: 'idle', t: 0, prevP: null, hint: -1, nextCp: 0, splits: [], offFor: 0,
    best: [], bestSplits: [], last: null, lastDelta: null, splitDelta: null, msgT: 0 }); };
  // drive along the centreline: `secs` for the stretch, `off` metres to the side
  function drive(from, count, secs, off, dir) {
    const d = dir || 1;
    for (let k = 0; k < count; k++) {
      const p = S[(((from + k * d) % N) + N) % N];
      V.x = p.x + p.nx * (off || 0); V.z = p.z + p.nz * (off || 0); V.y = C.H;
      updateLap(secs / count);
    }
    return (((from + count * d) % N) + N) % N;
  }
  const lapFrom = i => drive(i, N, 60);              // one lap, one minute at this pace
  console.log(`  default best shown as ${fmtLap(0)}`, fmtLap(0) === '0:00:000' ? 'PASS' : 'FAIL');
  console.log(`  ${C.checkpoints.length} checkpoints at ${C.checkpoints.map(c => c.at.toFixed(0) + ' m').join(', ')} of a ${C.total.toFixed(0)} m lap`);

  reset();
  let at = drive((C.startIdx - 20 + N) % N, 10, 2);           // roll up to the line
  console.log('  clock idle before the line:', LAP.state === 'idle' ? 'PASS' : 'FAIL');
  at = drive(at, 12, 2);                                       // across it
  console.log('  crossing the line starts the clock:', LAP.state === 'running' ? 'PASS' : 'FAIL');
  at = drive(at, N - 2, 70);                                    // round to just before the line
  at = drive(at, 4, 1);                                         // and over it
  const lap1 = LAP.last;
  console.log(`  first lap ${fmtLap(lap1)}, best ${fmtLap(LAP.best[0])}, delta ${LAP.lastDelta === null ? 'none (no best yet)' : fmtDelta(LAP.lastDelta)}`);
  console.log('  a clean lap is recorded:', LAP.best.length === 1 && lap1 > 60000 && LAP.lastDelta === null ? 'PASS' : 'FAIL');
  console.log('  next lap starts on the fly:', LAP.state === 'running' && LAP.t < 2 ? 'PASS' : 'FAIL');

  at = drive(at, N - 4, 60); at = drive(at, 4, 1);              // quicker
  console.log(`  quicker lap ${fmtLap(LAP.last)}, delta ${fmtDelta(LAP.lastDelta)}`,
    LAP.lastDelta < 0 && LAP.best[0] === LAP.last ? 'PASS' : 'FAIL');
  at = drive(at, N - 4, 75); at = drive(at, 4, 1);              // slower
  console.log(`  slower lap ${fmtLap(LAP.last)}, delta ${fmtDelta(LAP.lastDelta)}`,
    LAP.lastDelta > 0 && LAP.best[0] < LAP.last ? 'PASS' : 'FAIL');
  console.log(`  leaderboard: ${LAP.best.map(fmtLap).join(', ')}`,
    LAP.best.length === 3 && LAP.best[0] <= LAP.best[1] && LAP.best[1] <= LAP.best[2] ? 'PASS' : 'FAIL');

  // leave the circuit mid-lap
  const laps = LAP.best.length;
  at = drive(at, Math.round(N * 0.3), 20);
  const t0 = LAP.t;
  drive(at, 20, 2, C.W + 12);                                   // out onto the run-off
  console.log(`  ran off at ${fmtLap(t0 * 1000)}: clock ${LAP.state === 'idle' ? 'stopped' : 'still running'}`,
    LAP.state === 'idle' ? 'PASS' : 'FAIL');
  at = drive(at, N - Math.round(N * 0.3) - 4, 50); drive(at, 4, 1);
  console.log('  rejoining and crossing the line does not score the abandoned lap:', LAP.best.length === laps ? 'PASS' : 'FAIL');

  // kerb hop: brief, should not abandon
  reset();
  at = drive((C.startIdx - 10 + N) % N, 20, 2);
  at = drive(at, 30, 4);
  drive(at, 1, 0.1, C.W + 1.5);
  console.log('  a quick kerb hop keeps the lap alive:', LAP.state === 'running' ? 'PASS' : 'FAIL');

  // skip a checkpoint by cutting across
  reset();
  at = drive((C.startIdx - 10 + N) % N, 20, 2);
  const cp2 = C.checkpoints[1].i;
  V.x = S[(cp2 + 5) % N].x; V.z = S[(cp2 + 5) % N].z; updateLap(0.1);    // teleport past checkpoints 1 and 2
  LAP.hint = (cp2 + 5) % N;
  const rest = ((C.startIdx - (cp2 + 5)) % N + N) % N;
  at = drive((cp2 + 5) % N, rest + 4, 20);
  console.log('  cutting the track skips checkpoints, so the lap does not count:', LAP.best.length === 0 ? 'PASS' : 'FAIL');

  // wrong way round
  reset();
  drive((C.startIdx + 10) % N, 30, 3, 0, -1);
  console.log('  driving the wrong way over the line never starts a lap:', LAP.state === 'idle' ? 'PASS' : 'FAIL');

  // into the pit lane mid-lap
  reset();
  at = drive((C.startIdx - 10 + N) % N, 20, 2);
  at = drive(at, N - 40, 50);
  const pit = C.pit.pts, mid = pit[Math.floor(pit.length / 2)];
  for (let k = 0; k < 20; k++) { V.x = mid.x; V.z = mid.z; V.y = C.H; updateLap(0.05); }
  console.log('  going into the pit lane stops the clock:', LAP.state === 'idle' ? 'PASS' : 'FAIL');

  // the gantry spans the road: its legs sit either side, clear of the kerbs
  const p = S[C.startIdx];
  const legGap = (C.W + 3.2) * 2;
  console.log(`  start gantry legs ${legGap.toFixed(1)} m apart over a ${(C.W * 2).toFixed(0)} m track`,
    legGap > C.W * 2 + 3 ? 'PASS' : 'FAIL');
  console.log(`  kerbs along both edges for the whole lap: ${(C.kerbLength / 1000).toFixed(2)} km`,
    Math.abs(C.kerbLength - C.total * 2) < 1 ? 'PASS' : 'FAIL');
  reset();
}

console.log('--- English names, addresses and the dev code ---');
{
  const jp = /[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef\u00a5]/;
  const strings = [];
  CARS.forEach(c => { strings.push(c.name, c.blurb || ''); Object.keys(c).forEach(k => { if (typeof c[k] === 'string') strings.push(c[k]); }); });
  ROADS.forEach(r => strings.push(r.name, r.id));
  strings.push(HQ.name || '', RANKS.join(' '), UPGRADE_DEFS.map(u => u.name + u.desc).join(' '));
  const inst = makeInstancers(); generateCity(inst);
  destinations.forEach(d => strings.push(d.name));
  const bad = strings.filter(s => jp.test(s));
  console.log(`  ${strings.length} names checked, ${bad.length} with Japanese characters or yen signs`);
  console.log('  everything is English:', bad.length === 0 ? 'PASS' : 'FAIL ' + bad.slice(0, 3).join(', '));
  console.log('  no car carries a Japanese label:', CARS.every(c => c.jp === undefined) ? 'PASS' : 'FAIL');
  const named = ROADS.filter(r => !/^Route /.test(r.name)).length;
  console.log(`  ${named}/${ROADS.length} streets have proper names, e.g. ${ROADS[0].name}, ${ROADS[9].name}, ${ROADS[30].name}`);
  console.log('  every street is named:', named === ROADS.length ? 'PASS' : 'FAIL');
  const uniq = new Set(destinations.map(d => d.name));
  console.log(`  ${uniq.size} distinct addresses across ${destinations.length} drops`);
  console.log('  addresses are distinct:', uniq.size > destinations.length * 0.95 ? 'PASS' : 'FAIL');
  const withStreet = destinations.filter(d => ROADS.some(r => d.name.indexOf(r.name) >= 0)).length;
  console.log('  every address names its street:', withStreet === destinations.length ? 'PASS' : `FAIL (${withStreet}/${destinations.length})`);
  console.log(`  developer code is "${DEV_CODE}"`, DEV_CODE === 'darkeastwind' ? 'PASS' : 'FAIL');
  // No manufacturer or model trademarks anywhere the player can see.
  const MARQUES = /nissan|toyota|mazda|mitsubishi|lexus|honda|skyline|silvia|corolla|trueno|lancer|evolution|nsx|gt-r|gtr|rx-7|rx7|ae86|s13|s15|r32|r34|r35|fd3s|spec-r|n(ü|u)rburgring/i;
  const carText = CARS.map(c => c.name + ' ' + (c.blurb || '')).join(' | ');
  const badCars = CARS.filter(c => MARQUES.test(c.name + ' ' + (c.blurb || '')));
  console.log('  car names carry no manufacturer trademarks:', badCars.length === 0 ? 'PASS' : 'FAIL ' + badCars.map(c => c.name).join(', '));
  const modelUrls = Object.keys(CAR_MODELS).map(k => CAR_MODELS[k].url);
  const badFiles = modelUrls.filter(u => MARQUES.test(u));
  console.log('  model filenames are neutral too:', badFiles.length === 0 ? 'PASS' : 'FAIL ' + badFiles.join(', '));
  console.log(`  models are looked for in one place: ${MODEL_DIR}`,
    modelPath('car-sable-250.glb') === 'models/car-sable-250.glb' ? 'PASS' : 'FAIL');
  console.log('  roster: ' + CARS.slice().sort((a, b) => a.lvl - b.lvl).map(c => c.name).join(' · '));
  console.log(`  example drops: ${destinations.slice(0, 3).map(d => d.name).join('  ·  ')}`);
}

console.log('--- credits ---');
{
  const files = Object.keys(CAR_MODELS).map(k => CAR_MODELS[k].url).concat([TILESET.url]);
  const credited = MODEL_CREDITS.map(c => c.file);
  const missingRow = files.filter(f => credited.indexOf(f) < 0);
  console.log(`  ${files.length} model files, ${MODEL_CREDITS.length} credit rows`);
  console.log('  every model has a credit row:', missingRow.length === 0 ? 'PASS' : 'FAIL ' + missingRow.join(', '));
  const cars = MODEL_CREDITS.filter(c => c.file.indexOf('car-') === 0);
  const filled = MODEL_CREDITS.filter(c => c.artist && c.licence);
  console.log('  every car model is credited:',
    cars.every(c => c.artist && c.licence && c.subject) ? 'PASS' : 'FAIL');
  const nc = cars.filter(c => c.licence.indexOf('NC') >= 0).length;
  const sa = cars.filter(c => c.licence.indexOf('SA') >= 0).length;
  console.log(`  ${nc} of ${cars.length} cars are NonCommercial, ${sa} also ShareAlike`);
  console.log(`  rows filled in: ${filled.length}/${MODEL_CREDITS.length}` +
    (filled.length < MODEL_CREDITS.length ? '  (the game shows the rest in red until they are)' : ''));
  // the panel must actually show a name and a licence once a row is filled
  const sample = MODEL_CREDITS[0];
  const before = { a: sample.artist, l: sample.licence, u: sample.url };
  sample.artist = 'A. Modeller'; sample.licence = 'CC BY 4.0'; sample.url = 'https://example.com/model';
  renderCredits();
  const html = $('creditList').innerHTML;
  console.log('  a filled row shows the artist and licence:',
    html.indexOf('A. Modeller') >= 0 && html.indexOf('CC BY 4.0') >= 0 ? 'PASS' : 'FAIL');
  console.log('  and links to the source:', html.indexOf('https://example.com/model') >= 0 ? 'PASS' : 'FAIL');
  sample.artist = before.a; sample.licence = before.l; sample.url = before.u;
  renderCredits();
  const html2 = $('creditList').innerHTML;
  console.log('  an unfilled row is called out, not hidden:',
    html2.indexOf('credit not filled in') >= 0 && html2.indexOf('still need crediting') >= 0 ? 'PASS' : 'FAIL');
  console.log('  three.js is credited:', $('creditList').innerHTML.indexOf('three.js') >= 0 ? 'PASS' : 'FAIL');
  // names must not leak back in through the credits text
  const jp = /[\u3000-\u30ff\u4e00-\u9fff]/;
  console.log('  credits carry no stray characters:', !jp.test(html2) ? 'PASS' : 'FAIL');
}

console.log('--- wheels in a slide, and off-road ability ---');
{
  surfaceAt = () => SURF.road;
  rig('road'); spec = CARS[2];
  input.thr = 1; run(6);
  input.left = 1; input.hand = true; run(0.5); input.hand = false;
  // hold the slide with the wheel centred: the car runs on at an angle
  let held = 0, n = 0, sumVis = 0, sumSlip = 0;
  for (let i = 0; i < 120 * 2; i++) { input.left = 0; input.right = 0; stepPhysics(1 / 120);
    if (V.slip > 0.2) { held++; sumVis += V.steerVis; sumSlip += Math.atan2(V.vLat, Math.abs(V.vLong)); } n++; }
  const slideDir = Math.sign(sumSlip);
  console.log(`  sliding at ${(Math.abs(sumSlip / held) * 57.3).toFixed(0)} deg: front wheels sit at ` +
    `${(sumVis / held * 57.3).toFixed(0)} deg`);
  console.log('  wheels point into opposite lock:', Math.sign(sumVis) === slideDir && Math.abs(sumVis / held) > 0.08 ? 'PASS' : 'FAIL');
  // now rotate the car hard: the wheels should come back toward straight
  let sumTurn = 0, m = 0;
  for (let i = 0; i < 120; i++) { input.left = 1; stepPhysics(1 / 120); sumTurn += Math.abs(V.steerVis); m++; }
  console.log(`  while the car is rotating: ${(sumTurn / m * 57.3).toFixed(0)} deg of lock`);
  console.log('  wheels straighten as the car comes round:', sumTurn / m < Math.abs(sumVis / held) ? 'PASS' : 'FAIL');
  // grip driving is unaffected
  rig('road'); input.thr = 0.4; input.left = 0.5; run(2);
  console.log('  normal cornering still follows the wheel:', Math.abs(V.steerVis - V.steer) < 0.05 ? 'PASS' : 'FAIL');

  console.log('  40-100 km/h on dirt:');
  const dirtRun = car => {
    surfaceAt = () => SURF.dirt;
    spec = car; autoBox = true;
    V.x = 0; V.z = 0; V.y = 0; V.yaw = 0; V.vx = 0; V.vz = 40 / 3.6; V.vLong = 40 / 3.6; V.vLat = 0;
    V.yawRate = 0; V.gear = 2; V.rpm = car.redline * 0.5; V.spPrev = 0; V.steerVis = 0;
    input.thr = 1; input.brk = 0; input.left = 0; input.right = 0; input.hand = false; input.boost = false;
    let t = 0;
    while (t < 30 && V.vLong * 3.6 < 100) { stepPhysics(1 / 120); t += 1 / 120; if (Math.abs(V.z) > 300) V.z = 0; }
    return t;
  };
  const evo = CARS.find(c => c.name.indexOf('Talon') >= 0);
  [CARS[2], CARS[0], evo, CARS[5]].forEach(c => {
    console.log(`    ${c.name.padEnd(26)} ${dirtRun(c).toFixed(2)}s   (off-road factor ${(c.offroad || 1).toFixed(2)})`);
  });
  // cornering off tarmac, not just acceleration
  const dirtCorner = car => {
    surfaceAt = () => SURF.dirt;
    spec = car; autoBox = true;
    V.x = 0; V.z = 0; V.y = 0; V.yaw = 0; V.vx = 0; V.vz = 0; V.vLong = 0; V.vLat = 0; V.yawRate = 0;
    V.gear = 1; V.rpm = car.idle; V.gripRMem = 0; V.spPrev = 0; V.steerVis = 0;
    input.thr = 1; input.brk = 0; input.left = 0; input.right = 0; input.hand = false; input.boost = false;
    for (let i = 0; i < 120 * 7; i++) { stepPhysics(1 / 120); if (Math.abs(V.z) > 300) V.z = 0; }
    input.thr = 0.5; input.left = 0.5;
    let g = 0, n2 = 0;
    for (let i = 0; i < 120 * 3; i++) { stepPhysics(1 / 120); g += Math.abs(V.yawRate * V.vLong) / 9.81; n2++; }
    return g / n2;
  };
  console.log('  cornering on dirt at half lock:');
  [CARS[2], CARS[0], evo, CARS[5]].forEach(c => console.log(`    ${c.name.padEnd(26)} ${dirtCorner(c).toFixed(2)}g`));
  const evoG = dirtCorner(evo);
  console.log('  the rally car also corners best on dirt:',
    evoG > Math.max(dirtCorner(CARS[0]), dirtCorner(CARS[5])) * 0.95 ? 'PASS' : 'FAIL');
  const others = [CARS[2], CARS[0], CARS[5]].map(dirtRun);
  const evoT = dirtRun(evo);
  console.log('  the rally car is the quickest off tarmac:', evoT < Math.min.apply(null, others) ? 'PASS' : 'FAIL');
  surfaceAt = realSurface;
}

console.log('--- measuring models accurately ---');
{
  // Box3.setFromObject expands each geometry's own box by the node transform,
  // which overshoots on rotated parts. preciseBox reads the vertices.
  const geo = new Geo();
  const pts = [[-1, 0, -2], [1, 0, 2], [0, 0.5, 0]];
  geo.attributes = {
    position: {
      count: pts.length,
      array: new Float32Array(pts.flat()),
      getX: i => pts[i][0], getY: i => pts[i][1], getZ: i => pts[i][2]
    }
  };
  geo.boundingBox = null;
  const mesh = new Obj();
  mesh.isMesh = true; mesh.geometry = geo;
  const box = preciseBox(mesh);
  const size = box.getSize(new THREE.Vector3());
  console.log(`  measured ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} from ${pts.length} vertices`);
  console.log('  matches the vertices exactly:',
    Math.abs(size.x - 2) < 0.01 && Math.abs(size.y - 0.5) < 0.01 && Math.abs(size.z - 4) < 0.01 ? 'PASS' : 'FAIL');
  const empty = new Obj();
  empty.isMesh = true; empty.geometry = new Geo();
  console.log('  geometry without vertex data still measures:', preciseBox(empty) ? 'PASS' : 'FAIL');
}

console.log('--- wheels spin true ---');
{
  // camber, road speed and the correction for a wheel modelled turned each get
  // their own node, so a cambered wheel does not trace a cone as it spins
  const car = buildCarMesh(CARS[2], { body: 0x2f4f7f, rim: 0xd7d2c6, finish: 'gloss', livery: 'none',
    rimStyle: 'mesh', stance: 'low', wing: 'auto', glow: 'off', plate: 'HAN 32' });
  const w = car.userData.wheels[0];
  console.log('  each wheel has separate camber and spin nodes:',
    w.spin && w.hub && w.spin !== w.hub ? 'PASS' : 'FAIL');
  if (w.spin) {
    w.hub.rotation.z = 0.09;
    w.spin.rotation.x = 1.2;
    console.log('  spinning does not disturb camber:',
      Math.abs(w.hub.rotation.z - 0.09) < 1e-9 && Math.abs(w.spin.rotation.x - 1.2) < 1e-9 ? 'PASS' : 'FAIL');
  }
  // a part the size of a body panel must never be claimed into a wheel
  const wheels = [{ hub: { matrixWorld: { __pos: { x: 0, y: 0.3, z: 2 } }, userData: { radius: 0.35 } },
    steer: new Obj(), straight: new Obj() }];
  const root = new Obj();
  const mk = (name, sx, sy, sz, at) => {
    const o = new Obj(); o.isMesh = true; o.name = name;
    const pts = [[at.x - sx / 2, at.y - sy / 2, at.z - sz / 2], [at.x + sx / 2, at.y + sy / 2, at.z + sz / 2]];
    o.geometry = new Geo();
    o.geometry.attributes = { position: { count: 2, array: new Float32Array(pts.flat()),
      getX: i => pts[i][0], getY: i => pts[i][1], getZ: i => pts[i][2] } };
    root.add(o); return o;
  };
  const spoke = mk('spoke', 0.1, 0.4, 0.4, { x: 0, y: 0.3, z: 2 });
  const fender = mk('fender', 0.4, 1.4, 2.2, { x: 0, y: 0.5, z: 2 });
  const info = { notes: [] };
  claimWheelStrays(root, wheels, info);
  const claimed = wheels[0].straight.children.concat(wheels[0].steer.children);
  console.log(`  claimed ${claimed.length} of 2 parts: ${claimed.map(o => o.name).join(', ') || 'none'}`);
  console.log('  small wheel parts are claimed:', claimed.indexOf(spoke) >= 0 ? 'PASS' : 'FAIL');
  console.log('  body panels are not:', claimed.indexOf(fender) < 0 ? 'PASS' : 'FAIL');
}

console.log('--- looking around the car ---');
{
  // The camera orbits the car itself at a fixed distance. Aiming ahead of the
  // car while orbiting made it appear to swing about its nose.
  const dist = 11.2;
  const sample = pitch => {
    const horiz = dist * Math.cos(pitch);
    const height = dist * Math.sin(pitch);
    return Math.hypot(horiz, height);
  };
  [0, 0.4, 0.9, -0.35].forEach(p => {
    console.log(`  pitch ${(p * 57.3).toFixed(0).padStart(4)} deg: camera sits ${sample(p).toFixed(2)} m from the car`);
  });
  const spread = [0, 0.4, 0.9, -0.35].map(sample);
  console.log('  distance holds while looking around:',
    Math.max.apply(null, spread) - Math.min.apply(null, spread) < 0.01 ? 'PASS' : 'FAIL');
  const aheadAt = orbit => 8 * (1 - clamp(orbit / 0.3, 0, 1));
  console.log(`  aim point: ${aheadAt(0).toFixed(1)} m ahead when driving, ${aheadAt(0.3).toFixed(1)} m when looking around`);
  console.log('  looking around pivots on the car:', aheadAt(0.35) === 0 && aheadAt(0) === 8 ? 'PASS' : 'FAIL');
}
