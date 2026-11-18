// Rivais na pista (Modo Corrida de 3 voltas): 3 carros de IA usando CAR.models[0..1],
// seguem AI.line/AI.vt com desvio para ultrapassagem, colisão elástica 2D e classificação contínua.
// Nenhuma alocação em rivStep() ou rivPose().
const RIV_N = 3;
const RACE_LAPS = 3;
const RIV_CAP_H = 0.95;
const RIV_CAP_R = 0.85;

function rivMakeCar(idx, nome, modelIdx, paintIdx, pace, gridS, gridD) {
  return {
    idx, nome, modelIdx, paintIdx, pace, gridS, gridD,
    activeModel: 0, bodyKind: modelIdx, wheelR: 0.281,
    hubs: [[1.181, 0.281, -0.67], [1.181, 0.281, 0.67], [-1.181, 0.281, -0.65], [-1.181, 0.281, 0.65]],
    slotBody: 0, slotWheel: [0, 0, 0, 0],
    items: [], glassItems: [], vis: false,
    s: 0, d: 0, lastS: 0, laps: 0, prog: 0, hint: -1,
    x: 0, y: 0, z: 0, yaw: 0, speed: 0, vLat: 0,
    gPitch: 0, gRoll: 0, roll: 0, pitch: 0, steer: 0, brake: 0,
    px: 0, py: 0, pz: 0, pyaw: 0, pgPitch: 0, pgRoll: 0, proll: 0, ppitch: 0, psteer: 0,
    spin: new Float32Array(4), pspin: new Float32Array(4), omega: new Float32Array(4),
    finished: false, finishTime: 0,
  };
}

const RIV = {
  active: false,
  finished: false,
  vis: false,
  _init: false,
  playerRank: 4,
  playerLap: 1,
  finishOrder: new Int32Array(4),
  finishTime: new Float64Array(4),
  finishCount: 0,
  cars: [
    rivMakeCar(0, 'Gol Vermelho', 1, 2, 1.00, -8, -1.8),
    rivMakeCar(1, 'Uno da Firma', 0, 1, 0.975, -16, 1.8),
    rivMakeCar(2, 'Gol Prata', 1, 3, 0.95, -24, -1.8),
  ],
  _rp: new Float64Array(5),
  _rq: new Float64Array(12),
  _col: new Float64Array(8),
  _podId: new Int32Array(4),
  _podT: new Float64Array(4),
  _g: m4(), _b: m4(), _t: m4(), _t2: m4(), _w: m4(),
};

function rivSetVis(vis) {
  const v = !!vis;
  RIV.vis = v;
  for (let i = 0; i < RIV_N; i++) {
    const its = RIV.cars[i].items;
    for (let j = 0; j < its.length; j++) its[j].on = v;
  }
}

function rivRenderInit() {
  if (RIV._init || GAME.mode === 'test' || GAME.mode === 'car' || typeof CAR === 'undefined' || !CAR.models || !CAR.models[0] || !CAR.set) return;
  RIV._init = true;
  for (let i = 0; i < RIV_N; i++) {
    const rv = RIV.cars[i];
    const mIdx = rv.modelIdx === 1 && CAR.models[1] ? 1 : 0;
    const M = CAR.models[mIdx];
    rv.activeModel = mIdx;
    rv.bodyKind = M.bodyKind !== undefined ? M.bodyKind : mIdx;
    rv.wheelR = M.wheelR || 0.281;
    if (M.hubs) rv.hubs = M.hubs;
    rv.slotBody = objSlot();
    for (let w = 0; w < 4; w++) rv.slotWheel[w] = objSlot();
    rv.items.length = 0;
    rv.glassItems.length = 0;
    const pushItem = (it, isGlass) => {
      if (!it) return;
      it.on = false;
      rv.items.push(it);
      if (isGlass) rv.glassItems.push(it);
    };
    if (M.bodyMesh) pushItem(CAR.set.add(M.bodyMesh, rv.slotBody, 3), false);
    if (M.driverMesh) pushItem(CAR.set.add(M.driverMesh, rv.slotBody, 3), false);
    if (M.glassMesh && CAR.glass) pushItem(CAR.glass.add_(M.glassMesh, rv.slotBody), true);
    if (M.wheelMesh) {
      for (let w = 0; w < 4; w++) {
        pushItem(CAR.set.add(M.wheelMesh, rv.slotWheel[w], 3), false);
        if (M.wheelBlurMesh) pushItem(CAR.set.add(M.wheelBlurMesh, rv.slotWheel[w], 1), false);
      }
    }
    if (typeof carApplyPaint === 'function') carApplyPaint(rv.slotBody, rv.paintIdx, rv.bodyKind);
  }
  RIV.vis = false;
}

