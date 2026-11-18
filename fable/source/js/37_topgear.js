// Supercarro Top Gear 2 SNES Realista (estilo Fireball / Jaguar XJ220 / Nissan R390 GT1 anos 90):
// carroceria larga e baixa em cunha fluida, paralamas destacados acima do capô, faróis duplos embutidos sob carenagens translúcidas,
// piscas horizontais âmbar, tomada frontal bipartida com splitter preto, cabine bolha avançada com colunas A ocultas sob vidro envolvente,
// retrovisores de haste dupla, tomadas laterais esculpidas atrás das portas, motor V12 biturbo visível sob vigia traseira,
// aerofólio integrado em arco contínuo (hoop wing), painel traseiro em grade escura com 4 lanternas redondas/ovais + ré + placa/emblema TG2,
// difusor inferior de 4 aletas, escapamento central duplo de inox e rodas côncavas de 5 raios largos.
const TG = {
  XF: 2.21, XR: -2.18,
  YS: 0.145,
  AXF: 1.29, AXR: -1.29, WR: 0.315,
  TH_S: Math.sin(33 * PI / 180), TH_C: Math.cos(33 * PI / 180),
  VF: [0, 0.36, 0.42, 0.60, 0.68, 1],
  ARCH_R: 0.365, ARCH_Y: 0.330,
};
const _tuv = [0, 0];
const tsq = x => x * x;
function tsmin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function tsmax(a, b, k) { return -tsmin(-a, -b, k); }
function tgG(d, r) { return d <= -r || d >= r ? 0 : d < 0 ? (r + d) * (r + d) / (4 * r) : (r - d) * (r - d) / (4 * r); }
function tgRRect(a, b, ha, hb, r) { const qa = Math.abs(a) - ha + r, qb = Math.abs(b) - hb + r; return Math.hypot(Math.max(qa, 0), Math.max(qb, 0)) + Math.min(Math.max(qa, qb), 0) - r; }
function tgSegDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, t = sat(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); }

