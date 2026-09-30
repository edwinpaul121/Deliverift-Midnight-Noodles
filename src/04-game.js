/* ============================================================
   Part 4: the job, progression, interface, loop
   ============================================================ */

// Calibrated so a clean career, drifting nothing, is 50 deliveries ending at the summit.
const LEVELS = [0, 290, 720, 1370, 2280, 3500, 5100, 7150, 9740, 12930];
const RANKS = ['Runner', 'Runner', 'Regular', 'Night shift', 'Night shift', 'Trusted hand',
  'Trusted hand', 'Kitchen partner', 'Kitchen partner', 'The Copper Kettle legend'];

const S = {
  cash: 0, xp: 0, level: 1, carId: STARTER, unlocked: [STARTER],
  running: false, paused: false, job: null, dev: false, summitReady: false, summitDone: false,
  driftPts: 0, driftChain: 0, driftMult: 1, driftBank: 0, lastDrift: 0,
  deliveries: 0, best: 0, shadows: true
};
const CUSTOM = {};   // per car id
function customFor(id) {
  if (!CUSTOM[id]) CUSTOM[id] = {
    body: CARS[id].col, rim: RIMS[0], finish: 'gloss', livery: 'none',
    rimStyle: 'mesh', stance: 'stock', wing: 'auto', glow: 'off', plate: 'HAN 32'
  };
  return CUSTOM[id];
}

let carObj = null, marker = null, hqMarker = null, clouds = null, guideArrow = null;
const roadArt = [], tileArt = [];

/* Physics runs at a fixed 120 Hz and the render interpolates between the last
   two states, so motion stays smooth at any refresh rate. */
const VIEW = { x: 0, y: 0, z: 0, yaw: 0 };
const VPREV = { x: 0, y: 0, z: 0, yaw: 0 };
function snapView() { VIEW.x = V.x; VIEW.y = V.y; VIEW.z = V.z; VIEW.yaw = V.yaw; }
function wrapAngle(a) { return ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; }
const $ = id => document.getElementById(id);

/* ---------- job generation ---------- */
function distFromCar(d) { return Math.hypot(d.x - V.x, d.z - V.z); }

/* Where drops went recently, so new ones can be sent somewhere else. */
const RECENT_DROPS = [];

/* The summit viewpoint as a destination: the last delivery of the game. */
function summitDest() {
  return { x: PLAZA.x, z: PLAZA.z, name: 'the viewpoint at the top of Fox Mountain', type: 'summit' };
}

function makeJob() {
  // The final delivery of a career always goes to the top of the mountain.
  if (S.summitReady) {
    const d = summitDest();
    const total = Math.hypot(d.x - HQ.x, d.z - HQ.z) + MTN.roadLen;
    const fare = Math.round((900 + total * 2.4) * (1 + S.level * 0.07) * TUNE.game.fare / 10) * 10;
    const limit = (total / 15 + 60) * TUNE.game.timeAllowance;
    return { stops: [d], idx: 0, total: total, limit: limit, time: limit,
      fare: fare, fresh: 1, intact: 1, driftAtStart: S.driftPts, hold: 0, summit: true };
  }

  const stops = S.level >= 8 ? 3 : (S.level >= 4 ? 2 : 1);
  const picked = [];
  let originX = HQ.x, originZ = HQ.z;
  const wantFar = 120 + S.level * 34;
  for (let i = 0; i < stops; i++) {
    let best = null, bestScore = 1e9;
    for (let k = 0; k < 140; k++) {
      const c = destinations[Math.floor(Math.random() * destinations.length)];
      if (!c || picked.indexOf(c) >= 0) continue;
      const d = Math.hypot(c.x - originX, c.z - originZ);
      /* Prefer somewhere the player has not been lately. Scoring purely on
         distance from the shop kept sending runs to the same ring of streets;
         rewarding distance from recent drops spreads them over the whole map. */
      let fresh = 400;
      for (const r of RECENT_DROPS) fresh = Math.min(fresh, Math.hypot(c.x - r.x, c.z - r.z));
      for (const p of picked) fresh = Math.min(fresh, Math.hypot(c.x - p.x, c.z - p.z));
      const score = Math.abs(d - wantFar) * 0.6 - fresh * 0.45 + Math.random() * 30;
      if (score < bestScore) { bestScore = score; best = c; }
    }
    if (!best) break;
    picked.push(best);
    originX = best.x; originZ = best.z;
  }
  picked.forEach(p => { RECENT_DROPS.push({ x: p.x, z: p.z }); });
  while (RECENT_DROPS.length > 14) RECENT_DROPS.shift();

  let total = Math.hypot(picked[0].x - HQ.x, picked[0].z - HQ.z);
  for (let i = 1; i < picked.length; i++) total += Math.hypot(picked[i].x - picked[i - 1].x, picked[i].z - picked[i - 1].z);

  const fare = Math.round((260 + total * 2.4 + picked.length * 180) * (1 + S.level * 0.07) * TUNE.game.fare / 10) * 10;
  return {
    stops: picked, idx: 0, total,
    limit: (total / 17 + 22 + picked.length * 12) * TUNE.game.timeAllowance,
    time: (total / 17 + 22 + picked.length * 12) * TUNE.game.timeAllowance,
    fare, fresh: 1, intact: 1, driftAtStart: S.driftPts, hold: 0
  };
}

function startJob() {
  S.job = makeJob();
  if (carObj && carObj.userData.tray) carObj.userData.tray.visible = true;
  updateMarker();
  toast('Tray loaded — ' + S.job.stops[0].name, 'good');
  sfx.chime();
  refreshJobCard();
}

function updateMarker() {
  if (!S.job || S.job.idx >= S.job.stops.length) { marker.visible = false; return; }
  const d = S.job.stops[S.job.idx];
  marker.position.set(d.x, terrainH(d.x, d.z), d.z);
  marker.visible = true;
}

function onImpact(force, soft) {
  CAM.shake = clamp(force / 42, 0.03, 0.5) * TUNE.camera.shake;
  breakChain();
  if (S.job && !soft) {
    S.job.intact = clamp(S.job.intact - force / 140, 0, 1);
    if (S.job.intact < 0.3) toast('The tray is taking a beating', 'bad');
  }
}
function breakChain() {
  if (S.driftChain > 1.2 && S.driftBank > 60) {
    S.driftPts += Math.round(S.driftBank);
  }
  S.driftBank = 0; S.driftChain = 0; S.driftMult = 1;
}
function bankChain() {
  if (S.driftBank > 0) { S.driftPts += Math.round(S.driftBank * S.driftMult); S.driftBank = 0; }
  S.driftChain = 0; S.driftMult = 1;
}

function updateJob(dt) {
  const job = S.job;
  if (!job) {
    // near HQ? offer a pickup
    const d = Math.hypot(V.x - HQ.x, V.z - (HQ.z - 13));
    const sp = Math.hypot(V.vx, V.vz);
    if (d < 22 && sp < 7) {
      showPrompt('<kbd>F</kbd> pick up a tray &nbsp;·&nbsp; <kbd>G</kbd> garage');
      if (keyPressed('KeyF')) startJob();
    } else hidePrompt();
    return;
  }

  job.time -= dt;
  job.fresh = clamp(job.time / job.limit, 0, 1);
  // sloshing: hard cornering cools nothing but shakes the tray
  if (V.slip > 0.5 && Math.hypot(V.vx, V.vz) > 16) job.intact = clamp(job.intact - dt * 0.012, 0, 1);

  const dest = job.stops[job.idx];
  const d = Math.hypot(V.x - dest.x, V.z - dest.z);
  const sp = Math.hypot(V.vx, V.vz);
  if (d < 9) {
    if (sp < 4.5) {
      job.hold += dt;
      showPrompt('Handing it over… ' + Math.max(0, (0.8 - job.hold)).toFixed(1) + 's');
      if (job.hold > 0.8) deliverStop();
    } else {
      job.hold = 0;
      showPrompt('Slow down at <b>' + dest.name + '</b>');
    }
  } else { job.hold = 0; hidePrompt(); }

  if (job.time < -25) failJob();
  cardTick += dt;
  if (cardTick > 0.1) { cardTick = 0; refreshJobCard(); }
}

function deliverStop() {
  const job = S.job;
  job.idx++;
  bankChain();
  S.deliveries++;
  if (job.idx >= job.stops.length) finishJob();
  else {
    sfx.chime();
    toast('Delivered. Next: ' + job.stops[job.idx].name, 'good');
    job.time += job.limit * 0.42;   // fresh tray for the next stop

    updateMarker();
  }
}

function finishJob() {
  const job = S.job;
  const fresh = clamp(job.time / job.limit, 0, 1);
  const freshPay = Math.round(job.fare * (0.45 + 0.55 * clamp(fresh + 0.25, 0, 1)));
  const intactPen = Math.round(job.fare * (1 - job.intact) * 0.5);
  const driftEarned = Math.max(0, S.driftPts - job.driftAtStart);
  const driftPay = Math.round(driftEarned * TUNE.game.driftCash);
  const total = Math.max(80, freshPay - intactPen + driftPay);

  S.cash += total;
  const xp = Math.round(total / 6 + driftEarned * TUNE.game.driftXp);
  S.xp += xp;
  if (job.summit) {
    S.summitDone = true;
    S.summitReady = false;
  }
  if (driftEarned > S.best) S.best = driftEarned;

  marker.visible = false;
  if (carObj && carObj.userData.tray) carObj.userData.tray.visible = false;
  S.job = null;
  hidePrompt();

  $('results').innerHTML =
    row('Fare', '$' + freshPay) +
    row('Broth still hot', Math.round(fresh * 100) + '%') +
    (intactPen ? row('Spillage', '−$' + intactPen) : '') +
    row('Drift bonus', '$' + driftPay + ' <small>(' + Math.round(driftEarned) + ' pts)</small>') +
    '<div class="tot"><span>Paid</span><span>$' + total.toLocaleString() + '</span></div>';
  $('rSub').textContent = fresh > 0.6 ? 'Steaming. They tipped.' :
    (fresh > 0.2 ? 'Warm enough. Nobody complained.' : 'Lukewarm. You got a look.');
  openOverlay('results-ov');
  sfx.fanfare();
  checkLevel();
  refreshWallet();
}

function failJob() {
  const pay = Math.round(S.job.fare * 0.12);
  S.cash += pay;
  marker.visible = false;
  if (carObj && carObj.userData.tray) carObj.userData.tray.visible = false;
  S.job = null;
  toast('Stone cold — they refused it. $' + pay + ' for the trip.', 'bad');
  refreshWallet(); refreshJobCard();
}

let cardTick = 0;
const row = (a, b) => '<div><span>' + a + '</span><span>' + b + '</span></div>';

function checkLevel() {
  /* The last level is not earned on points alone: once there is enough XP for
     it, the next run from the shop is the delivery to the top of the mountain,
     and completing that is what finishes the career. */
  if (S.level === 9 && S.xp >= LEVELS[9] && !S.summitDone && !S.summitReady) {
    S.summitReady = true;
    toast('One last delivery — up to the viewpoint on Fox Mountain', 'good');
    sfx.chime();
  }
  while (S.level < 10 && S.xp >= LEVELS[S.level] && !(S.level === 9 && !S.summitDone)) {
    S.level++;
    const car = carForLevel(S.level);
    if (car && S.unlocked.indexOf(car.id) < 0) S.unlocked.push(car.id);
    $('luLevel').textContent = S.level;
    $('luTitle').textContent = RANKS[S.level - 1];
    $('luSub').textContent = 'Level ' + S.level + ' · ' + (S.level < 10 ? 'the old man nods at the lock-up' : 'the keys to everything');
    $('luCar').textContent = car ? car.name : '';
    $('luBlurb').textContent = car ? car.blurb : '';
    setTimeout(() => openOverlay('levelup'), 260);
  }
  refreshWallet();
}