function rivRestart() {
  const L = TRK.L, N = TRK.N, ds = TRK.ds;
  const raceOn = !!(typeof GS !== 'undefined' && GS.raceMode && !GS.replayOn && !GS.poseOn && !GS._warm);
  RIV.active = raceOn;
  RIV.finished = false;
  RIV.playerRank = 4;
  RIV.playerLap = 1;
  RIV.finishCount = 0;
  RIV.finishOrder.fill(0);
  RIV.finishTime.fill(0);
  for (let i = 0; i < RIV_N; i++) {
    const rv = RIV.cars[i];
    rv.s = L > 0 ? ((L + rv.gridS) % L + L) % L : 0;
    rv.lastS = rv.s;
    rv.d = rv.gridD;
    rv.laps = 0;
    rv.prog = rv.gridS;
    rv.hint = -1;
    rv.speed = 0;
    rv.vLat = 0;
    rv.roll = 0;
    rv.pitch = 0;
    rv.steer = 0;
    rv.brake = 0;
    rv.spin.fill(0);
    rv.pspin.fill(0);
    rv.omega.fill(0);
    rv.finished = false;
    rv.finishTime = 0;
    rv.vis = false;
    if (N > 0) {
      trackPos(rv.s, rv.d, RIV._rp);
      rv.x = RIV._rp[0]; rv.y = RIV._rp[1]; rv.z = RIV._rp[2];
      rv.yaw = Math.atan2(RIV._rp[4], RIV._rp[3]);
      const u = rv.s / ds, i0 = ((Math.floor(u) % N) + N) % N, f = u - Math.floor(u);
      rv.hint = i0;
      rv.gPitch = Math.atan(trkAt(TRK.slope, i0, f));
      rv.gRoll = -Math.atan(trkAt(TRK.bank, i0, f));
    } else {
      rv.x = rv.y = rv.z = rv.yaw = rv.gPitch = rv.gRoll = 0;
    }
    rv.px = rv.x; rv.py = rv.y; rv.pz = rv.z; rv.pyaw = rv.yaw;
    rv.pgPitch = rv.gPitch; rv.pgRoll = rv.gRoll;
    rv.proll = 0; rv.ppitch = 0; rv.psteer = 0;
  }
  rivSetVis(raceOn && !(typeof GS !== 'undefined' && GS.frozen));
  if (raceOn) rivPose();
}