// Perfil longitudinal base: frente em cunha baixa (0,435 -> 0,680), para-brisa muito inclinado, bolha 1,108 m, fastback até deck traseiro
function tgYT(x) {
  const fascia = 0.435 - 2.9 * (x - 2.13);
  const hood = 0.680 - 0.205 * (x - 0.94) + 0.012 * (1 - tsq((x - 1.54) / 0.60));
  const wind = 0.680 - 0.495 * (x - 0.94);
  const a = x + 0.12, roof = 1.108 - (a > 0 ? 0.17 * a * a : 0.08 * a * a);
  const fastback = 0.818 + 0.425 * (x + 1.24);
  const deck = 0.742 + 0.088 * (x + 2.11);
  const tail = 0.742 + 6.5 * (x + 2.125);
  const rear = tsmax(fastback, deck, 0.036);
  let y = tsmax(hood, wind, 0.028);
  y = tsmin(y, roof, 0.032);
  y = tsmin(y, rear, 0.032);
  y = tsmin(y, tail, 0.022);
  y = tsmin(y, fascia, 0.026);
  return y;
}
function tgBulge(x) { return 0.045 * smooth(-0.08, 0.35, x) - 0.022 * smooth(-1.55, -2.02, x); }
function tgCrown(x) {
  let c = 0.014 * smooth(0.85, 1.15, x) * smooth(2.15, 1.98, x);
  c += 0.062 * smooth(0.82, 0.30, x) * smooth(-0.85, -0.35, x); // teto em bolha abaulado lateralmente
  c += 0.014 * smooth(-0.75, -1.10, x) * smooth(-2.12, -1.92, x);
  return c;
}
function tgYtop(x, z) {
  const zz = z / 0.80, xi = tgBulge(x) * (1 - zz * zz);
  const xe = x - xi;
  let y = tgYT(xe) - tgCrown(xe) * zz * zz;
  // Paralamas dianteiros destacados acima do capô central rebaixado (estilo XJ220 / Fireball)
  if (xe > 0.62 && xe < 2.16) {
    const fLat = smooth(0.32, 0.56, z) * (1 - 0.16 * smooth(0.76, 0.90, z));
    const fLon = smooth(0.64, 1.02, xe) * smooth(2.14, 1.90, xe);
    const fArch = 0.044 * Math.exp(-tsq((xe - TG.AXF) / 0.35));
    y += (0.046 * fLon + fArch) * fLat;
  }
  // Ancas musculosas traseiras sobre o eixo traseiro (flying buttresses em volta da vigia do motor)
  if (xe < -0.58 && xe > -2.14) {
    const rLat = smooth(0.42, 0.64, z) * (1 - 0.15 * smooth(0.82, 0.94, z));
    const rLon = smooth(-0.62, -1.00, xe) * smooth(-2.12, -1.92, xe);
    const rArch = 0.042 * Math.exp(-tsq((xe - TG.AXR) / 0.38));
    y += (0.028 * rLon + rArch) * rLat;
  }
  return y;
}
function tgWPlan(x) {
  // Cintura Coke-bottle: dianteira larga (0.895 m), leve cintura nas portas (0.875 m), anca traseira larga (0.940 m)
  const tf = smooth(0.45, 1.45, x) * 0.020 - smooth(1.65, 2.20, x) * 0.075;
  const tr = smooth(-0.40, -1.30, x) * 0.065 - smooth(-1.65, -2.18, x) * 0.045;
  return 0.875 + tf + tr;
}
function tgZL(x, y) {
  let z = tgWPlan(x);
  const d = y - 0.44;
  z -= d < 0 ? 0.020 * tsq(d / 0.30) : 0.024 * tsq(d / 0.28);
  // Vinco lateral inferior e dobra aerodinâmica da soleira
  z -= 0.004 * smooth(0.24, 0.28, y) * (1 - smooth(0.32, 0.36, y));
  if (y < 0.205) z -= 0.024 * tsq((0.205 - y) / 0.06);
  const df = Math.hypot(x - TG.AXF, y - TG.ARCH_Y) - TG.ARCH_R;
  const dr = Math.hypot(x - TG.AXR, y - TG.ARCH_Y) - TG.ARCH_R;
  const da = Math.min(df, dr);
  if (da < 0.26) z += 0.012 * Math.exp(-tsq((da - 0.008) / 0.070));
  return z;
}
function tgBeltN(x) { return 0.695 - 0.140 * smooth(0.95, 2.02, x) + 0.045 * smooth(-0.55, -1.55, x); }
function tgR2(x) {
  let r = 0.032;
  r = lerp(r, 0.024, smooth(0.05, 0.35, x));
  r = lerp(r, 0.022, smooth(0.85, 1.10, x));
  r = lerp(r, 0.028, smooth(1.98, 2.15, x));
  r = lerp(r, 0.024, smooth(-1.75, -2.08, x));
  return r;
}
const _tstCache = []; let _tstNext = 0;
for (let i = 0; i < 8; i++) _tstCache.push({ x: NaN, yB: 0, zB: 0, dAz: 0, LA: 0, LB: 0, zE: 0, yE: 0, dCy: 0, r1: 0, r2: 0, b: new Float64Array(6) });
function tgStation(x) {
  for (let i = 0; i < 8; i++) if (_tstCache[i].x === x) return _tstCache[i];
  const st = _tstCache[_tstNext]; _tstNext = (_tstNext + 1) & 7; st.x = x;
  const bn = tgBeltN(x);
  let y = bn; for (let k = 0; k < 4; k++) y = tgYtop(x, tgZL(x, Math.min(y, bn + 0.2)));
  if (y <= bn) { st.yB = y; st.LB = 0; }
  else {
    st.yB = bn; const zb = tgZL(x, bn); let t = (tgYtop(x, zb) - bn) / TG.TH_C;
    for (let k = 0; k < 5; k++) t = (tgYtop(x, zb - t * TG.TH_S) - bn) / TG.TH_C;
    st.LB = Math.max(t, 0);
  }
  st.zB = tgZL(x, st.yB); st.dAz = (tgZL(x, st.yB) - tgZL(x, st.yB - 0.004)) / 0.004;
  st.LA = st.yB - TG.YS;
  st.zE = st.zB - st.LB * TG.TH_S; st.yE = st.yB + st.LB * TG.TH_C;
  st.dCy = -(tgYtop(x, st.zE) - tgYtop(x, st.zE - 0.004)) / 0.004;
  st.r1 = 0.012; st.r2 = tgR2(x);
  const b = st.b, h = st.LB * 0.5, rFlat = Math.min(st.r2, st.LA * 0.45, st.zE * 0.45);
  const w = sat(st.LB / (st.r1 + st.r2));
  const p0 = 0, p1 = st.LA - st.r1, p2 = st.LA + Math.min(st.r1, h), p3 = st.LA + st.LB - Math.min(st.r2, h), p4 = st.LA + st.LB + st.r2, p5 = st.LA + st.LB + st.zE;
  const f1 = Math.max(0.002, (st.LA - rFlat) * 0.72), f2 = Math.max(f1 + 0.002, st.LA - rFlat), f3 = st.LA + h, f4 = st.LA + st.LB + rFlat;
  b[0] = p0; b[1] = lerp(f1, p1, w); b[2] = lerp(f2, p2, w); b[3] = lerp(f3, p3, w); b[4] = lerp(f4, p4, w); b[5] = p5;
  return st;
}
function tgSkin(x, v, off, out) {
  const st = tgStation(x), VF = TG.VF, b = st.b;
  let k = 0; while (k < 4 && v > VF[k + 1]) k++;
  const s = b[k] + (b[k + 1] - b[k]) * (v - VF[k]) / (VF[k + 1] - VF[k]);
  let z, y, tz, ty;
  const s1 = st.LA, s2 = st.LA + st.LB;
  if (s <= s1) { y = TG.YS + s; z = tgZL(x, y); tz = (tgZL(x, y + 0.002) - tgZL(x, y - 0.002)) / 0.004; ty = 1; }
  else if (s <= s2) { const t = s - s1; z = st.zB - t * TG.TH_S; y = st.yB + t * TG.TH_C; tz = -TG.TH_S; ty = TG.TH_C; }
  else { z = st.zE - (s - s2); y = tgYtop(x, z); tz = -1; ty = -(tgYtop(x, z + 0.002) - tgYtop(x, z - 0.002)) / 0.004; }
  const d1z = -TG.TH_S - st.dAz, d1y = TG.TH_C - 1, d2z = -1 + TG.TH_S, d2y = st.dCy - TG.TH_C;
  const g1 = tgG(s - s1, st.r1), g2 = tgG(s - s2, st.r2);
  z += d1z * g1 + d2z * g2; y += d1y * g1 + d2y * g2;
  let px = x;
  if (off) {
    const e1 = s - s1, e2 = s - s2;
    const h1 = e1 <= -st.r1 || e1 >= st.r1 ? 0 : (e1 < 0 ? (st.r1 + e1) : -(st.r1 - e1)) / (2 * st.r1);
    const h2 = e2 <= -st.r2 || e2 >= st.r2 ? 0 : (e2 < 0 ? (st.r2 + e2) : -(st.r2 - e2)) / (2 * st.r2);
    const Tz = tz + d1z * h1 + d2z * h2, Ty = ty + d1y * h1 + d2y * h2;
    let nz = Ty, ny = -Tz; const l = 1 / Math.hypot(nz, ny); nz *= l; ny *= l;
    const yx = (tgYtop(x + 0.003, Math.max(z, 0)) - tgYtop(x - 0.003, Math.max(z, 0))) / 0.006;
    const nx = -yx * Math.max(ny, 0) * Math.max(ny, 0), l2 = 1 / Math.hypot(nx, ny, nz);
    px += nx * l2 * off; y += ny * l2 * off; z += nz * l2 * off;
  }
  out[0] = px; out[1] = y; out[2] = z;
}
const TG_UT = { n: 800, x: null, s: null, L: 0 };
function tgShapeInit() {
  const n = TG_UT.n, xs = TG_UT.x = new Float64Array(n + 1), ss = TG_UT.s = new Float64Array(n + 1);
  let px = TG.XF, py = tgYT(px), acc = 0;
  for (let i = 0; i <= n; i++) {
    const x = TG.XF + (TG.XR - TG.XF) * i / n, y = tgYT(x);
    acc += Math.hypot(x - px, y - py); px = x; py = y; xs[i] = x; ss[i] = acc;
  }
  TG_UT.L = acc;
}
function tgXofU(u) {
  const T = TG_UT, s = sat(u) * T.L; let lo = 0, hi = T.n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.s[m] <= s) lo = m; else hi = m; }
  const f = (s - T.s[lo]) / Math.max(1e-9, T.s[hi] - T.s[lo]);
  return T.x[lo] + (T.x[hi] - T.x[lo]) * f;
}
function tgUofX(x) {
  const T = TG_UT, f = sat((x - TG.XF) / (TG.XR - TG.XF)) * T.n, i = Math.min(T.n - 1, Math.floor(f));
  return (T.s[i] + (T.s[i + 1] - T.s[i]) * (f - i)) / T.L;
}
function tgSkinFn(off) { return (u, v, out) => tgSkin(tgXofU(u), v, off || 0, out); }
function tgTopX(z, y, rear) {
  let a = rear ? -2.20 : 1.72, b = rear ? -1.45 : 2.22;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2, f = tgYtop(m, z) - y; if ((f > 0) === !rear) a = m; else b = m; }
  return (a + b) / 2;
}
function tgSub(mb, off, x0, x1, va, vb, cell, opts) {
  const u0 = tgUofX(x0), u1 = tgUofX(x1);
  opts.nu = Math.max(2, Math.ceil((u1 - u0) * TG_UT.L / cell));
  opts.nv = Math.max(2, Math.ceil((vb - va) * 3.1 / cell));
  opts.flip = opts.flip === undefined ? true : opts.flip;
  mb.patch(tgSkinFn(off), u0, u1, va, vb, opts);
}

