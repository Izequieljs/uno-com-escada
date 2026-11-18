// VW Gol Quadrado AP 1.8 (1991–1994 CL/GL/GTi "chinesinha"): carroceria em cunha, vigia ~42°, aerofólios,
// lanternas horizontais tricolores, grade frisada com emblema VW, borzeguim lateral, painel satélite, volante 4 botões e rodas Orbital.
const GOL = {
  XF: 1.888, XR: -1.815,
  YS: 0.195,
  AXF: 1.179, AXR: -1.179, WR: 0.281,
  TH_S: Math.sin(17.5 * PI / 180), TH_C: Math.cos(17.5 * PI / 180),
  VF: [0, 0.36, 0.42, 0.60, 0.68, 1],
  ARCH_R: 0.324, ARCH_Y: 0.296,
};
const _guv = [0, 0];
const gsq = x => x * x;
function gsmin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function gsmax(a, b, k) { return -gsmin(-a, -b, k); }
function golG(d, r) { return d <= -r || d >= r ? 0 : d < 0 ? (r + d) * (r + d) / (4 * r) : (r - d) * (r - d) / (4 * r); }
function golRRect(a, b, ha, hb, r) { const qa = Math.abs(a) - ha + r, qb = Math.abs(b) - hb + r; return Math.hypot(Math.max(qa, 0), Math.max(qb, 0)) + Math.min(Math.max(qa, qb), 0) - r; }
function golSegDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, t = sat(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)); return Math.hypot(px - ax - dx * t, py - ay - dy * t); }

// perfil superior no plano de borda: frente inclinada "chinesinha", capô longo em cunha, para-brisa, teto baixo (1,375 m), vigia ~42°, tampa traseira
function golYT(x) {
  const fascia = 0.720 - 2.9 * (x - 1.785);
  const hood = 0.895 - 0.144 * (x - 0.57) + 0.010 * (1 - gsq((x - 1.18) / 0.61));
  const wind = 0.895 - 0.84 * (x - 0.57);
  const a = x + 0.56, roof = 1.375 - (a > 0 ? 0.045 * a * a : 0.025 * a * a) + (x > 0.05 ? 4.5 * gsq(x - 0.05) : 0);
  const hatch = 0.878 + 0.92 * (x + 1.69);
  const deck = 0.865 + 0.25 * (x + 1.74);
  const tail = 0.858 + 9.5 * (x + 1.755);
  const rear = gsmax(hatch, deck, 0.018);
  let y = gsmax(hood, wind, 0.024);
  y = gsmin(y, roof, 0.032);
  y = gsmin(y, rear, 0.026);
  y = gsmin(y, tail, 0.022);
  y = gsmin(y, fascia, 0.030);
  return y;
}
function golBulge(x) { return 0.038 * smooth(-0.1, 0.3, x) - 0.022 * smooth(-1.25, -1.60, x); }
function golCrown(x) { return 0.016 * smooth(0.55, 0.88, x) * smooth(1.86, 1.74, x) + 0.018 * smooth(0.15, -0.15, x) * smooth(-1.72, -1.45, x); }
function golYtop(x, z) {
  const zz = z / 0.73, xi = golBulge(x) * (1 - zz * zz);
  let y = golYT(x - xi) - golCrown(x) * zz * zz;
  // ressalto central limpo no capô (característico do Gol CL/GTi)
  if (x > 0.52) {
    const zc = 0.42 - 0.095 * sat((x - 0.62) / 1.12);
    y += 0.010 * (1 - smooth(zc - 0.012, zc + 0.012, z)) * smooth(0.66, 0.80, x - xi) * smooth(1.78, 1.68, x - xi);
  }
  return y;
}
function golWPlan(x) {
  const t = sat((x - 0.60) / 1.28), t2 = sat((-0.90 - x) / 0.90);
  return 0.792 - 0.068 * t * t - 0.044 * t2 * t2;
}
function golZL(x, y) {
  let z = golWPlan(x);
  const d = y - 0.60;
  z -= d < 0 ? 0.018 * gsq(d / 0.40) : 0.016 * gsq(d / 0.30);
  // vinco sutil de cintura e dobra da soleira
  z -= 0.0025 * smooth(0.45, 0.54, y) * (1 - smooth(0.76, 0.85, y));
  if (y < 0.245) z -= 0.026 * gsq((0.245 - y) / 0.05);
  const df = Math.hypot(x - GOL.AXF, y - GOL.ARCH_Y) - GOL.ARCH_R;
  const dr = Math.hypot(x - GOL.AXR, y - GOL.ARCH_Y) - GOL.ARCH_R;
  const da = Math.min(df, dr);
  if (da < 0.25) z += 0.0085 * Math.exp(-gsq((da - 0.008) / 0.065));
  return z;
}
function golBeltN(x) { return 0.892 + 0.004 * (0.57 - x); }
function golR2(x) {
  let r = 0.036;
  r = lerp(r, 0.020, smooth(-0.08, 0.16, x));
  r = lerp(r, 0.012, smooth(0.55, 0.75, x));
  r = lerp(r, 0.032, smooth(1.70, 1.80, x));
  r = lerp(r, 0.022, smooth(-1.25, -1.45, x));
  r = lerp(r, 0.026, smooth(-1.68, -1.76, x));
  return r;
}
const _gstCache = []; let _gstNext = 0;
for (let i = 0; i < 8; i++) _gstCache.push({ x: NaN, yB: 0, zB: 0, dAz: 0, LA: 0, LB: 0, zE: 0, yE: 0, dCy: 0, r1: 0, r2: 0, b: new Float64Array(6) });
function golStation(x) {
  for (let i = 0; i < 8; i++) if (_gstCache[i].x === x) return _gstCache[i];
  const st = _gstCache[_gstNext]; _gstNext = (_gstNext + 1) & 7; st.x = x;
  const bn = golBeltN(x);
  let y = bn; for (let k = 0; k < 4; k++) y = golYtop(x, golZL(x, Math.min(y, bn + 0.2)));
  if (y <= bn) { st.yB = y; st.LB = 0; }
  else {
    st.yB = bn; const zb = golZL(x, bn); let t = (golYtop(x, zb) - bn) / GOL.TH_C;
    for (let k = 0; k < 5; k++) t = (golYtop(x, zb - t * GOL.TH_S) - bn) / GOL.TH_C;
    st.LB = Math.max(t, 0);
  }
  st.zB = golZL(x, st.yB); st.dAz = (golZL(x, st.yB) - golZL(x, st.yB - 0.004)) / 0.004;
  st.LA = st.yB - GOL.YS;
  st.zE = st.zB - st.LB * GOL.TH_S; st.yE = st.yB + st.LB * GOL.TH_C;
  st.dCy = -(golYtop(x, st.zE) - golYtop(x, st.zE - 0.004)) / 0.004;
  st.r1 = 0.010; st.r2 = golR2(x);
  const b = st.b, h = st.LB * 0.5;
  b[0] = 0; b[1] = st.LA - st.r1; b[2] = st.LA + Math.min(st.r1, h); b[3] = st.LA + st.LB - Math.min(st.r2, h); b[4] = st.LA + st.LB + st.r2; b[5] = st.LA + st.LB + st.zE;
  return st;
}
function golSkin(x, v, off, out) {
  const st = golStation(x), VF = GOL.VF, b = st.b;
  let k = 0; while (k < 4 && v > VF[k + 1]) k++;
  const s = b[k] + (b[k + 1] - b[k]) * (v - VF[k]) / (VF[k + 1] - VF[k]);
  let z, y, tz, ty;
  const s1 = st.LA, s2 = st.LA + st.LB;
  if (s <= s1) { y = GOL.YS + s; z = golZL(x, y); tz = (golZL(x, y + 0.002) - golZL(x, y - 0.002)) / 0.004; ty = 1; }
  else if (s <= s2) { const t = s - s1; z = st.zB - t * GOL.TH_S; y = st.yB + t * GOL.TH_C; tz = -GOL.TH_S; ty = GOL.TH_C; }
  else { z = st.zE - (s - s2); y = golYtop(x, z); tz = -1; ty = -(golYtop(x, z + 0.002) - golYtop(x, z - 0.002)) / 0.004; }
  const d1z = -GOL.TH_S - st.dAz, d1y = GOL.TH_C - 1, d2z = -1 + GOL.TH_S, d2y = st.dCy - GOL.TH_C;
  const g1 = golG(s - s1, st.r1), g2 = golG(s - s2, st.r2);
  z += d1z * g1 + d2z * g2; y += d1y * g1 + d2y * g2;
  let px = x;
  if (off) {
    const e1 = s - s1, e2 = s - s2;
    const h1 = e1 <= -st.r1 || e1 >= st.r1 ? 0 : (e1 < 0 ? (st.r1 + e1) : -(st.r1 - e1)) / (2 * st.r1);
    const h2 = e2 <= -st.r2 || e2 >= st.r2 ? 0 : (e2 < 0 ? (st.r2 + e2) : -(st.r2 - e2)) / (2 * st.r2);
    const Tz = tz + d1z * h1 + d2z * h2, Ty = ty + d1y * h1 + d2y * h2;
    let nz = Ty, ny = -Tz; const l = 1 / Math.hypot(nz, ny); nz *= l; ny *= l;
    const yx = (golYtop(x + 0.003, Math.max(z, 0)) - golYtop(x - 0.003, Math.max(z, 0))) / 0.006;
    const nx = -yx * Math.max(ny, 0) * Math.max(ny, 0), l2 = 1 / Math.hypot(nx, ny, nz);
    px += nx * l2 * off; y += ny * l2 * off; z += nz * l2 * off;
  }
  out[0] = px; out[1] = y; out[2] = z;
}
const GOL_UT = { n: 800, x: null, s: null, L: 0 };
function golShapeInit() {
  const n = GOL_UT.n, xs = GOL_UT.x = new Float64Array(n + 1), ss = GOL_UT.s = new Float64Array(n + 1);
  let px = GOL.XF, py = golYT(px), acc = 0;
  for (let i = 0; i <= n; i++) {
    const x = GOL.XF + (GOL.XR - GOL.XF) * i / n, y = golYT(x);
    acc += Math.hypot(x - px, y - py); px = x; py = y; xs[i] = x; ss[i] = acc;
  }
  GOL_UT.L = acc;
}
function golXofU(u) {
  const T = GOL_UT, s = sat(u) * T.L; let lo = 0, hi = T.n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T.s[m] <= s) lo = m; else hi = m; }
  const f = (s - T.s[lo]) / Math.max(1e-9, T.s[hi] - T.s[lo]);
  return T.x[lo] + (T.x[hi] - T.x[lo]) * f;
}
function golUofX(x) {
  const T = GOL_UT, f = sat((x - GOL.XF) / (GOL.XR - GOL.XF)) * T.n, i = Math.min(T.n - 1, Math.floor(f));
  return (T.s[i] + (T.s[i + 1] - T.s[i]) * (f - i)) / T.L;
}
function golSkinFn(off) { return (u, v, out) => golSkin(golXofU(u), v, off || 0, out); }
function golTopX(z, y, rear) {
  let a = rear ? -1.86 : 1.62, b = rear ? -1.16 : 1.92;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2, f = golYtop(m, z) - y; if ((f > 0) === !rear) a = m; else b = m; }
  return (a + b) / 2;
}
function golSub(mb, off, x0, x1, va, vb, cell, opts) {
  const u0 = golUofX(x0), u1 = golUofX(x1);
  opts.nu = Math.max(2, Math.ceil((u1 - u0) * GOL_UT.L / cell));
  opts.nv = Math.max(2, Math.ceil((vb - va) * 3.1 / cell));
  opts.flip = opts.flip === undefined ? true : opts.flip;
  mb.patch(golSkinFn(off), u0, u1, va, vb, opts);
}