// Teste cápsula×cápsula 2D sem argumentos numéricos nem alocações: lê/escreve RIV._col.
function rivCapTest() {
  const C = RIV._col;
  const ax = C[0], az = C[1], ay = C[2], bx = C[3], bz = C[4], by = C[5];
  const h2 = RIV_CAP_H * 2;
  const d1x = Math.cos(ay) * h2, d1z = Math.sin(ay) * h2;
  const d2x = Math.cos(by) * h2, d2z = Math.sin(by) * h2;
  const p1x = ax - d1x * 0.5, p1z = az - d1z * 0.5;
  const p2x = bx - d2x * 0.5, p2z = bz - d2z * 0.5;
  const rx = p1x - p2x, rz = p1z - p2z;
  const a = h2 * h2, e = h2 * h2;
  const b = d1x * d2x + d1z * d2z;
  const c = d1x * rx + d1z * rz;
  const f = d2x * rx + d2z * rz;
  const denom = a * e - b * b;
  let s = 0, t = 0;
  if (denom > 1e-6) {
    s = (b * f - c * e) / denom;
    if (s < 0) s = 0; else if (s > 1) s = 1;
  }
  t = (b * s + f) / e;
  if (t < 0) {
    t = 0;
    s = -c / a;
    if (s < 0) s = 0; else if (s > 1) s = 1;
  } else if (t > 1) {
    t = 1;
    s = (b - c) / a;
    if (s < 0) s = 0; else if (s > 1) s = 1;
  }
  const c1x = p1x + d1x * s, c1z = p1z + d1z * s;
  const c2x = p2x + d2x * t, c2z = p2z + d2z * t;
  let dx = c1x - c2x, dz = c1z - c2z;
  const dist = Math.hypot(dx, dz);
  const minD = RIV_CAP_R * 2;
  if (dist >= minD) { C[0] = 0; return; }
  if (dist > 1e-6) {
    dx /= dist; dz /= dist;
  } else {
    dx = ax - bx; dz = az - bz;
    const dl = Math.hypot(dx, dz);
    if (dl > 1e-6) { dx /= dl; dz /= dl; }
    else { dx = -Math.sin(by); dz = Math.cos(by); }
  }
  C[0] = minD - dist;
  C[1] = dx; C[2] = dz;
  C[3] = (c1x + c2x) * 0.5; C[4] = (c1z + c2z) * 0.5;
}

function rivSyncFromWorld(rv) {
  const L = TRK.L, Q = RIV._rq;
  Q[0] = rv.x; Q[1] = rv.z;
  trackLocateQ(rv.hint, Q);
  const ns = Q[2], i0 = Q[4] | 0, f = Q[5];
  rv.hint = i0;
  const ds = ns - rv.s;
  if (ds < -L * 0.5) rv.laps++;
  else if (ds > L * 0.5) rv.laps--;
  rv.s = ns;
  const bLimL = trkAt(TRK.barL, i0, f) - 0.9;
  const bLimR = trkAt(TRK.barR, i0, f) - 0.9;
  rv.d = clamp(Q[3], -bLimL, bLimR);
  trackPos(rv.s, rv.d, RIV._rp);
  rv.x = RIV._rp[0]; rv.y = RIV._rp[1]; rv.z = RIV._rp[2];
  rv.prog = (rv.laps - 1) * L + rv.s;
}