// Campos de recorte (negativo = dentro do elemento)
function tgArchF(P) {
  return Math.min(Math.hypot(P[0] - TG.AXF, P[1] - TG.ARCH_Y), Math.hypot(P[0] - TG.AXR, P[1] - TG.ARCH_Y)) - TG.ARCH_R;
}
const TGW = { apx: 0, apy: 0, anx: 0, any: 0 };
function tgWindowsInit() {
  const a = tgStation(0.86), ax = 0.86, ay = a.yE, b = tgStation(0.14), bx = 0.14, by = b.yE;
  let nx = -(by - ay), ny = bx - ax, l = Math.hypot(nx, ny); nx /= l; ny /= l; if (ny > 0) { nx = -nx; ny = -ny; }
  TGW.apx = ax; TGW.apy = ay; TGW.anx = nx; TGW.any = ny;
}
function tgRoofEdgeY(x) { return tgStation(clamp(x, -0.56, 0.14)).yE; }
function tgWinSide(P) {
  const x = P[0], y = P[1];
  const bottom = (tgBeltN(x) + 0.022) - y;
  const top = y - (tgRoofEdgeY(x) - 0.032);
  const front = 0.012 - ((x - TGW.apx) * TGW.anx + (y - TGW.apy) * TGW.any);
  const rear = -0.48 - x;
  return tsmax(tsmax(bottom, top, 0.018), tsmax(front, rear, 0.018), 0.024);
}
function tgXe(P) { const zz = P[2] / 0.80; return P[0] - tgBulge(P[0]) * (1 - zz * zz); }
function tgWindshield(P) {
  const xe = tgXe(P), st = tgStation(P[0]);
  const lo = xe - 0.90, hi = 0.10 - xe, side = P[2] - (st.zE - 0.022);
  return P[0] < -0.02 ? 1 : tsmax(tsmax(lo, hi, 0.022), side, 0.036);
}
// Recorte contínuo da bolha envolvente (para-brisa + coluna A oculta sob o vidro + janela lateral)
function tgCanopyGlass(P, v) {
  const fW = v > 0.56 ? tgWindshield(P) : 1;
  const fS = (v > 0.36 && v < 0.72) ? tgWinSide(P) : 1;
  return tsmin(fW, fS, 0.016);
}
// Vigia traseira do motor central-traseiro V12
function tgEngineGlass(P) {
  return tgRRect(P[0] + 1.22, P[2], 0.58, 0.42, 0.06);
}
// Faróis duplos embutidos sob carenagens aerodinâmicas (nos paralamas dianteiros)
const TGL = { hlZ0: 0.49, hlZ1: 0.78, x0: 1.82, x1: 2.09 };
function tgHeadlight(P) {
  return tgRRect(P[0] - (TGL.x0 + TGL.x1) * 0.5, P[2] - (TGL.hlZ0 + TGL.hlZ1) * 0.5, (TGL.x1 - TGL.x0) * 0.5, (TGL.hlZ1 - TGL.hlZ0) * 0.5, 0.040);
}
// Tomada de ar frontal bipartida (esquerda/direita separadas por pilar central |z| <= 0.085)
function tgFrontIntake(P) {
  if (P[0] < 1.98) return 1;
  return tgRRect(P[2] - 0.39, P[1] - 0.255, 0.30, 0.085, 0.018);
}
// Tomada de ar lateral esculpida atrás das portas
function tgSideIntake(P) {
  return tgRRect(P[0] + 0.68, P[1] - 0.43, 0.27, 0.16, 0.028);
}
// Painel traseiro recuado em grade escura (4 lanternas + placa)
function tgRearPanel(P) {
  if (P[0] > -2.02) return 1;
  return tgRRect(P[2], P[1] - 0.565, 0.77, 0.155, 0.024);
}
// Corte do difusor traseiro inferior
function tgDiffuserCut(P) {
  if (P[0] > -1.96) return 1;
  return Math.max(P[1] - 0.34, Math.abs(P[2]) - 0.76);
}

const TGSEAM = { door: null };
function tgSeamInit() {
  const p = [[0.78, 0.18], [0.78, 0.67], [0.66, 0.72]];
  for (let x = 0.48; x >= -0.44; x -= 0.08) p.push([x, tgStation(x).yE - 0.02]);
  p.push([-0.46, 0.68]); p.push([-0.46, 0.18]); p.push([0.78, 0.18]);
  TGSEAM.door = p;
}
function tgSeam(P, v) {
  const x = P[0], y = P[1], z = P[2]; let d = 1;
  if (v < 0.66 && x > -0.62 && x < 0.90) {
    const p = TGSEAM.door; let m = 1e9, inside = false;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1]; m = Math.min(m, tgSegDist(x, y, a[0], a[1], b[0], b[1]));
      if ((a[1] > y) !== (b[1] > y) && x < a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])) inside = !inside;
    }
    d = Math.min(d, inside ? -m : m);
  }
  if (v > 0.62) {
    const xe = tgXe(P), st = tgStation(x);
    if (xe > 0.88) d = Math.min(d, Math.max(z - (st.zE - 0.08), 0.94 - xe, xe - 2.08)); // fresta do capô dianteiro
    if (x < -0.54 && x > -1.96) d = Math.min(d, Math.max(z - 0.48, -1.92 - x, x + 0.58)); // fresta da tampa do motor V12
  }
  return d;
}

function topgearBuildBody(mb, gl) {
  const seamUV = (u, v, P) => { _tuv[0] = tgSeam(P, v); _tuv[1] = v; return _tuv; };
  const plainUV = (u, v) => { _tuv[0] = 1; _tuv[1] = v; return _tuv; };
  const v0 = mb.nv, i0 = mb.ni, gv0 = gl.nv, gi0 = gl.ni;

  const paintField = (u, v, P) => {
    let f = 1;
    if (v < 0.42) f = Math.min(tgArchF(P), tgSideIntake(P));
    else if (v < 0.68) f = Math.min(tgWinSide(P), tgSideIntake(P));
    if (v > 0.56) {
      f = Math.min(f, tgWindshield(P));
      if (P[0] < -0.58 && P[0] > -1.86) f = Math.min(f, tgEngineGlass(P));
      if (P[0] > 1.78) f = Math.min(f, tgHeadlight(P));
    }
    if (P[0] > 1.96) f = Math.min(f, tgFrontIntake(P));
    if (P[0] < -1.96) f = Math.min(f, tgRearPanel(P), tgDiffuserCut(P));
    return -f;
  };
  const VS = 64 / 152;
  mb.mat(CM.PAINT).color(1, 1, 1);
  mb.patch(tgSkinFn(0), 0, 1, 0, VS, { nu: 320, nv: 56, flip: true, uv: seamUV, rim: 0.015, rimMat: m => m.mat(CM.PAINT, 255), field: paintField });
  mb.mat(CM.PAINT).color(1, 1, 1);
  mb.patch(tgSkinFn(0), 0, 1, VS, 1, { nu: 320, nv: 92, flip: true, uv: seamUV, rim: 0.015, rimMat: m => m.mat(CM.RUBBER).color(0.016, 0.016, 0.018), field: paintField });

  // Guarnições pretas ao redor dos vidros, faróis e vigia do motor
  const band = (fn, a, b) => (u, v, P) => { const f = fn(P, v); return Math.max(f - b, a - f); };
  mb.mat(CM.RUBBER).color(0.016, 0.016, 0.018);
  tgSub(mb, 0.0014, 0.94, -0.50, 0.36, 0.68, 0.0115, { field: band(tgWinSide, -0.012, 0.003), uv: plainUV });
  tgSub(mb, 0.0014, 0.96, 0.06, 0.58, 1, 0.0115, { field: band(tgWindshield, -0.014, 0.004), uv: plainUV });
  tgSub(mb, 0.0014, -0.58, -1.86, 0.64, 1, 0.013, { field: band(tgEngineGlass, -0.012, 0.004), uv: plainUV });
  tgSub(mb, 0.0012, 2.12, 1.80, 0.60, 1, 0.008, { field: band(tgHeadlight, -0.006, 0.003), uv: plainUV });

  // Coluna A preta estrutural oculta sob o vidro envolvente da bolha (recuada -0.008 m)
  {
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, x = lerp(0.86, 0.14, t), y = lerp(0.685, 1.072, t);
      const st = tgStation(x), z = lerp(st.zB, st.zE, clamp((y - st.yB) / Math.max(0.01, st.yE - st.yB), 0, 1)) - 0.012;
      pts.push([x, y, z]);
    }
    mb.mat(CM.PLASTIC, 1).color(0.014, 0.014, 0.016);
    mb.sweep(pts, [[-0.016, -0.007], [0.016, -0.007], [0.016, 0.005], [-0.016, 0.005]], { closedProfile: true, hard: true, up: [0, 0, 1] });
  }

  // Piscas horizontais âmbar dianteiros (CM.LENS, 2) na quina externa sob/ao lado da carenagem do farol (y ~ 0.51..0.55)
  mb.mat(CM.LENS, 2).color(0.98, 0.50, 0.06);
  tgSub(mb, 0.003, 2.16, 2.02, 0.68, 0.82, 0.006, {
    field: (u, v, P) => tgRRect(P[0] - 2.09, P[2] - 0.64, 0.05, 0.075, 0.012),
    uv: (u, v, P) => { _tuv[0] = P[0] + P[2]; _tuv[1] = P[1]; return _tuv; },
  });

  // Dutos NACA esculpidos no capô traseiro lateral (rente à superfície da carroceria, normal +Y)
  mb.mat(CM.GRILLE, 1).color(0.010, 0.010, 0.012);
  mb.quad(
    -0.98, tgYtop(-0.98, 0.51) + 0.003, 0.51,
    -1.36, tgYtop(-1.36, 0.48) + 0.003, 0.48,
    -1.36, tgYtop(-1.36, 0.62) + 0.003, 0.62,
    -0.98, tgYtop(-0.98, 0.57) + 0.003, 0.57
  );

  // Forro interno escuro (colunas/portas/teto baixo)
  const inner = (u, v, P) => -(Math.min(tgWinSide(P), v > 0.55 ? tgWindshield(P) : 1) - 0.014);
  mb.mat(CM.INTERIOR).color(0.055, 0.058, 0.064);
  tgSub(mb, -0.024, 0.92, -0.60, 0.05, 0.60, 0.026, { field: inner, uv: plainUV, flip: false });
  mb.mat(CM.INTERIOR, 1).color(0.085, 0.088, 0.095);
  tgSub(mb, -0.024, 0.92, -0.60, 0.60, 1, 0.026, { field: inner, uv: plainUV, flip: false });

  // Vidros: cabine bolha envolvente + vigia do motor V12 + carenagens translúcidas dos faróis duplos
  gl.mat(0).color(0.76, 0.85, 0.86);
  const glz = fn => (u, v, P) => fn(P, v) + 0.008;
  tgSub(gl, -0.003, 0.95, -0.50, 0.36, 1.0, 0.018, { field: glz(tgCanopyGlass), uv: plainUV });
  tgSub(gl, -0.004, -0.58, -1.86, 0.64, 1.0, 0.020, { field: glz(tgEngineGlass), uv: plainUV });
  gl.mat(1).color(0.95, 0.97, 0.98);
  tgSub(gl, -0.001, 2.11, 1.81, 0.60, 1.0, 0.012, {
    field: (u, v, P) => tgHeadlight(P) + 0.004,
    uv: (u, v, P) => { _tuv[0] = P[2]; _tuv[1] = P[1]; return _tuv; },
  });

  mb.mirror(v0, i0, 2); gl.mirror(gv0, gi0, 2);
}

