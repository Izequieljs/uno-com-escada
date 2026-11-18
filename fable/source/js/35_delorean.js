// DeLorean DMC-12 Máquina do Tempo (De Volta para o Futuro): carroceria Giugiaro em cunha, aço inox escovado,
// portas gullwing, faróis quádruplos, bandas de fluxo, persiana traseira, Mr. Fusion, extratores BTTF,
// Capacitor de Fluxo no cockpit e rodas multirraios de 16 aletas.
const DMC = {
  XF: 2.08, XR: -2.06,
  YS: 0.215,
  AXF: 1.205, AXR: -1.205, WR: 0.295,
  TH_S: Math.sin(24 * PI / 180), TH_C: Math.cos(24 * PI / 180),
  VF: [0, 0.36, 0.42, 0.60, 0.68, 1],
  ARCH_R: 0.340, ARCH_Y: 0.305,
};
const _duv = [0, 0];
const dsq = x => x * x;
function dsmin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function dsmax(a, b, k) { return -dsmin(-a, -b, k); }
function dmcG(d, r) { return d <= -r || d >= r ? 0 : d < 0 ? (r + d) * (r + d) / (4 * r) : (r - d) * (r - d) / (4 * r); }
function dmcRRect(a, b, ha, hb, r) { const qa = Math.abs(a) - ha + r, qb = Math.abs(b) - hb + r; return Math.hypot(Math.max(qa, 0), Math.max(qb, 0)) + Math.min(Math.max(qa, qb), 0) - r; }
function dmcSegDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, t = sat(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); }

// Perfil superior Giugiaro em cunha: frente baixa, capô longo, para-brisa muito inclinado, teto 1,14 m, fastback até a traseira
function dmcYT(x) {
  const fascia = 0.642 - 3.6 * (x - 2.01);
  const hood = 0.786 - 0.117 * (x - 0.78);
  const wind = 0.786 - 0.478 * (x - 0.78);
  const a = x + 0.26, roof = 1.140 - 0.018 * a * a;
  const deck = 0.812 + 0.232 * (x + 1.99);
  const tail = 0.812 + 7.5 * (x + 2.015);
  let y = dsmax(hood, wind, 0.022);
  y = dsmin(y, roof, 0.026);
  y = dsmin(y, deck, 0.024);
  y = dsmin(y, tail, 0.020);
  y = dsmin(y, fascia, 0.022);
  return y;
}
function dmcBulge(x) { return 0.028 * smooth(-0.1, 0.35, x) - 0.014 * smooth(-1.5, -1.9, x); }
function dmcCrown(x) { return 0.012 * smooth(0.70, 1.0, x) * smooth(2.05, 1.92, x) + 0.014 * smooth(0.10, -0.25, x) * smooth(-1.95, -1.70, x); }
function dmcYtop(x, z) {
  const zz = z / 0.76, xi = dmcBulge(x) * (1 - zz * zz);
  let y = dmcYT(x - xi) - dmcCrown(x) * zz * zz;
  // Vincos sutis do capô Giugiaro (dois ressaltos externos convergindo suavemente)
  if (x > 0.72) {
    const zc = 0.56 - 0.08 * sat((x - 0.80) / 1.2);
    y += 0.007 * (1 - smooth(zc - 0.014, zc + 0.014, z)) * smooth(0.80, 0.95, x - xi) * smooth(1.98, 1.88, x - xi);
  }
  return y;
}
function dmcWPlan(x) {
  const t = sat((x - 0.75) / 1.32), t2 = sat((-0.95 - x) / 1.10);
  return 0.830 - 0.052 * t * t - 0.032 * t2 * t2;
}
function dmcZL(x, y) {
  let z = dmcWPlan(x);
  const d = y - 0.56;
  z -= d < 0 ? 0.018 * dsq(d / 0.34) : 0.014 * dsq(d / 0.24);
  // Vinco lateral vivo na altura dos para-choques / friso preto + dobra inferior da soleira
  z -= 0.005 * smooth(0.47, 0.51, y) * (1 - smooth(0.54, 0.58, y));
  if (y < 0.26) z -= 0.028 * dsq((0.26 - y) / 0.045);
  const df = Math.hypot(x - DMC.AXF, y - DMC.ARCH_Y) - DMC.ARCH_R;
  const dr = Math.hypot(x - DMC.AXR, y - DMC.ARCH_Y) - DMC.ARCH_R;
  const da = Math.min(df, dr);
  if (da < 0.26) z += 0.011 * Math.exp(-dsq((da - 0.008) / 0.068));
  return z;
}
function dmcBeltN(x) { return 0.778 - 0.022 * sat((x + 0.60) / 1.45); }
function dmcR2(x) {
  let r = 0.026;
  r = lerp(r, 0.016, smooth(-0.10, 0.20, x));
  r = lerp(r, 0.010, smooth(0.70, 0.90, x));
  r = lerp(r, 0.022, smooth(1.90, 2.02, x));
  r = lerp(r, 0.016, smooth(-1.55, -1.85, x));
  return r;
}
const _dstCache = []; let _dstNext = 0;
for (let i = 0; i < 8; i++) _dstCache.push({ x: NaN, yB: 0, zB: 0, dAz: 0, LA: 0, LB: 0, zE: 0, yE: 0, dCy: 0, r1: 0, r2: 0, b: new Float64Array(6) });
function dmcStation(x) {
  for (let i = 0; i < 8; i++) if (_dstCache[i].x === x) return _dstCache[i];
  const st = _dstCache[_dstNext]; _dstNext = (_dstNext + 1) & 7; st.x = x;
  const bn = dmcBeltN(x);
  let y = bn; for (let k = 0; k < 4; k++) y = dmcYtop(x, dmcZL(x, Math.min(y, bn + 0.2)));
  if (y <= bn) { st.yB = y; st.LB = 0; }
  else {
    st.yB = bn; const zb = dmcZL(x, bn); let t = (dmcYtop(x, zb) - bn) / DMC.TH_C;
    for (let k = 0; k < 5; k++) t = (dmcYtop(x, zb - t * DMC.TH_S) - bn) / DMC.TH_C;
    st.LB = Math.max(t, 0);
  }
  st.zB = dmcZL(x, st.yB); st.dAz = (dmcZL(x, st.yB) - dmcZL(x, st.yB - 0.004)) / 0.004;
  st.LA = st.yB - DMC.YS;
  st.zE = st.zB - st.LB * DMC.TH_S; st.yE = st.yB + st.LB * DMC.TH_C;
  st.dCy = -(dmcYtop(x, st.zE) - dmcYtop(x, st.zE - 0.004)) / 0.004;
  st.r1 = 0.009; st.r2 = dmcR2(x);
  const b = st.b, h = st.LB * 0.5;
  b[0] = 0; b[1] = st.LA - st.r1; b[2] = st.LA + Math.min(st.r1, h); b[3] = st.LA + st.LB - Math.min(st.r2, h); b[4] = st.LA + st.LB + st.r2; b[5] = st.LA + st.LB + st.zE;
  return st;
}
function dmcSkin(x, v, off, out) {
  const st = dmcStation(x), VF = DMC.VF, b = st.b;
  let k = 0; while (k < 4 && v > VF[k + 1]) k++;
  const s = b[k] + (b[k + 1] - b[k]) * (v - VF[k]) / (VF[k + 1] - VF[k]);
  let z, y, tz, ty;
  const s1 = st.LA, s2 = st.LA + st.LB;
  if (s <= s1) { y = DMC.YS + s; z = dmcZL(x, y); tz = (dmcZL(x, y + 0.002) - dmcZL(x, y - 0.002)) / 0.004; ty = 1; }
  else if (s <= s2) { const t = s - s1; z = st.zB - t * DMC.TH_S; y = st.yB + t * DMC.TH_C; tz = -DMC.TH_S; ty = DMC.TH_C; }
  else { z = st.zE - (s - s2); y = dmcYtop(x, z); tz = -1; ty = -(dmcYtop(x, z + 0.002) - dmcYtop(x, z - 0.002)) / 0.004; }
  const d1z = -DMC.TH_S - st.dAz, d1y = DMC.TH_C - 1, d2z = -1 + DMC.TH_S, d2y = st.dCy - DMC.TH_C;
  const g1 = dmcG(s - s1, st.r1), g2 = dmcG(s - s2, st.r2);
  z += d1z * g1 + d2z * g2; y += d1y * g1 + d2y * g2;
  let px = x;
  if (off) {
    const e1 = s - s1, e2 = s - s2;
    const h1 = e1 <= -st.r1 || e1 >= st.r1 ? 0 : (e1 < 0 ? (st.r1 + e1) : -(st.r1 - e1)) / (2 * st.r1);
    const h2 = e2 <= -st.r2 || e2 >= st.r2 ? 0 : (e2 < 0 ? (st.r2 + e2) : -(st.r2 - e2)) / (2 * st.r2);
    const Tz = tz + d1z * h1 + d2z * h2, Ty = ty + d1y * h1 + d2y * h2;
    let nz = Ty, ny = -Tz; const l = 1 / Math.hypot(nz, ny); nz *= l; ny *= l;
    const yx = (dmcYtop(x + 0.003, Math.max(z, 0)) - dmcYtop(x - 0.003, Math.max(z, 0))) / 0.006;
    const nx = -yx * Math.max(ny, 0) * Math.max(ny, 0), l2 = 1 / Math.hypot(nx, ny, nz);
    px += nx * l2 * off; y += ny * l2 * off; z += nz * l2 * off;
  }
  out[0] = px; out[1] = y; out[2] = z;
}
const DMC_UT = { n: 800, x: null, s: null, L: 0 };
function dmcShapeInit() {
  const n = DMC_UT.n, xs = DMC_UT.x = new Float64Array(n + 1), ss = DMC_UT.s = new Float64Array(n + 1);
  let px = DMC.XF, py = dmcYT(px), acc = 0;
  for (let i = 0; i <= n; i++) {
    const x = DMC.XF + (DMC.XR - DMC.XF) * i / n, y = dmcYT(x);
    acc += Math.hypot(x - px, y - py); px = x; py = y; xs[i] = x; ss[i] = acc;
  }
  DMC_UT.L = acc;
}
function dmcXofU(u) {
  const T = DMC_UT, s = sat(u) * T.L; let lo = 0, hi = T.n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.s[m] <= s) lo = m; else hi = m; }
  const f = (s - T.s[lo]) / Math.max(1e-9, T.s[hi] - T.s[lo]);
  return T.x[lo] + (T.x[hi] - T.x[lo]) * f;
}
function dmcUofX(x) {
  const T = DMC_UT, f = sat((x - DMC.XF) / (DMC.XR - DMC.XF)) * T.n, i = Math.min(T.n - 1, Math.floor(f));
  return (T.s[i] + (T.s[i + 1] - T.s[i]) * (f - i)) / T.L;
}
function dmcSkinFn(off) { return (u, v, out) => dmcSkin(dmcXofU(u), v, off || 0, out); }
function dmcTopX(z, y, rear) {
  let a = rear ? -2.08 : 1.80, b = rear ? -1.40 : 2.12;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2, f = dmcYtop(m, z) - y; if ((f > 0) === !rear) a = m; else b = m; }
  return (a + b) / 2;
}
function dmcSub(mb, off, x0, x1, va, vb, cell, opts) {
  const u0 = dmcUofX(x0), u1 = dmcUofX(x1);
  opts.nu = Math.max(2, Math.ceil((u1 - u0) * DMC_UT.L / cell));
  opts.nv = Math.max(2, Math.ceil((vb - va) * 3.1 / cell));
  opts.flip = opts.flip === undefined ? true : opts.flip;
  mb.patch(dmcSkinFn(off), u0, u1, va, vb, opts);
}