// recortes (negativo = dentro do elemento)
function golArchF(P) {
  return Math.min(Math.hypot(P[0] - GOL.AXF, P[1] - GOL.ARCH_Y), Math.hypot(P[0] - GOL.AXR, P[1] - GOL.ARCH_Y)) - GOL.ARCH_R;
}
const GW = { apx: 0, apy: 0, anx: 0, any: 0, cpx: 0, cpy: 0, cnx: 0, cny: 0 };
function golWindowsInit() {
  const a = golStation(0.50), ax = 0.50, ay = a.yE, b = golStation(0.10), bx = 0.10, by = b.yE;
  let nx = -(by - ay), ny = bx - ax, l = Math.hypot(nx, ny); nx /= l; ny /= l; if (ny > 0) { nx = -nx; ny = -ny; }
  GW.apx = ax; GW.apy = ay; GW.anx = nx; GW.any = ny;
  const c = golStation(-1.18), cx = -1.18, cy = c.yE, d = golStation(-1.54), dx = -1.54, dy = d.yE;
  nx = -(dy - cy); ny = dx - cx; l = Math.hypot(nx, ny); nx /= l; ny /= l; if (nx < 0) { nx = -nx; ny = -ny; }
  GW.cpx = cx; GW.cpy = cy; GW.cnx = nx; GW.cny = ny;
}
function golRoofEdgeY(x) { return golStation(clamp(x, -1.24, 0.04)).yE; }
function golWinDoor(P) {
  const x = P[0], y = P[1];
  const bottom = (golBeltN(x) + 0.014) - y;
  const top = y - (golRoofEdgeY(x) - 0.036);
  const front = 0.058 - ((x - GW.apx) * GW.anx + (y - GW.apy) * GW.any);
  const rear = -0.37 - x;
  return gsmax(gsmax(bottom, top, 0.022), gsmax(front, rear, 0.022), 0.026);
}
function golWinQuarter(P) {
  const x = P[0], y = P[1];
  const bottom = (golBeltN(x) + 0.014) - y;
  const top = y - (golRoofEdgeY(x) - 0.036);
  const front = x - (-0.465);
  const rear = 0.088 - ((x - GW.cpx) * GW.cnx + (y - GW.cpy) * GW.cny);
  return gsmax(gsmax(bottom, top, 0.020), gsmax(front, rear, 0.020), 0.024);
}
function golXe(P) { const zz = P[2] / 0.73; return P[0] - golBulge(P[0]) * (1 - zz * zz); }
function golWindshield(P) {
  const xe = golXe(P), st = golStation(P[0]);
  const lo = xe - 0.555, hi = 0.042 - xe, side = P[2] - (st.zE - 0.044);
  return P[0] < -0.05 ? 1 : gsmax(gsmax(lo, hi, 0.026), side, 0.05);
}
function golHatchGlass(P) {
  const st = golStation(P[0]), y = P[1];
  const lo = 0.920 - y, hi = y - 1.335, side = P[2] - (st.zE - 0.068);
  return P[0] > -1.16 ? 1 : gsmax(gsmax(lo, hi, 0.026), side, 0.05);
}
const GL_GOL = { hlZ0: 0.348, hlZ1: 0.602, lY: 0.626, lH: 0.062, clZ: 0.608, clX: 1.665 };
function golHeadlight(P) { return golRRect(P[2] - (GL_GOL.hlZ0 + GL_GOL.hlZ1) / 2, P[1] - GL_GOL.lY, (GL_GOL.hlZ1 - GL_GOL.hlZ0) / 2, GL_GOL.lH, 0.008); }
function golCornerLamp(P, v) {
  const g = v > 0.64 ? GL_GOL.clZ - P[2] : GL_GOL.clX - P[0];
  return Math.max(Math.abs(P[1] - GL_GOL.lY) - GL_GOL.lH, g);
}
function golGrille(P) { return golRRect(P[2], P[1] - GL_GOL.lY, 0.335, GL_GOL.lH, 0.006); }
const GT_GOL = { z0: 0.355, y0: 0.576, y1: 0.742 };
function golTailLamp(P) {
  return Math.max(
    golRRect(0, P[1] - (GT_GOL.y0 + GT_GOL.y1) / 2, 1, (GT_GOL.y1 - GT_GOL.y0) / 2, 0.008),
    GT_GOL.z0 - P[2],
    P[0] - (-1.755 + (P[1] - 0.858) / 9.5 + 0.058)
  );
}
const GSEAM = { door: null };
function golSeamInit() {
  const p = [[0.64, 0.22], [0.64, 0.89], [0.58, 0.93]];
  for (let x = 0.50; x >= -0.39; x -= 0.045) p.push([x, golStation(x).yE - (x > 0.04 ? 0.028 : 0.022)]);
  p.push([-0.415, golStation(-0.415).yE - 0.022]); p.push([-0.415, 0.22]); p.push([0.64, 0.22]);
  GSEAM.door = p;
}
function golSeam(P, v) {
  const x = P[0], y = P[1], z = P[2]; let d = 1;
  if (v < 0.66 && x > -0.65 && x < 0.90) {
    const p = GSEAM.door; let m = 1e9, inside = false;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1]; m = Math.min(m, golSegDist(x, y, a[0], a[1], b[0], b[1]));
      if ((a[1] > y) !== (b[1] > y) && x < a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])) inside = !inside;
    }
    d = Math.min(d, inside ? -m : m);
  }
  if (v > 0.6) {
    const xe = golXe(P), st = golStation(x);
    if (xe > 0.48) d = Math.min(d, Math.max(z - (st.zE - 0.052), 0.615 - xe, xe - 1.770));
    if (x < -1.05) {
      const zs = lerp(GT_GOL.z0 - 0.015, st.zE - 0.05, smooth(GT_GOL.y1 + 0.01, GT_GOL.y1 + 0.08, y));
      d = Math.min(d, Math.max(z - zs, 0.560 - y, x + 1.18));
    }
  }
  return d;
}