function topgearBuildParts(mb, fb) {
  const v0 = mb.nv, i0 = mb.ni;

  // ---------------- 1. Splitter dianteiro em carbono fosco + winglets + tomadas de ar frontais bipartidas ----------------
  // Topo (+Y, flip:true), fundo (-Y, flip:false) e borda dianteira (+X, flip:true)
  mb.mat(CM.PLASTIC).color(0.018, 0.018, 0.021);
  mb.patch((u, v, o) => {
    const z = u * 0.78;
    const xLead = 2.22 - 0.09 * Math.pow(u, 1.9);
    o[0] = lerp(xLead, 1.90, v); o[1] = 0.136; o[2] = z;
  }, 0, 1, 0, 1, { nu: 16, nv: 4, flip: true });
  mb.patch((u, v, o) => {
    const z = u * 0.78;
    const xLead = 2.22 - 0.09 * Math.pow(u, 1.9);
    o[0] = lerp(xLead, 1.90, v); o[1] = 0.112; o[2] = z;
  }, 0, 1, 0, 1, { nu: 16, nv: 4, flip: false });
  mb.patch((u, v, o) => {
    const z = u * 0.78;
    const xLead = 2.22 - 0.09 * Math.pow(u, 1.9);
    o[0] = xLead; o[1] = lerp(0.112, 0.136, v); o[2] = z;
  }, 0, 1, 0, 1, { nu: 16, nv: 2, flip: true });
  mb.rbox(2.02, 0.155, 0.78, 0.22, 0.075, 0.016, 0.005, 1); // endplate lateral do splitter

  // Fundo escuro da tomada frontal bipartida (face +X) + divisória central + strake horizontal
  mb.mat(CM.GRILLE, 1).color(0.010, 0.010, 0.012);
  mb.quad(2.04, 0.165, 0.69, 2.04, 0.165, 0.085, 2.04, 0.345, 0.085, 2.04, 0.345, 0.69);
  mb.mat(CM.UNDER).color(0.012, 0.012, 0.014);
  mb.quad(2.04, 0.160, 0.71, 2.16, 0.160, 0.71, 2.16, 0.160, 0.080, 2.04, 0.160, 0.080); // piso interno (+Y)
  mb.quad(2.04, 0.350, 0.080, 2.16, 0.350, 0.080, 2.16, 0.350, 0.71, 2.04, 0.350, 0.71); // teto interno (-Y)
  mb.quad(2.04, 0.160, 0.085, 2.16, 0.160, 0.085, 2.16, 0.350, 0.085, 2.04, 0.350, 0.085); // parede divisória central (+Z)
  mb.quad(2.04, 0.160, 0.70, 2.04, 0.350, 0.70, 2.16, 0.350, 0.70, 2.16, 0.160, 0.70); // parede externa (-Z)
  mb.mat(CM.PLASTIC).color(0.020, 0.020, 0.022);
  mb.rbox(2.12, 0.255, 0.39, 0.055, 0.014, 0.60, 0.004, 1); // lâmina horizontal aerodinâmica

  // Saia lateral em carbono fosco ligando o splitter dianteiro ao difusor traseiro
  mb.rbox(0.0, 0.160, 0.855, 1.78, 0.044, 0.045, 0.008, 1);

  // ---------------- 2. Faróis duplos elípticos embutidos (CM.REFLECTOR) ----------------
  {
    // Caixa interna escura sob o farol (normal +Y)
    mb.mat(CM.UNDER).color(0.012, 0.012, 0.014);
    mb.quad(1.80, 0.44, 0.48, 1.80, 0.44, 0.79, 2.10, 0.44, 0.79, 2.10, 0.44, 0.48);
    for (const [zc, xF, yF, rZ, rY] of [[0.565, 1.98, 0.505, 0.056, 0.040], [0.700, 1.96, 0.515, 0.056, 0.040]]) {
      const D = 0.068;
      const dep = (a, b) => 0.006 + D * Math.pow(Math.max(0, 1 - a * a - b * b), 0.7);
      mb.mat(CM.REFLECTOR).color(0.92, 0.93, 0.96);
      mb.patch((u, v, o) => {
        const s = u * Math.sqrt(1 - 0.5 * v * v), t = v * Math.sqrt(1 - 0.5 * u * u);
        const z = zc + s * rZ, y = yF + t * rY, d = dep(s, t);
        o[0] = xF - d; o[1] = y - d * 0.22; o[2] = z;
      }, -1, 1, -1, 1, { nu: 14, nv: 14, flip: false, uv: (u, v) => { _tuv[0] = u; _tuv[1] = v; return _tuv; } });
      mb.push(m4translate(m4(), xF - (D - 0.014), yF - (D - 0.014) * 0.22, zc));
      mb.push(m4rotZ(m4(), -PI / 2 + 0.22));
      mb.mat(CM.REFLECTOR, 1).color(1, 0.96, 0.85); mb.cyl(0, -0.01, 0, 0.010, 0.022, 0.009, 12, false, true);
      mb.mat(CM.REFLECTOR, 2).color(0.82, 0.83, 0.85); mb.cyl(0, -0.01, 0, 0.015, -0.006, 0.013, 12, false, true);
      mb.pop(); mb.pop();
    }
  }

  // ---------------- 3. Tomada lateral esculpida atrás das portas (CM.GRILLE, 1) ----------------
  mb.mat(CM.GRILLE, 1).color(0.010, 0.010, 0.012);
  mb.quad(-0.84, 0.27, 0.88, -0.84, 0.27, 0.66, -0.84, 0.59, 0.66, -0.84, 0.59, 0.88);
  mb.mat(CM.UNDER).color(0.014, 0.014, 0.016);
  mb.quad(-0.84, 0.27, 0.66, -0.42, 0.27, 0.66, -0.42, 0.59, 0.66, -0.84, 0.59, 0.66); // parede interna (+Z)
  mb.quad(-0.84, 0.27, 0.66, -0.84, 0.27, 0.89, -0.42, 0.27, 0.89, -0.42, 0.27, 0.66); // piso (+Y)
  mb.quad(-0.84, 0.59, 0.66, -0.42, 0.59, 0.66, -0.42, 0.59, 0.89, -0.84, 0.59, 0.89); // teto (-Y)
  mb.mat(CM.PAINT, 255).color(1, 1, 1);
  mb.rbox(-0.78, 0.43, 0.895, 0.28, 0.022, 0.045, 0.006, 1); // divisor horizontal pintado na boca da tomada

  // ---------------- 4. Retrovisores aerodinâmicos de haste dupla ----------------
  mb.mat(CM.PLASTIC).color(0.018, 0.018, 0.020);
  mb.rbox(0.55, 0.725, 0.845, 0.085, 0.022, 0.11, 0.005, 1); // haste inferior
  mb.rbox(0.52, 0.765, 0.845, 0.075, 0.020, 0.11, 0.005, 1); // haste superior (haste dupla)
  mb.mat(CM.PAINT, 255).color(1, 1, 1);
  mb.push(m4translate(m4(), 0.48, 0.76, 0.92)); mb.push(m4rotY(m4(), 0.22));
  mb.rbox(0, 0, 0, 0.125, 0.068, 0.155, 0.026, 4);
  mb.mat(CM.MIRROR).color(0.62, 0.64, 0.67);
  mb.quad(-0.063, -0.022, -0.062, -0.063, -0.022, 0.062, -0.063, 0.022, 0.062, -0.063, 0.022, -0.062);
  mb.pop(); mb.pop();

  // ---------------- 5. Caixas de roda e assoalho ----------------
  mb.mat(CM.UNDER).color(0.006, 0.006, 0.007);
  for (const ax of [TG.AXF, TG.AXR]) {
    const R0 = TG.ARCH_R + 0.006, N = 26, zo = tgZL(ax, 0.42) - 0.012, zi = 0.44;
    for (let i = 0; i < N; i++) {
      const aS = ax > 0 ? 12 : -18, aE = ax > 0 ? 198 : 163;
      const a0 = (aS + (aE - aS) * i / N) * PI / 180, a1 = (aS + (aE - aS) * (i + 1) / N) * PI / 180;
      const x0 = ax + Math.cos(a0) * R0, y0 = TG.ARCH_Y + Math.sin(a0) * R0, x1 = ax + Math.cos(a1) * R0, y1 = TG.ARCH_Y + Math.sin(a1) * R0;
      const a = mb.v(x0, y0, zo, -Math.cos(a0), -Math.sin(a0), 0, 0, 0), b = mb.v(x0, y0, zi, -Math.cos(a0), -Math.sin(a0), 0, 0, 1), c = mb.v(x1, y1, zi, -Math.cos(a1), -Math.sin(a1), 0, 1, 1), d = mb.v(x1, y1, zo, -Math.cos(a1), -Math.sin(a1), 0, 1, 0);
      mb.quadI(a, d, c, b);
    }
    mb.quad(ax - 0.36, 0.20, zi, ax + 0.36, 0.20, zi, ax + 0.36, 0.68, zi, ax - 0.36, 0.68, zi);
  }
  mb.quad(-0.88, 0.16, 0, 0.88, 0.16, 0, 0.88, 0.16, 0.82, -0.88, 0.16, 0.82); // assoalho central (-Y)
  mb.quad(0.88, 0.16, 0, 1.88, 0.16, 0, 1.88, 0.16, 0.50, 0.88, 0.16, 0.50);   // assoalho dianteiro estreito (-Y)
  mb.quad(-1.82, 0.16, 0, -0.88, 0.16, 0, -0.88, 0.16, 0.50, -1.82, 0.16, 0.50); // assoalho traseiro estreito (-Y)

  // ---------------- 6. Painel traseiro recuado em grade escura + 4 lanternas redondas/ovais + ré + difusor 4 aletas ----------------
  // Grade traseira escura voltada para -X
  mb.mat(CM.GRILLE, 1).color(0.010, 0.010, 0.012);
  mb.quad(-2.125, 0.405, 0, -2.125, 0.405, 0.78, -2.125, 0.725, 0.78, -2.125, 0.725, 0);
  // Parede inferior e superior do nicho traseiro
  mb.mat(CM.PLASTIC).color(0.016, 0.016, 0.018);
  mb.quad(-2.125, 0.405, 0, -2.18, 0.405, 0, -2.18, 0.405, 0.78, -2.125, 0.405, 0.78); // piso (+Y)
  mb.quad(-2.18, 0.725, 0, -2.125, 0.725, 0, -2.125, 0.725, 0.78, -2.18, 0.725, 0.78); // teto (-Y)

  // 2 lanternas ovais/redondas por lado (4 no total): externa dual rubi/âmbar (|z|=0.64) + interna rubi pura (|z|=0.44)
  for (const [zc, dual] of [[0.64, true], [0.44, false]]) {
    const yc = 0.585, hz = 0.080, hy = 0.052;
    mb.mat(CM.PLASTIC).color(0.015, 0.015, 0.017);
    mb.rbox(-2.136, yc, zc, 0.032, hy * 2 + 0.018, hz * 2 + 0.018, 0.022, 3);
    mb.mat(CM.LENS, 1).color(0.78, 0.03, 0.02);
    mb.patch((u, v, o) => {
      const s = u * Math.sqrt(1 - 0.5 * v * v), t = v * Math.sqrt(1 - 0.5 * u * u);
      o[0] = -2.150 - 0.011 * (1 - s * s - t * t);
      o[1] = yc + hy * t;
      o[2] = zc + hz * s;
    }, -1, 1, -1, 1, {
      nu: 12, nv: 12, flip: false,
      uv: (u, v) => {
        const s = u * Math.sqrt(1 - 0.5 * v * v), t = v * Math.sqrt(1 - 0.5 * u * u);
        _tuv[0] = 0.45 + 0.48 * (s * 0.5 + 0.5);
        _tuv[1] = dual ? (0.34 + 0.54 * (t * 0.5 + 0.5)) : (0.28 + 0.32 * (t * 0.5 + 0.5));
        return _tuv;
      },
    });
  }

  // Luzes de ré brancas (CM.LENS, 1 com u < 0.36, v < 0.20, normal -X)
  mb.mat(CM.PLASTIC).color(0.015, 0.015, 0.017);
  mb.rbox(-2.135, 0.505, 0.275, 0.028, 0.048, 0.095, 0.010, 2);
  mb.mat(CM.LENS, 1).color(0.82, 0.82, 0.80);
  mb.quad(-2.152, 0.487, 0.236, -2.152, 0.487, 0.314, -2.152, 0.523, 0.314, -2.152, 0.523, 0.236, 0.08, 0.06, 0.32, 0.17);

  // Difusor traseiro inferior com 4 aletas verticais (2 por metade, espelhadas -> z = ±0.26, ±0.52)
  mb.mat(CM.PLASTIC).color(0.018, 0.018, 0.020);
  mb.quad(-1.82, 0.145, 0.76, -1.82, 0.145, 0, -2.19, 0.235, 0, -2.19, 0.235, 0.76); // fundo inclinado (-Y)
  mb.quad(-2.19, 0.235, 0, -2.19, 0.235, 0.76, -2.19, 0.405, 0.76, -2.19, 0.405, 0); // fechamento traseiro (-X)
  mb.rbox(-2.02, 0.195, 0.26, 0.36, 0.12, 0.014, 0.004, 1); // aleta interna
  mb.rbox(-2.02, 0.195, 0.52, 0.36, 0.12, 0.014, 0.004, 1); // aleta externa

  // ---------------- 7. Interior esportivo (metade direita; espelhado) ----------------
  mb.mat(CM.INTERIOR).color(0.045, 0.046, 0.052);
  mb.quad(-0.56, 0.18, 0.78, 0.88, 0.18, 0.78, 0.88, 0.18, 0, -0.56, 0.18, 0); // assoalho cabine (+Y)
  mb.quad(0.86, 0.18, 0, 0.86, 0.18, 0.78, 0.86, 0.70, 0.78, 0.86, 0.70, 0); // corta-fogo dianteiro (-X)
  mb.quad(-0.56, 0.18, 0.78, -0.56, 0.18, 0, -0.56, 0.92, 0, -0.56, 0.92, 0.78); // antepara do motor (+X)

  // Painel envolvente baixo (sem obstruir a linha de visada y = 0.96 nem tocar o para-brisa)
  mb.mat(CM.INTERIOR, 3).color(0.042, 0.044, 0.050);
  mb.rbox(0.56, 0.64, 0.36, 0.30, 0.18, 0.72, 0.03, 3);
  mb.mat(CM.INTERIOR, 3).color(0.058, 0.060, 0.066);
  mb.rbox(0.57, 0.742, 0.36, 0.26, 0.022, 0.70, 0.008, 2); // tampo do painel (abaixo de y = 0.76)

  // Bancos concha esportivos muito baixos (encosto reclinado cabendo sob o teto de 1,11 m)
  mb.mat(CM.INTERIOR, 4).color(0.062, 0.065, 0.072);
  mb.rbox(-0.02, 0.28, 0.36, 0.46, 0.10, 0.44, 0.04, 4);
  mb.push(m4translate(m4(), -0.25, 0.31, 0.36)); mb.push(m4rotZ(m4(), 0.46));
  mb.rbox(0, 0.24, 0, 0.095, 0.48, 0.42, 0.04, 4);
  mb.rbox(0.01, 0.51, 0, 0.075, 0.12, 0.20, 0.03, 3);
  mb.pop(); mb.pop();

  mb.mirror(v0, i0, 2);

  // ======================= Peças centrais e assimétricas (sem espelhamento) =======================

  // ---------------- 8. Aerofólio traseiro integrado em arco contínuo (Hoop Wing, CM.PAINT, 255) ----------------
  {
    mb.mat(CM.PAINT, 255).color(1, 1, 1);
    const hoopPath = [
      [-1.84, 0.71, -0.82],
      [-1.96, 0.80, -0.83],
      [-2.04, 0.91, -0.78],
      [-2.09, 0.975, -0.64],
      [-2.11, 0.992, -0.32],
      [-2.115, 0.996, 0.0],
      [-2.11, 0.992, 0.32],
      [-2.09, 0.975, 0.64],
      [-2.04, 0.91, 0.78],
      [-1.96, 0.80, 0.83],
      [-1.84, 0.71, 0.82],
    ];
    // Perfil aerodinâmico arredondado (a = espessura/arqueamento, b = corda ~ 0.20 m)
    const airfoil = [
      [0.012, 0.0], [0.014, 0.045], [0.009, 0.088], [0.0, 0.102],
      [-0.008, 0.084], [-0.010, 0.035], [-0.008, -0.035], [-0.004, -0.096],
      [0.004, -0.098], [0.009, -0.045],
    ];
    mb.sweep(hoopPath, airfoil, { closedProfile: true, up: [1, 0, 0] });
  }

  // ---------------- 9. Compartimento do motor V12 biturbo visível sob a vigia traseira ----------------
  mb.mat(CM.UNDER).color(0.012, 0.012, 0.014);
  mb.quad(-1.82, 0.44, -0.43, -1.82, 0.44, 0.43, -0.60, 0.44, 0.43, -0.60, 0.44, -0.43); // piso da baia (+Y)
  mb.quad(-1.82, 0.44, 0.43, -1.82, 0.84, 0.43, -0.60, 0.84, 0.43, -0.60, 0.44, 0.43);   // parede dir (-Z)
  mb.quad(-1.82, 0.44, -0.43, -0.60, 0.44, -0.43, -0.60, 0.84, -0.43, -1.82, 0.84, -0.43); // parede esq (+Z)
  mb.quad(-1.82, 0.44, -0.43, -1.82, 0.84, -0.43, -1.82, 0.84, 0.43, -1.82, 0.44, 0.43);   // parede tras (+X)
  // Bloco V12 + cabeçotes vermelhos + 12 cornetas/coletores cromados e plenums em alumínio
  mb.mat(CM.ALU, 1).color(0.54, 0.56, 0.60);
  mb.rbox(-1.20, 0.54, 0, 0.82, 0.16, 0.34, 0.02, 2); // bloco central
  for (const sg of [-1, 1]) {
    mb.push(m4translate(m4(), -1.20, 0.63, sg * 0.16));
    mb.push(m4rotX(m4(), sg * 0.42));
    mb.mat(CM.STRAP).color(0.78, 0.08, 0.05);
    mb.rbox(0, 0.04, 0, 0.78, 0.055, 0.14, 0.012, 2); // tampa de válvulas vermelha V12
    mb.mat(CM.ALU, 1).color(0.68, 0.70, 0.75);
    mb.rbox(0, 0.085, -sg * 0.04, 0.74, 0.048, 0.11, 0.015, 2); // plenum de admissão
    mb.mat(CM.CHROME).color(0.88, 0.90, 0.94);
    for (let k = 0; k < 6; k++) {
      const rx = -0.30 + k * 0.12;
      mb.tube([[rx, 0.06, 0.03 * sg], [rx, 0.12, -0.02 * sg], [rx, 0.095, -0.07 * sg]], 0.014, 7);
    }
    mb.pop(); mb.pop();
    // Turbinas gêmeas na traseira do V12 + tubulação do intercooler
    mb.mat(CM.ALU, 1).color(0.64, 0.66, 0.70);
    mb.push(m4translate(m4(), -1.62, 0.58, sg * 0.22)); mb.push(m4rotX(m4(), PI / 2));
    mb.cyl(0, -0.04, 0, 0.068, 0.04, 0.068, 16, true, true);
    mb.pop(); mb.pop();
    mb.mat(CM.CHROME).color(0.86, 0.88, 0.92);
    mb.tube([[-1.62, 0.64, sg * 0.22], [-1.52, 0.73, sg * 0.14], [-1.42, 0.73, sg * 0.12]], 0.018, 8);
  }
  // Barra estrutural em X sobre a baia do motor
  mb.mat(CM.STEEL, 1).color(0.16, 0.17, 0.19);
  mb.tube([[-0.74, 0.84, -0.38], [-1.66, 0.74, 0.38]], 0.014, 7);
  mb.tube([[-0.74, 0.84, 0.38], [-1.66, 0.74, -0.38]], 0.014, 7);

  // ---------------- 10. Escapamento central duplo de inox no difusor ([-2.22, 0.28, ±0.11]) ----------------
  mb.mat(CM.STEEL, 1).color(0.04, 0.04, 0.045);
  mb.rbox(-2.06, 0.28, 0, 0.24, 0.11, 0.34, 0.015, 2); // nicho central dos escapes
  for (const ez of [-0.11, 0.11]) {
    mb.mat(CM.STEEL, 1).color(0.08, 0.08, 0.09);
    mb.tube([[-1.76, 0.31, ez], [-2.02, 0.285, ez]], 0.032, 10);
    const BE = m4basis(m4(), -1, 0.03, 0, -0.03, -1, 0, 0, 0, 1, -2.22, 0.28, ez);
    mb.push(BE);
    mb.mat(CM.CHROME, 1).color(0.86, 0.88, 0.92);
    mb.lathe([[-0.20, 0.036], [-0.02, 0.048], [0.0, 0.048], [0.0, 0.041]], 20);
    mb.mat(CM.UNDER).color(0.008, 0.008, 0.010);
    mb.lathe([[0.0, 0.041], [-0.16, 0.032], [-0.16, 0.0]], 16);
    mb.pop();
  }
  if (typeof carAddExhaustFlame === 'function') {
    const fxTarget = fb || mb;
    carAddExhaustFlame(fxTarget, -2.22, 0.28, -0.11, -1, 0.03, 0.72, 0.056);
    carAddExhaustFlame(fxTarget, -2.22, 0.28,  0.11, -1, 0.03, 0.72, 0.056);
  }

  // ---------------- 11. Placa e emblemas 'TG2' (CAT.tg2 / CAT.tg2Plate) ----------------
  // Placa traseira centrada no painel escuro (normal -X)
  mb.mat(CM.PLASTIC).color(0.014, 0.014, 0.016);
  mb.rbox(-2.138, 0.502, 0, 0.014, 0.106, 0.366, 0.005, 1);
  mb.mat(CM.DECAL).color(1, 1, 1);
  const regP = CAT.tg2Plate || CAT.tg2;
  mb.quad(-2.147, 0.456, -0.175, -2.147, 0.456, 0.175, -2.147, 0.548, 0.175, -2.147, 0.548, -0.175, regP[0], regP[3], regP[2], regP[1]);

  // Emblema 'TG2' metálico acima da placa no painel traseiro (normal -X) + emblema no bico dianteiro
  const regB = CAT.tg2;
  mb.mat(CM.DECAL, 1).color(1, 1, 1);
  mb.quad(-2.147, 0.635, -0.105, -2.147, 0.635, 0.105, -2.147, 0.705, 0.105, -2.147, 0.705, -0.105, regB[0], regB[3], regB[2], regB[1]);
  {
    const x0 = 2.08, y0 = tgYtop(x0, 0) + 0.004, y1 = tgYtop(x0 + 0.02, 0) + 0.004, sl = (y1 - y0) / 0.02;
    const l = Math.hypot(1, sl), nx = -sl / l, ny = 1 / l, ux = -1 / l, uy = -sl / l;
    const cx = x0 + nx * 0.003, cy = y0 + ny * 0.003, hw = 0.068, hh = 0.023;
    mb.quad(
      cx - ux * hh, cy - uy * hh, hw,
      cx - ux * hh, cy - uy * hh, -hw,
      cx + ux * hh, cy + uy * hh, -hw,
      cx + ux * hh, cy + uy * hh, hw,
      regB[0], regB[3], regB[2], regB[1]
    );
  }

  // ---------------- 12. Cockpit voltado ao piloto: console central + capela + bateria de manômetros analógicos ----------------
  mb.mat(CM.INTERIOR, 3).color(0.036, 0.038, 0.044);
  mb.rbox(0.24, 0.34, 0, 0.66, 0.24, 0.19, 0.025, 2); // console central baixo
  mb.tube([[0.18, 0.46, 0], [0.16, 0.56, 0]], 0.009, 6);
  mb.rbox(0.158, 0.575, 0, 0.036, 0.036, 0.036, 0.014, 3); // manopla de câmbio esportiva
  // Capela envolvente do painel em z = -0.36 (altura <= 0.855, bem abaixo de eyePos.y = 0.96)
  mb.rbox(0.49, 0.785, -0.36, 0.16, 0.12, 0.34, 0.024, 3);
  mb.tube([[0.27, 0.755, -0.36], [0.52, 0.69, -0.36]], 0.024, 10); // coluna de direção
  // Bateria de manômetros analógicos (RPM central + velocímetro + pressão turbo/óleo) voltados para -X (piloto)
  for (const [mz, my, mr] of [[-0.36, 0.79, 0.036], [-0.445, 0.785, 0.026], [-0.275, 0.785, 0.026], [-0.07, 0.68, 0.022], [-0.01, 0.68, 0.022]]) {
    mb.mat(CM.ALU, 1).color(0.72, 0.74, 0.78);
    mb.push(m4translate(m4(), 0.415, my, mz)); mb.push(m4rotZ(m4(), PI / 2));
    mb.cyl(0, -0.006, 0, mr, 0.004, mr, 16, true, true);
    mb.pop(); mb.pop();
    mb.mat(CM.INTERIOR, 1).color(0.018, 0.020, 0.025);
    mb.quad(0.409, my - mr * 0.82, mz - mr * 0.82, 0.409, my - mr * 0.82, mz + mr * 0.82, 0.409, my + mr * 0.82, mz + mr * 0.82, 0.409, my + mr * 0.82, mz - mr * 0.82);
    mb.mat(CM.STRAP).color(0.95, 0.25, 0.10);
    mb.box(0.407, my + mr * 0.2, mz, 0.003, mr * 0.6, 0.004); // ponteiro vermelho
  }
  // Retrovisor interno discreto no topo do para-brisa + limpador único central (estilo grupo C / supercarro)
  mb.mat(CM.INTERIOR, 3).color(0.03, 0.03, 0.034);
  mb.rbox(0.24, 1.01, 0, 0.022, 0.042, 0.16, 0.010, 2);
  mb.mat(CM.RUBBER).color(0.015, 0.015, 0.015);
  mb.sweep([[0.86, 0.70, 0.02], [0.64, 0.81, -0.05], [0.42, 0.92, -0.14]], [[-0.005, -0.004], [0.005, -0.004], [0.005, 0.004], [-0.005, 0.004]], { closedProfile: true, hard: true });
}