// Recortes (negativo = dentro do elemento)
function dmcArchF(P) {
  return Math.min(Math.hypot(P[0] - DMC.AXF, P[1] - DMC.ARCH_Y), Math.hypot(P[0] - DMC.AXR, P[1] - DMC.ARCH_Y)) - DMC.ARCH_R;
}
const DW = { apx: 0, apy: 0, anx: 0, any: 0, cpx: 0, cpy: 0, cnx: 0, cny: 0 };
function dmcWindowsInit() {
  const a = dmcStation(0.66), ax = 0.66, ay = a.yE, b = dmcStation(0.06), bx = 0.06, by = b.yE;
  let nx = -(by - ay), ny = bx - ax, l = Math.hypot(nx, ny); nx /= l; ny /= l; if (ny > 0) { nx = -nx; ny = -ny; }
  DW.apx = ax; DW.apy = ay; DW.anx = nx; DW.any = ny;
  const c = dmcStation(-0.58), cx = -0.58, cy = c.yE, d = dmcStation(-1.02), dx = -1.02, dy = d.yE;
  nx = -(dy - cy); ny = dx - cx; l = Math.hypot(nx, ny); nx /= l; ny /= l; if (nx < 0) { nx = -nx; ny = -ny; }
  DW.cpx = cx; DW.cpy = cy; DW.cnx = nx; DW.cny = ny;
}
function dmcRoofEdgeY(x) { return dmcStation(clamp(x, -0.58, 0.06)).yE; }
function dmcWinDoor(P) {
  const x = P[0], y = P[1];
  const bottom = (dmcBeltN(x) + 0.015) - y;
  const top = y - (dmcRoofEdgeY(x) - 0.030);
  const front = 0.048 - ((x - DW.apx) * DW.anx + (y - DW.apy) * DW.any);
  const rear = -0.45 - x;
  return dsmax(dsmax(bottom, top, 0.018), dsmax(front, rear, 0.018), 0.022);
}
function dmcWinQuarter(P) {
  const x = P[0], y = P[1];
  const bottom = (dmcBeltN(x) + 0.015) - y;
  const top = y - (dmcYtop(x, 0.62) - 0.032);
  const front = x - (-0.53);
  const rear = 0.04 - ((x - DW.cpx) * DW.cnx + (y - DW.cpy) * DW.cny);
  return dsmax(dsmax(bottom, top, 0.016), dsmax(front, rear, 0.016), 0.020);
}
function dmcXe(P) { const zz = P[2] / 0.76; return P[0] - dmcBulge(P[0]) * (1 - zz * zz); }
function dmcWindshield(P) {
  const xe = dmcXe(P), st = dmcStation(P[0]);
  const lo = xe - 0.72, hi = 0.08 - xe, side = P[2] - (st.zE - 0.044);
  return P[0] < -0.02 ? 1 : dsmax(dsmax(lo, hi, 0.022), side, 0.04);
}
const DL_DMC = { hlZ0: 0.365, hlZ1: 0.705, lY: 0.596, lH: 0.042, clZ: 0.715, clX: 1.94 };
function dmcHeadlight(P) { return dmcRRect(P[2] - (DL_DMC.hlZ0 + DL_DMC.hlZ1) / 2, P[1] - DL_DMC.lY, (DL_DMC.hlZ1 - DL_DMC.hlZ0) / 2, DL_DMC.lH, 0.006); }
function dmcCornerLamp(P, v) {
  const g = v > 0.62 ? DL_DMC.clZ - P[2] : DL_DMC.clX - P[0];
  return Math.max(Math.abs(P[1] - DL_DMC.lY) - DL_DMC.lH, g);
}
function dmcGrille(P) { return dmcRRect(P[2], P[1] - DL_DMC.lY, 0.35, DL_DMC.lH, 0.005); }
const DT_DMC = { z0: 0.33, z1: 0.75, y0: 0.575, y1: 0.715 };
function dmcTailLamp(P) {
  return Math.max(
    dmcRRect(P[2] - (DT_DMC.z0 + DT_DMC.z1) * 0.5, P[1] - (DT_DMC.y0 + DT_DMC.y1) * 0.5, (DT_DMC.z1 - DT_DMC.z0) * 0.5, (DT_DMC.y1 - DT_DMC.y0) * 0.5, 0.006),
    P[0] - (-1.95)
  );
}
const DSEAM = { door: null };
function dmcSeamInit() {
  const p = [[0.68, 0.24], [0.68, 0.76], [0.60, 0.81]];
  for (let x = 0.45; x >= -0.45; x -= 0.06) p.push([x, dmcStation(x).yE - 0.02]);
  p.push([-0.48, dmcStation(-0.48).yE - 0.02]); p.push([-0.48, 0.24]); p.push([0.68, 0.24]);
  DSEAM.door = p;
}
function dmcSeam(P, v) {
  const x = P[0], y = P[1], z = P[2]; let d = 1;
  if (v < 0.66 && x > -0.7 && x < 0.95) {
    const p = DSEAM.door; let m = 1e9, inside = false;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1]; m = Math.min(m, dmcSegDist(x, y, a[0], a[1], b[0], b[1]));
      if ((a[1] > y) !== (b[1] > y) && x < a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])) inside = !inside;
    }
    d = Math.min(d, inside ? -m : m);
  }
  if (v > 0.6) {
    const xe = dmcXe(P), st = dmcStation(x);
    if (xe > 0.65) d = Math.min(d, Math.max(z - (st.zE - 0.04), 0.79 - xe, xe - 1.98));
    // Fenda da asa gullwing no teto
    if (x > -0.50 && x < 0.06) d = Math.min(d, Math.max(Math.abs(z) - 0.16, -0.48 - x, x - 0.04));
  }
  return d;
}