function golBuildBody(mb, gl) {
  const seamUV = (u, v, P) => { _guv[0] = golSeam(P, v); _guv[1] = v; return _guv; };
  const plainUV = (u, v, P) => { _guv[0] = 1; _guv[1] = v; return _guv; };
  const v0 = mb.nv, i0 = mb.ni, gv0 = gl.nv, gi0 = gl.ni;
  const paintField = (u, v, P) => {
    let f = 1;
    if (v < 0.42) f = golArchF(P);
    else if (v < 0.66) f = Math.min(golWinDoor(P), golWinQuarter(P));
    if (v > 0.6) {
      f = Math.min(f, golWindshield(P), golHatchGlass(P));
      if (P[0] > 1.55) f = Math.min(f, golHeadlight(P), golGrille(P));
    }
    f = Math.min(f, Math.max(GOL.AXF - P[0], P[1] - 0.542), Math.max(P[0] - GOL.AXR, P[1] - 0.550));
    return -f;
  };
  const VS = 64 / 152;
  mb.mat(CM.PAINT).color(1, 1, 1);
  mb.patch(golSkinFn(0), 0, 1, 0, VS, { nu: 320, nv: 56, flip: true, uv: seamUV, rim: 0.016, rimMat: m => m.mat(CM.PAINT, 255), field: paintField });
  mb.mat(CM.PAINT).color(1, 1, 1);
  mb.patch(golSkinFn(0), 0, 1, VS, 1, { nu: 320, nv: 88, flip: true, uv: seamUV, rim: 0.016, rimMat: m => m.mat(CM.RUBBER).color(0.018, 0.018, 0.02), field: paintField });

  // borrachas das janelas e faróis
  const band = (fn, a, b) => (u, v, P) => { const f = fn(P, v); return Math.max(f - b, a - f); };
  mb.mat(CM.RUBBER).color(0.02, 0.02, 0.02);
  golSub(mb, 0.0015, 0.62, -0.40, 0.40, 0.64, 0.013, { field: band(golWinDoor, -0.012, 0.003), uv: plainUV });
  golSub(mb, 0.0015, -0.44, -1.62, 0.40, 0.64, 0.013, { field: band(golWinQuarter, -0.012, 0.003), uv: plainUV });
  golSub(mb, 0.0015, 0.62, -0.02, 0.60, 1, 0.013, { field: band(golWindshield, -0.014, 0.004), uv: plainUV });
  golSub(mb, 0.0015, -1.16, -1.70, 0.60, 1, 0.013, { field: band(golHatchGlass, -0.014, 0.004), uv: plainUV });
  golSub(mb, 0.0012, 1.88, 1.66, 0.62, 1, 0.006, { field: band(golHeadlight, -0.004, 0.002), uv: plainUV });

  // coluna divisória do quebra-vento (entre triângulo dianteiro e vidro principal da porta)
  {
    const xB = 0.24, xT = 0.16, yB = 0.905, yT = 1.225;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, x = lerp(xB, xT, t), y = lerp(yB, yT, t);
      const st = golStation(x), z = lerp(st.zB, st.zE, clamp((y - st.yB) / Math.max(0.01, st.yE - st.yB), 0, 1));
      pts.push([x, y, z]);
    }
    mb.mat(CM.RUBBER).color(0.02, 0.02, 0.022);
    mb.sweep(pts, [[-0.011, -0.004], [0.011, -0.004], [0.011, 0.006], [-0.011, 0.006]], { closedProfile: true, hard: true, up: [0, 0, 1] });
  }

  // pisca âmbar envolvente de canto e lanterna traseira horizontal tricolor
  mb.mat(CM.LENS, 2).color(0.62, 0.3, 0.05);
  golSub(mb, 0.002, 1.87, 1.65, 0.25, 0.88, 0.006, {
    field: (u, v, P) => golCornerLamp(P, v),
    uv: (u, v, P) => { _guv[0] = P[0] + P[2]; _guv[1] = P[1]; return _guv; },
    rim: 0.004,
  });
  mb.mat(CM.LENS, 1).color(0.75, 0.03, 0.02);
  golSub(mb, 0.0025, -1.68, -1.815, 0.12, 0.95, 0.007, {
    field: (u, v, P) => golTailLamp(P) - 0.003,
    uv: (u, v, P) => { _guv[0] = sat((P[2] - GT_GOL.z0) / (0.748 - GT_GOL.z0)); _guv[1] = sat((P[1] - GT_GOL.y0) / (GT_GOL.y1 - GT_GOL.y0)); return _guv; },
    rim: 0.003,
  });

  // maçaneta retangular preta e fechadura na porta
  mb.mat(CM.PLASTIC).color(0.025, 0.025, 0.028);
  golSub(mb, 0.005, -0.26, -0.39, 0.2, 0.39, 0.005, { field: (u, v, P) => golRRect(P[0] + 0.325, P[1] - 0.822, 0.048, 0.018, 0.006), uv: plainUV, rim: 0.004 });

  // fundo das fendas da grade dianteira + 3 frisos horizontais pretos
  mb.mat(CM.GRILLE).color(0.012, 0.012, 0.013);
  golSub(mb, -0.024, 1.87, 1.72, 0.62, 1, 0.012, { field: (u, v, P) => golRRect(P[2], P[1] - GL_GOL.lY, 0.348, 0.068, 0.006), uv: plainUV });
  mb.mat(CM.PLASTIC).color(0.022, 0.022, 0.024);
  for (const sy of [0.592, 0.626, 0.660]) {
    const xF = golTopX(0.18, sy, false) - 0.004;
    mb.rbox(xF, sy, 0.175, 0.024, 0.009, 0.335, 0.003, 1);
  }

  // borzeguim: friso largo inferior na lateral entre as caixas de roda (y = 0.235..0.435)
  mb.mat(CM.PLASTIC).color(0.024, 0.024, 0.026);
  {
    const clPts = [[-0.005, 0.235], [0.009, 0.242], [0.011, 0.392], [0.006, 0.398], [0.011, 0.405], [0.011, 0.428], [0.002, 0.438], [-0.006, 0.440]];
    const np = clPts.length, nu = 44;
    mb.patch((u, v, o) => {
      const x = lerp(-0.835, 0.835, u), k = v * (np - 1), j = Math.min(np - 2, Math.floor(k)), f = k - j;
      const off = lerp(clPts[j][0], clPts[j + 1][0], f), y = lerp(clPts[j][1], clPts[j + 1][1], f);
      o[0] = x; o[1] = y; o[2] = golZL(x, y) + off;
    }, 0, 1, 0, 1, { nu, nv: np - 1, flip: false, uv: plainUV });
  }

  // forro interno (portas/laterais escuras, teto claro)
  const inner = (u, v, P) => -(Math.min(golWinDoor(P), golWinQuarter(P), v > 0.55 ? Math.min(golWindshield(P), golHatchGlass(P)) : 1) - 0.014);
  mb.mat(CM.INTERIOR).color(0.075, 0.078, 0.085);
  golSub(mb, -0.028, 0.65, -1.72, 0.04, 0.60, 0.026, { field: inner, uv: plainUV, flip: false });
  mb.mat(CM.INTERIOR, 1).color(0.2, 0.2, 0.195);
  golSub(mb, -0.028, 0.65, -1.72, 0.60, 1, 0.026, { field: inner, uv: plainUV, flip: false });

  // vidros (laterais, para-brisa, vigia traseira inclinada, lentes dos faróis)
  gl.mat(0).color(0.83, 0.915, 0.88);
  const glz = fn => (u, v, P) => fn(P, v) + 0.008;
  golSub(gl, -0.005, 0.62, -0.40, 0.40, 0.64, 0.02, { field: glz(golWinDoor), uv: plainUV });
  golSub(gl, -0.005, -0.44, -1.62, 0.40, 0.64, 0.02, { field: glz(golWinQuarter), uv: plainUV });
  golSub(gl, -0.005, 0.62, -0.02, 0.60, 1, 0.02, { field: glz(golWindshield), uv: plainUV });
  golSub(gl, -0.005, -1.16, -1.70, 0.60, 1, 0.02, { field: glz(golHatchGlass), uv: plainUV });
  gl.mat(1).color(0.93, 0.95, 0.95);
  golSub(gl, -0.003, 1.88, 1.72, 0.62, 1, 0.012, { field: (u, v, P) => golHeadlight(P) + 0.002, uv: (u, v, P) => { _guv[0] = P[2]; _guv[1] = P[1]; return _guv; } });

  mb.mirror(v0, i0, 2); gl.mirror(gv0, gi0, 2);
}