/* ---------- HUD ---------- */
function refreshWallet() {
  $('cash').textContent = '$' + S.cash.toLocaleString();
  $('lvl').textContent = RANKS[S.level - 1] + ' · level ' + S.level;
  const prev = LEVELS[S.level - 1] || 0, next = LEVELS[S.level] || LEVELS[9];
  const pct = S.level >= 10 ? 100 : clamp((S.xp - prev) / (next - prev), 0, 1) * 100;
  $('xpbar').firstElementChild.style.width = pct + '%';
}
function refreshJobCard() {
  const job = S.job;
  if (!job) {
    $('jobTitle').textContent = 'No run loaded';
    $('jobDest').textContent = 'Head back to The Copper Kettle and pick up a tray.';
    $('jobDist').textContent = '—'; $('jobFare').textContent = '—'; $('jobStops').textContent = '—';
    setBar('freshBar', 1); setBar('intactBar', 1);
    $('freshPct').textContent = '—'; $('intactPct').textContent = '—';
    return;
  }
  const dest = job.stops[job.idx];
  $('jobTitle').textContent = 'Delivering to';
  $('jobDest').textContent = dest.name;
  $('jobDist').textContent = Math.round(distFromCar(dest)) + ' m';
  $('jobFare').textContent = '$' + job.fare;
  $('jobStops').textContent = (job.idx + 1) + '/' + job.stops.length;
  setBar('freshBar', job.fresh); setBar('intactBar', job.intact);
  $('freshPct').textContent = Math.round(job.fresh * 100) + '%';
  $('intactPct').textContent = Math.round(job.intact * 100) + '%';
}
function setBar(id, v) {
  const el = $(id);
  el.firstElementChild.style.width = clamp(v, 0, 1) * 100 + '%';
  el.className = 'bar' + (v < 0.25 ? ' cold' : (v < 0.6 ? ' warm' : ''));
}
let toastTimer = [];
function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.innerHTML = msg;
  $('toast').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = 0;
    setTimeout(() => el.remove(), 420); }, 2600);
}
function showPrompt(html) { const p = $('prompt'); p.innerHTML = html; p.style.display = 'block'; }
function hidePrompt() { $('prompt').style.display = 'none'; }

/* tachometer arc */
const R_T = 44, CX = 60, CY = 60, A0 = Math.PI * 0.78, A1 = Math.PI * 2.22;
function arcPath(t0, t1) {
  const a0 = lerp(A0, A1, t0), a1 = lerp(A0, A1, t1);
  const x0 = CX + Math.cos(a0) * R_T, y0 = CY + Math.sin(a0) * R_T;
  const x1 = CX + Math.cos(a1) * R_T, y1 = CY + Math.sin(a1) * R_T;
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  return 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A' + R_T + ' ' + R_T + ' 0 ' + large + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2);
}
function refreshNitro() {
  const el = $('nitro');
  const on = S.running && upgradeLevel(S.carId, 'nitro') > 0;
  el.classList.toggle('on', on);
  if (!on) return;
  $('nitroFill').style.width = (V.nitro * 100).toFixed(0) + '%';
  el.classList.toggle('empty', V.nitro < 0.05);
}
function refreshDash() {
  const kmh = Math.abs(V.vLong) * 3.6;
  $('speed').innerHTML = Math.round(kmh) + '<span>km/h</span>';
  const g = $('gear');
  g.textContent = V.gear === 0 ? 'N' : (V.gear < 0 ? 'R' : V.gear);
  g.className = V.rpm > spec.redline * 0.94 ? 'warn' : '';
  const t = clamp(V.rpm / (spec.redline * 1.08), 0, 1);
  $('tachFill').setAttribute('d', arcPath(0, Math.max(0.002, t)));
  $('tachTxt').textContent = Math.round(V.rpm) + ' rpm';
}

/* drift readout */
function updateDrift(dt) {
  const sp = Math.hypot(V.vx, V.vz);
  const drifting = V.slip > 0.19 && sp > 7.5 && !V.airborne;
  if (drifting) {
    S.driftChain += dt;
    S.driftMult = clamp(1 + S.driftChain * 0.42, 1, 5);
    S.driftBank += V.slip * sp * dt * TUNE.game.driftScore;
    if (upgradeLevel(S.carId, 'nitro') > 0) {
      V.nitro = clamp(V.nitro + V.slip * sp * dt * TUNE.nitro.driftGain, 0, 1);
    }
    S.lastDrift = 0;
  } else {
    S.lastDrift += dt;
    if (S.lastDrift > 0.85 && S.driftBank > 0) bankChain();
  }
  const el = $('drift');
  const show = drifting || S.driftBank > 0;
  el.classList.toggle('on', show);
  if (show) {
    $('driftPts').textContent = Math.round(S.driftBank * S.driftMult);
    const names = ['Slide', 'Flick', 'Chain', 'Committed', 'Masterclass'];
    $('driftMult').textContent = names[clamp(Math.floor(S.driftMult) - 1, 0, 4)] + ' ×' + S.driftMult.toFixed(1);
  }
}

/* off-screen destination arrow */
const _v = new THREE.Vector3();
function updateCompass() {
  const arrow = $('arrow'), holder = $('compass');
  if (!S.job) { arrow.style.opacity = 0; return; }
  const d = S.job.stops[S.job.idx];
  _v.set(d.x, terrainH(d.x, d.z) + 6, d.z).project(camera);
  const inFront = _v.z < 1;
  const sx = _v.x * innerWidth / 2, sy = -_v.y * innerHeight / 2;
  const onScreen = inFront && Math.abs(sx) < innerWidth / 2 - 60 && Math.abs(sy) < innerHeight / 2 - 60;
  if (onScreen) { arrow.style.opacity = 0; return; }
  arrow.style.opacity = 0.95;
  let ang = Math.atan2(inFront ? sy : -sy, inFront ? sx : -sx);
  const radius = Math.min(innerWidth, innerHeight) * 0.31;
  holder.style.transform = 'translate(' + (Math.cos(ang) * radius).toFixed(1) + 'px,' +
    (Math.sin(ang) * radius).toFixed(1) + 'px)';
  arrow.style.transform = 'rotate(' + (ang * 180 / Math.PI + 90) + 'deg)';
}

/* ---------- circuit time trial ----------
   Crossing the start line starts the clock; all checkpoints must be passed in
   order; leaving the circuit voids the lap. Best times persist in localStorage. */
const LAP = {
  state: 'idle', t: 0, prevP: null, hint: -1, nextCp: 0, splits: [], offFor: 0,
  best: [], bestSplits: [], last: null, lastDelta: null, splitDelta: null, msg: '', msgT: 0
};
const LAP_KEY = 'yubin-noodles-laps';
const LAP_OFF_TOLERANCE = 2.6;   // metres past the kerb before you are off the circuit

function fmtLap(ms) {
  if (!ms || ms < 0) return '0:00:000';
  const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000), r = Math.floor(ms % 1000);
  return m + ':' + String(s).padStart(2, '0') + ':' + String(r).padStart(3, '0');
}
function fmtDelta(ms) {
  if (ms === null || ms === undefined) return '';
  return (ms > 0 ? '+' : ms < 0 ? '−' : '±') + (Math.abs(ms) / 1000).toFixed(3);
}
function loadLaps() {
  try {
    const raw = localStorage.getItem(LAP_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (Array.isArray(d.best)) LAP.best = d.best.filter(v => typeof v === 'number' && v > 0).slice(0, 5);
    if (Array.isArray(d.bestSplits)) LAP.bestSplits = d.bestSplits;
  } catch (e) { /* storage unavailable: laps just last the session */ }
}
function saveLaps() {
  try { localStorage.setItem(LAP_KEY, JSON.stringify({ best: LAP.best, bestSplits: LAP.bestSplits })); } catch (e) { }
}
function lapNote(text, kind) { LAP.msg = text; LAP.msgKind = kind || ''; LAP.msgT = 3.5; }

function abandonLap(why) {
  if (LAP.state !== 'running') return;
  LAP.state = 'idle';
  LAP.t = 0;
  LAP.splitDelta = null;
  lapNote(why, 'bad');
  sfx.error && sfx.error();
}

function completeLap() {
  const ms = Math.round(LAP.t * 1000);
  const prevBest = LAP.best.length ? LAP.best[0] : null;
  LAP.last = ms;
  LAP.lastDelta = prevBest ? ms - prevBest : null;
  LAP.best.push(ms);
  LAP.best.sort((a, b) => a - b);
  LAP.best = LAP.best.slice(0, 5);
  const isBest = !prevBest || ms < prevBest;
  if (isBest) LAP.bestSplits = LAP.splits.slice();
  saveLaps();
  lapNote(isBest ? 'New best lap — ' + fmtLap(ms) : 'Lap ' + fmtLap(ms) + '  ' + fmtDelta(LAP.lastDelta), isBest ? 'good' : '');
  sfx.chime && sfx.chime();
}

function updateLap(dt) {
  if (!CIRCUIT) return;
  const C = CIRCUIT;
  if (LAP.msgT > 0) LAP.msgT -= dt;
  const level = Math.abs(V.y - C.H) < 3.5;
  const pr = circuitProgress(V.x, V.z, LAP.hint);
  LAP.hint = pr.i;
  const onTrack = level && pr.d < C.W + LAP_OFF_TOLERANCE;
  LAP.near = level && platDist(V.x, V.z) < 30;
  if (LAP.prevP === null) { LAP.prevP = pr.p; return; }
  const prev = LAP.prevP, p = pr.p, total = C.total;
  LAP.prevP = p;
  // a jump of more than half a lap in one frame means the line was crossed
  const crossedFwd = onTrack && prev - p > total * 0.5;
  const crossedBack = onTrack && p - prev > total * 0.5;

  if (LAP.state === 'running') {
    LAP.t += dt;
    // brief kerb-hops are fine; properly leaving the circuit is not
    LAP.offFor = onTrack ? 0 : LAP.offFor + dt;
    if (LAP.offFor > 0.25) { abandonLap('Left the circuit — lap not counted'); return; }
    if (crossedBack) { abandonLap('Wrong way over the line — lap not counted'); return; }
    // checkpoints, strictly in order
    const cp = C.checkpoints[LAP.nextCp];
    if (cp && !crossedFwd && prev < cp.at && p >= cp.at && p - prev < total * 0.5) {
      LAP.splits[LAP.nextCp] = LAP.t * 1000;
      const ref = LAP.bestSplits[LAP.nextCp];
      LAP.splitDelta = ref ? LAP.t * 1000 - ref : null;
      LAP.nextCp++;
      lapNote('Checkpoint ' + LAP.nextCp + '/' + C.checkpoints.length +
        (LAP.splitDelta !== null ? '  ' + fmtDelta(LAP.splitDelta) : ''), LAP.splitDelta !== null && LAP.splitDelta < 0 ? 'good' : '');
      sfx.tick && sfx.tick();
    }
    if (crossedFwd) {
      if (LAP.nextCp >= C.checkpoints.length) completeLap();
      else lapNote('Missed a checkpoint — lap not counted', 'bad');
      // flying start into the next lap
      LAP.t = 0; LAP.nextCp = 0; LAP.splits = []; LAP.splitDelta = null;
    }
  } else if (crossedFwd) {
    LAP.state = 'running';
    LAP.t = 0; LAP.nextCp = 0; LAP.splits = []; LAP.offFor = 0; LAP.splitDelta = null;
    lapNote('Lap started', 'good');
  }
}

let lapHudTick = 0;
function refreshLapHud(dt) {
  if (!CIRCUIT) return;
  const show = LAP.state === 'running' || LAP.near;
  $('lapHud').classList.toggle('on', !!show);
  // the gantry screen, a few times a second
  lapHudTick -= dt;
  if (lapHudTick <= 0 && CIRCUIT.screen) {
    lapHudTick = 0.1;
    const cur = LAP.state === 'running' ? fmtLap(LAP.t * 1000) : (LAP.last ? fmtLap(LAP.last) : '0:00:000');
    CIRCUIT.screen.set(cur + '|BEST ' + fmtLap(LAP.best[0] || 0));
  }
  if (!show) return;
  $('lhTime').textContent = LAP.state === 'running' ? fmtLap(LAP.t * 1000) : '0:00:000';
  $('lhBest').textContent = fmtLap(LAP.best[0] || 0);
  $('lhLast').firstChild.textContent = fmtLap(LAP.last || 0);
  const dEl = $('lhDelta');
  dEl.textContent = LAP.lastDelta !== null ? fmtDelta(LAP.lastDelta) : '';
  dEl.className = 'lh-delta' + (LAP.lastDelta > 0 ? ' up' : LAP.lastDelta < 0 ? ' down' : '');
  let cp;
  if (LAP.msgT > 0) cp = LAP.msg;
  else if (LAP.state === 'running') cp = 'Checkpoint ' + LAP.nextCp + '/' + CIRCUIT.checkpoints.length;
  else cp = 'Cross the start line to begin a lap';
  $('lhCp').textContent = cp;
  $('lhCp').style.color = LAP.msgT > 0 && LAP.msgKind === 'bad' ? '#ff8a7a' : (LAP.msgT > 0 && LAP.msgKind === 'good' ? '#7dff9a' : '');
  const board = $('lhBoard');
  const html = LAP.best.length
    ? LAP.best.map((t, i) => '<li' + (i === 0 ? ' class="best"' : '') + '>' + fmtLap(t) + '</li>').join('')
    : '<li>0:00:000</li>';
  if (board.innerHTML !== html) board.innerHTML = html;
}

/* ---------- credits ----------
   Built from MODEL_CREDITS. Rows without an artist or licence are shown in red
   rather than omitted. */
function renderCredits() {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const row = c => {
    const known = c.artist && c.licence;
    const who = known
      ? '<b>' + esc(c.artist) + '</b>' + (c.url ? ' · <a href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">source</a>' : '')
      : 'credit not filled in — see CREDITS.md';
    return '<div class="cr' + (known ? '' : ' missing') + '">' +
      '<div class="who">' + esc(c.subject) + ' — ' + who + '</div>' +
      '<div class="lic">' + esc(c.licence || 'licence unknown') + '</div></div>';
  };
  const models = (typeof MODEL_CREDITS !== 'undefined' ? MODEL_CREDITS : [])
    .filter(c => CAR_MODEL_PRESENT[c.file] !== false);
  let html = '<h3>Models</h3>' + models.map(row).join('');
  html += '<h3>Software</h3>' + (typeof SOFTWARE_CREDITS !== 'undefined' ? SOFTWARE_CREDITS : []).map(row).join('');
  html += '<h3>Everything else</h3><div class="cr"><div class="who">City, roads, terrain, textures, ' +
    'sound and code — <b>this project</b></div><div class="lic">MIT</div></div>';
  const missing = models.filter(c => !(c.artist && c.licence)).length;
  const nc = models.filter(c => (c.licence || '').indexOf('NC') >= 0).length;
  if (nc) html += '<div class="foot">' + nc + ' of these models are licensed NonCommercial. ' +
    'This game is free to play and carries no advertising.</div>';
  html += '<div class="foot">' + (missing
    ? '<b style="color:#ff8a7a">' + missing + ' model' + (missing === 1 ? '' : 's') +
      ' still need crediting.</b> Fill in MODEL_CREDITS in the source before publishing — ' +
      'most licences require the author to be named where players can see it.'
    : 'Thank you to everyone above.') + '</div>';
  $('creditList').innerHTML = html;
}

/* Models that failed to load are left out of the credits, so the panel matches
   what is actually on screen. */
const CAR_MODEL_PRESENT = {};

/* ---------- day and night ---------- */
const SKY_DAY = { top: 0x2f5f9e, mid: 0x9fc6e4, low: 0xf6d5a8, horizon: 0xf8ead0, fog: 0xb9c8d6 };
const SKY_DUSK = { top: 0x243a63, mid: 0x6d7fa8, low: 0xe0915c, horizon: 0xf0b784, fog: 0xa0966f };
const SKY_NIGHT = { top: 0x070c19, mid: 0x101b33, low: 0x1d2a45, horizon: 0x2b3550, fog: 0x141c2e };
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function mixSky(a, b, t, key) {
  _c1.setHex(a[key]); _c2.setHex(b[key]);
  return _c1.lerp(_c2, t);
}
function updateTimeOfDay(dt, active) {
  if (active && TUNE.look.dayLength > 0) {
    TUNE.look.timeOfDay = (TUNE.look.timeOfDay + dt * 24 / TUNE.look.dayLength) % 24;
  }
  const t = TUNE.look.timeOfDay;
  // elevation: up at 06:00, peak at noon, down at 18:00
  const elev = Math.sin((t - 6) / 12 * Math.PI);
  const day = clamp(elev * 2.2, 0, 1);                 // full daylight
  const night = clamp(-elev * 2.2, 0, 1);              // full dark
  const dusk = clamp(1 - day - night, 0, 1);           // the warm band between

  let from, to, mixT;
  if (night > 0) { from = SKY_DUSK; to = SKY_NIGHT; mixT = night; }
  else { from = SKY_DAY; to = SKY_DUSK; mixT = dusk; }

  if (skyMesh && skyMesh.material.uniforms) {
    const u = skyMesh.material.uniforms;
    ['top', 'mid', 'low', 'horizon'].forEach(k => u[k].value.copy(mixSky(from, to, mixT, k)));
  }
  if (scene && scene.fog) scene.fog.color.copy(mixSky(from, to, mixT, 'fog'));

  if (sunLight) {
    const az = (t / 24) * TAU;
    const r = 320;
    sunLight.color.setHex(dusk > 0.35 ? 0xffb066 : 0xffd2a0);
    sunLight.intensity = TUNE.look.sun * clamp(elev * 1.35, 0.02, 1);
    sunLight.position.set(V.x + Math.cos(az) * r, 90 + Math.max(0, elev) * 280, V.z + Math.sin(az) * r * 0.6);
  }
  if (hemiLight) hemiLight.intensity = TUNE.look.ambient * (0.18 + 0.82 * clamp(elev * 1.6, 0, 1));
  if (renderer) renderer.toneMappingExposure = TUNE.look.exposure * (1 + night * 0.28);

  // street lighting and shopfronts come up as the light goes
  const lit = clamp(night + dusk * 0.6, 0, 1);
  MATS.windows.forEach(m => { m.emissiveIntensity = TUNE.look.windows * (0.22 + 1.25 * lit); });
  MATS.neon.forEach(m => { m.emissiveIntensity = TUNE.look.neon * (0.3 + 1.1 * lit); });
  if (carObj && carObj.userData.head) carObj.userData.head.intensity = lit > 0.25 ? 2.4 : 0;
  S.night = lit;
}

/* ---------- mountain path editor ----------
   Edit mode drags existing points; draw mode lays a road freehand. An image can
   be placed underneath to trace over. "Make drivable" rebuilds the path with a
   minimum corner radius; "Copy JSON" exports it for MTN_TRACE. */
const PE = {
  which: 'pass', mode: 'edit', sel: -1, drag: false, drawing: false,
  ctx: null, view: null, backup: null,
  img: null, opacity: 0.5, rot: 0, scale: 1
};
const PE_MIN_RADIUS = 16;

function peSnapshot() {
  return {
    pass: MTN_TRACE.pass.map(p => p.slice()),
    track: MTN_TRACE.track.map(p => p.slice()),
    trackClosed: !!MTN_TRACE.trackClosed
  };
}
function peList() { return MTN_TRACE[PE.which]; }

/* --- geometry helpers, ported from the tracing pipeline --- */
function peResample(pts, step) {
  if (pts.length < 2) return pts.map(p => p.slice());
  const out = [pts[0].slice()];
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.floor(L / step));
    for (let i = 1; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  }
  return out;
}
/* Walk the road clamping how fast its heading may turn: a corner can never be
   tighter than Rmin, so a drawn hairpin becomes a slightly wider hairpin. */