function rivStep() {
  const raceOn = typeof GS !== 'undefined' && GS.raceMode && !GS.replayOn && !GS.poseOn && !GS._warm && !GS.frozen;
  if (!RIV.active || !raceOn || !TRK.N || !AI.vt || !AI.line) return;
  const V = VEH, P = VP, L = TRK.L, N = TRK.N, ds = TRK.ds, dt = PHYS_DT;
  const totalTarget = RACE_LAPS * L;
  const playerProg = (V.laps - 1) * L + V.s;
  const gripF = (typeof ENV !== 'undefined' && !GS.replayOn && !GS.poseOn) ? Math.sqrt(ENV.grip) : 1;
  const hwLim = TRK.hw - 1.05;
  const pOx = -(P.L * 0.5 - P.a);
  const pCy = Math.cos(V.yaw), pSy = Math.sin(V.yaw);
  const pSpeed = Math.hypot(V.vx, V.vy);

  for (let i = 0; i < RIV_N; i++) {
    const rv = RIV.cars[i];
    rv.px = rv.x; rv.py = rv.y; rv.pz = rv.z; rv.pyaw = rv.yaw;
    rv.pgPitch = rv.gPitch; rv.pgRoll = rv.gRoll;
    rv.proll = rv.roll; rv.ppitch = rv.pitch; rv.psteer = rv.steer;
    rv.pspin.set(rv.spin);

    const u = rv.s / ds, i0 = ((Math.floor(u) % N) + N) % N, f = u - Math.floor(u);
    let vCorner = 1e9;
    for (let q = 0; q <= 6; q += 3) {
      const vc = AI.vt[(i0 + q) % N];
      if (vc < vCorner) vCorner = vc;
    }
    const rb = clamp((playerProg - rv.prog) * 0.0005, -0.04, 0.04);
    const pace = rv.pace * (1 + rb);
    let vTgt = Math.min(42.5 * pace, vCorner * 0.97 * pace * gripF);

    const la = (i0 + Math.round((4 + rv.speed * 0.18) / ds)) % N;
    let tgtD = AI.line[la];
    let bestDs = 14.0;
    let blockD = 0, blockSpd = 0, hasBlock = false;
    for (let o = -1; o < RIV_N; o++) {
      if (o === i) continue;
      const os = o < 0 ? V.s : RIV.cars[o].s;
      const od = o < 0 ? V.d : RIV.cars[o].d;
      const ospd = o < 0 ? pSpeed : RIV.cars[o].speed;
      let dsO = os - rv.s;
      if (dsO > L * 0.5) dsO -= L;
      else if (dsO < -L * 0.5) dsO += L;
      if (dsO > -2.0 && dsO < bestDs && Math.abs(od - rv.d) < 2.6) {
        bestDs = dsO;
        blockD = od;
        blockSpd = ospd;
        hasBlock = true;
      }
    }
    if (hasBlock) {
      const leftRoom = blockD - (-hwLim);
      const rightRoom = hwLim - blockD;
      let side;
      if (rv.d < blockD - 0.15 && leftRoom >= 2.1) side = -1;
      else if (rv.d > blockD + 0.15 && rightRoom >= 2.1) side = 1;
      else side = rightRoom > leftRoom ? 1 : -1;
      tgtD = clamp(blockD + side * 2.45, -hwLim, hwLim);
      if (bestDs > 1.0 && bestDs < 5.2 && Math.abs(blockD - rv.d) < 1.65) {
        vTgt = Math.min(vTgt, Math.max(blockSpd + 1.0, 8));
      }
    } else {
      tgtD = clamp(tgtD, -hwLim, hwLim);
    }

    const prevSpd = rv.speed;
    if (rv.speed < vTgt) {
      const acc = (2.1 + 3.4 * Math.max(0, 1 - rv.speed / 30)) * pace;
      rv.speed = Math.min(vTgt, rv.speed + acc * dt);
      rv.brake = 0;
    } else {
      const brk = Math.min(9.5, (rv.speed - vTgt) * 2.8 + 1.5);
      rv.speed = Math.max(vTgt, rv.speed - brk * dt);
      rv.brake = rv.speed > vTgt + 1.2 ? 1 : 0;
    }
    const ax = (rv.speed - prevSpd) / dt;
    const vLatTgt = clamp((tgtD - rv.d) * 2.4, -4.8, 4.8);
    rv.vLat += (vLatTgt - rv.vLat) * 0.15;
    rv.d = clamp(rv.d + rv.vLat * dt, -hwLim, hwLim);

    const curv = trkAt(TRK.k, i0, f);
    const arcK = clamp(1 - rv.d * curv, 0.55, 1.6);
    const vFwd = Math.sqrt(Math.max(0, rv.speed * rv.speed - rv.vLat * rv.vLat));
    rv.lastS = rv.s;
    rv.s += (vFwd / arcK) * dt;
    if (rv.s >= L) { rv.s -= L; rv.laps++; }
    else if (rv.s < 0) { rv.s += L; rv.laps--; }
    rv.prog = (rv.laps - 1) * L + rv.s;

    trackPos(rv.s, rv.d, RIV._rp);
    rv.x = RIV._rp[0]; rv.y = RIV._rp[1]; rv.z = RIV._rp[2];
    rv.yaw = Math.atan2(RIV._rp[4], RIV._rp[3]) + Math.atan2(rv.vLat, Math.max(rv.speed, 4));
    const u2 = rv.s / ds, j0 = ((Math.floor(u2) % N) + N) % N, jf = u2 - Math.floor(u2);
    rv.hint = j0;
    const gp = Math.atan(trkAt(TRK.slope, j0, jf));
    const gr = -Math.atan(trkAt(TRK.bank, j0, jf));
    rv.gPitch += (gp - rv.gPitch) * 0.35;
    rv.gRoll += (gr - rv.gRoll) * 0.35;

    const ay = rv.speed * rv.speed * curv;
    const rollT = clamp(ay * 0.0058, -0.062, 0.062);
    const pitchT = clamp(-ax * 0.003, -0.03, 0.03);
    rv.roll += (rollT - rv.roll) * 0.15;
    rv.pitch += (pitchT - rv.pitch) * 0.15;
    const steerT = clamp(Math.atan(2.36 * curv) + Math.atan2(rv.vLat, Math.max(rv.speed, 6)) * 0.5, -0.45, 0.45);
    rv.steer += (steerT - rv.steer) * 0.25;
    const w = rv.speed / rv.wheelR;
    for (let k = 0; k < 4; k++) {
      rv.omega[k] = w;
      rv.spin[k] += w * dt;
    }
  }

  // Colisão rival × rival
  const C = RIV._col;
  for (let i = 0; i < RIV_N; i++) {
    const a = RIV.cars[i];
    for (let j = i + 1; j < RIV_N; j++) {
      const b = RIV.cars[j];
      C[0] = a.x; C[1] = a.z; C[2] = a.yaw;
      C[3] = b.x; C[4] = b.z; C[5] = b.yaw;
      rivCapTest();
      const pen = C[0];
      if (pen > 0) {
        const nx = C[1], nz = C[2], push = pen * 0.5;
        a.x += nx * push; a.z += nz * push;
        b.x -= nx * push; b.z -= nz * push;
        const ca = Math.cos(a.yaw), sa = Math.sin(a.yaw);
        const cb = Math.cos(b.yaw), sb = Math.sin(b.yaw);
        const avx = a.speed * ca, avz = a.speed * sa;
        const bvx = b.speed * cb, bvz = b.speed * sb;
        const vn = (avx - bvx) * nx + (avz - bvz) * nz;
        if (vn < 0) {
          const imp = -1.35 * vn * 0.5;
          a.speed = Math.max(0, (avx + nx * imp) * ca + (avz + nz * imp) * sa);
          b.speed = Math.max(0, (bvx - nx * imp) * cb + (bvz - nz * imp) * sb);
        }
        rivSyncFromWorld(a);
        rivSyncFromWorld(b);
      }
    }
  }

  // Colisão jogador × rival
  let pcx = V.x + pCy * pOx, pcz = V.z + pSy * pOx;
  for (let i = 0; i < RIV_N; i++) {
    const rv = RIV.cars[i];
    C[0] = pcx; C[1] = pcz; C[2] = V.yaw;
    C[3] = rv.x; C[4] = rv.z; C[5] = rv.yaw;
    rivCapTest();
    const pen = C[0];
    if (pen > 0) {
      const nx = C[1], nz = C[2], cpx = C[3], cpz = C[4];
      const push = pen * 0.5;
      V.x += nx * push; V.z += nz * push;
      pcx += nx * push; pcz += nz * push;
      rv.x -= nx * push; rv.z -= nz * push;
      let wvx = V.vx * pCy - V.vy * pSy, wvz = V.vx * pSy + V.vy * pCy;
      const cr = Math.cos(rv.yaw), sr = Math.sin(rv.yaw);
      const rvx = rv.speed * cr, rvz = rv.speed * sr;
      const vn = (wvx - rvx) * nx + (wvz - rvz) * nz;
      if (vn < 0) {
        const imp = -1.35 * vn * 0.5;
        wvx += nx * imp; wvz += nz * imp;
        V.vx = wvx * pCy + wvz * pSy;
        V.vy = -wvx * pSy + wvz * pCy;
        const rx = cpx - V.x, rz = cpz - V.z;
        V.r += (rx * nz - rz * nx) * imp * 0.28;
        V.r *= 0.92;
        rv.speed = Math.max(0, (rvx - nx * imp) * cr + (rvz - nz * imp) * sr);
        if (vn < -1.8) V.hits++;
      }
      rivSyncFromWorld(rv);
    }
  }

  // Registro de chegada dos rivais antes do jogador
  if (!RIV.finished) {
    for (let i = 0; i < RIV_N; i++) {
      const rv = RIV.cars[i];
      if (!rv.finished && rv.prog >= totalTarget) {
        const fr = rv.speed > 1e-3 ? clamp(rv.s / (rv.speed * dt), 0, 1) : 0;
        rv.finishTime = V.time - fr * dt;
        rv.finished = true;
      }
    }
  }

  // Chegada do jogador: fecha corrida e ordena os 4 tempos para o pódio
  if (!RIV.finished && playerProg >= totalTarget) {
    RIV.finished = true;
    const st = V.vx * dt, fr = st > 1e-6 ? clamp(V.s / st, 0, 1) : 0;
    const pTime = V.time - fr * dt;
    const pid = RIV._podId, pt = RIV._podT;
    pid[0] = 0; pt[0] = pTime;
    for (let i = 0; i < RIV_N; i++) {
      const rv = RIV.cars[i];
      pid[i + 1] = i + 1;
      if (rv.finished) {
        pt[i + 1] = rv.finishTime;
      } else {
        const rem = Math.max(0, totalTarget - rv.prog);
        rv.finishTime = V.time + rem / Math.max(rv.speed, 18);
        pt[i + 1] = rv.finishTime;
      }
    }
    for (let a = 1; a < 4; a++) {
      const keyId = pid[a], keyT = pt[a];
      let b = a - 1;
      while (b >= 0 && pt[b] > keyT) {
        pid[b + 1] = pid[b];
        pt[b + 1] = pt[b];
        b--;
      }
      pid[b + 1] = keyId;
      pt[b + 1] = keyT;
    }
    for (let k = 0; k < 4; k++) {
      RIV.finishOrder[k] = pid[k];
      RIV.finishTime[k] = pt[k];
      if (pid[k] === 0) RIV.playerRank = k + 1;
    }
    RIV.finishCount = 4;
    RIV.playerLap = RACE_LAPS;
  } else if (!RIV.finished) {
    RIV.playerLap = clamp(V.laps, 1, RACE_LAPS);
    let rank = 1;
    for (let i = 0; i < RIV_N; i++) {
      if (RIV.cars[i].prog > playerProg) rank++;
    }
    RIV.playerRank = rank;
  }
}