function golBuildParts(mb) {
  const v0 = mb.nv, i0 = mb.ni;
  // para-choques envolventes (comprimento total 1.94 - (-1.87) = 3.81 m)
  mb.mat(CM.PLASTIC).color(0.022, 0.022, 0.024);
  const fPath = carPath([[1.908, 0], [1.902, 0.34, 0.14], [1.882, 0.56, 0.12], [1.842, 0.720, 0.06], [1.72, 0.742, 0.05], [1.56, 0.766, 0.08], [1.42, 0.785]]);
  const fProf = carPath([[-0.08, 0.548], [0.024, 0.546, 0.004], [0.032, 0.538, 0.004], [0.032, 0.514, 0.004], [0.025, 0.508, 0.003], [0.025, 0.492, 0.003], [0.032, 0.488, 0.003], [0.030, 0.365, 0.010], [0.020, 0.285, 0.008], [-0.06, 0.275]]);
  carBumper(mb, fPath, fProf, 1, (u, v, P) => {
    let f = golArchF(P) - 0.004;
    if (P[0] > 1.84) {
      f = Math.min(f,
        golRRect(P[2] - 0.48, P[1] - 0.335, 0.13, 0.024, 0.008),
        golRRect(P[2], P[1] - 0.445, 0.212, 0.068, 0.008),
        golRRect(P[2], P[1] - 0.328, 0.24, 0.024, 0.008)
      );
    }
    return -f;
  }, 136, 42, 0.34 + 0.22 + 0.165, 0.32, 0.548, 0.24);

  const rPath = carPath([[-1.842, 0], [-1.838, 0.34, 0.14], [-1.820, 0.58, 0.12], [-1.778, 0.744, 0.06], [-1.67, 0.764, 0.05], [-1.54, 0.778, 0.08], [-1.42, 0.790]]);
  const rProf = carPath([[-0.08, 0.555], [0.022, 0.553, 0.004], [0.028, 0.545, 0.004], [0.028, 0.520, 0.004], [0.022, 0.514, 0.003], [0.022, 0.498, 0.003], [0.028, 0.494, 0.003], [0.026, 0.355, 0.012], [0.008, 0.312, 0.008], [-0.06, 0.305]]);
  carBumper(mb, rPath, rProf, -1, (u, v, P) => -(golArchF(P) - 0.004), 120, 38, 0.34 + 0.24 + 0.162, 0.34, 0.555, 0.20);

  // fundo das entradas de ar e rebaixo da placa dianteira
  mb.mat(CM.GRILLE, 1).color(0.008, 0.008, 0.009);
  mb.quad(1.908, 0.30, 0.62, 1.908, 0.30, 0, 1.908, 0.37, 0, 1.908, 0.37, 0.62);
  mb.mat(CM.PLASTIC).color(0.018, 0.018, 0.02);
  mb.quad(1.922, 0.375, 0.22, 1.922, 0.375, 0, 1.922, 0.515, 0, 1.922, 0.515, 0.22);

  // caixas de roda e assoalho
  mb.mat(CM.UNDER).color(0.006, 0.006, 0.007);
  for (const ax of [GOL.AXF, GOL.AXR]) {
    const R0 = GOL.ARCH_R + 0.006, N = 26, zo = golZL(ax, 0.54) - 0.012, zi = 0.34;
    for (let i = 0; i < N; i++) {
      const aS = ax > 0 ? 12 : -18, aE = ax > 0 ? 198 : 163;
      const a0 = (aS + (aE - aS) * i / N) * PI / 180, a1 = (aS + (aE - aS) * (i + 1) / N) * PI / 180;
      const x0 = ax + Math.cos(a0) * R0, y0 = GOL.ARCH_Y + Math.sin(a0) * R0, x1 = ax + Math.cos(a1) * R0, y1 = GOL.ARCH_Y + Math.sin(a1) * R0;
      const a = mb.v(x0, y0, zo, -Math.cos(a0), -Math.sin(a0), 0, 0, 0), b = mb.v(x0, y0, zi, -Math.cos(a0), -Math.sin(a0), 0, 0, 1), c = mb.v(x1, y1, zi, -Math.cos(a1), -Math.sin(a1), 0, 1, 1), d = mb.v(x1, y1, zo, -Math.cos(a1), -Math.sin(a1), 0, 1, 0);
      mb.quadI(a, d, c, b);
    }
    mb.quad(ax - 0.33, 0.25, zi, ax + 0.33, 0.25, zi, ax + 0.33, 0.65, zi, ax - 0.33, 0.65, zi);
  }
  mb.quad(1.56, 0.20, 0.56, 1.56, 0.20, 0, 1.56, 0.40, 0, 1.56, 0.40, 0.56);
  mb.quad(-1.44, 0.20, 0, -1.44, 0.20, 0.56, -1.44, 0.40, 0.56, -1.44, 0.40, 0);
  mb.quad(1.56, 0.40, 0, 1.90, 0.40, 0, 1.90, 0.40, 0.72, 1.56, 0.40, 0.72);
  mb.quad(-1.82, 0.40, 0, -1.44, 0.40, 0, -1.44, 0.40, 0.74, -1.82, 0.40, 0.74);
  mb.quad(-0.84, 0.20, 0, 0.84, 0.20, 0, 0.84, 0.20, 0.71, -0.84, 0.20, 0.71);
  mb.quad(0.84, 0.20, 0, 1.56, 0.20, 0, 1.56, 0.20, 0.50, 0.84, 0.20, 0.50);
  mb.quad(-1.44, 0.20, 0, -0.84, 0.20, 0, -0.84, 0.20, 0.50, -1.44, 0.20, 0.50);

  // refletores e bulbos dos faróis dianteiros
  {
    const z0 = GL_GOL.hlZ0 + 0.003, z1 = GL_GOL.hlZ1 - 0.003, y0 = GL_GOL.lY - GL_GOL.lH + 0.003, y1 = GL_GOL.lY + GL_GOL.lH - 0.003, D = 0.056;
    const zc = (z0 + z1) / 2, yc = (y0 + y1) / 2, hz = (z1 - z0) / 2, hy = (y1 - y0) / 2;
    const dep = (a, b) => 0.006 + D * Math.pow(Math.max(0, (1 - a * a * a * a) * (1 - b * b * b * b)), 0.6);
    mb.mat(CM.REFLECTOR).color(0.9, 0.9, 0.92);
    mb.patch((u, v, o) => { const z = zc + u * hz, y = yc + v * hy, d = dep(u, v), x = golTopX(z, y, false); o[0] = x - d * 0.95; o[1] = y - d * 0.22; o[2] = z; }, -1, 1, -1, 1, { nu: 20, nv: 12, flip: true, uv: (u, v) => { _guv[0] = u; _guv[1] = v; return _guv; } });
    const xb = golTopX(zc, yc, false) - (dep(0, 0) - 0.012) * 0.95, ybb = yc - (dep(0, 0) - 0.012) * 0.22;
    mb.push(m4translate(m4(), xb, ybb, zc)); mb.push(m4rotZ(m4(), -PI / 2 + 0.25));
    mb.mat(CM.REFLECTOR, 1).color(1, 0.95, 0.8); mb.cyl(0, -0.012, 0, 0.010, 0.024, 0.009, 12, false, true);
    mb.mat(CM.REFLECTOR, 2).color(0.85, 0.85, 0.86); mb.cyl(0, -0.012, 0, 0.015, -0.007, 0.013, 12, false, true);
    mb.mat(CM.REFLECTOR, 2).color(0.6, 0.6, 0.6); mb.cyl(0, 0.022, 0, 0.010, 0.028, 0.007, 10, false, true);
    mb.pop(); mb.pop();
  }

  // retrovisores externos quadrados anos 90
  mb.mat(CM.PLASTIC).color(0.015, 0.015, 0.016);
  mb.push(m4translate(m4(), 0.48, 0.948, 0.855)); mb.push(m4rotY(m4(), 0.16));
  mb.rbox(0, 0, 0, 0.070, 0.094, 0.156, 0.018, 4);
  mb.mat(CM.MIRROR).color(0.62, 0.64, 0.67);
  mb.quad(-0.0355, -0.035, -0.065, -0.0355, -0.035, 0.065, -0.0355, 0.035, 0.065, -0.0355, 0.035, -0.065);
  mb.pop(); mb.pop();
  mb.mat(CM.PLASTIC).color(0.015, 0.015, 0.016);
  mb.rbox(0.50, 0.944, 0.755, 0.12, 0.074, 0.076, 0.008, 2);

  // aerofólios traseiros pretos (superior sobre a vigia + inferior sobre a tampa traseira)
  mb.mat(CM.PLASTIC).color(0.020, 0.020, 0.022);
  mb.rbox(-1.225, 1.356, 0.295, 0.13, 0.026, 0.59, 0.008, 2);
  mb.rbox(-1.725, 0.902, 0.33, 0.105, 0.042, 0.66, 0.010, 2);
  // suportes laterais dos aerofólios
  mb.rbox(-1.21, 1.345, 0.575, 0.11, 0.032, 0.03, 0.006, 1);

  // interior (metade direita; espelhado) — bancos esportivos CL/GTi mais baixos para teto de 1,375 m
  mb.mat(CM.INTERIOR).color(0.048, 0.048, 0.052);
  mb.quad(-0.90, 0.23, 0.73, 0.80, 0.23, 0.73, 0.80, 0.23, 0, -0.90, 0.23, 0);
  mb.quad(-1.42, 0.23, 0.50, -0.90, 0.23, 0.50, -0.90, 0.23, 0, -1.42, 0.23, 0);
  mb.quad(-1.74, 0.42, 0.73, -1.42, 0.42, 0.73, -1.42, 0.42, 0, -1.74, 0.42, 0);
  mb.quad(0.75, 0.20, 0, 0.75, 0.20, 0.73, 0.75, 0.88, 0.73, 0.75, 0.88, 0);
  // painel dianteiro reto e console central
  mb.mat(CM.INTERIOR, 3).color(0.042, 0.042, 0.046);
  mb.rbox(0.54, 0.76, 0.35, 0.34, 0.20, 0.70, 0.03, 3);
  mb.rbox(0.42, 0.48, 0.055, 0.32, 0.30, 0.12, 0.025, 2);
  mb.mat(CM.INTERIOR, 3).color(0.068, 0.068, 0.074);
  mb.rbox(0.56, 0.858, 0.35, 0.30, 0.024, 0.69, 0.008, 2);
  mb.mat(CM.GRILLE).color(0.02, 0.02, 0.022);
  mb.box(0.37, 0.81, 0.61, 0.008, 0.04, 0.10);
  mb.box(0.37, 0.81, 0.09, 0.008, 0.04, 0.10);
  mb.mat(CM.INTERIOR, 3).color(0.03, 0.03, 0.034);
  mb.rbox(0.368, 0.73, 0.35, 0.012, 0.08, 0.28, 0.004, 2);

  // bancos dianteiros e traseiro
  mb.mat(CM.INTERIOR, 4).color(0.065, 0.068, 0.075);
  mb.rbox(-0.04, 0.38, 0.355, 0.48, 0.13, 0.48, 0.05, 4);
  mb.push(m4translate(m4(), -0.27, 0.415, 0.355)); mb.push(m4rotZ(m4(), 0.31));
  mb.rbox(0, 0.28, 0, 0.12, 0.56, 0.46, 0.05, 4);
  mb.color(0.115, 0.12, 0.135);
  mb.rbox(0.055, 0.28, 0, 0.03, 0.42, 0.28, 0.012, 2);
  mb.pop(); mb.pop();
  mb.push(m4translate(m4(), -0.29, 0.415, 0.355)); mb.push(m4rotZ(m4(), 0.31));
  mb.mat(CM.INTERIOR, 2).color(0.062, 0.064, 0.072); mb.rbox(0.005, 0.66, 0, 0.09, 0.15, 0.23, 0.035, 4);
  mb.mat(CM.STEEL).color(0.3, 0.3, 0.3); mb.cyl(0, 0.54, -0.055, 0.006, 0.60, 0.006, 6); mb.cyl(0, 0.54, 0.055, 0.006, 0.60, 0.006, 6);
  mb.pop(); mb.pop();

  mb.mat(CM.INTERIOR, 4).color(0.065, 0.068, 0.075);
  mb.rbox(-0.98, 0.40, 0.31, 0.44, 0.14, 0.62, 0.05, 4);
  mb.push(m4translate(m4(), -1.19, 0.44, 0.31)); mb.push(m4rotZ(m4(), 0.36)); mb.rbox(0, 0.24, 0, 0.11, 0.48, 0.62, 0.045, 4); mb.pop(); mb.pop();
  mb.mat(CM.INTERIOR).color(0.038, 0.038, 0.042); mb.box(-1.50, 0.85, 0.30, 0.36, 0.02, 0.60);

  mb.mirror(v0, i0, 2);

  // ---------------- peças não simétricas ----------------
  // painel "satélite" exclusivo do lado do motorista (capela quadrada + asas laterais de chaves)
  mb.mat(CM.INTERIOR, 3).color(0.038, 0.038, 0.042);
  mb.rbox(0.43, 0.885, -0.355, 0.16, 0.125, 0.34, 0.022, 3);
  mb.rbox(0.405, 0.855, -0.57, 0.09, 0.11, 0.08, 0.015, 2);
  mb.rbox(0.405, 0.855, -0.14, 0.09, 0.11, 0.08, 0.015, 2);
  mb.tube([[0.32, 0.84, -0.355], [0.52, 0.77, -0.355]], 0.028, 10);
  mb.rbox(0.20, 1.23, 0, 0.024, 0.05, 0.19, 0.010, 2); mb.tube([[0.21, 1.23, 0], [0.17, 1.29, 0]], 0.007, 6);
  mb.tube([[0.18, 0.38, 0], [0.15, 0.56, 0]], 0.010, 6); mb.rbox(0.148, 0.58, 0, 0.044, 0.044, 0.044, 0.018, 3);
  mb.rbox(-0.14, 0.36, 0, 0.28, 0.045, 0.038, 0.014, 2);

  // limpadores dianteiros e traseiro
  mb.mat(CM.RUBBER).color(0.015, 0.015, 0.015);
  const wipF = (zp, z1, xe0, lift) => {
    const P = (z, xe) => { const zz = z / 0.73, x = xe + golBulge(xe) * (1 - zz * zz); return [x, golYtop(x, z) + 0.015, z]; };
    const zm = (zp + z1) / 2, a = P(zp, 0.58), m = P(zm + (z1 - zp) * 0.1, xe0 - lift * 0.5);
    mb.rbox(a[0], a[1] - 0.004, a[2], 0.028, 0.02, 0.028, 0.007, 2);
    mb.sweep([a, [(a[0] + m[0]) / 2, (a[1] + m[1]) / 2 + 0.005, (a[2] + m[2]) / 2], m], [[-0.005, -0.003], [0.005, -0.003], [0.005, 0.003], [-0.005, 0.003]], { closedProfile: true, hard: true });
    const pts = []; for (let k = 0; k <= 7; k++) { const z = lerp(zp + (z1 - zp) * 0.12, z1, k / 7); pts.push(P(z, lerp(xe0, xe0 - lift, k / 7))); }
    mb.sweep(pts, [[-0.006, -0.007], [0.006, -0.007], [0.003, 0.005], [-0.003, 0.005]], { closedProfile: true, hard: true });
  };
  wipF(0.28, -0.22, 0.555, 0.03); wipF(-0.24, -0.64, 0.555, 0.045);
  {
    const PR = (z, y) => { const x = golTopX(z, y, true); return [x - 0.015, y + 0.012, z]; };
    const a = PR(0.02, 0.92), b = PR(-0.22, 0.97);
    mb.rbox(a[0], a[1], a[2], 0.026, 0.026, 0.026, 0.007, 2);
    mb.sweep([a, b], [[-0.005, -0.003], [0.005, -0.003], [0.005, 0.003], [-0.005, 0.003]], { closedProfile: true, hard: true });
    const pts = []; for (let k = 0; k <= 6; k++) pts.push(PR(lerp(0, -0.38, k / 6), 0.975 + 0.012 * k / 6));
    mb.sweep(pts, [[-0.005, -0.005], [0.005, -0.005], [0.003, 0.005], [-0.003, 0.005]], { closedProfile: true, hard: true });
  }

  // escapamento: silencioso transversal + ponteira dupla cromada à esquerda
  mb.mat(CM.STEEL, 1).color(0.03, 0.03, 0.032);
  mb.push(m4translate(m4(), -1.55, 0.275, -0.24)); mb.push(m4rotX(m4(), PI / 2)); mb.cyl(0, 0, 0, 0.058, 0.30, 0.058, 18, true, true); mb.pop(); mb.pop();
  mb.mat(CM.CHROME, 1).color(0.86, 0.88, 0.90);
  for (const ez of [-0.425, -0.485]) mb.tube([[-1.56, 0.272, ez], [-1.72, 0.270, ez], [-1.865, 0.268, ez]], 0.017, 10);

  // emblema VW cromado central na grade dianteira (aro 3D + decalque VW nítido à frente do tampão)
  {
    const y = GL_GOL.lY, x = golTopX(0, y, false), xu = golTopX(0, y + 0.02, false), sl = (xu - x) / 0.02, l = Math.hypot(1, sl);
    const B = m4basis(m4(), 0, 0, -1, sl / l, 1 / l, 0, 1 / l, -sl / l, 0, x + 0.003, y, 0);
    mb.mat(CM.CHROME, 2).color(0.92, 0.93, 0.95); mb.push(B);
    mb.push(m4rotX(m4(), PI / 2)); mb.cyl(0, -0.006, 0, 0.044, 0.005, 0.044, 24, true, true); mb.pop();
    const reg = CAT.vw, hw = 0.040, hh = 0.040, zd = 0.0068;
    mb.mat(CM.DECAL, 1).color(1, 1, 1);
    mb.quad(-hw, -hh, zd, hw, -hh, zd, hw, hh, zd, -hw, hh, zd, reg[0], reg[3], reg[2], reg[1]);
    mb.pop();
  }

  // placas dianteira/traseira e emblemas traseiros (VW + GOL 1.8)
  const dq = (reg, zc, y0, w, h, rear, lift) => {
    const P = (z, y) => { const x = rear ? golTopX(z, y, true) - lift : lift; return [x, y, z]; };
    const s = rear ? 1 : -1, a = P(zc - s * w / 2, y0), b = P(zc + s * w / 2, y0), c = P(zc + s * w / 2, y0 + h), d = P(zc - s * w / 2, y0 + h);
    mb.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2], reg[0], reg[3], reg[2], reg[1]);
  };
  mb.mat(CM.DECAL).color(1, 1, 1);
  dq(CAT.golPlate, 0, 0.592, 0.40, 0.13, true, 0.006);
  dq(CAT.golPlate, 0, 0.382, 0.40, 0.13, false, 1.9245);
  mb.mat(CM.DECAL, 1).color(1, 1, 1);
  dq(CAT.vw, 0, 0.768, 0.064, 0.064, true, 0.004);
  dq(CAT.gol18, 0.49, 0.772, 0.21, 0.044, true, 0.004);
  // faixa plástica preta acima da placa traseira (puxador da tampa)
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.022);
  mb.rbox(golTopX(0, 0.742, true) - 0.006, 0.742, 0, 0.016, 0.024, 0.44, 0.005, 1);
}

