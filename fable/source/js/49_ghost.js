// Telemetria da volta (splits/delta), medalhas e gravação/reprodução/persistência do carro fantasma.
const GH_NONE = -999999;
const MEDALS = [5350, 5600, 6000, 6600]; // 0 = Firma <= 53,50s, 1 = Ouro <= 56,00s, 2 = Prata <= 60,00s, 3 = Bronze <= 66,00s
const GH_SPIN_HALF = 16 * PI, GH_SPIN_PER = 32 * PI;
const ghWrapSpin = a => { a = (a + GH_SPIN_HALF) % GH_SPIN_PER; if (a < 0) a += GH_SPIN_PER; return a - GH_SPIN_HALF; };

function medalOf(cs) {
  if (!(cs > 0)) return -1;
  for (let i = 0; i < MEDALS.length; i++) if (cs <= MEDALS[i]) return i;
  return -1;
}

function ghCarIdx(idx) {
  if (idx !== undefined) return (idx | 0) === 1 ? 1 : 0;
  return typeof GS !== 'undefined' && GS.carIdx === 1 ? 1 : 0;
}
function ghStoragePrefix(idx) {
  return ghCarIdx(idx) === 1 ? 'gol' : 'uno';
}
function ghMakeSlot() {
  return {
    hasSplit: false, hasGhost: false, savePending: false, bestLen: 0, bestTime: 0,
    bestSplit: new Float32Array(2048).fill(-1),
    bestFrames: new Float32Array(10800 * 8),
  };
}
const _ghSlots = [ghMakeSlot(), ghMakeSlot()];

const GH = {
  on: true, warm: false, hasSplit: false, hasGhost: false, savePending: false,
  deltaCs: GH_NONE, vis: false, drawOn: false, qMask: 0, curLen: 0, bestLen: 0, bestTime: 0,
  slotIdx: 0, slots: _ghSlots,
  curSplit: new Float32Array(2048).fill(-1), bestSplit: _ghSlots[0].bestSplit,
  curFrames: new Float32Array(10800 * 8), bestFrames: _ghSlots[0].bestFrames,
  gx: 0, gy: 0, gz: 0, gyaw: 0, gpitch: 0, groll: 0, gsteer: 0, gspin: 0,
  slotBody: 0, slotWheel: [0, 0, 0, 0], fam: null, bg: null,
  _b: m4(), _t: m4(), _w: m4(),
};

function ghFlushSlot() {
  const S = GH.slots[GH.slotIdx];
  S.hasSplit = GH.hasSplit;
  S.hasGhost = GH.hasGhost;
  S.savePending = GH.savePending;
  S.bestLen = GH.bestLen;
  S.bestTime = GH.bestTime;
}
function ghLoadSlot(i) {
  const S = GH.slots[i];
  GH.slotIdx = i;
  GH.hasSplit = S.hasSplit;
  GH.hasGhost = S.hasGhost;
  GH.savePending = S.savePending;
  GH.bestLen = S.bestLen;
  GH.bestTime = S.bestTime;
  GH.bestSplit = S.bestSplit;
  GH.bestFrames = S.bestFrames;
}
function ghSyncSlot(idx) {
  const i = ghCarIdx(idx);
  if (i === GH.slotIdx) return i;
  ghFlushSlot();
  ghLoadSlot(i);
  return i;
}

function ghInit() {
  GH.warm = false;
  for (let i = 0; i < GH.slots.length; i++) {
    const S = GH.slots[i];
    S.hasSplit = false;
    S.hasGhost = false;
    S.savePending = false;
    S.bestLen = 0;
    S.bestTime = 0;
    S.bestSplit.fill(-1);
  }
  ghLoadSlot(ghCarIdx());
  ghRestart();
}

function ghRestart() {
  ghSyncSlot();
  GH.curSplit.fill(-1);
  GH.curLen = 0;
  GH.qMask = 0;
  GH.deltaCs = GH_NONE;
  GH.vis = false;
  GH.drawOn = false;
}

function ghToggle() {
  GH.on = !GH.on;
  if (!GH.on) { GH.vis = false; GH.drawOn = false; }
  return GH.on;
}