function rivPose() {
  if (!RIV._init) return;
  const vis = !!(RIV.active && typeof GS !== 'undefined' && GS.raceMode && !GS.replayOn && !GS.poseOn && !GS._warm && !GS.frozen);
  if (!vis) {
    if (RIV.vis) rivSetVis(false);
    for (let i = 0; i < RIV_N; i++) RIV.cars[i].vis = false;
    return;
  }
  if (!RIV.vis) rivSetVis(true);
  const al = GS.alpha, lights = GS.lightsOn ? 1 : 0, cut = !!GS.cut;
  const G0 = RIV._g, B = RIV._b, T = RIV._t, D2 = RIV._t2, W = RIV._w;
  for (let i = 0; i < RIV_N; i++) {
    const rv = RIV.cars[i], sb = rv.slotBody;
    if (!sb) continue;
    const x = rv.px + (rv.x - rv.px) * al;
    const y = rv.py + (rv.y - rv.py) * al;
    const z = rv.pz + (rv.z - rv.pz) * al;
    let dy = rv.yaw - rv.pyaw; if (dy > PI) dy -= TAU; else if (dy < -PI) dy += TAU;
    const yaw = rv.pyaw + dy * al;
    const gp = rv.pgPitch + (rv.gPitch - rv.pgPitch) * al;
    const gr = rv.pgRoll + (rv.gRoll - rv.pgRoll) * al;
    const roll = rv.proll + (rv.roll - rv.proll) * al;
    const pitch = rv.ppitch + (rv.pitch - rv.ppitch) * al;
    const steer = rv.psteer + (rv.steer - rv.psteer) * al;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    G0[0] = c; G0[1] = 0; G0[2] = s; G0[3] = 0;
    G0[4] = 0; G0[5] = 1; G0[6] = 0; G0[7] = 0;
    G0[8] = -s; G0[9] = 0; G0[10] = c; G0[11] = 0;
    G0[12] = x; G0[13] = y; G0[14] = z; G0[15] = 1;
    let cg = Math.cos(gp), sg = Math.sin(gp);
    T.fill(0); T[0] = cg; T[1] = sg; T[4] = -sg; T[5] = cg; T[10] = 1; T[15] = 1;
    m4mul(G0, G0, T);
    cg = Math.cos(-gr); sg = Math.sin(-gr);
    T.fill(0); T[0] = 1; T[5] = cg; T[6] = sg; T[9] = -sg; T[10] = cg; T[15] = 1;
    m4mul(G0, G0, T);
    m4ident(T); T[13] = 0.18; m4mul(B, G0, T);
    cg = Math.cos(-pitch); sg = Math.sin(-pitch);
    T.fill(0); T[0] = cg; T[1] = sg; T[4] = -sg; T[5] = cg; T[10] = 1; T[15] = 1;
    m4mul(B, B, T);
    cg = Math.cos(-roll); sg = Math.sin(-roll);
    T.fill(0); T[0] = 1; T[5] = cg; T[6] = sg; T[9] = -sg; T[10] = cg; T[15] = 1;
    m4mul(B, B, T);
    m4ident(T); T[13] = -0.18; m4mul(B, B, T);

    const mb = objModel(sb), pb = objPrev(sb), keepPrev = rv.vis && !cut;
    pb.set(keepPrev ? mb : B);
    mb.set(B);
    const bp = objParams(sb);
    bp[0] = rv.brake;
    bp[1] = 0;
    bp[2] = lights;
    bp[3] = 0;
    if (typeof carApplyPaint === 'function') carApplyPaint(sb, rv.paintIdx, rv.bodyKind);

    m4inv(T, B);
    m4mul(D2, pb, T);
    for (let w = 0; w < 4; w++) {
      const sw = rv.slotWheel[w], mw = objModel(sw), h = rv.hubs[w], left = (w & 1) === 0;
      const a = -(w < 2 ? steer : 0) + (left ? PI : 0), ca = Math.cos(a), sa = Math.sin(a);
      const sp = rv.pspin[w] + (rv.spin[w] - rv.pspin[w]) * al;
      const g = left ? sp : -sp, cg2 = Math.cos(g), sg2 = Math.sin(g);
      W[0] = ca * cg2; W[1] = sg2; W[2] = -sa * cg2; W[3] = 0;
      W[4] = -ca * sg2; W[5] = cg2; W[6] = sa * sg2; W[7] = 0;
      W[8] = sa; W[9] = 0; W[10] = ca; W[11] = 0;
      W[12] = h[0]; W[13] = h[1]; W[14] = h[2]; W[15] = 1;
      m4mul(mw, B, W);
      m4mul(objPrev(sw), D2, mw);
      objParams(sw)[0] = Math.abs(rv.omega[w]);
    }
    rv.vis = true;
  }
}

if (typeof BUILD !== 'undefined') BUILD.push(async () => { rivRenderInit(); });