function deloreanBuildBody(mb, gl) {
  const seamUV = (u, v, P) => { _duv[0] = dmcSeam(P, v); _duv[1] = v; return _duv; };
  const plainUV = (u, v) => { _duv[0] = 1; _duv[1] = v; return _duv; };
  const v0 = mb.nv, i0 = mb.ni, gv0 = gl.nv, gi0 = gl.ni;

  const paintField = (u, v, P) => {
    let f = 1;
    if (v < 0.42) f = dmcArchF(P);
    else if (v < 0.66) f = Math.min(dmcWinDoor(P), dmcWinQuarter(P));
    if (v > 0.6) {
      f = Math.min(f, dmcWindshield(P));
      if (P[0] > 1.82) f = Math.min(f, dmcHeadlight(P), dmcGrille(P));
    }
    if (P[0] < -1.95) f = Math.min(f, dmcTailLamp(P));
    f = Math.min(f, Math.max(DMC.AXF - P[0], P[1] - 0.540), Math.max(P[0] - DMC.AXR, P[1] - 0.545));
    return -f;
  };
  const VS = 64 / 152;
  mb.mat(CM.PAINT).color(0.76, 0.78, 0.80);
  mb.patch(dmcSkinFn(0), 0, 1, 0, VS, { nu: 320, nv: 56, flip: true, uv: seamUV, rim: 0.014, rimMat: m => m.mat(CM.PAINT, 255), field: paintField });
  mb.mat(CM.PAINT).color(0.76, 0.78, 0.80);
  mb.patch(dmcSkinFn(0), 0, 1, VS, 1, { nu: 320, nv: 88, flip: true, uv: seamUV, rim: 0.014, rimMat: m => m.mat(CM.RUBBER).color(0.018, 0.018, 0.02), field: paintField });

  // Guarnições das janelas e faróis
  const band = (fn, a, b) => (u, v, P) => { const f = fn(P, v); return Math.max(f - b, a - f); };
  mb.mat(CM.RUBBER).color(0.018, 0.018, 0.02);
  dmcSub(mb, 0.0015, 0.72, -0.48, 0.40, 0.64, 0.012, { field: band(dmcWinDoor, -0.012, 0.003), uv: plainUV });
  dmcSub(mb, 0.0015, -0.50, -1.05, 0.40, 0.64, 0.012, { field: band(dmcWinQuarter, -0.011, 0.003), uv: plainUV });
  dmcSub(mb, 0.0015, 0.78, 0.04, 0.60, 1, 0.012, { field: band(dmcWindshield, -0.014, 0.004), uv: plainUV });
  dmcSub(mb, 0.0012, 2.08, 1.88, 0.62, 1, 0.006, { field: band(dmcHeadlight, -0.004, 0.002), uv: plainUV });

  // Barra divisória da janela estilo pedágio (toll-booth window)
  {
    const xB = 0.04, xT = 0.00, yB = 0.77, yT = 1.07;
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const t = k / 5, x = lerp(xB, xT, t), y = lerp(yB, yT, t);
      const st = dmcStation(x), z = lerp(st.zB, st.zE, clamp((y - st.yB) / Math.max(0.01, st.yE - st.yB), 0, 1));
      pts.push([x, y, z]);
    }
    mb.mat(CM.RUBBER).color(0.02, 0.02, 0.022);
    mb.sweep(pts, [[-0.010, -0.004], [0.010, -0.004], [0.010, 0.005], [-0.010, 0.005]], { closedProfile: true, hard: true, up: [0, 0, 1] });
  }

  // Piscas âmbar envolventes de canto dianteiros
  mb.mat(CM.LENS, 2).color(0.64, 0.30, 0.04);
  dmcSub(mb, 0.002, 2.07, 1.88, 0.25, 0.88, 0.006, {
    field: (u, v, P) => dmcCornerLamp(P, v),
    uv: (u, v, P) => { _duv[0] = P[0] + P[2]; _duv[1] = P[1]; return _duv; },
    rim: 0.004,
  });

  // Lanternas traseiras quadriculadas icônicas (faixa superior âmbar, centro vermelho, ré interna), salientes à pele traseira
  {
    const { z0, z1, y0, y1 } = DT_DMC;
    mb.mat(CM.PLASTIC).color(0.016, 0.016, 0.018);
    mb.box(-2.002, (y0 + y1) * 0.5, (z0 + z1) * 0.5, 0.036, y1 - y0 + 0.022, z1 - z0 + 0.024);
    mb.patch((u, v, o) => {
      const z = lerp(z0 - 0.012, z1 + 0.012, u), y = lerp(y0 - 0.011, y1 + 0.011, v);
      o[0] = dmcTopX(z, y, true) - 0.004; o[1] = y; o[2] = z;
    }, 0, 1, 0, 1, { nu: 8, nv: 4, flip: false, uv: plainUV });
    mb.mat(CM.LENS, 1).color(0.75, 0.03, 0.02);
    mb.patch((u, v, o) => {
      const z = lerp(z0, z1, u), y = lerp(y0, y1, v);
      o[0] = dmcTopX(z, y, true) - 0.007; o[1] = y; o[2] = z;
    }, 0, 1, 0, 1, { nu: 10, nv: 6, flip: false, uv: (u, v) => { _duv[0] = u; _duv[1] = v; return _duv; } });
    // Grade preta divisória clássica do DeLorean acompanhando a curvatura da lente
    mb.mat(CM.PLASTIC).color(0.015, 0.015, 0.017);
    for (const gy of [0.622, 0.668]) {
      for (let k = 0; k < 4; k++) {
        const za = lerp(z0, z1, k / 4), zb = lerp(z0, z1, (k + 1) / 4);
        const zm = (za + zb) * 0.5, xL = dmcTopX(zm, gy, true) - 0.0085;
        mb.box(xL, gy, zm, 0.006, 0.007, (zb - za) + 0.002);
      }
    }
    for (const gz of [0.47, 0.61]) {
      const xb = dmcTopX(gz, y0, true) - 0.0085, xt = dmcTopX(gz, y1, true) - 0.0085;
      mb.quad(xb, y0, gz - 0.004, xb, y0, gz + 0.004, xt, y1, gz + 0.004, xt, y1, gz - 0.004);
    }
  }

  // Friso lateral preto entre as caixas de roda e saia da soleira
  mb.mat(CM.PLASTIC).color(0.022, 0.022, 0.025);
  for (let k = 0; k < 16; k++) {
    const x0 = lerp(-0.84, 0.84, k / 16), x1 = lerp(-0.84, 0.84, (k + 1) / 16);
    const xm = (x0 + x1) * 0.5, zM = dmcZL(xm, 0.50);
    mb.rbox(xm, 0.50, zM + 0.006, (x1 - x0) * 1.03, 0.042, 0.014, 0.003, 1);
  }
  mb.box(0.0, 0.215, 0.78, 1.66, 0.042, 0.04);

  // Maçaneta preta embutida na porta gullwing
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.022);
  dmcSub(mb, 0.004, -0.22, -0.40, 0.20, 0.40, 0.005, { field: (u, v, P) => dmcRRect(P[0] + 0.31, P[1] - 0.72, 0.05, 0.018, 0.005), uv: plainUV, rim: 0.004 });

  // Grade frontal preta + frisos horizontais + moldura dos faróis quádruplos
  mb.mat(CM.GRILLE).color(0.012, 0.012, 0.013);
  dmcSub(mb, -0.022, 2.06, 1.94, 0.62, 1, 0.012, { field: (u, v, P) => dmcRRect(P[2], P[1] - DL_DMC.lY, 0.365, 0.048, 0.005), uv: plainUV });
  mb.mat(CM.PLASTIC).color(0.020, 0.020, 0.022);
  for (const sy of [0.576, 0.600, 0.624]) {
    const xF = dmcTopX(0.18, sy, false) - 0.004;
    mb.rbox(xF, sy, 0.175, 0.020, 0.008, 0.35, 0.002, 1);
  }

  // Forro interno escuro (portas/colunas/teto baixo)
  const inner = (u, v, P) => -(Math.min(dmcWinDoor(P), dmcWinQuarter(P), v > 0.55 ? dmcWindshield(P) : 1) - 0.012);
  mb.mat(CM.INTERIOR).color(0.085, 0.088, 0.095);
  dmcSub(mb, -0.024, 0.76, -1.55, 0.04, 0.60, 0.026, { field: inner, uv: plainUV, flip: false });
  mb.mat(CM.INTERIOR, 1).color(0.13, 0.135, 0.145);
  dmcSub(mb, -0.024, 0.76, -1.55, 0.60, 1, 0.026, { field: inner, uv: plainUV, flip: false });

  // Vidros (portas, quebra-ventos, para-brisa muito inclinado, lentes dos 4 faróis)
  gl.mat(0).color(0.82, 0.90, 0.90);
  const glz = fn => (u, v, P) => fn(P, v) + 0.008;
  dmcSub(gl, -0.005, 0.72, -0.48, 0.40, 0.64, 0.02, { field: glz(dmcWinDoor), uv: plainUV });
  dmcSub(gl, -0.005, -0.50, -1.05, 0.40, 0.64, 0.02, { field: glz(dmcWinQuarter), uv: plainUV });
  dmcSub(gl, -0.005, 0.78, 0.04, 0.60, 1, 0.02, { field: glz(dmcWindshield), uv: plainUV });
  gl.mat(1).color(0.93, 0.95, 0.96);
  dmcSub(gl, -0.003, 2.08, 1.92, 0.62, 1, 0.012, { field: (u, v, P) => dmcHeadlight(P) + 0.002, uv: (u, v, P) => { _duv[0] = P[2]; _duv[1] = P[1]; return _duv; } });

  mb.mirror(v0, i0, 2); gl.mirror(gv0, gi0, 2);
}