function peCurvLimit(pts, Rmin, step) {
  const a = peResample(pts, step);
  if (a.length < 3) return a;
  let head = Math.atan2(a[1][1] - a[0][1], a[1][0] - a[0][0]);
  const maxTurn = step / Rmin;
  let pos = a[0].slice();
  const out = [pos.slice()];
  for (let i = 1; i < a.length; i++) {
    const want = Math.atan2(a[i][1] - pos[1], a[i][0] - pos[0]);
    let dh = ((want - head + Math.PI) % TAU + TAU) % TAU - Math.PI;
    dh = clamp(dh, -maxTurn, maxTurn);
    head += dh;
    pos = [pos[0] + Math.cos(head) * step, pos[1] + Math.sin(head) * step];
    out.push(pos.slice());
  }
  return out;
}
function peRdp(pts, eps) {
  if (pts.length < 3) return pts;
  const s = pts[0], e = pts[pts.length - 1];
  const vx = e[0] - s[0], vz = e[1] - s[1], L = Math.hypot(vx, vz);
  let bi = 0, bd = -1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = L < 1e-9 ? Math.hypot(pts[i][0] - s[0], pts[i][1] - s[1])
      : Math.abs(vx * (pts[i][1] - s[1]) - vz * (pts[i][0] - s[0])) / L;
    if (d > bd) { bd = d; bi = i; }
  }
  if (bd > eps) return peRdp(pts.slice(0, bi + 1), eps).slice(0, -1).concat(peRdp(pts.slice(bi), eps));
  return [s, e];
}
function peCornerRadius(pts, i) {
  const A = pts[i - 2], B = pts[i - 1], C = pts[i];
  const ab = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const bc = Math.hypot(C[0] - B[0], C[1] - B[1]);
  const ac = Math.hypot(C[0] - A[0], C[1] - A[1]);
  const cr = Math.abs((B[0] - A[0]) * (C[1] - B[1]) - (B[1] - A[1]) * (C[0] - B[0]));
  if (cr < 1e-9 || ab < 1 || bc < 1) return 1e9;
  return (ab * bc * ac) / (2 * cr);
}
function peTidy(list, closed) {
  if (list.length < 3) return list;
  let src = list.map(p => p.slice());
  if (closed) src.push(src[0].slice());
  let out = peCurvLimit(src, PE_MIN_RADIUS, 4);
  if (closed) {
    // the heading limit lets the end wander; walk it home so the lap closes
    const gap = [src[0][0] - out[out.length - 1][0], src[0][1] - out[out.length - 1][1]];
    out = out.map((p, i) => [p[0] + gap[0] * i / (out.length - 1), p[1] + gap[1] * i / (out.length - 1)]);
    out.pop();
  }
  out = peRdp(out, 1.5);
  return out.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);
}

/* --- drawing the editor --- */
function peDraw() {
  const cv = $('pecanvas');
  const w = cv.clientWidth || 900, h = cv.clientHeight || 560;
  if (cv.width !== w * 2 || cv.height !== h * 2) { cv.width = w * 2; cv.height = h * 2; }
  const c = PE.ctx || (PE.ctx = cv.getContext('2d'));
  c.setTransform(2, 0, 0, 2, 0, 0);
  const span = MTN.r * 2.25;
  const sc = Math.min(w, h) / span;
  const tx = x => w / 2 + (x - MTN.x) * sc;
  const tz = z => h / 2 + (z - MTN.z) * sc;
  PE.view = { w: w, h: h, sc: sc, tx: tx, tz: tz,
    inv: (px, pz) => [MTN.x + (px - w / 2) / sc, MTN.z + (pz - h / 2) / sc] };

  c.clearRect(0, 0, w, h);
  c.fillStyle = '#12182a'; c.fillRect(0, 0, w, h);

  // the sketch underneath, fitted to the hill so a drawing lines straight up
  if (PE.img) {
    const r = MTN.r * sc * PE.scale;
    const ar = PE.img.width / PE.img.height;
    const iw = ar >= 1 ? r * 2 * ar : r * 2, ih = ar >= 1 ? r * 2 : r * 2 / ar;
    c.save();
    c.globalAlpha = PE.opacity;
    c.translate(tx(MTN.x), tz(MTN.z));
    c.rotate(PE.rot * Math.PI / 180);
    c.drawImage(PE.img, -iw / 2, -ih / 2, iw, ih);
    c.restore();
  }

  for (let f = 1; f >= 0.2; f -= 0.2) {
    c.strokeStyle = 'rgba(247,236,214,' + (0.08 + f * 0.12) + ')';
    c.lineWidth = f === 1 ? 2 : 1;
    c.beginPath(); c.arc(tx(MTN.x), tz(MTN.z), MTN.r * f * sc, 0, TAU); c.stroke();
  }
  const app = ROADS.find(r => r.id === 'mountain-approach');
  if (app) {
    c.strokeStyle = 'rgba(243,181,69,.75)'; c.lineWidth = 4;
    c.beginPath();
    app.pts.forEach((p, i) => i ? c.lineTo(tx(p[0]), tz(p[1])) : c.moveTo(tx(p[0]), tz(p[1])));
    c.stroke();
  }

  ['pass', 'track'].forEach(name => {
    const pts = MTN_TRACE[name];
    if (!pts.length) return;
    const active = name === PE.which;
    const col = name === 'pass' ? '143,208,255' : '255,210,127';
    c.strokeStyle = 'rgba(' + col + ',' + (active ? 1 : 0.35) + ')';
    c.lineWidth = active ? 3.5 : 2;
    c.beginPath();
    pts.forEach((p, i) => i ? c.lineTo(tx(p[0]), tz(p[1])) : c.moveTo(tx(p[0]), tz(p[1])));
    if (name === 'track' && MTN_TRACE.trackClosed) c.closePath();
    c.stroke();
    if (!active) return;
    pts.forEach((p, i) => {
      const end = i === 0 || i === pts.length - 1;
      c.fillStyle = i === PE.sel ? '#ffffff' : (i === 0 ? '#7dff9a' : (i === pts.length - 1 ? '#ff6b5e' : '#f3b545'));
      c.beginPath(); c.arc(tx(p[0]), tz(p[1]), i === PE.sel ? 6 : (end ? 5 : 3), 0, TAU); c.fill();
    });
  });

  const pts = peList();
  let tight = 0;
  c.strokeStyle = '#ff5a4a'; c.lineWidth = 2;
  for (let i = 2; i < pts.length; i++) {
    if (peCornerRadius(pts, i) < 12) {
      tight++;
      c.beginPath(); c.arc(tx(pts[i - 1][0]), tz(pts[i - 1][1]), 9, 0, TAU); c.stroke();
    }
  }
  peStats(tight);
}