// Piloto em posição baixa de cockpit (capacete abaixo do teto de 1,11 m)
function topgearBuildDriver(mb) {
  const zd = -0.36;
  mb.mat(CM.INTERIOR, 2).color(0.12, 0.16, 0.24); // macacão azul-escuro racing
  mb.push(m4translate(m4(), -0.21, 0.34, zd)); mb.push(m4rotZ(m4(), 0.45));
  mb.rbox(0.065, 0.23, 0, 0.16, 0.45, 0.32, 0.065, 4);
  mb.rbox(0.065, 0.41, 0, 0.135, 0.085, 0.37, 0.038, 3);
  mb.pop(); mb.pop();
  mb.rbox(0.02, 0.38, zd, 0.38, 0.10, 0.30, 0.046, 3);
  for (const sg of [-1, 1]) mb.tube([[-0.20, 0.78, zd + sg * 0.175], [0.02, 0.71, zd + sg * 0.185], [0.25, 0.755, zd + sg * 0.145]], 0.035, 8);
  mb.mat(CM.INTERIOR, 3).color(0.02, 0.02, 0.022);
  for (const sg of [-1, 1]) mb.rbox(0.26, 0.76, zd + sg * 0.15, 0.072, 0.058, 0.064, 0.024, 2);
  mb.rbox(-0.19, 0.84, zd, 0.082, 0.055, 0.090, 0.024, 2);
  mb.mat(CM.GLOSS).color(0.82, 0.14, 0.08); // capacete integral vermelho/laranja Top Gear 2
  mb.rbox(-0.165, 0.945, zd, 0.210, 0.205, 0.194, 0.092, 7);
  mb.rbox(-0.140, 0.880, zd, 0.155, 0.085, 0.175, 0.040, 5);
  mb.mat(CM.GLOSS, 1).color(0.01, 0.011, 0.014);
  mb.rbox(-0.110, 0.952, zd, 0.112, 0.066, 0.198, 0.028, 5);
}