function deloreanBuildParts(mb, fb) {
  const v0 = mb.nv, i0 = mb.ni;

  // Para-choques integrados em poliuretano cinza-escuro (comprimento total 2.12 - (-2.10) = 4.22 m)
  mb.mat(CM.PLASTIC).color(0.055, 0.058, 0.064);
  const fPath = carPath([[2.092, 0], [2.085, 0.36, 0.14], [2.055, 0.60, 0.12], [2.00, 0.755, 0.06], [1.86, 0.775, 0.05], [1.68, 0.790, 0.08], [1.54, 0.802]]);
  const fProf = carPath([[-0.08, 0.545], [0.022, 0.542, 0.004], [0.028, 0.532, 0.004], [0.028, 0.420, 0.004], [0.022, 0.340, 0.010], [0.016, 0.255, 0.008], [-0.06, 0.245]]);
  carBumper(mb, fPath, fProf, 1, (u, v, P) => {
    let f = dmcArchF(P) - 0.004;
    if (P[0] > 2.00) f = Math.min(f, dmcRRect(P[2], P[1] - 0.375, 0.34, 0.036, 0.008));
    return -f;
  }, 136, 40, 0.36 + 0.24 + 0.16, 0.34, 0.545, 0.22);

  const rPath = carPath([[-2.075, 0], [-2.070, 0.36, 0.14], [-2.045, 0.62, 0.12], [-1.99, 0.775, 0.06], [-1.85, 0.795, 0.05], [-1.68, 0.810, 0.08], [-1.54, 0.820]]);
  const rProf = carPath([[-0.08, 0.562], [0.020, 0.558, 0.004], [0.025, 0.548, 0.004], [0.025, 0.420, 0.004], [0.020, 0.350, 0.012], [0.006, 0.295, 0.008], [-0.06, 0.285]]);
  carBumper(mb, rPath, rProf, -1, (u, v, P) => -(dmcArchF(P) - 0.004), 124, 38, 0.36 + 0.26 + 0.16, 0.34, 0.562, 0.20);

  // Fundo entrada de ar dianteira + spoiler inferior preto
  mb.mat(CM.GRILLE, 1).color(0.008, 0.008, 0.009);
  mb.quad(2.085, 0.33, 0.36, 2.085, 0.33, 0, 2.085, 0.42, 0, 2.085, 0.42, 0.36);

  // Caixas de roda e assoalho
  mb.mat(CM.UNDER).color(0.006, 0.006, 0.007);
  for (const ax of [DMC.AXF, DMC.AXR]) {
    const R0 = DMC.ARCH_R + 0.006, N = 26, zo = dmcZL(ax, 0.52) - 0.012, zi = 0.36;
    for (let i = 0; i < N; i++) {
      const aS = ax > 0 ? 12 : -18, aE = ax > 0 ? 198 : 163;
      const a0 = (aS + (aE - aS) * i / N) * PI / 180, a1 = (aS + (aE - aS) * (i + 1) / N) * PI / 180;
      const x0 = ax + Math.cos(a0) * R0, y0 = DMC.ARCH_Y + Math.sin(a0) * R0, x1 = ax + Math.cos(a1) * R0, y1 = DMC.ARCH_Y + Math.sin(a1) * R0;
      const a = mb.v(x0, y0, zo, -Math.cos(a0), -Math.sin(a0), 0, 0, 0), b = mb.v(x0, y0, zi, -Math.cos(a0), -Math.sin(a0), 0, 0, 1), c = mb.v(x1, y1, zi, -Math.cos(a1), -Math.sin(a1), 0, 1, 1), d = mb.v(x1, y1, zo, -Math.cos(a1), -Math.sin(a1), 0, 1, 0);
      mb.quadI(a, d, c, b);
    }
    mb.quad(ax - 0.34, 0.24, zi, ax + 0.34, 0.24, zi, ax + 0.34, 0.65, zi, ax - 0.34, 0.65, zi);
  }
  mb.quad(1.68, 0.20, 0.62, 1.68, 0.20, 0, 1.68, 0.42, 0, 1.68, 0.42, 0.62);
  mb.quad(-1.64, 0.20, 0, -1.64, 0.20, 0.62, -1.64, 0.42, 0.62, -1.64, 0.42, 0);
  mb.quad(1.68, 0.42, 0, 2.08, 0.42, 0, 2.08, 0.42, 0.74, 1.68, 0.42, 0.74);
  mb.quad(-2.05, 0.42, 0, -1.64, 0.42, 0, -1.64, 0.42, 0.76, -2.05, 0.42, 0.76);
  mb.quad(-0.85, 0.20, 0, 0.85, 0.20, 0, 0.85, 0.20, 0.76, -0.85, 0.20, 0.76);
  mb.quad(0.85, 0.20, 0, 1.68, 0.20, 0, 1.68, 0.20, 0.50, 0.85, 0.20, 0.50);
  mb.quad(-1.64, 0.20, 0, -0.85, 0.20, 0, -0.85, 0.20, 0.50, -1.64, 0.20, 0.50);

  // Faróis quádruplos retangulares recuados (2 refletores + divisória cromada por lado)
  {
    const yc = DL_DMC.lY, hy = DL_DMC.lH - 0.005, D = 0.048;
    for (const [z0, z1] of [[DL_DMC.hlZ0 + 0.004, 0.528], [0.542, DL_DMC.hlZ1 - 0.004]]) {
      const zc = (z0 + z1) * 0.5, hz = (z1 - z0) * 0.5;
      const dep = (a, b) => 0.005 + D * Math.pow(Math.max(0, (1 - a * a * a * a) * (1 - b * b * b * b)), 0.6);
      mb.mat(CM.REFLECTOR).color(0.90, 0.91, 0.94);
      mb.patch((u, v, o) => { const z = zc + u * hz, y = yc + v * hy, d = dep(u, v), x = dmcTopX(z, y, false); o[0] = x - d * 0.96; o[1] = y - d * 0.16; o[2] = z; }, -1, 1, -1, 1, { nu: 14, nv: 10, flip: true, uv: (u, v) => { _duv[0] = u; _duv[1] = v; return _duv; } });
      const xb = dmcTopX(zc, yc, false) - (dep(0, 0) - 0.01) * 0.96;
      mb.push(m4translate(m4(), xb, yc, zc)); mb.push(m4rotZ(m4(), -PI / 2 + 0.16));
      mb.mat(CM.REFLECTOR, 1).color(1, 0.95, 0.85); mb.cyl(0, -0.01, 0, 0.009, 0.022, 0.008, 10, false, true);
      mb.pop(); mb.pop();
    }
    mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.022);
    mb.box(dmcTopX(0.535, yc, false) - 0.01, yc, 0.535, 0.022, DL_DMC.lH * 2, 0.014);
  }

  // Retrovisores externos aerodinâmicos em cunha
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.022);
  mb.push(m4translate(m4(), 0.58, 0.85, 0.89)); mb.push(m4rotY(m4(), 0.18));
  mb.rbox(0, 0, 0, 0.095, 0.082, 0.155, 0.018, 4);
  mb.mat(CM.MIRROR).color(0.62, 0.64, 0.67);
  mb.quad(-0.048, -0.030, -0.064, -0.048, -0.030, 0.064, -0.048, 0.030, 0.064, -0.048, 0.030, -0.064);
  mb.pop(); mb.pop();
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.022);
  mb.rbox(0.60, 0.835, 0.785, 0.08, 0.05, 0.09, 0.008, 2);

  // Bandas de fluxo externas BTTF (mat 18, a=0) + suportes e conduítes blindados laterais
  mb.mat(CM.STEEL, 1).color(0.06, 0.065, 0.075);
  mb.rbox(2.04, 0.455, 0.77, 0.14, 0.055, 0.055, 0.006, 1);
  mb.mat(18, 0).color(0.28, 0.76, 1.0);
  // Arco frontal envolvendo a quina do para-choque
  mb.sweep(
    [[2.126, 0.46, 0.34], [2.120, 0.46, 0.60], [2.085, 0.46, 0.765], [1.96, 0.46, 0.80]],
    [[-0.011, -0.014], [0.011, -0.014], [0.011, 0.014], [-0.011, 0.014]],
    { closedProfile: true, hard: true }
  );
  // Bandas de fluxo contornando a linha de teto/coluna A e coluna traseira (flying buttress)
  mb.sweep(
    [[0.75, 0.815, 0.755], [0.40, 0.99, 0.70], [0.06, 1.158, 0.63], [-0.56, 1.158, 0.63], [-1.30, 0.99, 0.64], [-1.96, 0.84, 0.66]],
    [[-0.011, -0.011], [0.011, -0.011], [0.011, 0.011], [-0.011, 0.011]],
    { closedProfile: true, hard: true }
  );
  // Banda horizontal ligando o topo do módulo traseiro à lateral
  mb.sweep(
    [[-1.96, 0.84, 0.66], [-2.055, 0.76, 0.73], [-2.065, 0.56, 0.74]],
    [[-0.011, -0.012], [0.011, -0.012], [0.011, 0.012], [-0.011, 0.012]],
    { closedProfile: true, hard: true }
  );
  // Conduíte blindado lateral com anéis metálicos (entre paralama dianteiro e reator traseiro)
  mb.mat(CM.RUBBER).color(0.025, 0.032, 0.045);
  mb.tube([[1.96, 0.46, 0.805], [1.56, 0.44, 0.815], [0.82, 0.44, 0.842], [-0.82, 0.45, 0.842], [-1.36, 0.58, 0.82], [-1.62, 0.78, 0.64]], 0.016, 8);
  mb.mat(CM.STEEL).color(0.28, 0.30, 0.34);
  for (const cx of [1.65, 0.80, 0.0, -0.80, -1.35]) {
    const cy = cx < -1.0 ? 0.58 : 0.445, cz = cx < -1.0 ? 0.82 : 0.840;
    mb.rbox(cx, cy, cz, 0.045, 0.042, 0.042, 0.005, 1);
  }
  // Bobinas/dutos traseiros na lateral da baia do reator
  mb.mat(CM.ALU).color(0.58, 0.60, 0.64);
  mb.rbox(-1.55, 0.87, 0.46, 0.24, 0.08, 0.14, 0.012, 2);
  mb.mat(18, 0).color(0.28, 0.76, 1.0);
  mb.rbox(-1.55, 0.92, 0.46, 0.18, 0.025, 0.08, 0.005, 1);

  // Grandes dutos/extratores traseiros BTTF (cooling vents) inclinados para trás/cima sobre o deck traseiro (acima das lanternas)
  {
    mb.mat(CM.STEEL, 1).color(0.16, 0.17, 0.19);
    const cz = 0.44, hw = 0.135;
    mb.push(m4translate(m4(), -1.78, 0.86, cz)); mb.push(m4rotZ(m4(), -0.15));
    mb.box(0, 0, 0, 0.62, 0.150, hw * 2);
    mb.mat(CM.ALU).color(0.46, 0.48, 0.52);
    mb.box(-0.29, 0.068, 0, 0.05, 0.018, hw * 2 + 0.02);
    mb.box(-0.29, -0.068, 0, 0.05, 0.018, hw * 2 + 0.02);
    mb.box(-0.29, 0, hw, 0.05, 0.150, 0.018);
    mb.box(-0.29, 0, -hw, 0.05, 0.150, 0.018);
    mb.mat(CM.GRILLE).color(0.008, 0.008, 0.01);
    mb.quad(-0.312, -0.062, -hw + 0.01, -0.312, -0.062, hw - 0.01, -0.312, 0.062, hw - 0.01, -0.312, 0.062, -hw + 0.01);
    mb.pop(); mb.pop();
  }

  // Ponteiras duplas inferiores de escapamento sob o para-choque traseiro ([-2.11, 0.27, ±0.50])
  mb.mat(CM.STEEL, 1).color(0.04, 0.04, 0.045);
  mb.tube([[-1.64, 0.29, 0.34], [-1.88, 0.278, 0.46], [-2.11, 0.27, 0.50]], 0.024, 10);
  mb.mat(CM.CHROME, 1).color(0.76, 0.78, 0.82);
  mb.push(m4translate(m4(), -2.06, 0.27, 0.50)); mb.push(m4rotZ(m4(), PI / 2));
  mb.cyl(0, -0.05, 0, 0.030, 0.05, 0.030, 14, true, true);
  mb.pop(); mb.pop();

  // Interior cinza realista (metade direita; espelhado)
  mb.mat(CM.INTERIOR).color(0.065, 0.068, 0.075);
  mb.quad(-0.78, 0.24, 0.74, 0.82, 0.24, 0.74, 0.82, 0.24, 0, -0.78, 0.24, 0);
  mb.quad(-1.40, 0.24, 0.50, -0.78, 0.24, 0.50, -0.78, 0.24, 0, -1.40, 0.24, 0);
  mb.quad(0.76, 0.22, 0, 0.76, 0.22, 0.74, 0.76, 0.78, 0.74, 0.76, 0.78, 0);
  // Painel e console alto envolvido (estilo DMC)
  mb.mat(CM.INTERIOR, 3).color(0.055, 0.058, 0.065);
  mb.rbox(0.56, 0.67, 0.36, 0.32, 0.16, 0.70, 0.025, 3);
  mb.rbox(0.32, 0.42, 0.06, 0.62, 0.26, 0.12, 0.02, 2);
  mb.mat(CM.INTERIOR, 3).color(0.075, 0.078, 0.085);
  mb.rbox(0.58, 0.765, 0.36, 0.30, 0.022, 0.69, 0.008, 2);
  // Bancos esportivos baixos em couro cinza (encosto baixo para capacete caber sob teto 1,14 m)
  mb.mat(CM.INTERIOR, 4).color(0.11, 0.115, 0.125);
  mb.rbox(-0.02, 0.33, 0.355, 0.48, 0.11, 0.46, 0.045, 4);
  mb.push(m4translate(m4(), -0.25, 0.36, 0.355)); mb.push(m4rotZ(m4(), 0.44));
  mb.rbox(0, 0.24, 0, 0.10, 0.48, 0.44, 0.04, 4);
  mb.rbox(0.01, 0.52, 0, 0.08, 0.13, 0.22, 0.03, 3);
  mb.pop(); mb.pop();

  mb.mirror(v0, i0, 2);

  // ================= Peças não simétricas =================
  // Persiana traseira escalonada (louvers pretas sobre o compartimento do motor)
  mb.mat(CM.GRILLE).color(0.012, 0.012, 0.014);
  mb.quad(-1.60, 0.87, 0.54, -0.58, 1.11, 0.54, -0.58, 1.11, -0.54, -1.60, 0.87, -0.54);
  mb.mat(CM.PLASTIC).color(0.022, 0.022, 0.025);
  for (let k = 0; k < 6; k++) {
    const lx = -0.66 - k * 0.115, ly = 1.11 - k * 0.027;
    mb.push(m4translate(m4(), lx, ly, 0)); mb.push(m4rotZ(m4(), -0.14));
    mb.box(0, 0, 0, 0.092, 0.014, 1.06);
    mb.pop(); mb.pop();
  }

  // Reator Mr. Fusion no deck traseiro (cilindro branco/preto com base em alumínio)
  mb.mat(CM.ALU).color(0.62, 0.64, 0.68);
  mb.cyl(-1.46, 0.84, 0, 0.145, 0.92, 0.140, 20, true, true);
  mb.mat(CM.STEEL).color(0.18, 0.19, 0.21);
  mb.cyl(-1.46, 0.92, 0, 0.135, 0.97, 0.125, 20, false, true);
  mb.mat(CM.GLOSS).color(0.86, 0.88, 0.90);
  mb.cyl(-1.46, 0.97, 0, 0.118, 1.13, 0.095, 20, true, true);
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.022);
  mb.cyl(-1.46, 1.13, 0, 0.102, 1.175, 0.092, 20, true, true);
  mb.mat(CM.STRAP).color(0.75, 0.12, 0.08);
  mb.rbox(-1.35, 1.04, 0, 0.04, 0.08, 0.06, 0.008, 1);

  // Placa OUTATIME saliente à superfície traseira + moldura preta + emblema DMC na grade dianteira
  {
    const yb = 0.585, yt = 0.708;
    const xbP = dmcTopX(0, yb, true) - 0.008, xtP = dmcTopX(0, yt, true) - 0.008;
    mb.mat(CM.PLASTIC).color(0.016, 0.016, 0.018);
    mb.quad(xbP + 0.002, yb - 0.008, -0.198, xbP + 0.002, yb - 0.008, 0.198, xtP + 0.002, yt + 0.008, 0.198, xtP + 0.002, yt + 0.008, -0.198);
    mb.mat(CM.DECAL).color(1, 1, 1);
    const reg = CAT.outatime;
    mb.quad(xbP, yb, -0.19, xbP, yb, 0.19, xtP, yt, 0.19, xtP, yt, -0.19, reg[0], reg[3], reg[2], reg[1]);
  }
  mb.mat(CM.DECAL, 1).color(1, 1, 1);
  {
    const y = DL_DMC.lY, x = dmcTopX(0, y, false) + 0.004, xu = dmcTopX(0, y + 0.02, false) + 0.004, sl = (xu - x) / 0.02, l = Math.hypot(1, sl);
    const B = m4basis(m4(), 0, 0, -1, sl / l, 1 / l, 0, 1 / l, -sl / l, 0, x, y, 0);
    mb.push(B);
    const reg = CAT.dmc;
    mb.quad(-0.14, -0.042, 0.005, 0.14, -0.042, 0.005, 0.14, 0.042, 0.005, -0.14, 0.042, 0.005, reg[0], reg[3], reg[2], reg[1]);
    mb.pop();
  }

  // Painel interno com Circuitos de Tempo coloridos + Capacitor de Fluxo atrás dos bancos (visível ao olhar para trás V!)
  mb.mat(CM.INTERIOR, 3).color(0.04, 0.04, 0.045);
  mb.rbox(0.45, 0.76, -0.355, 0.16, 0.10, 0.30, 0.02, 2);
  mb.tube([[0.34, 0.755, -0.355], [0.54, 0.695, -0.355]], 0.026, 10);
  // Mostradores digitais de tempo no console central (vermelho, verde, âmbar)
  mb.mat(CM.INTERIOR).color(0.90, 0.14, 0.08); mb.box(0.40, 0.675, -0.04, 0.02, 0.022, 0.11);
  mb.mat(CM.INTERIOR).color(0.12, 0.82, 0.24); mb.box(0.40, 0.640, -0.04, 0.02, 0.022, 0.11);
  mb.mat(CM.INTERIOR).color(0.92, 0.68, 0.10); mb.box(0.40, 0.605, -0.04, 0.02, 0.022, 0.11);
  // Caixa do Capacitor de Fluxo no console traseiro entre os bancos
  mb.mat(CM.STEEL).color(0.18, 0.20, 0.22);
  mb.rbox(-0.42, 0.72, 0, 0.07, 0.22, 0.18, 0.012, 2);
  mb.mat(18, 0).color(0.40, 0.90, 1.0);
  mb.tube([[-0.38, 0.72, 0], [-0.38, 0.65, 0]], 0.011, 6);
  mb.tube([[-0.38, 0.72, 0], [-0.38, 0.78, -0.055]], 0.011, 6);
  mb.tube([[-0.38, 0.72, 0], [-0.38, 0.78, 0.055]], 0.011, 6);

  // Limpadores dianteiros
  mb.mat(CM.RUBBER).color(0.015, 0.015, 0.015);
  const wipF = (zp, z1, xe0, lift) => {
    const P = (z, xe) => { const zz = z / 0.76, x = xe + dmcBulge(xe) * (1 - zz * zz); return [x, dmcYtop(x, z) + 0.014, z]; };
    const zm = (zp + z1) / 2, a = P(zp, 0.74), m = P(zm + (z1 - zp) * 0.1, xe0 - lift * 0.5);
    mb.rbox(a[0], a[1] - 0.004, a[2], 0.026, 0.018, 0.026, 0.006, 2);
    mb.sweep([a, [(a[0] + m[0]) / 2, (a[1] + m[1]) / 2 + 0.004, (a[2] + m[2]) / 2], m], [[-0.005, -0.003], [0.005, -0.003], [0.005, 0.003], [-0.005, 0.003]], { closedProfile: true, hard: true });
    const pts = []; for (let k = 0; k <= 7; k++) { const z = lerp(zp + (z1 - zp) * 0.12, z1, k / 7); pts.push(P(z, lerp(xe0, xe0 - lift, k / 7))); }
    mb.sweep(pts, [[-0.006, -0.006], [0.006, -0.006], [0.003, 0.005], [-0.003, 0.005]], { closedProfile: true, hard: true });
  };
  wipF(0.28, -0.22, 0.72, 0.03); wipF(-0.24, -0.66, 0.72, 0.045);

  // Fitas 3D de relâmpago (mat 18, a=1) + cones de chama de turbo (mat 19) na malha separada fb (sem sombra fantasma!)
  const fxTarget = fb || mb;
  if (typeof carAddExhaustFlame === 'function') {
    carAddExhaustFlame(fxTarget, -2.11, 0.27, -0.50, -1, 0, 0.62, 0.048);
    carAddExhaustFlame(fxTarget, -2.11, 0.27,  0.50, -1, 0, 0.62, 0.048);
    carAddExhaustFlame(fxTarget, -2.089, 0.907, -0.44, -0.989, 0.149, 0.56, 0.056);
    carAddExhaustFlame(fxTarget, -2.089, 0.907,  0.44, -0.989, 0.149, 0.56, 0.056);
  }
  const addArcRibbon = (pts, hw) => {
    fxTarget.mat(18, 1).color(0.45, 0.92, 1.0);
    const n = pts.length, base = fxTarget.nv;
    for (let i = 0; i < n; i++) {
      const p = pts[i], pa = pts[Math.max(0, i - 1)], pb = pts[Math.min(n - 1, i + 1)];
      let tx = pb[0] - pa[0], ty = pb[1] - pa[1], tz = pb[2] - pa[2];
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let rx = -tz, ry = 0, rz = tx;
      if (Math.hypot(rx, rz) < 0.2) { rx = 0; ry = 1; rz = 0; }
      const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
      const u = i / (n - 1);
      fxTarget.v(p[0] - rx * hw, p[1] - ry * hw, p[2] - rz * hw, 0, 1, 0, u, 0);
      fxTarget.v(p[0] + rx * hw, p[1] + ry * hw, p[2] + rz * hw, 0, 1, 0, u, 1);
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2, b = a + 1, c = a + 3, d = a + 2;
      fxTarget.quadI(a, b, c, d);
      fxTarget.quadI(a, d, c, b);
    }
  };
  // Arcos de raio 3D arqueando sobre a frente, capô, teto e extratores traseiros
  addArcRibbon([[2.14, 0.48, -0.74], [2.16, 0.50, -0.35], [2.17, 0.49, 0.0], [2.16, 0.50, 0.35], [2.14, 0.48, 0.74]], 0.055);
  addArcRibbon([[2.04, 0.67, -0.55], [1.66, 0.73, -0.44], [1.22, 0.77, -0.52], [0.80, 0.82, -0.46]], 0.048);
  addArcRibbon([[2.04, 0.67,  0.55], [1.66, 0.73,  0.44], [1.22, 0.77,  0.52], [0.80, 0.82,  0.46]], 0.048);
  addArcRibbon([[0.05, 1.18, -0.60], [-0.26, 1.19, -0.20], [-0.28, 1.19, 0.20], [-0.55, 1.18, 0.60]], 0.050);
  addArcRibbon([[-1.52, 0.91, -0.54], [-1.78, 0.95, -0.44], [-2.08, 0.98, -0.44]], 0.048);
  addArcRibbon([[-1.52, 0.91,  0.54], [-1.78, 0.95,  0.44], [-2.08, 0.98,  0.44]], 0.048);
}