// piloto ajustado ao banco mais baixo e volante do Gol Quadrado (capacete sempre abaixo do teto de 1,375 m)
function golBuildDriver(mb) {
  const zd = -0.355;
  mb.mat(CM.INTERIOR, 2).color(0.2, 0.028, 0.03);
  mb.push(m4translate(m4(), -0.255, 0.455, zd)); mb.push(m4rotZ(m4(), 0.28));
  mb.rbox(0.08, 0.26, 0, 0.19, 0.52, 0.35, 0.075, 4);
  mb.rbox(0.08, 0.48, 0, 0.16, 0.10, 0.42, 0.042, 3);
  mb.pop(); mb.pop();
  mb.rbox(0.01, 0.485, zd, 0.43, 0.125, 0.33, 0.058, 3);
  for (const sg of [-1, 1]) mb.tube([[-0.26, 0.915, zd + sg * 0.195], [-0.03, 0.82, zd + sg * 0.205], [0.245, 0.875, zd + sg * 0.162]], 0.041, 8);
  mb.mat(CM.INTERIOR, 3).color(0.02, 0.02, 0.022);
  for (const sg of [-1, 1]) mb.rbox(0.255, 0.880, zd + sg * 0.165, 0.082, 0.068, 0.072, 0.028, 2);
  mb.rbox(-0.265, 0.980, zd, 0.095, 0.065, 0.105, 0.028, 2);
  mb.mat(CM.INTERIOR, 3).color(0.012, 0.012, 0.013);
  mb.sweep([[-0.255, 0.95, zd - 0.145], [-0.15, 0.77, zd - 0.02], [-0.085, 0.58, zd + 0.145]], [[-0.022, 0.004], [0.022, 0.004], [0.022, -0.004], [-0.022, -0.004]], { closedProfile: true, hard: true, up: [1, 0.3, 0] });
  mb.mat(CM.GLOSS).color(0.05, 0.052, 0.058);
  mb.rbox(-0.245, 1.105, zd, 0.24, 0.235, 0.22, 0.106, 7);
  mb.rbox(-0.220, 1.034, zd, 0.178, 0.098, 0.198, 0.046, 5);
  mb.mat(CM.GLOSS, 1).color(0.01, 0.011, 0.014);
  mb.rbox(-0.185, 1.115, zd, 0.125, 0.076, 0.225, 0.032, 5);
}