// Registra splits e pose a 60 Hz (após vehicleStep + lapCross, no passo ímpar de 120 Hz). Sem alocações.
function ghStep() {
  if ((GS.sub & 1) !== 1) return;
  ghSyncSlot();
  if (GH.warm || GS.frozen || GS.replayOn || GS.ai || LAP[3] !== 1) { GH.deltaCs = GH_NONE; return; }
  const N = TRK.N, ds = TRK.ds;
  const q = ((VEH.s / TRK.L) * 4) | 0;
  GH.qMask |= 1 << (q & 3);
  const tLap = VEH.time - LAP[0], u = VEH.s / ds, iu = Math.floor(u), si = ((iu % N) + N) % N;
  if (GH.curSplit[si] < 0) GH.curSplit[si] = tLap;
  if (GH.hasSplit && tLap >= 0.25) {
    const s0 = GH.bestSplit[si];
    const s1 = si + 1 < N ? GH.bestSplit[si + 1] : (GH.bestTime > s0 ? GH.bestTime : GH.bestSplit[0]);
    if (s0 >= 0 && s1 >= 0) {
      const ref = s0 + (s1 - s0) * (u - iu);
      GH.deltaCs = clamp(Math.round((tLap - ref) * 100), -9999, 9999);
    }
  }
  if (GH.curLen < 10800) {
    const o = GH.curLen * 8, F = GH.curFrames, ox = -(VP.L * 0.5 - VP.a);
    const cy = Math.cos(VEH.yaw), sy = Math.sin(VEH.yaw);
    F[o]     = VEH.x + cy * ox;
    F[o + 1] = VEH.y;
    F[o + 2] = VEH.z + sy * ox;
    F[o + 3] = VEH.yaw;
    F[o + 4] = VEH.gPitch - VEH.pitch;
    F[o + 5] = VEH.gRoll + VEH.roll;
    F[o + 6] = VEH.steer;
    F[o + 7] = (VEH.spin[0] + VEH.spin[1]) * 0.5;
    GH.curLen++;
  }
}

// Preenche eventuais buracos (-1) nos splits da melhor volta por interpolação linear ao fechar a volta.
function ghFillSplits(arr, n, lt) {
  if (n <= 0) return;
  if (arr[0] < 0) arr[0] = 0;
  for (let i = 1; i < n; i++) {
    if (arr[i] >= 0) continue;
    let j = i + 1;
    while (j < n && arr[j] < 0) j++;
    const v0 = arr[i - 1], v1 = j < n ? arr[j] : lt, span = j - (i - 1);
    for (let k = i; k < j; k++) arr[k] = v0 + (v1 - v0) * ((k - (i - 1)) / span);
    i = j;
  }
}

function ghLapCross(lt, isRecord) {
  ghSyncSlot();
  if (!GH.warm && !GS.replayOn && !GS.ai && GH.qMask === 15 && (isRecord || !GH.hasSplit) && (GH.bestTime === 0 || lt <= GH.bestTime + 1e-6)) {
    GH.bestSplit.set(GH.curSplit);
    ghFillSplits(GH.bestSplit, TRK.N, lt);
    GH.hasSplit = true;
    const n = GH.curLen;
    if (n > 0) GH.bestFrames.set(GH.curFrames.subarray(0, n * 8));
    GH.bestLen = n;
    GH.hasGhost = n > 30;
    GH.bestTime = lt;
    GH.savePending = true;
    ghFlushSlot();
  }
  GH.curSplit.fill(-1);
  GH.curLen = 0;
  GH.qMask = 1;
  GH.deltaCs = GH_NONE;
}