// Piloto proporcionado ao cockpit baixo (capacete abaixo do teto de 1,14 m)
function deloreanBuildDriver(mb) {
  const zd = -0.355;
  mb.mat(CM.INTERIOR, 2).color(0.18, 0.20, 0.24);
  mb.push(m4translate(m4(), -0.22, 0.40, zd)); mb.push(m4rotZ(m4(), 0.42));
  mb.rbox(0.075, 0.23, 0, 0.17, 0.46, 0.33, 0.07, 4);
  mb.rbox(0.075, 0.42, 0, 0.14, 0.09, 0.39, 0.04, 3);
  mb.pop(); mb.pop();
  mb.rbox(0.02, 0.43, zd, 0.40, 0.11, 0.31, 0.05, 3);
  for (const sg of [-1, 1]) mb.tube([[-0.22, 0.82, zd + sg * 0.18], [-0.01, 0.74, zd + sg * 0.19], [0.26, 0.78, zd + sg * 0.15]], 0.037, 8);
  mb.mat(CM.INTERIOR, 3).color(0.02, 0.02, 0.022);
  for (const sg of [-1, 1]) mb.rbox(0.27, 0.785, zd + sg * 0.155, 0.075, 0.062, 0.068, 0.025, 2);
  mb.rbox(-0.22, 0.88, zd, 0.088, 0.058, 0.095, 0.025, 2);
  mb.mat(CM.GLOSS).color(0.08, 0.085, 0.095);
  mb.rbox(-0.19, 0.985, zd, 0.215, 0.210, 0.200, 0.095, 7);
  mb.rbox(-0.165, 0.920, zd, 0.160, 0.088, 0.180, 0.042, 5);
  mb.mat(CM.GLOSS, 1).color(0.01, 0.011, 0.014);
  mb.rbox(-0.135, 0.992, zd, 0.115, 0.068, 0.205, 0.030, 5);
}