// Roda esportiva côncava de 5 raios largos estilo anos 90 (OZ/BBS) + disco de freio + disco de borrão
function topgearBuildWheel(mb, mbBlur) {
  mb.push(m4rotY(m4(), -PI / 2));
  mb.push(m4translate(m4(), -0.015, 0, 0));
  const R = TG.WR, seg = 64;
  // Pneu esportivo largo de perfil baixo
  mb.mat(CM.TIRE, 255).color(0.020, 0.020, 0.022);
  mb.lathe([[-0.088, 0.220], [-0.098, 0.236], [-0.105, 0.264], [-0.105, 0.288], [-0.098, 0.304], [-0.090, 0.310, 0.5, 1]], seg);
  mb.lathe([[0.090, 0.310, 0.5, -1], [0.098, 0.304], [0.105, 0.288], [0.105, 0.264], [0.098, 0.236], [0.088, 0.220]], seg);
  mb.mat(CM.TIRE, 0);
  const tread = [[-0.090, 0.310, 0.5, 1], [-0.082, 0.314], [-0.072, R]];
  const groove = x => { tread.push([x - 0.005, R], [x - 0.004, R - 0.007], [x + 0.004, R - 0.007], [x + 0.005, R]); };
  tread.push([-0.056, R]); groove(-0.044); groove(-0.015); groove(0.015); groove(0.044); tread.push([0.056, R]);
  tread.push([0.072, R], [0.082, 0.314], [0.090, 0.310, 0.5, -1]);
  mb.lathe(tread, seg);

  // Tambor interno escuro + disco de freio ventilado atrás dos 5 raios largos
  mb.mat(CM.STEEL, 1).color(0.032, 0.034, 0.038);
  mb.lathe([[0.088, 0.220], [0.096, 0.222], [0.098, 0.214], [0.046, 0.206], [0.020, 0.165], [0.016, 0.0]], 36);
  mb.lathe([[-0.025, 0.0], [-0.025, 0.14], [-0.072, 0.208], [-0.090, 0.218], [-0.088, 0.220]], 28);
  mb.mat(CM.ALU, 1).color(0.56, 0.58, 0.62);
  mb.lathe([[0.026, 0.068], [0.026, 0.160], [0.018, 0.160], [0.018, 0.068]], 32); // disco de freio interno

  // Borda usinada côncava do aro 18" + cubo central + 5 raios largos côncavos + 5 porcas cromadas
  mb.mat(CM.ALU, 1).color(0.80, 0.82, 0.86);
  mb.lathe([[0.098, 0.214], [0.098, 0.221], [0.088, 0.221], [0.072, 0.212], [0.058, 0.200], [0.054, 0.200]], 40);
  mb.lathe([[0.042, 0.0], [0.042, 0.052], [0.068, 0.052], [0.072, 0.042], [0.072, 0.0]], 24);
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * TAU;
    mb.push(m4rotX(m4(), a));
    mb.push(m4translate(m4(), 0.068, 0.125, 0));
    mb.push(m4rotZ(m4(), -0.14));
    mb.rbox(0, 0, 0, 0.020, 0.155, 0.044, 0.006, 2); // 5 raios largos côncavos
    mb.pop(); mb.pop();
    mb.mat(CM.CHROME, 2).color(0.88, 0.90, 0.94);
    mb.rbox(0.073, 0.032, 0, 0.010, 0.011, 0.011, 0.003, 1);
    mb.mat(CM.ALU, 1).color(0.80, 0.82, 0.86);
    mb.pop();
  }
  mb.mat(CM.STRAP).color(0.82, 0.12, 0.08);
  mb.lathe([[0.072, 0.0], [0.072, 0.018], [0.076, 0.015], [0.076, 0.0]], 16);

  // Disco de borrão em velocidade
  const bm = mbBlur || mb;
  if (mbBlur) { bm.push(m4rotY(m4(), -PI / 2)); bm.push(m4translate(m4(), -0.015, 0, 0)); }
  bm.mat(CM.HUBCAP, 1).color(0.78, 0.80, 0.84);
  bm.patch((u, v, o) => {
    const a = u * TAU, r = 0.044 + v * 0.160;
    o[0] = lerp(0.072, 0.091, v) + 0.002;
    o[1] = r * Math.cos(a);
    o[2] = r * Math.sin(a);
  }, 0, 1, 0, 1, { nu: 48, nv: 8, flip: true, uv: (u, v) => { _tuv[0] = u; _tuv[1] = v; return _tuv; } });
  if (mbBlur) { bm.pop(); bm.pop(); }
  mb.pop(); mb.pop();
}