// roda Orbital prateada (aro de liga leve com anel de 9 janelas orbitais e disco de borrão)
function golBuildWheel(mb, mbBlur) {
  mb.push(m4rotY(m4(), -PI / 2));
  mb.push(m4translate(m4(), -0.015, 0, 0));
  const R = GOL.WR, seg = 64;
  mb.mat(CM.TIRE, 255).color(0.02, 0.02, 0.021);
  mb.lathe([[-0.058, 0.168], [-0.066, 0.18], [-0.0735, 0.205], [-0.074, 0.228], [-0.071, 0.25], [-0.066, 0.264, 0.5, 1]], seg);
  mb.lathe([[0.066, 0.264, 0.5, -1], [0.071, 0.25], [0.074, 0.228], [0.0735, 0.205], [0.066, 0.18], [0.058, 0.168]], seg);
  mb.mat(CM.TIRE, 0);
  const tread = [[-0.066, 0.264, 0.5, 1], [-0.061, 0.2745], [-0.052, 0.2795]];
  const groove = x => { tread.push([x - 0.0045, R], [x - 0.0036, R - 0.0065], [x + 0.0036, R - 0.0065], [x + 0.0045, R]); };
  tread.push([-0.041, R]); groove(-0.033); groove(-0.011); groove(0.011); groove(0.033); tread.push([0.041, R]);
  tread.push([0.052, 0.2795], [0.061, 0.2745], [0.066, 0.264, 0.5, -1]);
  mb.lathe(tread, seg);

  // tambor/disco interno escuro atrás das aberturas da roda Orbital
  mb.mat(CM.STEEL, 1).color(0.038, 0.038, 0.042);
  mb.lathe([[0.058, 0.168], [0.064, 0.171], [0.068, 0.168], [0.050, 0.164], [0.026, 0.154], [0.024, 0.0]], 36);
  mb.lathe([[-0.02, 0.0], [-0.02, 0.10], [-0.05, 0.158], [-0.06, 0.166], [-0.058, 0.168]], 28);

  // face usinada da roda Orbital com 9 janelas periféricas e calota central lisa
  mb.mat(CM.ALU, 1).color(0.76, 0.78, 0.82);
  const NS = 9, prof = r => {
    const t = r / 0.168;
    return 0.0705 - 0.006 * t * t - 0.0025 * smooth(0.052, 0.058, r) * (1 - smooth(0.058, 0.064, r)) + 0.004 * smooth(0.154, 0.168, r);
  };
  mb.patch((u, v, o) => {
    const a = u * TAU, r = v * 0.1685;
    o[0] = prof(r); o[1] = r * Math.cos(a); o[2] = r * Math.sin(a);
  }, 0, 1.003, 0.0, 1, {
    nu: 180, nv: 28, flip: true, rim: 0.015,
    rimMat: m => m.mat(CM.STEEL, 1).color(0.06, 0.06, 0.07),
    uv: (u, v) => { _guv[0] = u; _guv[1] = v; return _guv; },
    field: (u, v) => {
      const r = v * 0.1685, da = (u * NS - Math.round(u * NS)) / NS * TAU;
      const t = r * Math.sin(da), q = Math.max(Math.abs(r - 0.133) - 0.017, 0);
      return -(Math.hypot(t, q) - 0.0105);
    },
  });
  // sulco central da calotinha Orbital
  mb.mat(CM.STEEL, 1).color(0.06, 0.06, 0.07);
  mb.lathe([[0.0702, 0.052], [0.0682, 0.055], [0.0702, 0.058]], 32);

  // disco de borrão em velocidade
  const bm = mbBlur || mb;
  if (mbBlur) { bm.push(m4rotY(m4(), -PI / 2)); bm.push(m4translate(m4(), -0.015, 0, 0)); }
  bm.mat(CM.HUBCAP, 1).color(0.76, 0.78, 0.82);
  bm.patch((u, v, o) => {
    const a = u * TAU, r = 0.056 + v * 0.104;
    o[0] = prof(r) + 0.002; o[1] = r * Math.cos(a); o[2] = r * Math.sin(a);
  }, 0, 1, 0, 1, { nu: 48, nv: 8, flip: true, uv: (u, v) => { _guv[0] = u; _guv[1] = v; return _guv; } });
  if (mbBlur) { bm.pop(); bm.pop(); }
  mb.pop(); mb.pop();
}