// Roda clássica DMC multirraios (16 aletas radiais usinadas com cubo profundo e disco de borrão)
function deloreanBuildWheel(mb, mbBlur) {
  mb.push(m4rotY(m4(), -PI / 2));
  mb.push(m4translate(m4(), -0.015, 0, 0));
  const R = DMC.WR, seg = 64;
  mb.mat(CM.TIRE, 255).color(0.02, 0.02, 0.021);
  mb.lathe([[-0.072, 0.180], [-0.082, 0.194], [-0.090, 0.222], [-0.091, 0.248], [-0.086, 0.270], [-0.080, 0.282, 0.5, 1]], seg);
  mb.lathe([[0.080, 0.282, 0.5, -1], [0.086, 0.270], [0.091, 0.248], [0.090, 0.222], [0.082, 0.194], [0.072, 0.180]], seg);
  mb.mat(CM.TIRE, 0);
  const tread = [[-0.080, 0.282, 0.5, 1], [-0.072, 0.291], [-0.062, 0.294]];
  const groove = x => { tread.push([x - 0.005, R], [x - 0.004, R - 0.007], [x + 0.004, R - 0.007], [x + 0.005, R]); };
  tread.push([-0.048, R]); groove(-0.038); groove(-0.013); groove(0.013); groove(0.038); tread.push([0.048, R]);
  tread.push([0.062, 0.294], [0.072, 0.291], [0.080, 0.282, 0.5, -1]);
  mb.lathe(tread, seg);

  // Fundo escuro atrás das 16 aletas radiais
  mb.mat(CM.STEEL, 1).color(0.035, 0.035, 0.04);
  mb.lathe([[0.072, 0.180], [0.078, 0.182], [0.082, 0.178], [0.048, 0.172], [0.032, 0.145], [0.030, 0.0]], 36);
  mb.lathe([[-0.02, 0.0], [-0.02, 0.11], [-0.062, 0.172], [-0.074, 0.179], [-0.072, 0.180]], 28);

  // Face usinada da roda DMC com 16 aletas radiais e cubo central
  mb.mat(CM.ALU, 1).color(0.74, 0.76, 0.80);
  const NS = 16, prof = r => {
    const t = r / 0.180;
    return 0.076 - 0.018 * t * t + 0.005 * smooth(0.158, 0.180, r) - 0.004 * smooth(0.028, 0.040, r);
  };
  mb.patch((u, v, o) => {
    const a = u * TAU, r = v * 0.180;
    o[0] = prof(r); o[1] = r * Math.cos(a); o[2] = r * Math.sin(a);
  }, 0, 1.003, 0.0, 1, {
    nu: 224, nv: 28, flip: true, rim: 0.016,
    rimMat: m => m.mat(CM.STEEL, 1).color(0.06, 0.06, 0.07),
    uv: (u, v) => { _duv[0] = u; _duv[1] = v; return _duv; },
    field: (u, v) => {
      const r = v * 0.180, da = (u * NS - Math.round(u * NS)) / NS * TAU;
      const t = r * Math.sin(da), q = Math.max(Math.abs(r - 0.118) - 0.040, 0);
      return -(Math.hypot(t, q) - 0.0068);
    },
  });

  // Disco de borrão em velocidade
  const bm = mbBlur || mb;
  if (mbBlur) { bm.push(m4rotY(m4(), -PI / 2)); bm.push(m4translate(m4(), -0.015, 0, 0)); }
  bm.mat(CM.HUBCAP, 1).color(0.74, 0.76, 0.80);
  bm.patch((u, v, o) => {
    const a = u * TAU, r = 0.042 + v * 0.132;
    o[0] = prof(r) + 0.002; o[1] = r * Math.cos(a); o[2] = r * Math.sin(a);
  }, 0, 1, 0, 1, { nu: 48, nv: 8, flip: true, uv: (u, v) => { _duv[0] = u; _duv[1] = v; return _duv; } });
  if (mbBlur) { bm.pop(); bm.pop(); }
  mb.pop(); mb.pop();
}