// Volante esportivo Momo de 3 raios em couro preto e alumínio
function topgearBuildSteer(mb) {
  mb.mat(CM.INTERIOR, 3).color(0.028, 0.028, 0.032);
  const ring = [];
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; ring.push([0, 0.158 * Math.cos(a), 0.158 * Math.sin(a)]); }
  mb.tube(ring, 0.014, 10, { closed: true, up: [1, 0, 0] });
  mb.mat(CM.STRAP).color(0.92, 0.72, 0.08); // marca amarela 12h
  mb.rbox(0, -0.158, 0, 0.030, 0.030, 0.018, 0.005, 1);

  mb.mat(CM.ALU, 1).color(0.72, 0.74, 0.78);
  mb.rbox(-0.014, 0, 0.092, 0.014, 0.028, 0.130, 0.005, 1);
  mb.rbox(-0.014, 0, -0.092, 0.014, 0.028, 0.130, 0.005, 1);
  mb.rbox(-0.014, 0.090, 0, 0.014, 0.125, 0.030, 0.005, 1);
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.024);
  mb.rbox(-0.022, 0, 0, 0.032, 0.068, 0.068, 0.022, 3);
  mb.mat(CM.STRAP).color(0.84, 0.14, 0.08);
  mb.box(-0.005, 0, 0, 0.004, 0.026, 0.026);

  const t0 = m4translate(m4(), 0.27, 0.755, -0.36), t1 = m4rotZ(m4(), 152 * PI / 180);
  return m4mul(m4(), t0, t1);
}