function peStats(tight) {
  const pts = peList();
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const grade = PE.which === 'pass' ? (MTN.h / Math.max(len, 1) * 100).toFixed(1) + '%' : 'level';
  const outside = pts.filter(p => Math.hypot(p[0] - MTN.x, p[1] - MTN.z) > MTN.r - 4).length;
  const tips = PE.mode === 'draw'
    ? 'Draw: press and drag to lay road, or click point by point. Green = start, red = end.'
    : 'Edit: click a point to select it, drag to move. Delete key removes it.';
  $('peHint').textContent = tips;
  let msg = `${pts.length} points · ${len.toFixed(0)} m · gradient ${grade}`;
  msg += tight ? ` · <b style="color:#ff8a7a">${tight} corner(s) too tight</b> — press Make drivable` : ' · every corner drivable';
  if (outside) msg += ` · <b style="color:#ff8a7a">${outside} point(s) off the hill</b>`;
  $('peStats').innerHTML = msg;
  $('peLoop').textContent = 'Loop: ' + (MTN_TRACE.trackClosed ? 'on' : 'off');
  $('peLoop').style.display = PE.which === 'track' ? '' : 'none';
}

function peSyncChips() {
  fillChips('peWhich', [['pass', 'Climb'], ['track', 'Circuit']], PE.which,
    v => { PE.which = v; PE.sel = -1; peSyncChips(); peDraw(); });
  fillChips('peMode', [['edit', 'Edit points'], ['draw', 'Draw road']], PE.mode,
    v => { PE.mode = v; PE.sel = -1; peSyncChips(); peDraw(); });
}

function peOpen() {
  if (!S.dev) { toast('The path editor is developer-only — enter the code in Settings', 'bad'); return; }
  if (!PE.backup) PE.backup = peSnapshot();
  peSyncChips();
  openOverlay('patheditor');
  peDraw();
}

function peBind() {
  const cv = $('pecanvas');
  const at = e => {
    const r = cv.getBoundingClientRect();
    return PE.view.inv(e.clientX - r.left, e.clientY - r.top);
  };
  const nearest = (wx, wz) => {
    const pts = peList();
    let bi = -1, bd = 1e9;
    pts.forEach((p, i) => {
      const d = Math.hypot(p[0] - wx, p[1] - wz);
      if (d < bd) { bd = d; bi = i; }
    });
    return bd * PE.view.sc < 12 ? bi : -1;
  };
  const snap = (wx, wz) => [Math.round(wx * 10) / 10, Math.round(wz * 10) / 10];

  cv.addEventListener('pointerdown', e => {
    const [wx, wz] = at(e);
    if (PE.mode === 'draw') {
      peList().push(snap(wx, wz));
      PE.drawing = true;
      PE.sel = peList().length - 1;
      cv.setPointerCapture(e.pointerId);
    } else {
      PE.sel = nearest(wx, wz);
      PE.drag = PE.sel >= 0;
      if (PE.drag) cv.setPointerCapture(e.pointerId);
    }
    peDraw();
  });
  cv.addEventListener('pointermove', e => {
    const [wx, wz] = at(e);
    if (PE.mode === 'draw' && PE.drawing) {
      // freehand: drop a point every few metres while the button is held
      const pts = peList(), last = pts[pts.length - 1];
      if (Math.hypot(wx - last[0], wz - last[1]) > 7) {
        pts.push(snap(wx, wz));
        PE.sel = pts.length - 1;
        peDraw();
      }
      return;
    }
    if (!PE.drag || PE.sel < 0) return;
    peList()[PE.sel] = snap(wx, wz);
    peDraw();
  });
  const up = () => { PE.drag = false; PE.drawing = false; };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);

  addEventListener('keydown', e => {
    if (!$('patheditor').classList.contains('on')) return;
    if ((e.code === 'Delete' || e.code === 'Backspace') && PE.sel >= 0 && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      $('peDel').click();
    }
  });

  $('peClear').onclick = () => {
    MTN_TRACE[PE.which] = [];
    PE.sel = -1;
    PE.mode = 'draw';
    peSyncChips();
    toast('Cleared — draw the ' + (PE.which === 'pass' ? 'climb from its entry upward' : 'circuit') + ' now');
    peDraw();
  };
  $('peLoop').onclick = () => { MTN_TRACE.trackClosed = !MTN_TRACE.trackClosed; peDraw(); };
  $('peAdd').onclick = () => {
    const pts = peList();
    if (pts.length < 2) return;
    const i = PE.sel >= 0 ? Math.min(PE.sel, pts.length - 2) : pts.length - 2;
    const a = pts[i], b = pts[i + 1];
    pts.splice(i + 1, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    PE.sel = i + 1;
    peDraw();
  };
  $('peDel').onclick = () => {
    const pts = peList();
    if (PE.sel < 0 || !pts.length) return;
    pts.splice(PE.sel, 1);
    PE.sel = Math.min(PE.sel, pts.length - 1);
    peDraw();
  };
  $('peTidy').onclick = () => {
    const before = peList().length;
    MTN_TRACE[PE.which] = peTidy(peList(), PE.which === 'track' && MTN_TRACE.trackClosed);
    PE.sel = -1;
    toast('Corners opened to at least ' + PE_MIN_RADIUS + ' m (' + before + ' → ' + peList().length + ' points)', 'good');
    peDraw();
  };
  $('peApply').onclick = () => {
    if (MTN_TRACE.pass.length < 3) { toast('The climb needs at least three points', 'bad'); return; }
    if (MTN_TRACE.track.length && MTN_TRACE.track.length < 3) { toast('The circuit needs at least three points', 'bad'); return; }
    // the entry always meets the approach road
    const app = ROADS.find(r => r.id === 'mountain-approach');
    if (app && MTN_TRACE.pass.length) {
      const e = MTN_TRACE.pass[0];
      app.pts[app.pts.length - 1] = [e[0], e[1]];
    }
    rebuildMountain();
    peDraw();
    toast('Mountain rebuilt', 'good');
  };
  $('peReset').onclick = () => {
    if (!PE.backup) return;
    MTN_TRACE.pass = PE.backup.pass.map(p => p.slice());
    MTN_TRACE.track = PE.backup.track.map(p => p.slice());
    MTN_TRACE.trackClosed = PE.backup.trackClosed;
    rebuildMountain();
    peDraw();
    toast('Reverted to the traced layout');
  };
  $('peCopy').onclick = () => {
    const fmt = a => '[' + a.map(p => '[' + p[0] + ',' + p[1] + ']').join(',') + ']';
    const text = 'const MTN_TRACE = {\n  pass: ' + fmt(MTN_TRACE.pass) +
      ',\n  track: ' + fmt(MTN_TRACE.track) +
      ',\n  trackClosed: ' + !!MTN_TRACE.trackClosed +
      (MTN_TRACE.link ? ',\n  link: ' + fmt(MTN_TRACE.link) : '') +
      ',\n  trackH: ' + MTN_TRACE.trackH + '\n};';
    const done = () => toast('Path JSON copied — paste it over MTN_TRACE', 'good');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  };
  $('peImg').onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => { PE.img = img; peDraw(); toast('Image loaded — rotate and size it to match the hill'); };
    img.onerror = () => toast('That image could not be read. Try a JPG or PNG export.', 'bad');
    img.src = url;
  };
  $('peOpacity').oninput = e => { PE.opacity = +e.target.value; peDraw(); };
  $('peRot').oninput = e => { PE.rot = +e.target.value; peDraw(); };
  $('peScale').oninput = e => { PE.scale = +e.target.value; peDraw(); };
}

/* Re-cut the hill and relay its roads after an edit. */
let mtnMesh = null;
const mtnArt = [];
function rebuildMountain() {
  buildMountainRoad();
  if (mtnMesh) { world.remove(mtnMesh); mtnMesh.geometry.dispose(); }
  mtnArt.forEach(m => { world.remove(m); if (m.geometry) m.geometry.dispose(); });
  mtnArt.length = 0;
  mtnMesh = buildMountain();
  world.add(mtnMesh);
  mountainPaths().forEach(p => {
    if (p.custom) return;
    if (TILE_GEO && TILE_MAT) {
      const geo = sweepTileAlongPath(tileDeckOnly(TILE_GEO) || TILE_GEO, p, { follow: true });
      if (geo) {
        const m = new THREE.Mesh(geo, TILE_MAT);
        m.receiveShadow = true;
        mtnArt.push(m); world.add(m);
      }
    } else {
      const rib = ribbon(p, p.w, 0.26, 0xffffff, {
        follow: true, map: TEX.asphalt, vScale: 11, edge: 0xbdb7a6, po: -4, rough: 0.86
      });
      mtnArt.push(rib); world.add(rib);
      const el = edgeLines(p, p.w - 1.2, 0.36, 0.34, COL.line, true);
      const cl = centerLines(p, 0.34, true);
      mtnArt.push(el, cl); world.add(el); world.add(cl);
    }
  });
}

/* ---------- map drawing ---------- */
/* One renderer for both the corner minimap and the full-screen map: the minimap
   is simply a window centred on the car. */