// Volante DMC 3 raios em couro preto/alumínio
function deloreanBuildSteer(mb) {
  mb.mat(CM.INTERIOR, 3).color(0.032, 0.032, 0.036);
  const ring = [];
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; ring.push([0, 0.175 * Math.cos(a), 0.175 * Math.sin(a)]); }
  mb.tube(ring, 0.013, 10, { closed: true, up: [1, 0, 0] });
  mb.rbox(-0.028, -0.005, 0, 0.042, 0.095, 0.145, 0.02, 3);
  mb.mat(CM.ALU, 1).color(0.68, 0.70, 0.74);
  mb.rbox(-0.016, 0.0, 0.095, 0.018, 0.026, 0.15, 0.006, 1);
  mb.rbox(-0.016, 0.0, -0.095, 0.018, 0.026, 0.15, 0.006, 1);
  mb.rbox(-0.016, -0.09, 0, 0.018, 0.15, 0.032, 0.006, 1);
  const t0 = m4translate(m4(), 0.34, 0.775, -0.355), t1 = m4rotZ(m4(), 156 * PI / 180);
  return m4mul(m4(), t0, t1);
}

function deloreanBuildModel() {
  dmcShapeInit(); dmcWindowsInit(); dmcSeamInit();
  const mb = new MeshBuilder(1 << 17), gl = new MeshBuilder(1 << 14), fb = new MeshBuilder(1 << 10);
  deloreanBuildBody(mb, gl);
  deloreanBuildParts(mb, fb);
  let tris = mb.ni / 3 + gl.ni / 3 + fb.ni / 3;
  const dm = new MeshBuilder(1 << 13); deloreanBuildDriver(dm); tris += dm.ni / 3;
  const w = new MeshBuilder(1 << 15), wb = new MeshBuilder(1 << 11); deloreanBuildWheel(w, wb); tris += 4 * (w.ni + wb.ni) / 3;
  const s = new MeshBuilder(1 << 12); const steerMat = deloreanBuildSteer(s); tris += s.ni / 3;
  return {
    name: 'DeLorean DMC-12',
    bodyMesh: mb.upload(),
    driverMesh: dm.upload(),
    glassMesh: gl.upload(),
    flameMesh: fb.ni ? fb.upload() : null,
    wheelMesh: w.upload(),
    wheelBlurMesh: wb.upload(),
    steerMesh: s.upload(),
    steerMat,
    hubs: [[DMC.AXF, DMC.WR, -0.755], [DMC.AXF, DMC.WR, 0.755], [DMC.AXR, DMC.WR, -0.765], [DMC.AXR, DMC.WR, 0.765]],
    wheelR: DMC.WR,
    eyePos: [-0.04, 0.99, -0.355],
    bodyKind: 2,
    aoScale: 1.05,
    exhausts: [
      [-2.11, 0.27, -0.50, -1, 0, 0.95],
      [-2.11, 0.27, 0.50, -1, 0, 0.95],
      [-2.089, 0.907, -0.44, -0.989, 0.149, 0.85],
      [-2.089, 0.907, 0.44, -0.989, 0.149, 0.85],
    ],
    tris,
  };
}