// Interpola a pose do fantasma para o instante atual da volta e atualiza matrizes + fade de proximidade. Sem alocações.
function ghPose() {
  ghSyncSlot();
  let vis = GH.on && GH.hasGhost && LAP[3] === 1 && !GS.replayOn && !GS.ai && !GS.frozen;
  if (vis) {
    const f = (VEH.time - LAP[0]) * 60;
    if (f < 0 || f >= GH.bestLen - 1) {
      vis = false;
    } else {
      const k = f | 0, t = f - k, a = k * 8, b = a + 8, B = GH.bestFrames;
      GH.gx = B[a] + (B[b] - B[a]) * t;
      GH.gy = B[a + 1] + (B[b + 1] - B[a + 1]) * t;
      GH.gz = B[a + 2] + (B[b + 2] - B[a + 2]) * t;
      GH.gyaw = B[a + 3] + wrapPi(B[b + 3] - B[a + 3]) * t;
      GH.gpitch = B[a + 4] + (B[b + 4] - B[a + 4]) * t;
      GH.groll = B[a + 5] + (B[b + 5] - B[a + 5]) * t;
      GH.gsteer = B[a + 6] + (B[b + 6] - B[a + 6]) * t;
      GH.gspin = B[a + 7] + (B[b + 7] - B[a + 7]) * t;
    }
  }
  GH.vis = vis;
  if (!vis || !GH.slotBody || typeof CAR === 'undefined') { GH.drawOn = false; return; }
  const dxP = GH.gx - GS.cx, dzP = GH.gz - GS.cz;
  const dP = Math.sqrt(dxP * dxP + dzP * dzP);
  const cp = R.cam.pos, dxC = GH.gx - cp[0], dyC = GH.gy + 0.8 - cp[1], dzC = GH.gz - cp[2];
  const dC = Math.sqrt(dxC * dxC + dyC * dyC + dzC * dzC);
  const fade = smooth(1.8, 5.2, dP < dC ? dP : dC);
  if (fade < 0.01) { GH.drawOn = false; return; }
  const wasOn = GH.drawOn;
  GH.drawOn = true;
  const B = GH._b, T = GH._t, W = GH._w;
  const cy = Math.cos(GH.gyaw), sy = Math.sin(GH.gyaw);
  B[0] = cy; B[1] = 0; B[2] = sy; B[3] = 0;
  B[4] = 0;  B[5] = 1; B[6] = 0;  B[7] = 0;
  B[8] = -sy; B[9] = 0; B[10] = cy; B[11] = 0;
  B[12] = GH.gx; B[13] = GH.gy; B[14] = GH.gz; B[15] = 1;
  ROTQ[0] = GH.gpitch; rotZQ(T); m4mul(B, B, T);
  ROTQ[0] = -GH.groll; rotXQ(T); m4mul(B, B, T);
  const sb = GH.slotBody, mb = objModel(sb);
  objPrev(sb).set(wasOn ? mb : B);
  mb.set(B);
  objParams(sb)[0] = fade;
  for (let i = 0; i < 4; i++) {
    const sw = GH.slotWheel[i], mw = objModel(sw), h = CAR.hubs[i], left = (i & 1) === 0;
    const a = -(i < 2 ? GH.gsteer : 0) + (left ? PI : 0), c = Math.cos(a), sn = Math.sin(a);
    const g = left ? GH.gspin : -GH.gspin, cg = Math.cos(g), sg = Math.sin(g);
    W[0] = c * cg; W[1] = sg; W[2] = -sn * cg; W[3] = 0;
    W[4] = -c * sg; W[5] = cg; W[6] = sn * sg; W[7] = 0;
    W[8] = sn; W[9] = 0; W[10] = c; W[11] = 0;
    W[12] = h[0]; W[13] = h[1]; W[14] = h[2]; W[15] = 1;
    m4mul(T, B, W);
    objPrev(sw).set(wasOn ? mw : T);
    mw.set(T);
    objParams(sw)[0] = fade;
  }
}

function ghB64Enc(ta) {
  const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
  let s = '';
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return btoa(s);
}