function drawMap(c, W, H, opts) {
  const span = opts.span;                       // world units across the view
  const cx = opts.cx, cz = opts.cz;
  const sc = Math.min(W, H) / span;
  const tx = x => W / 2 + (x - cx) * sc;
  const tz = z => H / 2 + (z - cz) * sc;
  const wide = span > 700;

  c.clearRect(0, 0, W, H);
  c.fillStyle = '#1b2740';
  c.fillRect(0, 0, W, H);

  // mountain
  c.fillStyle = '#2c3a2e';
  c.beginPath(); c.arc(tx(MTN.x), tz(MTN.z), MTN.r * sc, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(247,236,214,.22)'; c.lineWidth = 1;
  c.beginPath(); c.arc(tx(MTN.x), tz(MTN.z), MTN.r * sc, 0, TAU); c.stroke();

  c.lineCap = 'round';
  c.strokeStyle = 'rgba(247,236,214,.18)';
  c.lineWidth = Math.max(1, 2 * sc * 60);
  c.setLineDash([4, 4]);
  for (const d of DIRT) {
    c.beginPath();
    d.pts.forEach((p, i) => i ? c.lineTo(tx(p[0]), tz(p[1])) : c.moveTo(tx(p[0]), tz(p[1])));
    c.stroke();
  }
  c.setLineDash([]);
  for (const r of ROADS) {
    c.strokeStyle = 'rgba(247,236,214,.55)';
    c.lineWidth = Math.max(1.5, r.w * 2 * sc * 0.55);
    c.beginPath();
    r.pts.forEach((p, i) => i ? c.lineTo(tx(p[0]), tz(p[1])) : c.moveTo(tx(p[0]), tz(p[1])));
    c.stroke();
  }
  // circuit, pit lane and access road
  if (typeof MPATHS !== 'undefined' && MPATHS) MPATHS.forEach((mp, mi) => {
    if (mi === 0) return;
    c.strokeStyle = mp.pit ? 'rgba(247,236,214,.35)' : 'rgba(243,181,69,.75)';
    c.lineWidth = Math.max(1.4, mp.w * 2 * sc * 0.55);
    c.beginPath();
    mp.pts.forEach((p, i) => i ? c.lineTo(tx(p.x), tz(p.z)) : c.moveTo(tx(p.x), tz(p.z)));
    c.stroke();
  });
  // the pass
  c.strokeStyle = 'rgba(247,236,214,.5)';
  c.lineWidth = Math.max(1.2, 9 * sc);
  c.beginPath();
  for (let i = 0; i < MROAD.length; i += 4) {
    const p = MROAD[i];
    i === 0 ? c.moveTo(tx(p.x), tz(p.z)) : c.lineTo(tx(p.x), tz(p.z));
  }
  c.stroke();

  // shop
  c.fillStyle = '#c8453c';
  c.beginPath(); c.arc(tx(HQ.x), tz(HQ.z), wide ? 5 : 6, 0, TAU); c.fill();
  if (wide) {
    c.fillStyle = 'rgba(247,236,214,.75)';
    c.font = '11px system-ui, sans-serif';
    c.fillText('The Copper Kettle', tx(HQ.x) + 8, tz(HQ.z) + 4);
  }

  // where you are headed
  {
    const toShop = !S.job;
    const d = toShop ? { x: HQ.x, z: HQ.z - 13 } : S.job.stops[S.job.idx];
    const col = toShop ? '#c8453c' : '#f3b545';
    const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.35;
    c.strokeStyle = col; c.globalAlpha = 0.45; c.lineWidth = 2;
    c.beginPath(); c.arc(tx(d.x), tz(d.z), 8 * pulse, 0, TAU); c.stroke();
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(247,236,214,.55)'; c.lineWidth = 1.5; c.setLineDash([5, 5]);
    c.beginPath(); c.moveTo(tx(V.x), tz(V.z)); c.lineTo(tx(d.x), tz(d.z)); c.stroke();
    c.setLineDash([]);
    c.fillStyle = col;
    c.beginPath(); c.arc(tx(d.x), tz(d.z), 5.5, 0, TAU); c.fill();
    c.strokeStyle = '#f7ecd6'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(tx(d.x), tz(d.z), 5.5, 0, TAU); c.stroke();
    if (wide && !toShop) {
      c.fillStyle = '#f3b545';
      c.font = '11px system-ui, sans-serif';
      c.fillText(S.job.stops[S.job.idx].name, tx(d.x) + 9, tz(d.z) + 4);
    }
  }

  // the car
  c.save();
  c.translate(tx(V.x), tz(V.z));
  c.rotate(-V.yaw + Math.PI);
  c.fillStyle = '#f7ecd6';
  const k = wide ? 0.8 : 1;
  c.beginPath();
  c.moveTo(0, -8 * k); c.lineTo(5.5 * k, 6 * k); c.lineTo(0, 3 * k); c.lineTo(-5.5 * k, 6 * k);
  c.closePath(); c.fill();
  c.restore();

  if (wide) {
    c.strokeStyle = 'rgba(247,236,214,.25)';
    c.lineWidth = 1;
    c.strokeRect(tx(-BOUND_X), tz(-BOUND_Z), BOUND_X * 2 * sc, BOUND_Z * 2 * sc);
  }
}

const mmCtx = $('mm').getContext('2d');
function drawMinimap() {
  drawMap(mmCtx, 424, 344, { cx: V.x, cz: V.z, span: TUNE.world.minimapSpan });
}

let bigMapCtx = null;
function drawBigMap() {
  const cv = $('bigmap');
  const w = cv.clientWidth || 900, h = cv.clientHeight || 640;
  if (cv.width !== w * 2 || cv.height !== h * 2) { cv.width = w * 2; cv.height = h * 2; }
  if (!bigMapCtx) bigMapCtx = cv.getContext('2d');
  bigMapCtx.setTransform(2, 0, 0, 2, 0, 0);
  const span = Math.max(BOUND_X * 2, BOUND_Z * 2) * 1.05;
  drawMap(bigMapCtx, w, h, { cx: 0, cz: 0, span: span });
}
function toggleBigMap() {
  const on = !$('mapview').classList.contains('on');
  if (on) { drawBigMap(); openOverlay('mapview'); }
  else closeOverlays();
}

/* ---------- tyre smoke + marks ---------- */
let smoke, smokeIdx = 0, smokeData = [];
const SMOKE_N = 220;
function initSmoke() {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(SMOKE_N * 3);
  const size = new Float32Array(SMOKE_N);
  const pcol = new Float32Array(SMOKE_N * 3);
  for (let i = 0; i < SMOKE_N; i++) { pos[i * 3 + 1] = -999; smokeData.push({ life: 0, vx: 0, vy: 0, vz: 0, s: 1 }); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('psize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('pcol', new THREE.BufferAttribute(pcol, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const cx = cv.getContext('2d');
  const grd = cx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,255,255,.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = grd; cx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { map: { value: tex } },
    vertexShader: 'attribute float psize; attribute vec3 pcol; varying float vA; varying vec3 vC;' +
      ' void main(){ vA = clamp(psize/9.0,0.0,1.0); vC = pcol;' +
      ' vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = psize * (300.0 / -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; varying float vA; varying vec3 vC;' +
      ' void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA * 0.5); }'
  });
  smoke = new THREE.Points(g, mat);
  smoke.frustumCulled = false;
  scene.add(smoke);
}
const _puffC = new THREE.Color();
function puff(x, y, z, tint) {
  const i = smokeIdx = (smokeIdx + 1) % SMOKE_N;
  const p = smoke.geometry.attributes.position, sz = smoke.geometry.attributes.psize;
  const pc = smoke.geometry.attributes.pcol;
  _puffC.setHex(tint === undefined ? 0xd8d4cb : tint);
  _puffC.multiplyScalar(0.85 + Math.random() * 0.3);
  pc.setXYZ(i, _puffC.r, _puffC.g, _puffC.b);
  pc.needsUpdate = true;
  p.setXYZ(i, x, y, z); sz.setX(i, rr(1.4, 2.6));
  smokeData[i].life = rr(0.8, 1.5);
  smokeData[i].vx = rr(-1.2, 1.2); smokeData[i].vy = rr(0.7, 1.9); smokeData[i].vz = rr(-1.2, 1.2);
  p.needsUpdate = true; sz.needsUpdate = true;
}
function updateSmoke(dt) {
  const p = smoke.geometry.attributes.position, sz = smoke.geometry.attributes.psize;
  let dirty = false;
  for (let i = 0; i < SMOKE_N; i++) {
    const d = smokeData[i];
    if (d.life <= 0) continue;
    d.life -= dt;
    p.setXYZ(i, p.getX(i) + d.vx * dt, p.getY(i) + d.vy * dt, p.getZ(i) + d.vz * dt);
    sz.setX(i, sz.getX(i) + dt * 7);
    if (d.life <= 0) { p.setY(i, -999); sz.setX(i, 0); }
    dirty = true;
  }
  if (dirty) { p.needsUpdate = true; sz.needsUpdate = true; }
}

let marks, markIdx = 0;
const MARK_N = 520;
function initMarks() {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(MARK_N * 6 * 3);
  const alpha = new Float32Array(MARK_N * 6);
  for (let i = 0; i < pos.length; i += 3) pos[i + 1] = -999;
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { c: { value: new THREE.Color(0x14161a) } },
    vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 c; varying float vA; void main(){ if(vA<=0.001) discard; gl_FragColor = vec4(c, vA*0.5); }'
  });
  marks = new THREE.Mesh(g, mat);
  marks.frustumCulled = false;
  marks.renderOrder = 1;
  scene.add(marks);
}
const lastMark = {};
function layMark(key, x, y, z, yaw, alpha) {
  const prev = lastMark[key];
  lastMark[key] = { x, y, z };
  if (!prev) return;
  if (Math.hypot(x - prev.x, z - prev.z) < 0.25) { lastMark[key] = prev; return; }
  const i = markIdx = (markIdx + 1) % MARK_N;
  const w = 0.16;
  const nx = Math.cos(yaw) * w, nz = -Math.sin(yaw) * w;
  const p = marks.geometry.attributes.position, a = marks.geometry.attributes.alpha;
  const verts = [
    [prev.x - nx, prev.y + 0.03, prev.z - nz], [prev.x + nx, prev.y + 0.03, prev.z + nz], [x + nx, y + 0.03, z + nz],
    [prev.x - nx, prev.y + 0.03, prev.z - nz], [x + nx, y + 0.03, z + nz], [x - nx, y + 0.03, z - nz]
  ];
  for (let k = 0; k < 6; k++) {
    p.setXYZ(i * 6 + k, verts[k][0], verts[k][1], verts[k][2]);
    a.setX(i * 6 + k, alpha);
  }
  p.needsUpdate = true; a.needsUpdate = true;
}

/* ---------- upgrades ---------- */
const UPGRADE_DEFS = [
  { key: 'turbo', name: 'Engine tune', max: 3, cost: [4000, 11000, 26000],
    desc: 'Boost pressure and fuelling. +7% torque per step.' },
  { key: 'tyres', name: 'Semi-slick tyres', max: 3, cost: [3200, 9000, 21000],
    desc: 'More bite everywhere. +3.5% grip per step.' },
  { key: 'nitro', name: 'Nitrous bottle', max: 3, cost: [6000, 15000, 34000],
    desc: 'Hold N for a burst. Higher steps hold more and refill on drifts.' }
];
function upgradeCost(def, lvl) { return def.cost[lvl]; }
function canFitNitro(id) { return CARS[id].nitroReady || S.dev; }

function renderUpgrades() {
  const box = $('upgList');
  box.innerHTML = '';
  const u = upgradesFor(S.carId);
  UPGRADE_DEFS.forEach(def => {
    const lvl = u[def.key] || 0;
    const locked = def.key === 'nitro' && !canFitNitro(S.carId);
    const row = document.createElement('div');
    row.className = 'upg';
    let pips = '<div class="pips">';
    for (let i = 0; i < def.max; i++) pips += '<i class="' + (i < lvl ? 'f' : '') + '"></i>';
    pips += '</div>';
    row.innerHTML = '<div class="info"><div class="nm">' + def.name + '</div>' +
      '<div class="ds">' + (locked ? 'This car has no mounting for a bottle.' : def.desc) + '</div>' + pips + '</div>';
    const btn = document.createElement('button');
    btn.className = 'btn' + (lvl >= def.max || locked ? '' : ' primary');
    if (lvl >= def.max) { btn.textContent = 'Maxed'; btn.disabled = true; }
    else if (locked) { btn.textContent = 'N/A'; btn.disabled = true; }
    else {
      const cost = upgradeCost(def, lvl);
      btn.textContent = '$' + cost.toLocaleString();
      btn.disabled = S.cash < cost;
      btn.onclick = () => {
        if (S.cash < cost) return;
        S.cash -= cost;
        u[def.key] = lvl + 1;
        if (def.key === 'nitro' && lvl === 0) V.nitro = 1;
        sfx.chime();
        refreshWallet();
        renderUpgrades();
        toast(def.name + ' fitted', 'good');
      };
    }
    row.appendChild(btn);
    box.appendChild(row);
  });
}

/* ---------- settings ---------- */
const SETTINGS_ROWS = [
  ['camera', 'dist', 4, 20, 0.1, 'Chase distance'],
  ['camera', 'height', 1, 10, 0.1, 'Chase height'],
  ['camera', 'lookHeight', 0, 6, 0.1, 'Camera angle — higher aims flatter, less looking down'],
  ['camera', 'speedPull', 0, 4, 0.05, 'How far the camera drifts back as you accelerate'],
  ['camera', 'fovGain', 0, 20, 0.5, 'How much the view widens with speed'],
  ['camera', 'lag', 1, 14, 0.1, 'How tightly the camera follows'],
  ['camera', 'fpHeight', 0, 1.4, 0.02, 'Bonnet view height'],
  ['camera', 'fpFovGain', 0, 12, 0.5, 'Bonnet view widening with speed'],
  ['camera', 'driftLean', 0, 1, 0.02, 'Camera swing toward the car\'s side in a slide'],
  ['camera', 'bodyRoll', 0, 2, 0.05, 'Body lean and pitch under load'],
  ['camera', 'shake', 0, 3, 0.05, 'Impact shake'],
  ['world', 'carScale', 0.6, 3.5, 0.05, 'Car size against the road'],
  ['world', 'minimapSpan', 200, 1600, 20, 'Minimap zoom — lower shows less ground'],
  ['look', 'timeOfDay', 0, 24, 0.1, 'Time of day'],
  ['look', 'dayLength', 0, 1800, 10, 'Length of a full day in seconds (0 freezes it)'],
  ['camera', 'mouseSpeed', 0.1, 3, 0.05, 'Free-look drag sensitivity'],
  ['camera', 'recentre', 0.5, 10, 0.1, 'How fast the view springs back']
];
let settingsBuilt = false;
function buildSettings() {
  if (settingsBuilt) return;
  settingsBuilt = true;
  const body = $('setBody');
  SETTINGS_ROWS.forEach(([grp, field, min, max, stepv, label]) => {
    const dec = stepv < 0.1 ? 2 : 1;
    const row = document.createElement('div');
    row.className = 'trow';
    const lab = document.createElement('div');
    lab.className = 'lab';
    lab.innerHTML = '<span>' + label + '</span><b>' + TUNE[grp][field].toFixed(dec) + '</b>';
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = stepv;
    inp.value = TUNE[grp][field];
    inp.setAttribute('aria-label', label);
    inp.oninput = () => {
      TUNE[grp][field] = parseFloat(inp.value);
      lab.querySelector('b').textContent = TUNE[grp][field].toFixed(dec);
      applyTune();
      if (tunerBuilt) syncTuner();
    };
    row.appendChild(lab); row.appendChild(inp);
    body.appendChild(row);
  });
  $('devGo').onclick = tryDevCode;
  $('devCode').onkeydown = e => { if (e.code === 'Enter') tryDevCode(); };
}
function syncSettingsChips() {
  fillChips('setGear', [['manual', 'Manual'], ['auto', 'Automatic']],
    autoBox ? 'auto' : 'manual', v => { autoBox = v === 'auto'; syncSettingsChips(); });
  fillChips('setShadow', [['on', 'On'], ['off', 'Off']],
    S.shadows ? 'on' : 'off', v => {
      if ((v === 'on') !== S.shadows) {
        S.shadows = v === 'on';
        renderer.shadowMap.enabled = S.shadows;
        sunLight.castShadow = S.shadows;
        scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
      }
      syncSettingsChips();
    });
}
function openSettings() {
  buildSettings();
  syncSettingsChips();
  $('devMsg').textContent = S.dev ? 'Developer mode active.' : '';
  $('setHint').textContent = S.dev
    ? 'Developer mode: press T for the full tuning panel.'
    : 'Full physics tuning unlocks with a developer code.';
  openOverlay('settings');
}