// volante clássico "4 botões" do Gol Quadrado (devolve a matriz da coluna de direção)
function golBuildSteer(mb) {
  mb.mat(CM.INTERIOR, 3).color(0.032, 0.032, 0.035);
  const ring = [];
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; ring.push([0, 0.180 * Math.cos(a), 0.180 * Math.sin(a)]); }
  mb.tube(ring, 0.0135, 10, { closed: true, up: [1, 0, 0] });
  // miolo largo + 4 raios
  mb.rbox(-0.028, -0.008, 0, 0.044, 0.115, 0.175, 0.018, 3);
  mb.rbox(-0.016, 0.02, 0.11, 0.02, 0.028, 0.14, 0.006, 1);
  mb.rbox(-0.016, 0.02, -0.11, 0.02, 0.028, 0.14, 0.006, 1);
  mb.rbox(-0.016, -0.095, 0.055, 0.02, 0.15, 0.028, 0.006, 1);
  mb.rbox(-0.016, -0.095, -0.055, 0.02, 0.15, 0.028, 0.006, 1);
  // 4 botões de buzina característicos na face voltada para o motorista (+X local)
  mb.mat(CM.INTERIOR, 2).color(0.065, 0.067, 0.072);
  for (const sy of [0.022, -0.032]) for (const sz of [-0.048, 0.048]) {
    mb.rbox(-0.003, sy, sz, 0.010, 0.038, 0.052, 0.005, 1);
  }
  const t0 = m4translate(m4(), 0.31, 0.855, -0.355), t1 = m4rotZ(m4(), 156 * PI / 180);
  return m4mul(m4(), t0, t1);
}