function topgearBuildModel() {
  tgShapeInit(); tgWindowsInit(); tgSeamInit();
  const mb = new MeshBuilder(1 << 17), gl = new MeshBuilder(1 << 14), fb = new MeshBuilder(1 << 10);
  topgearBuildBody(mb, gl);
  topgearBuildParts(mb, fb);
  let tris = mb.ni / 3 + gl.ni / 3 + fb.ni / 3;
  const dm = new MeshBuilder(1 << 13); topgearBuildDriver(dm); tris += dm.ni / 3;
  const w = new MeshBuilder(1 << 15), wb = new MeshBuilder(1 << 11); topgearBuildWheel(w, wb); tris += 4 * (w.ni + wb.ni) / 3;
  const s = new MeshBuilder(1 << 12); const steerMat = topgearBuildSteer(s); tris += s.ni / 3;
  return {
    name: 'Top Gear 2 GT',
    bodyMesh: mb.upload(),
    driverMesh: dm.upload(),
    glassMesh: gl.upload(),
    flameMesh: fb.ni ? fb.upload() : null,
    wheelMesh: w.upload(),
    wheelBlurMesh: wb.upload(),
    steerMesh: s.upload(),
    steerMat,
    hubs: [[TG.AXF, TG.WR, -0.81], [TG.AXF, TG.WR, 0.81], [TG.AXR, TG.WR, -0.83], [TG.AXR, TG.WR, 0.83]],
    wheelR: TG.WR,
    eyePos: [-0.02, 0.96, -0.36],
    bodyKind: 4,
    aoScale: 1.06,
    exhausts: [
      [-2.22, 0.28, -0.11, -1, 0.03, 1.15],
      [-2.22, 0.28,  0.11, -1, 0.03, 1.15],
    ],
    tris,
  };
}