const DEV_CODE = 'darkeastwind';
function tryDevCode() {
  const v = ($('devCode').value || '').trim().toLowerCase();
  if (v !== DEV_CODE) {
    $('devMsg').textContent = 'Not recognised.';
    return;
  }
  S.dev = true;
  S.level = 10;
  S.xp = Math.max(S.xp, LEVELS[9]);
  S.cash += 500000;
  S.unlocked = CARS.map(c => c.id);
  CARS.forEach(c => {
    const u = upgradesFor(c.id);
    u.turbo = 3; u.tyres = 3; u.nitro = 3;
  });
  V.nitro = 1;
  $('devMsg').textContent = 'Unlocked: every car, every upgrade. Press T for the tuning panel.';
  refreshWallet();
  sfx.fanfare();
  toast('Developer mode — all cars and upgrades unlocked', 'good');
}

/* ---------- garage UI ---------- */
function renderGarage() {
  const list = $('carList');
  list.innerHTML = '';
  CARS.slice().sort((a, b) => a.lvl - b.lvl).forEach(c => {
    const owned = S.unlocked.indexOf(c.id) >= 0;
    const el = document.createElement('button');
    el.className = 'car' + (c.id === S.carId ? ' sel' : '') + (owned ? '' : ' locked');
    const stat = (v, max) => {
      let s = '<div class="st">';
      for (let i = 0; i < 5; i++) s += '<i class="' + (i < Math.round(v / max * 5) ? 'f' : '') + '"></i>';
      return s + '</div>';
    };
    el.innerHTML = '<div class="nm sign">' + (owned ? c.name : 'Locked') + '</div>' +
      '<small>' + (owned ? c.drive.toUpperCase() + ' · ' + c.mass + ' kg' : 'Reach level ' + c.lvl) + '</small>' +
      stat(c.peakTq / c.mass, 0.42) + stat(c.grip, 1.4);
    if (owned) el.onclick = () => { selectCar(c.id); renderGarage(); };
    list.appendChild(el);
  });
  $('garageSub').textContent = 'Driving the ' + CARS[S.carId].name + '. ' + CARS[S.carId].blurb;
  const cz = customFor(S.carId);
  fillSwatches('bodySw', PAINTS, cz.body, v => { cz.body = v; selectCar(S.carId); renderGarage(); });
  fillSwatches('rimSw', RIMS, cz.rim, v => { cz.rim = v; selectCar(S.carId); renderGarage(); });
  fillChips('finishChips', [['gloss', 'Gloss'], ['matte', 'Matte'], ['pearl', 'Pearl']], cz.finish, v => { cz.finish = v; selectCar(S.carId); renderGarage(); });
  fillChips('liveryChips', [['none', 'Plain'], ['stripe', 'Centre stripe'], ['twotone', 'Two-tone'], ['itasha', 'Shop decals']], cz.livery, v => { cz.livery = v; selectCar(S.carId); renderGarage(); });
  // Liveries are painted onto the workshop bodywork; a real car's bodywork has
  // its own texture mapping, so say so rather than appear to do nothing.
  const note = $('liveryNote');
  const modelled = !!CAR_MODELS[S.carId];
  note.style.display = modelled && cz.livery !== 'none' ? '' : 'none';
  note.textContent = 'Paint, finish, rims, stance, wing, plate and underglow all apply to this car. Liveries only show on the workshop bodywork.';
  fillChips('rimChips', [['mesh', 'Mesh'], ['star', 'Six-spoke']], cz.rimStyle, v => { cz.rimStyle = v; selectCar(S.carId); renderGarage(); });
  fillChips('strChips', [['low', 'Slammed'], ['stock', 'Stock'], ['raised', 'Raised']], cz.stance, v => { cz.stance = v; selectCar(S.carId); renderGarage(); });
  fillChips('wingChips', [['none', 'None'], ['lip', 'Lip'], ['duck', 'Duckbill'], ['gt', 'GT wing'], ['auto', 'As delivered']], cz.wing, v => { cz.wing = v; selectCar(S.carId); renderGarage(); });
  fillChips('glowChips', [['off', 'Off'], ['blue', 'Blue'], ['pink', 'Pink'], ['green', 'Green']], cz.glow, v => { cz.glow = v; selectCar(S.carId); renderGarage(); });
  $('plate').value = cz.plate;
  renderUpgrades();
  $('garageHint').textContent = S.level < 10 ?
    'Next car at level ' + (S.level + 1) + ' · ' + (LEVELS[S.level] - S.xp) + ' XP to go' :
    'Every set of keys is yours.';
}
function fillSwatches(id, arr, cur, cb) {
  const box = $(id); box.innerHTML = '';
  arr.forEach(v => {
    const b = document.createElement('button');
    b.className = 'sw' + (v === cur ? ' on' : '');
    b.style.background = '#' + v.toString(16).padStart(6, '0');
    b.setAttribute('aria-label', 'colour option');
    b.onclick = () => cb(v);
    box.appendChild(b);
  });
}
function fillChips(id, arr, cur, cb) {
  const box = $(id); box.innerHTML = '';
  arr.forEach(([v, label]) => {
    const b = document.createElement('button');
    b.className = 'chip' + (v === cur ? ' on' : '');
    b.textContent = label;
    b.onclick = () => cb(v);
    box.appendChild(b);
  });
}