function golBuildModel() {
  golShapeInit(); golWindowsInit(); golSeamInit();
  const mb = new MeshBuilder(1 << 17), gl = new MeshBuilder(1 << 14);
  golBuildBody(mb, gl);
  golBuildParts(mb);
  let tris = mb.ni / 3 + gl.ni / 3;
  const dm = new MeshBuilder(1 << 13); golBuildDriver(dm); tris += dm.ni / 3;
  const w = new MeshBuilder(1 << 15), wb = new MeshBuilder(1 << 11); golBuildWheel(w, wb); tris += 4 * (w.ni + wb.ni) / 3;
  const s = new MeshBuilder(1 << 12); const steerMat = golBuildSteer(s); tris += s.ni / 3;
  return {
    name: 'Gol Quadrado AP 1.8',
    bodyMesh: mb.upload(),
    driverMesh: dm.upload(),
    glassMesh: gl.upload(),
    wheelMesh: w.upload(),
    wheelBlurMesh: wb.upload(),
    steerMesh: s.upload(),
    steerMat,
    hubs: [[GOL.AXF, GOL.WR, -0.685], [GOL.AXF, GOL.WR, 0.685], [GOL.AXR, GOL.WR, -0.67], [GOL.AXR, GOL.WR, 0.67]],
    wheelR: GOL.WR,
    eyePos: [-0.12, 1.115, -0.355],
    bodyKind: 1,
    tris,
  };
}