function ghB64Dec(str) {
  const bin = atob(str), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

function ghSaveData(carIdx) {
  const prev = GH.slotIdx, target = carIdx === undefined ? ghCarIdx() : ghCarIdx(carIdx);
  if (target !== GH.slotIdx) { ghFlushSlot(); ghLoadSlot(target); }
  let out = '';
  if (GH.hasSplit && GH.hasGhost && TRK.N > 0) {
    const N = TRK.N, sn = Math.ceil(N / 2), sp = new Uint16Array(sn);
    for (let k = 0; k < sn; k++) {
      const v = GH.bestSplit[k * 2];
      sp[k] = v >= 0 ? clamp(Math.round(v * 100), 0, 65535) : 0;
    }
    const len = GH.bestLen, needLast = len > 1 && (len - 1) % 3 !== 0;
    const fn = Math.ceil(len / 3) + (needLast ? 1 : 0);
    const fr = new Int16Array(fn * 8), B = GH.bestFrames;
    for (let k = 0; k < fn; k++) {
      const srcIdx = k * 3 < len ? k * 3 : len - 1, so = srcIdx * 8, doff = k * 8;
      fr[doff]     = clamp(Math.round(B[so]     * 20), -32767, 32767);
      fr[doff + 1] = clamp(Math.round(B[so + 1] * 20), -32767, 32767);
      fr[doff + 2] = clamp(Math.round(B[so + 2] * 20), -32767, 32767);
      fr[doff + 3] = clamp(Math.round(wrapPi(B[so + 3]) * 5000), -32767, 32767);
      fr[doff + 4] = clamp(Math.round(B[so + 4] * 5000), -32767, 32767);
      fr[doff + 5] = clamp(Math.round(B[so + 5] * 5000), -32767, 32767);
      fr[doff + 6] = clamp(Math.round(B[so + 6] * 5000), -32767, 32767);
      fr[doff + 7] = clamp(Math.round(ghWrapSpin(B[so + 7]) * 500), -32767, 32767);
    }
    out = JSON.stringify({
      v: 1,
      t: GH.bestTime,
      n: N,
      l: len,
      sp: ghB64Enc(sp),
      fr: ghB64Enc(fr),
    });
  }
  if (carIdx !== undefined && prev !== GH.slotIdx) { ghFlushSlot(); ghLoadSlot(prev); }
  return out;
}

function ghLoadData(str, expectedBestSec, carIdx) {
  const prev = GH.slotIdx, target = carIdx === undefined ? ghCarIdx() : ghCarIdx(carIdx);
  if (target !== GH.slotIdx) { ghFlushSlot(); ghLoadSlot(target); }
  const restore = () => { if (carIdx !== undefined && prev !== GH.slotIdx) { ghFlushSlot(); ghLoadSlot(prev); } };
  if (!str || typeof str !== 'string') { restore(); return false; }
  let obj;
  try { obj = JSON.parse(str); } catch (e) { restore(); return false; }
  if (!obj || typeof obj !== 'object') { restore(); return false; }
  if (typeof obj.t !== 'number' || !Number.isFinite(obj.t) || obj.t <= 0) { restore(); return false; }
  if (typeof expectedBestSec !== 'number' || !Number.isFinite(expectedBestSec) || expectedBestSec <= 0) { restore(); return false; }
  if (Math.abs(obj.t - expectedBestSec) > 0.05 || obj.n !== TRK.N) { restore(); return false; }
  if (typeof obj.sp !== 'string' || typeof obj.fr !== 'string') { restore(); return false; }

  let spU8, frU8;
  try { spU8 = ghB64Dec(obj.sp); frU8 = ghB64Dec(obj.fr); } catch (e) { restore(); return false; }
  const N = TRK.N, sn = Math.ceil(N / 2);
  if (N <= 0 || N > GH.bestSplit.length) { restore(); return false; }
  if (spU8.byteLength !== sn * 2) { restore(); return false; }
  if (frU8.byteLength < 32 || (frU8.byteLength & 15) !== 0) { restore(); return false; }
  if (obj.l !== undefined && (!Number.isInteger(obj.l) || obj.l < 2 || obj.l > 10800)) { restore(); return false; }

  const sp = new Uint16Array(spU8.buffer), fr = new Int16Array(frU8.buffer), fn = fr.length / 8;
  const bestLen = typeof obj.l === 'number' ? obj.l : Math.min(10800, (fn - 1) * 3 + 1);
  if (bestLen < 2 || bestLen > 10800) { restore(); return false; }
  const hasTrailing = bestLen > 1 && (bestLen - 1) % 3 !== 0;
  const expectedFn = Math.ceil(bestLen / 3) + (hasTrailing ? 1 : 0);
  if (typeof obj.l === 'number' && fn !== expectedFn) { restore(); return false; }

  GH.bestSplit.fill(-1);
  for (let k = 0; k < sn; k++) {
    const i = k * 2, v0 = sp[k] * 0.01;
    GH.bestSplit[i] = v0;
    if (i + 1 < N) {
      const v1 = k + 1 < sn ? sp[k + 1] * 0.01 : obj.t;
      GH.bestSplit[i + 1] = (v0 + v1) * 0.5;
    }
  }

  const B = GH.bestFrames, invPos = 1 / 20, invAng = 1 / 5000, invSpin = 1 / 500;
  let accSpin = fr[7] * invSpin, prevK0 = 0, prevRawS = accSpin;
  for (let f = 0; f < bestLen; f++) {
    let k0 = (f / 3) | 0;
    if (k0 >= fn - 1) k0 = fn - 1;
    if (k0 !== prevK0) {
      const rawS = fr[k0 * 8 + 7] * invSpin;
      accSpin += ghWrapSpin(rawS - prevRawS);
      prevRawS = rawS;
      prevK0 = k0;
    }
    const k1 = k0 + 1 < fn ? k0 + 1 : k0;
    const t0 = k0 * 3, t1 = (hasTrailing && k1 === fn - 1) ? (bestLen - 1) : (k1 * 3), dt = t1 - t0;
    const u = dt > 0 ? (f - t0) / dt : 0, o0 = k0 * 8, o1 = k1 * 8, bo = f * 8;
    B[bo]     = (fr[o0]     + (fr[o1]     - fr[o0])     * u) * invPos;
    B[bo + 1] = (fr[o0 + 1] + (fr[o1 + 1] - fr[o0 + 1]) * u) * invPos;
    B[bo + 2] = (fr[o0 + 2] + (fr[o1 + 2] - fr[o0 + 2]) * u) * invPos;
    const y0 = fr[o0 + 3] * invAng, y1 = fr[o1 + 3] * invAng;
    B[bo + 3] = y0 + wrapPi(y1 - y0) * u;
    B[bo + 4] = (fr[o0 + 4] + (fr[o1 + 4] - fr[o0 + 4]) * u) * invAng;
    B[bo + 5] = (fr[o0 + 5] + (fr[o1 + 5] - fr[o0 + 5]) * u) * invAng;
    B[bo + 6] = (fr[o0 + 6] + (fr[o1 + 6] - fr[o0 + 6]) * u) * invAng;
    const s0 = fr[o0 + 7] * invSpin, s1 = fr[o1 + 7] * invSpin;
    B[bo + 7] = accSpin + ghWrapSpin(s1 - s0) * u;
  }

  GH.bestTime = obj.t;
  GH.bestLen = bestLen;
  GH.hasSplit = true;
  GH.hasGhost = bestLen > 30;
  GH.savePending = false;
  ghFlushSlot();
  restore();
  return true;
}

// Aloca slots e família forward translúcida para renderizar o carro fantasma em WebGPU.
function ghRenderInit() {
  if (GH.slotBody || GAME.mode === 'test' || GAME.mode === 'car' || typeof CAR === 'undefined' || !CAR.bodyMesh) return;
  GH.slotBody = objSlot();
  for (let i = 0; i < 4; i++) GH.slotWheel[i] = objSlot();
  GH.fam = mkFwdFamily('ghost', {
    src: 'ghost',
    cull: 'back',
    blend: {
      color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
      alpha: { srcFactor: 'zero', dstFactor: 'one' },
    },
  });
  GH.bg = null;
  R.transparents.push({
    draw(pass) {
      if (!GH.drawOn || !GH.fam || !GH.fam.pipe) return;
      if (!GH.bg) GH.bg = fwdBindGroup(GH.fam);
      const bm = CAR.bodyMesh, wm = CAR.wheelMesh;
      if (!bm) return;
      pass.setPipeline(GH.fam.pipe);
      pass.setBindGroup(3, GH.bg);
      R.dyn2[0] = GH.slotBody * 256;
      pass.setBindGroup(2, R.objBG, R.dyn2, 0, 1);
      pass.setVertexBuffer(0, bm.vb);
      pass.setIndexBuffer(bm.ib, 'uint32');
      pass.drawIndexed(bm.count);
      if (wm) {
        pass.setVertexBuffer(0, wm.vb);
        pass.setIndexBuffer(wm.ib, 'uint32');
        for (let i = 0; i < 4; i++) {
          R.dyn2[0] = GH.slotWheel[i] * 256;
          pass.setBindGroup(2, R.objBG, R.dyn2, 0, 1);
          pass.drawIndexed(wm.count);
        }
      }
    },
  });
}
if (typeof BUILD !== 'undefined') BUILD.push(async () => { ghRenderInit(); });