let carGen = 0;
function selectCar(id) {
  S.carId = id;
  spec = CARS[id];
  const cz = customFor(id);
  if (carObj) { world.remove(carObj); carObj.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  // The built-in car goes in straight away so there's never an empty road; if a
  // glTF model is configured for this car it replaces the body once loaded.
  carObj = buildCarMesh(spec, cz);
  world.add(carObj);
  V.gear = 1; V.rpm = spec.idle;
  if (S.job && carObj.userData.tray) carObj.userData.tray.visible = true;

  const gen = ++carGen;
  if (CAR_MODELS[id]) {
    loadCarModel(id).then(src => {
      if (!src || gen !== carGen) return;    // user switched cars while it loaded
      let swapped;
      try { swapped = adaptCarModel(src, CARS[id], customFor(id), CAR_MODELS[id]); }
      catch (e) {
        modelProblem('loaded but could not be adapted (' + e.message + ') — keeping the built-in car');
        return;
      }
      world.remove(carObj);
      carObj = swapped;
      world.add(carObj);
      if (S.job && carObj.userData.tray) carObj.userData.tray.visible = true;
      const inf = swapped.userData.modelInfo;
      toast('Model loaded · ' + inf.meshes + ' meshes, ' + inf.wheels + ' wheels' +
        (inf.notes.length ? ' · ' + inf.notes[0] : ''), inf.wheels === 4 ? 'good' : 'bad');
    });
  }
}

/* ============================================================
   Tuning panel: live sliders bound straight to TUNE.
   ============================================================ */
const TUNE_SCHEMA = [
  ['Grip', 'grip', [
    ['base', 0.6, 3.2, 0.01, 'Overall tyre friction. Raise for more bite everywhere.'],
    ['front', 0.3, 0.9, 0.005, 'Front axle share. Below rear = understeer, above = the nose bites and the tail follows.'],
    ['rear', 0.3, 0.9, 0.005, 'Rear axle share. Drop it for a looser car.'],
    ['stiffFront', 15, 120, 1, 'How quickly the front makes force. Low feels floaty and vague.'],
    ['stiffRear', 15, 120, 1, 'Same for the rear.'],
    ['falloffFront', 0, 0.8, 0.01, 'Grip lost past peak slip at the front.'],
    ['falloffRear', 0, 0.8, 0.01, 'Rear falloff — this is what lets a drift hold instead of snapping straight.'],
    ['downforce', 0, 1.5, 0.05, 'Aero load with speed. This is what lets the car turn above 120 km/h.']
  ]],
  ['Steering', 'steer', [
    ['lockLow', 0.3, 1.2, 0.01, 'Max steering angle at low speed, radians. Bigger = tighter turning circle.'],
    ['lockHigh', 0.1, 0.7, 0.01, 'Steering angle once you are moving.'],
    ['lockFade', 20, 100, 1, 'Speed over which lock fades from low to high.'],
    ['rate', 3, 25, 0.5, 'How fast the wheels follow your input.'],
    ['counterRate', 3, 30, 0.5, 'Faster rate when flicking the other way, for counter-steer.']
  ]],
  ['Drift', 'drift', [
    ['redirect', 0, 8, 0.1, 'How hard sideways speed is rotated forward. Low = slides scrub and drag; high = drifts straighten themselves out.'],
    ['recover', 0, 10, 0.1, 'How much of the sideways speed the tyres scrub gets fed back along the car.'],
    ['slideGrip', 0.1, 1, 0.02, 'How much grip tarmac keeps once you are sideways. Low makes a road drift behave like loose ground and hold its angle.'],
    ['slideSlip', 0.05, 0.6, 0.01, 'Slip angle at which the road starts letting go. Normal cornering sits well below this.'],
    ['ctrlEnter', 0.1, 0.8, 0.01, 'Drift cars: angle (rad) at which steering starts steering the drift rather than the wheels.'],
    ['ctrlExit', 0.03, 0.5, 0.01, 'Angle below which the drift hands back to normal grip.'],
    ['ctrlTurn', 0.2, 3, 0.05, 'How fast full lock turns the path mid-drift (rad/s at 72 km/h).'],
    ['ctrlAngle', 0.15, 1.1, 0.01, 'Drift angle held on full throttle (rad). Lifting closes it a little.'],
    ['ctrlHold', 0.5, 10, 0.1, 'How firmly that angle is held.'],
    ['ctrlUnwind', 0, 4, 0.05, 'How decisively opposite lock straightens the car.'],
    ['ctrlYawRate', 1, 20, 0.5, 'How quickly the body answers the wheel mid-drift.'],
    ['ctrlBlend', 0.1, 1, 0.01, 'How strictly the car follows the line you steer. 1 = on rails, lower = more slide.'],
    ['ctrlSettle', 0, 1, 0.01, 'Rotation kept as a drift ends. Low = the car catches cleanly, high = it can snap the other way.'],
    ['visCounter', 0, 3, 0.05, 'How far the front wheels sit on opposite lock in a slide.'],
    ['visTurn', 0.2, 3, 0.05, 'Rotation speed at which the wheels come back to straight.'],
    ['visRate', 1, 25, 0.5, 'How quickly the wheels move to their visual angle.'],
    ['scrub', 0, 0.5, 0.01, 'Extra drag from running sideways.'],
    ['recoverBand', 0.1, 1.5, 0.05, 'How gradually the drift momentum transfer fades in. Wider = smoother onset.'],
    ['liftHold', 0, 2, 0.05, 'How long the rear stays loose after you lift. Higher = feather the throttle to hold an angle.'],
    ['coastCarry', 0, 1, 0.01, 'Drift momentum kept with no throttle. 0 means a slide only carries speed while you are on the power.'],
    ['coastDrag', 0, 1, 0.01, 'Extra speed bled off a slide while coasting.'],
    ['autoSettle', 0, 8, 0.1, 'How hard the car straightens itself when you are NOT counter-steering. This is the anti-spin.'],
    ['counterTrust', 0, 1, 0.01, 'How much of that settling is switched off while you hold opposite lock. Low = the drift is yours.'],
    ['yawDamp', 0, 4, 0.05, 'General rotational damping. High feels numb.'],
    ['maxYawDiv', 2, 12, 0.1, 'Spin cap: speed divided by this is the fastest the car may rotate.'],
    ['maxYawFloor', 0.4, 3, 0.05, 'Floor on that cap. Too low and low-speed manoeuvring suffers.'],
    ['maxYawCeil', 1, 5, 0.05, 'Ceiling on the cap.'],
    ['catchAngle', 0.4, 1.6, 0.01, 'Slip angle where anti-spin kicks in. Higher = wilder angles allowed.'],
    ['catchStrength', 0, 8, 0.1, 'How hard a big slide gets pulled back.'],
    ['handbrakeRear', 0.05, 1, 0.01, 'Rear grip with the handbrake up. Lower = easier to kick out.']
  ]],
  ['Power', 'power', [
    ['torqueScale', 0.3, 2.5, 0.01, 'Engine output across every car.'],
    ['brakeForce', 4, 20, 0.1, 'Braking strength.'],
    ['dragCd', 0.15, 0.8, 0.005, 'Aero drag. Raise to lower top speeds.'],
    ['rollResist', 0, 4, 0.05, 'Rolling resistance.'],
    ['reverseMax', 3, 25, 0.5, 'Top speed in reverse, m/s. Reverse is geared short on a real car.'],
    ['slopeGravity', 0.3, 2.5, 0.05, 'How hard hills pull at the car. 1 is real gravity.']
  ]],
  ['Surfaces', 'surface', [
    ['road', 0.4, 1.4, 0.01, 'Asphalt grip.'],
    ['dirt', 0.2, 1.2, 0.01, 'Dirt tracks.'],
    ['grass', 0.1, 1.0, 0.01, 'Open grass.'],
    ['walk', 0.3, 1.2, 0.01, 'Up on the kerb.'],
    ['rock', 0.2, 1.2, 0.01, 'Mountain flanks off the pass.']
  ]],
  ['Camera', 'camera', [
    ['dist', 4, 20, 0.1, 'Chase distance.'],
    ['height', 1, 10, 0.1, 'Chase height.'],
    ['fov', 45, 90, 1, 'Base field of view.'],
    ['lookHeight', 0, 6, 0.1, 'How high the camera aims. Higher = flatter, less looking down on the car.'],
    ['lag', 1, 14, 0.1, 'How tightly the camera follows. Low = floaty and cinematic.'],
    ['speedPull', 0, 4, 0.05, 'How far the camera eases back as you accelerate.'],
    ['fovGain', 0, 20, 0.5, 'How much the view widens with speed.'],
    ['fpHeight', 0, 1.4, 0.02, 'Bonnet camera height.'],
    ['fpFovGain', 0, 12, 0.5, 'Bonnet camera widening with speed.'],
    ['driftLean', 0, 1, 0.02, 'How far the camera swings toward the car\'s flank in a slide. 0 keeps it dead behind.'],
    ['bodyRoll', 0, 2, 0.05, 'How much the body leans and pitches under load.'],
    ['mouseSpeed', 0.1, 3, 0.05, 'Free-look drag sensitivity.'],
    ['recentre', 0.5, 10, 0.1, 'How fast the view springs back after a free look.'],
    ['shake', 0, 3, 0.05, 'Impact shake.']
  ]],
  ['Look', 'look', [
    ['exposure', 0.5, 2, 0.01, 'Overall brightness.'],
    ['sun', 0, 4, 0.05, 'Key light. Drives shadow contrast.'],
    ['ambient', 0, 1.5, 0.01, 'Fill light. Lower = moodier, deeper shadows.'],
    ['fog', 0, 0.004, 0.00002, 'Aerial haze. Higher hides the map edge.'],
    ['windows', 0, 3, 0.05, 'Lit office windows at dusk.'],
    ['neon', 0, 4, 0.05, 'Shop neon brightness.'],
    ['timeOfDay', 0, 24, 0.1, 'Hour of the day right now.'],
    ['dayLength', 0, 1800, 10, 'Seconds for a full day. 0 freezes the clock.']
  ]],
  ['World', 'world', [
    ['carScale', 0.6, 3.5, 0.05, 'Car size against the road. The roads are wide, so the real-world-sized car looks small at 1.0.'],
    ['minimapSpan', 200, 1600, 20, 'How much of the world the corner map shows. Lower = more zoomed in.'],
    ['railBreak', 5, 60, 0.5, 'Impact speed (m/s) at which a guard rail gives way rather than holding the car.']
  ]],
  ['Nitrous', 'nitro', [
    ['power', 1, 3, 0.05, 'Torque multiplier while the bottle is open.'],
    ['drain', 0.1, 2, 0.02, 'How fast a full bottle empties.'],
    ['refill', 0, 0.4, 0.005, 'Passive refill per second.'],
    ['driftGain', 0, 0.002, 0.00005, 'Bottle refilled by drifting.']
  ]],
  ['Gameplay', 'game', [
    ['fare', 0.2, 4, 0.05, 'Payout multiplier.'],
    ['timeAllowance', 0.4, 3, 0.05, 'How generous the broth-heat timer is.'],
    ['driftScore', 0.5, 8, 0.1, 'Drift points earned per second of slide.'],
    ['driftXp', 0, 0.6, 0.005, 'XP per drift point. Higher makes drifting the faster road to level 10.'],
    ['driftCash', 0, 3, 0.05, 'Yen per drift point, paid on delivery.']
  ]]
];

let tunerBuilt = false;
function buildTuner() {
  if (tunerBuilt) return;
  tunerBuilt = true;
  const body = $('tunerBody');
  TUNE_SCHEMA.forEach(([title, key, rows]) => {
    const g = document.createElement('div');
    g.className = 'tgroup';
    const h = document.createElement('h4');
    h.textContent = title;
    g.appendChild(h);
    rows.forEach(([field, min, max, stepv, hint]) => {
      const row = document.createElement('div');
      row.className = 'trow';
      const dec = stepv < 0.001 ? 5 : (stepv < 0.01 ? 3 : (stepv < 1 ? 2 : 0));
      const lab = document.createElement('div');
      lab.className = 'lab';
      const nm = document.createElement('span');
      nm.textContent = field;
      const val = document.createElement('b');
      val.textContent = TUNE[key][field].toFixed(dec);
      lab.appendChild(nm); lab.appendChild(val);
      const inp = document.createElement('input');
      inp.type = 'range';
      inp.min = min; inp.max = max; inp.step = stepv;
      inp.value = TUNE[key][field];
      inp.setAttribute('aria-label', title + ' ' + field);
      const hintEl = document.createElement('div');
      hintEl.className = 'hint';
      hintEl.textContent = hint;
      inp.oninput = () => {
        TUNE[key][field] = parseFloat(inp.value);
        val.textContent = TUNE[key][field].toFixed(dec);
        row.classList.toggle('changed', TUNE[key][field] !== TUNE_DEFAULTS[key][field]);
        applyTune();
      };
      row.appendChild(lab); row.appendChild(inp); row.appendChild(hintEl);
      row.dataset.key = key; row.dataset.field = field; row.dataset.dec = dec;
      g.appendChild(row);
    });
    body.appendChild(g);
  });

  $('tuneReset').onclick = () => {
    Object.keys(TUNE_DEFAULTS).forEach(k => Object.assign(TUNE[k], TUNE_DEFAULTS[k]));
    syncTuner();
    applyTune();
    toast('Tuning reset to defaults');
  };
  $('tuneCopy').onclick = () => {
    const text = 'const TUNE = ' + JSON.stringify(TUNE, null, 2) + ';';
    const done = () => toast('Tuning JSON copied — paste it over the TUNE block', 'good');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  };
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); }
  catch (e) { toast('Copy failed — check the console', 'bad'); console.log(text); }
  ta.remove();
}
function syncTuner() {
  document.querySelectorAll('#tunerBody .trow').forEach(row => {
    const k = row.dataset.key, f = row.dataset.field, dec = +row.dataset.dec;
    const v = TUNE[k][f];
    row.querySelector('input').value = v;
    row.querySelector('b').textContent = v.toFixed(dec);
    row.classList.toggle('changed', v !== TUNE_DEFAULTS[k][f]);
  });
}
function toggleTuner() {
  if (!S.dev) {
    toast('Tuning is developer-only — enter the code in Settings', 'bad');
    return;
  }
  buildTuner();
  const el = $('tuner');
  const on = !el.classList.contains('on');
  el.classList.toggle('on', on);
  if (on) syncTuner();
}

/* Swap the painted roads for geometry swept from the tile pack. */
function applyTileset() {
  if (!TILE_GEO || !TILE_MAT) return;
  const deck = tileDeckOnly(TILE_GEO);
  const juncs = findJunctions();
  let verts = 0, runs = 0;

  const addMesh = geo => {
    if (!geo) return;
    verts += geo.attributes.position.count;
    const m = new THREE.Mesh(geo, TILE_MAT);
    m.receiveShadow = true;
    m.castShadow = false;
    tileArt.push(m);
    world.add(m);
  };

  ROADS.forEach(path => {
    const { windows, length } = junctionWindows(path, juncs);
    // sweep the full profile between the junctions
    let cursor = 0;
    windows.forEach(w => {
      if (w.a - cursor > 1) { addMesh(sweepTileAlongPath(TILE_GEO, path, { s0: cursor, s1: w.a })); runs++; }
      cursor = Math.max(cursor, w.b);
    });
    if (length - cursor > 1) { addMesh(sweepTileAlongPath(TILE_GEO, path, { s0: cursor, s1: length })); runs++; }
  });

  // carriageway straight through each junction, one strip per road, nudged apart
  // by a millimetre so the overlap cannot z-fight
  if (deck) {
    juncs.forEach((j, ji) => {
      j.roads.forEach((path, ri) => {
        const w = junctionWindows(path, [j]).windows[0];
        if (!w) return;
        addMesh(sweepTileAlongPath(deck, path, {
          s0: Math.max(0, w.a - 3), s1: w.b + 3, lift: 0.004 * (ri + 1)
        }));
      });
    });
  }

  // Mountain roads are open road: carriageway only, no kerbs or footpaths.
  mountainPaths().forEach(p => { if (!p.custom) addMesh(sweepTileAlongPath(deck || TILE_GEO, p, { follow: true })); });

  roadArt.forEach(m => { world.remove(m); if (m.geometry) m.geometry.dispose(); });
  roadArt.length = 0;
  console.info('[noodles] tileset roads: ' + runs + ' runs, ' + juncs.length +
    ' junctions opened out, ' + verts + ' vertices');
  toast('Roads rebuilt from the tile pack · ' + juncs.length + ' junctions', 'good');
}

/* ---------- overlays / input ---------- */
const keys = {};
const pressed = {};
function keyPressed(code) { if (pressed[code]) { pressed[code] = false; return true; } return false; }

function openOverlay(id) {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('on'));
  $(id).classList.add('on');
  S.paused = true;
}
function closeOverlays() {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('on'));
  S.paused = false;
}

function bindUI() {
  $('btnStart').onclick = () => { sfx.init(); closeOverlays(); S.running = true; $('hud').classList.add('on'); };
  $('btnCloseGarage').onclick = closeOverlays;
  $('btnLuClose').onclick = closeOverlays;
  $('btnLuGarage').onclick = () => { renderGarage(); openOverlay('garage'); };
  $('btnNextRun').onclick = () => { closeOverlays(); };
  $('btnResume').onclick = closeOverlays;
  $('btnPauseGarage').onclick = () => { renderGarage(); openOverlay('garage'); };
  $('btnPauseSettings').onclick = openSettings;
  $('btnCloseSettings').onclick = closeOverlays;
  const gearLabel = () => 'Gearbox: ' + (autoBox ? 'automatic' : 'manual');
  const shadowLabel = () => 'Shadows: ' + (S.shadows ? 'on' : 'off');
  const syncBtns = () => {
    $('btnAuto').textContent = gearLabel(); $('btnAuto2').textContent = gearLabel();
    $('btnShadows').textContent = shadowLabel(); $('btnShadows2').textContent = shadowLabel();
  };
  const toggleAuto = () => { autoBox = !autoBox; syncBtns(); };
  const toggleShadow = () => {
    S.shadows = !S.shadows;
    renderer.shadowMap.enabled = S.shadows;
    sunLight.castShadow = S.shadows;
    scene.traverse(o => { if (o.isMesh || o.isInstancedMesh) o.material && (o.material.needsUpdate = true); });
    syncBtns();
  };
  $('btnAuto').onclick = toggleAuto; $('btnAuto2').onclick = toggleAuto;
  $('btnShadows').onclick = toggleShadow; $('btnShadows2').onclick = toggleShadow;
  syncBtns();

  document.querySelectorAll('.tab').forEach(t => {
    t.onclick = () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
      t.classList.add('on');
      $('tabPaint').style.display = t.dataset.tab === 'paint' ? '' : 'none';
      $('tabWheels').style.display = t.dataset.tab === 'wheels' ? '' : 'none';
      $('tabKit').style.display = t.dataset.tab === 'kit' ? '' : 'none';
      $('tabUpg').style.display = t.dataset.tab === 'upg' ? '' : 'none';
      if (t.dataset.tab === 'upg') renderUpgrades();
    };
  });
  $('plate').oninput = e => { customFor(S.carId).plate = e.target.value.toUpperCase(); };
  peBind();
  loadLaps();
  $('btnCredits').onclick = () => { renderCredits(); openOverlay('credits'); };
  $('btnCreditsBack').onclick = () => { openOverlay('pause'); };

  addEventListener('keydown', e => {
    if (e.repeat) { keys[e.code] = true; return; }
    keys[e.code] = true; pressed[e.code] = true;
    sfx.init();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(e.code) >= 0) e.preventDefault();
    if (e.code === 'Escape') {
      if (document.querySelector('.overlay.on')) closeOverlays();
      else openOverlay('pause');
    }
    if (e.code === 'KeyG' && S.running && !document.querySelector('.overlay.on')) {
      renderGarage(); openOverlay('garage');
    }
    if (e.code === 'KeyC' && S.running) CAM.mode = (CAM.mode + 1) % 3;
    if (e.code === 'KeyT' && S.running && !document.querySelector('.overlay.on')) toggleTuner();
    if (e.code === 'KeyH') sfx.horn();
    if (e.code === 'KeyM' && S.running) toggleBigMap();
    if (e.code === 'KeyP' && S.running && !document.querySelector('.overlay.on')) peOpen();
    if (e.code === 'KeyR' && S.running) { resetCar(false); breakChain(); toast('Recovered to the nearest road'); }
  });
  addEventListener('keyup', e => { keys[e.code] = false; });

  // hold B to look behind, click-drag to look around; both spring back
  const canvas = $('scene');
  let dragId = null, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', e => {
    if (!S.running || S.paused) return;
    dragId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    CAM.dragging = true;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (dragId !== e.pointerId || !CAM.dragging) return;
    CAM.orbitYaw = clamp(CAM.orbitYaw - (e.clientX - lastX) * 0.006 * TUNE.camera.mouseSpeed, -Math.PI, Math.PI);
    CAM.orbitPitch = clamp(CAM.orbitPitch + (e.clientY - lastY) * 0.002 * TUNE.camera.mouseSpeed, -0.35, 0.9);
    lastX = e.clientX; lastY = e.clientY;
  });
  const endDrag = e => {
    if (dragId !== e.pointerId) return;
    dragId = null; CAM.dragging = false;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

function readInput() {
  const typing = document.activeElement &&
    (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');
  const P = S.paused || !S.running || typing;
  input.thr = (!P && (keys.KeyW || keys.ArrowUp)) ? 1 : 0;
  input.brk = (!P && (keys.KeyS || keys.ArrowDown)) ? 1 : 0;
  input.left = (!P && (keys.KeyA || keys.ArrowLeft)) ? 1 : 0;
  input.right = (!P && (keys.KeyD || keys.ArrowRight)) ? 1 : 0;
  input.hand = !P && !!keys.Space;
  input.clutch = !P && (!!keys.ShiftLeft || !!keys.ShiftRight);
  input.boost = !P && !!keys.KeyN;
  CAM.lookBack = !P && !!keys.KeyB;
  if (!P) {
    if (keyPressed('KeyQ')) shiftDown();
    // E shifts up while you're carrying a tray; with an empty boot it loads one at the shop
    if (keyPressed('KeyE')) shiftUp();
  }
}

/* ---------- car visual sync ---------- */
const _up = new THREE.Vector3(0, 1, 0);
const _slopeQ = new THREE.Quaternion(), _yawQ = new THREE.Quaternion();
const _leanQ = new THREE.Quaternion(), _targetQ = new THREE.Quaternion();
const _leanE = new THREE.Euler();
let wheelRoll = 0, shownRoll = 0, shownPitch = 0;
function syncCar(dt) {
  if (!carObj) return;
  carObj.position.set(VIEW.x, VIEW.y, VIEW.z);

  // Lean is folded into the target orientation. Applying it after the slerp
  // compounds frame over frame and rolls the car onto its roof.
  const rollTarget = clamp(V.aLat * 0.0065, -0.055, 0.055) * TUNE.camera.bodyRoll;
  const pitchTarget = clamp(-V.aLong * 0.0045, -0.04, 0.04) * TUNE.camera.bodyRoll;
  shownRoll = lerp(shownRoll, rollTarget, clamp(dt * 7, 0, 1));
  shownPitch = lerp(shownPitch, pitchTarget, clamp(dt * 6, 0, 1));

  const n = terrainNormal(VIEW.x, VIEW.z);
  _slopeQ.setFromUnitVectors(_up, n);
  _yawQ.setFromAxisAngle(_up, VIEW.yaw);
  _leanE.set(shownPitch, 0, shownRoll, 'ZXY');
  _leanQ.setFromEuler(_leanE);
  _targetQ.copy(_slopeQ).multiply(_yawQ).multiply(_leanQ);
  carObj.quaternion.slerp(_targetQ, clamp(dt * 14, 0, 1));

  wheelRoll += (V.vLong / spec.shape.wr) * dt;
  const ws = carObj.userData.wheels;
  for (const w of ws) {
    if (w.front) w.steer.rotation.y = V.steerVis;
    // a loaded model's wheels are whatever size the artist made them
    const rr2 = w.hub.userData.radius || spec.shape.wr;
    (w.spin || w.hub).rotation.x = wheelRoll * (spec.shape.wr / rr2) * (V.airborne ? 0.3 : 1);
  }
}

/* The roof arrow: amber toward a drop, red back to the shop. */
function updateGuideArrow(now) {
  if (!guideArrow || !carObj) return;
  if (!S.running) { guideArrow.visible = false; return; }
  const toShop = !S.job;
  const tx = toShop ? HQ.x : S.job.stops[S.job.idx].x;
  const tz = toShop ? HQ.z - 13 : S.job.stops[S.job.idx].z;
  const dist = Math.hypot(tx - V.x, tz - V.z);
  guideArrow.visible = dist > 11;
  if (!guideArrow.visible) return;
  const bob = Math.sin(now * 0.0032) * 0.12;
  guideArrow.position.set(VIEW.x, VIEW.y + spec.shape.hgt + 5.2 + bob, VIEW.z);
  guideArrow.rotation.y = Math.atan2(tx - VIEW.x, tz - VIEW.z);
  const col = toShop ? 0xc8453c : 0xf3b545;
  guideArrow.userData.mat.color.setHex(col);
  guideArrow.userData.mat.emissive.setHex(col);
  guideArrow.userData.mat.emissiveIntensity = 0.55 + Math.sin(now * 0.005) * 0.2;
}

/* smoke + skid emission */
function emitEffects(dt) {
  const sp = Math.hypot(V.vx, V.vz);
  const slipping = (V.slip > 0.22 && sp > 6) || (V.wheelSpin > 0.25 && Math.abs(V.vLong) < 26) || input.hand && sp > 4;
  const surf = V.surface;
  const fx = Math.sin(V.yaw), fz = Math.cos(V.yaw);
  const s = spec.shape;
  for (const side of [-1, 1]) {
    const wx = V.x - fx * (s.wb / 2) + fz * side * (s.track / 2);
    const wz = V.z - fz * (s.wb / 2) - fx * side * (s.track / 2);
    const wy = terrainH(wx, wz);
    if (slipping) {
      if (Math.random() < clamp(V.slip * 2 + V.wheelSpin, 0.2, 1)) puff(wx, wy + 0.25, wz, surf.dust || undefined);
      if (surf === SURF.road) layMark('r' + side, wx, wy, wz, V.yaw, clamp(V.slip * 2.2, 0.15, 1));
    }
    // loose ground throws material off the wheels whenever they are working
    if (surf.dust && sp > 5) {
      const rate = clamp(sp / 26 + V.slip * 1.6 + V.wheelSpin * 0.8, 0, 1.3);
      if (Math.random() < rate) puff(wx + rr(-0.5, 0.5), wy + rr(0.1, 0.6), wz + rr(-0.5, 0.5), surf.dust);
    }
  }
}

/* ---------- boot ---------- */
function boot() {
  initRenderer();
  buildTextures();
  buildEnvMap();
  clouds = buildSky();
  world = new THREE.Group();
  scene.add(world);
  world.add(buildGround());

  const inst = makeInstancers();
  step('Laying the roads…', () => {
    buildRoadGrid();
    for (const r of ROADS) {
      roadArt.push(pavement(r, r.w + 0.2, paveHalf(r.w), 0.17));
      roadArt.push(ribbon(r, r.w, 0.24, 0xffffff, {
        edge: 0xa9a396, po: -4, map: TEX.asphalt, vScale: 11, rough: 0.93
      }));
      roadArt.push(edgeLines(r, r.w - 1.5, 0.42, 0.31, COL.line));
      roadArt.push(centerLines(r, 0.31));
    }
    roadArt.forEach(m => world.add(m));
    for (const d of DIRT) {
      // a scuffed verge blends the track into the grass instead of ending on a hard edge
      world.add(ribbon(d, d.w + 2.6, 0.12, 0x86a05e, { edge: 0x7d9857, po: -1, map: TEX.grass, vScale: 9, rough: 1 }));
      world.add(ribbon(d, d.w, 0.16, 0xffffff, { edge: 0xbda078, po: -3, map: TEX.dirt, vScale: 8, rough: 1 }));
    }
  });
  step('Cutting the pass…', () => {
    mtnMesh = buildMountain();
    world.add(mtnMesh);
    mountainProps(world, inst);
    // the pass gets the same asphalt and markings as the streets below
    mountainPaths().forEach(pass => {
      if (pass.custom) return;
      roadArt.push(ribbon(pass, pass.w, 0.26, 0xffffff, {
        follow: true, map: TEX.asphalt, vScale: 11, edge: 0xbdb7a6, po: -4, rough: 0.86
      }));
      roadArt.push(edgeLines(pass, pass.w - 1.2, 0.36, 0.34, COL.line, true));
      roadArt.push(centerLines(pass, 0.34, true));
      roadArt.slice(-3).forEach(m => world.add(m));
    });
  });
  step('Opening the shop…', () => buildHQ(world));
  step('Building Han…', () => generateCity(inst));
  step('Planting the last cedar…', () => {
    commitInstances(inst);
    (inst._poleRuns || []).forEach(run => {
      const cable = buildCables(run);
      if (cable) world.add(cable);
    });
  });
  step('Warming the engine…', () => {
    buildColliderGrid();
    marker = makeMarker(); scene.add(marker);
    guideArrow = makeGuideArrow(); scene.add(guideArrow);
    initSmoke(); initMarks();
    selectCar(STARTER);
    resetCar(true);
    applyTune();
    loadTileset().then(ok => { if (ok) applyTileset(); });
    refreshWallet(); refreshJobCard();
    bindUI();
    $('tachTrack').setAttribute('d', arcPath(0, 1));
    $('tachRed').setAttribute('d', arcPath(0.9, 1));
    $('loader').classList.add('off');
    setTimeout(() => $('loader').remove(), 600);
    loop();
  });
}

const steps = [];
function step(label, fn) {
  steps.push([label, fn]);
  if (steps.length === 1) runSteps();
}
function runSteps() {
  const [label, fn] = steps[0];
  $('loadStat').textContent = label;
  requestAnimationFrame(() => setTimeout(() => {
    fn();
    steps.shift();
    if (steps.length) runSteps();
  }, 16));
}

/* ---------- main loop ---------- */
let last = performance.now(), acc = 0;
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  let dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  readInput();
  const active = S.running && !S.paused;

  if (active) {
    acc += dt;
    let guard = 0;
    const H = 1 / 120;
    while (acc >= H && guard++ < 8) {
      VPREV.x = V.x; VPREV.y = V.y; VPREV.z = V.z; VPREV.yaw = V.yaw;
      stepPhysics(H);
      acc -= H;
    }
    const alpha = clamp(acc / H, 0, 1);
    VIEW.x = lerp(VPREV.x, V.x, alpha);
    VIEW.y = lerp(VPREV.y, V.y, alpha);
    VIEW.z = lerp(VPREV.z, V.z, alpha);
    VIEW.yaw = VPREV.yaw + wrapAngle(V.yaw - VPREV.yaw) * alpha;
    updateJob(dt);
    updateDrift(dt);
    emitEffects(dt);
  } else {
    acc = 0;
    snapView();
    hidePrompt();
  }

  syncCar(dt);
  updateGuideArrow(now);
  updateSmoke(dt);
  updateCamera(dt, carObj);
  updateCompass();
  refreshDash();
  refreshNitro();
  drawMinimap();
  if ($('mapview').classList.contains('on')) drawBigMap();

  updateTimeOfDay(dt, active);
  if (active) updateLap(dt);
  refreshLapHud(dt);
  if (S.shadows) {
    sunLight.target.position.set(V.x, 0, V.z);
    sunLight.target.updateMatrixWorld();
  }
  if (clouds) {
    clouds.position.x += 0.9 * dt;
    if (clouds.position.x > 2400) clouds.position.x = -2400;
  }

  sfx.update(V.rpm, input.thr, clamp((V.slip - 0.15) * 2.4 + V.wheelSpin, 0, 1) * (Math.hypot(V.vx, V.vz) > 4 ? 1 : 0),
    Math.hypot(V.vx, V.vz), !active);

  renderer.render(scene, camera);
  for (const k in pressed) pressed[k] = false;
}

boot();
