// Painel na tela: velocímetro, conta-giros, marcha, barra de turbo, cronômetro/posição da corrida, última/melhor volta, delta, medalha, minimapa com rivais e estatísticas.
// Quatro canvas 2D pequenos por cima do jogo, só no jogo aberto por uma pessoa (GAME.ui). Nenhuma alocação por quadro:
// mostradores, minimapa, medalhas e rótulos são desenhados uma vez em canvas de fundo; a cada quadro só há cópias de imagem
// (algarismos de atlas pré-coloridos), ponteiros e primitivas inteiras no minimapa, e só quando o valor quantizado mudou.
const HUD = {
  cg: null, ct: null, cs: null, cm: null, g: null, t: null, s: null, m: null,
  face: null, hub: null, bgT: null, bgR: null, bgCp: null, bgS: null, bgM: null, A: null, B: null, BG: null, BR: null, C: null, medals: null,
  rivCol: ['#bf352f', '#e2e3e0', '#c2c5c8'],
  L: new Int32Array(64), K: new Int32Array(32), acc: new Float64Array(4), stats: false, vis: false,
  V: new Int32Array(28),  // km/h × 10, rpm, marcha, volta, última, melhor, deltaCs, medalha, px, py, pa, gv, gx, gy, boost, boosting, raceOn, rx0,ry0, rx1,ry1, rx2,ry2, rank, lap, cpOn, cpTime, cpDelta
  M: new Float64Array(3), // minimapa: ox, oy, escala
  MC: new Float64Array(64), MS: new Float64Array(64),
};
const HCH = '0123456789:.,-R+/CP';
const HMED = ['#4be3ff', '#ffd23f', '#cfd6de', '#cd7f32'];
function hudPaintHex(idx) {
  if (typeof PAINTS === 'undefined' || !PAINTS[idx]) return '#cfd6de';
  const rgb = PAINTS[idx].rgb;
  let hex = '#';
  for (let c = 0; c < 3; c++) {
    const v = rgb[c] <= 0.0031308 ? 12.92 * rgb[c] : 1.055 * Math.pow(rgb[c], 1 / 2.4) - 0.055;
    const b = Math.max(0, Math.min(255, Math.round(v * 255)));
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}
// atlas de algarismos: cada caractere centrado numa célula; os algarismos têm todos a mesma largura (números não "dançam")
function hudAtlas(px, col) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), font = '600 ' + px + 'px "Helvetica Neue",Helvetica,Arial,sans-serif', n = HCH.length, w = new Int32Array(n), x = new Int32Array(n);
  g.font = font; let dw = 0, X = 0; for (let i = 0; i < 10; i++) dw = Math.max(dw, Math.ceil(g.measureText(HCH[i]).width));
  for (let i = 0; i < n; i++) { const m = Math.ceil(g.measureText(HCH[i]).width); w[i] = (i < 10 || i > 12 ? Math.max(dw, m) : m) + 2; x[i] = X; X += w[i]; }
  c.width = X; c.height = Math.ceil(px * 1.16); g.font = font; g.fillStyle = col || '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  for (let i = 0; i < n; i++) g.fillText(HCH[i], x[i] + w[i] / 2, px * 0.94);
  return { c, w, x, h: c.height };
}
// pré-renderiza os 4 ícones circulares de medalha (Firma com estrela, Ouro, Prata, Bronze)
function hudMedalIcons(sz) {
  const out = new Array(4), c = sz * 0.5, rad = sz * 0.42;
  for (let i = 0; i < 4; i++) {
    const cv = document.createElement('canvas'), g = cv.getContext('2d');
    cv.width = cv.height = sz;
    g.beginPath(); g.arc(c, c, rad, 0, TAU); g.fillStyle = HMED[i]; g.fill();
    g.lineWidth = Math.max(1, sz * 0.08); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.stroke();
    if (i === 0) {
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -PI * 0.5 + k * PI / 5, rr = (k & 1) ? rad * 0.3 : rad * 0.62;
        const px = c + Math.cos(a) * rr, py = c + Math.sin(a) * rr;
        if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fillStyle = '#07222b'; g.fill();
    } else {
      g.beginPath(); g.arc(c, c, rad * 0.56, 0, TAU);
      g.lineWidth = Math.max(1, sz * 0.07); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.stroke();
    }
    out[i] = cv;
  }
  return out;
}
// pré-renderiza o cartão do minimapa com o traçado fechado da pista e a linha de largada
function hudMinimapBg(r, dpr) {
  const H = HUD, L = H.L, M = H.M, cm = H.cm;
  const mw = Math.round(r * 1.85), mh = Math.round(r * 1.50);
  if (cm) { cm.width = mw; cm.height = mh; cm.style.width = mw / dpr + 'px'; cm.style.height = mh / dpr + 'px'; }
  const bg = document.createElement('canvas'); bg.width = mw; bg.height = mh;
  const g = bg.getContext('2d');
  g.fillStyle = 'rgba(9,11,14,.62)'; g.beginPath(); g.roundRect(0, 0, mw, mh, Math.round(r * 0.22)); g.fill();
  const hasTrk = typeof TRK !== 'undefined' && TRK.N > 0 && TRK.x && TRK.z;
  const pad = Math.round(r * 0.17);
  if (hasTrk) {
    const dx = Math.max(1, TRK.bx1 - TRK.bx0), dz = Math.max(1, TRK.bz1 - TRK.bz0);
    const sc = Math.min((mw - 2 * pad) / dx, (mh - 2 * pad) / dz);
    const ox = (mw - dx * sc) * 0.5 - TRK.bx0 * sc, oy = (mh - dz * sc) * 0.5 - TRK.bz0 * sc;
    M[0] = ox; M[1] = oy; M[2] = sc;
    const step = Math.max(1, (TRK.N / 260) | 0);
    g.beginPath();
    for (let i = 0; i < TRK.N; i += step) {
      const px = TRK.x[i] * sc + ox, py = TRK.z[i] * sc + oy;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.lineWidth = Math.max(4, r * 0.088); g.strokeStyle = 'rgba(0,0,0,0.72)'; g.stroke();
    g.lineWidth = Math.max(2, r * 0.044); g.strokeStyle = 'rgba(255,255,255,0.78)'; g.stroke();
    const sx = TRK.x[0] * sc + ox, sy = TRK.z[0] * sc + oy;
    const nx = -TRK.tz[0], ny = TRK.tx[0], hl = Math.max(3.5, r * 0.052);
    g.beginPath(); g.moveTo(sx - nx * hl, sy - ny * hl); g.lineTo(sx + nx * hl, sy + ny * hl);
    g.lineWidth = Math.max(2, r * 0.028); g.strokeStyle = '#fff'; g.stroke();
    if (TRK.cps && TRK.tx && TRK.tz) {
      const ds = TRK.ds || 1, chl = Math.max(3, r * 0.046);
      g.lineWidth = Math.max(2, r * 0.024); g.strokeStyle = '#eab308';
      for (let c = 0; c < TRK.cps.length; c++) {
        const idx = ((Math.round(TRK.cps[c] / ds) % TRK.N) + TRK.N) % TRK.N;
        const cx = TRK.x[idx] * sc + ox, cy = TRK.z[idx] * sc + oy;
        const cnx = -TRK.tz[idx], cny = TRK.tx[idx];
        g.beginPath(); g.moveTo(cx - cnx * chl, cy - cny * chl); g.lineTo(cx + cnx * chl, cy + cny * chl); g.stroke();
      }
    }
  } else {
    M[0] = mw * 0.5; M[1] = mh * 0.5; M[2] = 0;
  }
  L[30] = mw; L[31] = mh;
  L[32] = Math.max(2, Math.round(r * 0.042));
  L[33] = Math.max(4, Math.round(r * 0.082));
  L[34] = Math.max(1, Math.round(r * 0.016));
  return bg;
}
function hudInit() {
  const H = HUD; H.cg = document.getElementById('hg'); H.ct = document.getElementById('ht'); H.cs = document.getElementById('hs'); H.cm = document.getElementById('hm');
  H.g = H.cg.getContext('2d'); H.t = H.ct.getContext('2d'); H.s = H.cs.getContext('2d'); H.m = H.cm ? H.cm.getContext('2d') : null;
  hudLayout(); addEventListener('resize', hudLayout);
}
// tira com rótulos fixos e vãos para os números; devolve o canvas de fundo e grava em L[o + i] o x de cada número
function hudStrip(cv, labels, widths, units, At, px, o, fixedW) {
  const dpr = devicePixelRatio || 1, f = document.createElement('canvas'), g = f.getContext('2d'), font = '600 ' + Math.round(px * 0.62) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif', pad = Math.round(px * 0.7), L = HUD.L;
  g.font = font; let X = pad; const xs = [];
  for (let i = 0; i < labels.length; i++) { const lw = g.measureText(labels[i]).width, uw = units[i] ? g.measureText(units[i]).width + px * 0.25 : 0; xs.push(X); L[o + i] = Math.round(X + lw + px * 0.4); X = L[o + i] + widths[i] + uw + pad * 1.3; }
  const pillW = Math.round(X - pad * 0.3), W = fixedW > pillW ? fixedW : pillW, Hh = Math.round(px * 1.75), ox = fixedW > pillW ? Math.round((fixedW - pillW) * 0.5) : 0;
  f.width = W; f.height = Hh;
  if (cv) { cv.width = W; cv.height = Hh; cv.style.width = W / dpr + 'px'; cv.style.height = Hh / dpr + 'px'; }
  g.fillStyle = 'rgba(9,11,14,.62)'; g.beginPath(); g.roundRect(ox, 0, pillW, Hh, Hh * 0.3); g.fill();
  g.font = font; g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(255,255,255,.62)';
  for (let i = 0; i < labels.length; i++) {
    g.fillText(labels[i], ox + xs[i], Hh * 0.5 + px * 0.26);
    L[o + i] += ox;
    if (units[i]) g.fillText(units[i], L[o + i] + widths[i] + px * 0.25, Hh * 0.5 + px * 0.26);
  }
  L[o + 6] = Math.round((Hh - At.h) / 2); L[o + 7] = W; L[o + 8] = Hh;
  return f;
}
function hudLayout() {
  const H = HUD, L = H.L, dpr = devicePixelRatio || 1, r = Math.round(Math.min(Math.max(innerHeight * 0.105, 54), 124) * dpr), W = Math.round(r * 4.5), Hh = Math.round(r * 2.26);
  const bPx = Math.round(r * 0.23), A = H.A = hudAtlas(Math.round(r * 0.33)), B = H.B = hudAtlas(bPx), C = H.C = hudAtlas(Math.round(r * 0.17));
  H.BG = hudAtlas(bPx, '#3ee07a'); H.BR = hudAtlas(bPx, '#ff5a4e');
  const c = H.cg; c.width = W; c.height = Hh; c.style.width = W / dpr + 'px'; c.style.height = Hh / dpr + 'px';
  const cx1 = Math.round(r * 1.12), cy = Math.round(r * 1.12), cx2 = W - cx1; L[0] = cx1; L[1] = cy; L[2] = cx2; L[3] = r; L[4] = W; L[5] = Hh;
  const fc = H.face = document.createElement('canvas'); fc.width = W; fc.height = Hh; const f = fc.getContext('2d');
  f.textAlign = 'center'; f.textBaseline = 'middle';
  const dial = (cx, max, step, minor, red0, unit) => {
    const ang = v => (145 + 250 * v / max) * PI / 180;
    f.beginPath(); f.arc(cx, cy, r, 0, TAU); f.fillStyle = 'rgba(9,11,14,.66)'; f.fill(); f.lineWidth = r * 0.02; f.strokeStyle = 'rgba(255,255,255,.3)'; f.stroke();
    if (red0) { f.beginPath(); f.arc(cx, cy, r * 0.9, ang(red0), ang(max)); f.lineWidth = r * 0.075; f.strokeStyle = '#d8351c'; f.stroke(); }
    f.fillStyle = '#fff'; f.font = '600 ' + Math.round(r * 0.135) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    for (let k = 0; k <= Math.round(max / minor); k++) {
      const v = k * minor, major = k % Math.round(step / minor) === 0, a = ang(v), co = Math.cos(a), si = Math.sin(a);
      f.beginPath(); f.moveTo(cx + co * r * 0.945, cy + si * r * 0.945); f.lineTo(cx + co * r * (major ? 0.8 : 0.87), cy + si * r * (major ? 0.8 : 0.87)); f.lineWidth = r * (major ? 0.028 : 0.014); f.strokeStyle = 'rgba(255,255,255,.9)'; f.stroke();
      if (major) f.fillText(String(v), cx + co * r * 0.64, cy + si * r * 0.64);
    }
    f.fillStyle = 'rgba(255,255,255,.6)'; f.font = '600 ' + Math.round(r * 0.115) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif'; f.fillText(unit, cx, cy + r * 0.84);
  };
  dial(cx1, 200, 20, 10, 0, 'km/h'); dial(cx2, 7, 1, 0.5, 6.25, 'rpm × 1000');
  // trilha e rótulo da barra de turbo entre os dois mostradores
  const bw = Math.round(r * 0.72), bh = Math.max(6, Math.round(r * 0.13)), bx = Math.round((W - bw) * 0.5), by = Math.round(cy + r * 0.74), br = bh >> 1;
  L[35] = bx; L[36] = by; L[37] = bw; L[38] = bh; L[39] = br;
  f.fillStyle = 'rgba(255,255,255,.65)'; f.font = '600 ' + Math.round(r * 0.105) + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  f.fillText('TURBO', W * 0.5, by - Math.round(r * 0.11));
  f.beginPath(); f.roundRect(bx, by, bw, bh, br); f.fillStyle = 'rgba(9,11,14,.72)'; f.fill();
  f.lineWidth = Math.max(1, r * 0.016); f.strokeStyle = 'rgba(255,255,255,.32)'; f.stroke();
  const hb = H.hub = document.createElement('canvas'), hr = Math.round(r * 0.085); hb.width = hb.height = hr * 2; const hg = hb.getContext('2d'); hg.beginPath(); hg.arc(hr, hr, hr, 0, TAU); hg.fillStyle = '#16181b'; hg.fill(); hg.lineWidth = hr * 0.25; hg.strokeStyle = '#ff5a36'; hg.stroke();
  L[6] = hr; L[7] = Math.round(cy + r * 0.3);                                   // raio do cubo; y dos números grandes
  const g = H.g; g.setTransform(1 / 16, 0, 0, 1 / 16, 0, 0); g.lineCap = 'round'; g.lineWidth = Math.round(r * 0.034 * 16); g.strokeStyle = '#ff5a36';
  // cronômetro (m:ss.cc), medalha, delta, tira de corrida, minimapa e estatísticas
  const tw = B.w[0] * 5 + B.w[10] + B.w[11], pxB = B.h / 1.16, msz = Math.max(12, Math.round(pxB * 1.1)), mgap = Math.round(pxB * 0.35);
  const dw = Math.max(B.w[13], B.w[15]) + B.w[0] * 4 + B.w[11];
  const fw = B.w[0] * 2 + B.w[16];
  H.medals = hudMedalIcons(msz);
  H.bgT = hudStrip(H.ct, ['VOLTA', 'ÚLTIMA', 'MELHOR', 'DELTA'], [tw, tw, tw + mgap + msz, dw], ['', '', '', ''], B, pxB, 10);
  H.bgR = hudStrip(null, ['POS', 'VOLTAS', 'TEMPO', 'ÚLTIMA'], [fw, fw, tw, tw], ['', '', '', ''], B, pxB, 40, L[17]);
  L[14] = L[12] + tw + mgap; L[15] = Math.round((L[18] - msz) / 2);
  const cpPad = Math.round(pxB * 0.72), cpMid = Math.round(pxB * 0.85), cpGap = Math.max(4, Math.round(pxB * 0.28));
  const cpLblW = B.w[17] + B.w[18] + B.w[0], cpValW = Math.max(tw, dw);
  const cpW = Math.round(cpPad * 2 + cpLblW + cpMid + cpValW), cpH = Math.round(pxB * 1.58);
  const cpX = Math.round((L[17] - cpW) * 0.5), cpY = L[18] + cpGap, totalH = cpY + cpH;
  const bcp = H.bgCp = document.createElement('canvas'); bcp.width = cpW; bcp.height = cpH;
  const cg = bcp.getContext('2d');
  cg.fillStyle = 'rgba(9,11,14,.74)'; cg.beginPath(); cg.roundRect(0, 0, cpW, cpH, cpH * 0.3); cg.fill();
  cg.lineWidth = Math.max(1, Math.round(pxB * 0.07)); cg.strokeStyle = 'rgba(234,179,8,.55)'; cg.stroke();
  H.ct.height = totalH; H.ct.style.height = totalH / dpr + 'px';
  L[50] = totalH; L[51] = cpX; L[52] = cpY;
  L[53] = cpX + cpPad; L[54] = cpX + cpW - cpPad - dw; L[55] = cpX + cpW - cpPad - tw;
  L[56] = cpY + Math.round((cpH - B.h) * 0.5);
  H.bgS = hudStrip(H.cs, ['QPS', 'QUADRO', 'GPU'], [C.w[0] * 3, C.w[0] * 4 + C.w[12], C.w[0] * 4 + C.w[12]], ['', 'ms', 'ms'], C, C.h / 1.16, 20);
  if (typeof RIV !== 'undefined' && RIV.cars) {
    for (let i = 0; i < 3; i++) if (RIV.cars[i]) H.rivCol[i] = hudPaintHex(RIV.cars[i].paintIdx);
  }
  for (let k = 0; k < 64; k++) { const a = k * (TAU / 64); H.MC[k] = Math.cos(a); H.MS[k] = Math.sin(a); }
  H.bgM = hudMinimapBg(r, dpr);
  H.K.fill(-1000001);
}
// copia o caractere i do atlas para (x, y) em pixels (q = 16 no canvas dos mostradores, 1 nos outros); devolve a largura
function hudCh(g, A, i, x, y, q) { const w = A.w[i]; g.drawImage(A.c, A.x[i], 0, w, A.h, x * q, y * q, w * q, A.h * q); return w; }
// inteiro v alinhado à direita em n células, sem zeros à esquerda
function hudInt(g, A, v, n, x, y, q) { const w = A.w[0]; for (let k = n - 1; k >= 0; k--) { hudCh(g, A, v % 10, x + k * w, y, q); v = (v / 10) | 0; if (v === 0) break; } }
// fração a/b (ex: 1/4, 2/3) usando o glifo '/' no índice 16 do atlas
function hudFrac(g, A, a, b, x, y) {
  x += hudCh(g, A, clamp(a | 0, 0, 9), x, y, 1);
  x += hudCh(g, A, 16, x, y, 1);
  hudCh(g, A, clamp(b | 0, 0, 9), x, y, 1);
}
// tempo em centésimos como m:ss.cc; negativo = sem tempo (-:--.--)
function hudTime(g, A, cs, x, y) {
  if (cs > 59999) cs = 59999;
  const no = cs < 0, m = (cs / 6000) | 0, s = ((cs / 100) | 0) % 60, c = cs % 100;
  x += hudCh(g, A, no ? 13 : m, x, y, 1); x += hudCh(g, A, 10, x, y, 1); x += hudCh(g, A, no ? 13 : (s / 10) | 0, x, y, 1); x += hudCh(g, A, no ? 13 : s % 10, x, y, 1);
  x += hudCh(g, A, 11, x, y, 1); x += hudCh(g, A, no ? 13 : (c / 10) | 0, x, y, 1); hudCh(g, A, no ? 13 : c % 10, x, y, 1);
}
// valor com uma casa decimal (v10 = valor × 10) em NN,N; negativo = indisponível
function hudDec(g, A, v10, x, y) {
  const w = A.w[0]; if (v10 > 9999) v10 = 9999;
  if (v10 < 0) { hudCh(g, A, 13, x + w * 2, y, 1); hudCh(g, A, 13, x + w * 3 + A.w[12], y, 1); return; }
  hudInt(g, A, (v10 / 10) | 0, 3, x, y, 1); hudCh(g, A, 12, x + w * 3, y, 1); hudCh(g, A, v10 % 10, x + w * 3 + A.w[12], y, 1);
}
// delta em centésimos (+s.cc / -s.cc) sem alocação; cs <= -99999 = sem referência (--.--)
function hudDelta(g, cs, x, y) {
  const B = HUD.B;
  if (cs <= -99999) {
    x += B.w[0];
    x += hudCh(g, B, 13, x, y, 1); x += hudCh(g, B, 13, x, y, 1);
    x += hudCh(g, B, 11, x, y, 1);
    x += hudCh(g, B, 13, x, y, 1); hudCh(g, B, 13, x, y, 1);
    return;
  }
  if (cs > 9999) cs = 9999; else if (cs < -9999) cs = -9999;
  const A = cs <= 0 ? HUD.BG : HUD.BR, sg = cs < 0 ? 13 : 15, a = cs < 0 ? -cs : cs, sec = (a / 100) | 0, c = a % 100;
  if (sec >= 10) {
    x += hudCh(g, A, sg, x, y, 1);
    x += hudCh(g, A, (sec / 10) | 0, x, y, 1);
  } else {
    x += A.w[0];
    x += hudCh(g, A, sg, x, y, 1);
  }
  x += hudCh(g, A, sec % 10, x, y, 1);
  x += hudCh(g, A, 11, x, y, 1);
  x += hudCh(g, A, (c / 10) | 0, x, y, 1);
  hudCh(g, A, c % 10, x, y, 1);
}
// chamado a cada quadro do jogo: lê o estado (hudRead) e redesenha só o que mudou (hudDraw)
function hudFrame() { hudRead(); hudDraw(); }
function hudRead() {
  const V = HUD.V, M = HUD.M, L = HUD.L, v = VEH;
  let kmh = GS.speed * 36; if (kmh > 2000) kmh = 2000; let rpm = v.rpm; if (rpm > 7000) rpm = 7000;
  const best = LAP[2] > 0 ? Math.round(LAP[2] * 100) : -1;
  V[0] = kmh; V[1] = rpm; V[2] = v.gear;
  V[3] = LAP[3] === 1 ? (v.time - LAP[0]) * 100 : 0;
  V[4] = LAP[1] > 0 ? Math.round(LAP[1] * 100) : -1;
  V[5] = best;
  const hasGh = typeof GH !== 'undefined';
  V[6] = hasGh ? GH.deltaCs : -999999;
  V[7] = best > 0 && typeof medalOf === 'function' ? medalOf(best) : -1;
  const sc = M[2], ox = M[0], oy = M[1], mw = L[30], mh = L[31];
  V[8] = clamp(Math.round(GS.cx * sc + ox), 0, mw);
  V[9] = clamp(Math.round(GS.cz * sc + oy), 0, mh);
  V[10] = Math.round((GS.yaw / TAU) * 64) & 63;
  if (hasGh && GH.vis) {
    V[11] = 1;
    V[12] = clamp(Math.round(GH.gx * sc + ox), 0, mw);
    V[13] = clamp(Math.round(GH.gz * sc + oy), 0, mh);
  } else {
    V[11] = 0; V[12] = -1; V[13] = -1;
  }
  V[14] = v.boost !== undefined ? clamp(Math.round(v.boost * 100), 0, 100) : 100;
  V[15] = v.boosting ? 1 : 0;
  const raceOn = typeof GS !== 'undefined' && !!GS.raceMode && typeof RIV !== 'undefined' && !!RIV.active && !GS.replayOn && !GS.poseOn;
  V[16] = raceOn ? 1 : 0;
  if (raceOn) {
    for (let i = 0; i < 3; i++) {
      const rv = RIV.cars[i];
      V[17 + i * 2] = rv ? clamp(Math.round(rv.x * sc + ox), 0, mw) : -1;
      V[18 + i * 2] = rv ? clamp(Math.round(rv.z * sc + oy), 0, mh) : -1;
    }
    V[23] = clamp(RIV.playerRank | 0, 1, 4);
    V[24] = clamp(RIV.playerLap | 0, 1, typeof RACE_LAPS !== 'undefined' ? RACE_LAPS : 3);
  } else {
    V[17] = V[18] = V[19] = V[20] = V[21] = V[22] = -1;
    V[23] = 0; V[24] = 0;
  }
  const cpNone = typeof GH_NONE !== 'undefined' ? GH_NONE : -999999;
  const cpOn = hasGh && GH.cpFlashTicks > 0 && (GH.cpFlashIdx === 1 || GH.cpFlashIdx === 2) ? GH.cpFlashIdx : 0;
  V[25] = cpOn;
  V[26] = cpOn && GH.cpFlashTimeCs !== undefined ? (GH.cpFlashTimeCs | 0) : 0;
  V[27] = cpOn && GH.cpFlashDeltaCs !== undefined ? (GH.cpFlashDeltaCs | 0) : cpNone;
}
function hudDraw() {
  const H = HUD, L = H.L, K = H.K, V = H.V, an = V[0], ki = ((an + 5) / 10) | 0, ar = (V[1] / 10) | 0, gear = V[2];
  const boost = V[14], boosting = V[15];
  if (ki !== K[0] || an !== K[1] || ar !== K[2] || gear !== K[3] || boost !== K[15] || boosting !== K[16]) {
    K[0] = ki; K[1] = an; K[2] = ar; K[3] = gear; K[15] = boost; K[16] = boosting;
    const g = H.g, A = H.A, r = L[3], cy = L[1], w = A.w[0];
    g.clearRect(0, 0, L[4] * 16, L[5] * 16); g.drawImage(H.face, 0, 0, L[4] * 16, L[5] * 16);
    hudInt(g, A, ki, 3, L[0] - ((w * 3) >> 1), L[7], 16); hudCh(g, A, gear === 0 ? 14 : gear, L[2] - (A.w[gear === 0 ? 14 : gear] >> 1), L[7], 16);
    if (boost > 0) {
      const fw = Math.max(2, Math.round(L[37] * boost / 100));
      const br = Math.min(L[39], fw >> 1);
      g.fillStyle = boosting ? '#4be3ff' : '#ff5a36';
      g.beginPath(); g.roundRect(L[35] * 16, L[36] * 16, fw * 16, L[38] * 16, br * 16); g.fill();
    }
    g.beginPath();
    for (let d = 0; d < 2; d++) {
      const a = (145 + (d ? ar * (250 / 700) : an * (250 / 2000))) * 0.017453292519943295, co = Math.cos(a), si = Math.sin(a), cx = L[d * 2] * 16, cY = cy * 16, len = r * 16;
      g.moveTo((cx - co * len * 0.16) | 0, (cY - si * len * 0.16) | 0); g.lineTo((cx + co * len * 0.86) | 0, (cY + si * len * 0.86) | 0);
    }
    g.stroke();
    const hr = L[6]; g.drawImage(H.hub, (L[0] - hr) * 16, (cy - hr) * 16, hr * 32, hr * 32); g.drawImage(H.hub, (L[2] - hr) * 16, (cy - hr) * 16, hr * 32, hr * 32);
  }
  const cur = V[3], last = V[4], best = V[5], delta = V[6], med = V[7];
  const ra = V[16], rank = V[23], rlap = V[24];
  const cpOn = V[25], cpTime = V[26], cpDelta = V[27];
  if (cur !== K[4] || last !== K[5] || best !== K[6] || delta !== K[7] || med !== K[8] || ra !== K[24] ||
      (ra === 1 && (rank !== K[25] || rlap !== K[26])) || cpOn !== K[27] || cpTime !== K[28] || cpDelta !== K[29]) {
    K[4] = cur; K[5] = last; K[6] = best; K[7] = delta; K[8] = med; K[24] = ra;
    K[27] = cpOn; K[28] = cpTime; K[29] = cpDelta;
    const t = H.t, B = H.B;
    t.clearRect(0, 0, L[17], L[50]);
    if (ra === 1) {
      K[25] = rank; K[26] = rlap;
      const y = L[46];
      t.drawImage(H.bgR, 0, 0);
      hudFrac(t, B, rank, 4, L[40], y);
      hudFrac(t, B, rlap, typeof RACE_LAPS !== 'undefined' ? RACE_LAPS : 3, L[41], y);
      hudTime(t, B, cur, L[42], y);
      hudTime(t, B, last, L[43], y);
    } else {
      const y = L[16];
      t.drawImage(H.bgT, 0, 0); hudTime(t, B, cur, L[10], y); hudTime(t, B, last, L[11], y); hudTime(t, B, best, L[12], y);
      if (med >= 0 && med < 4) t.drawImage(H.medals[med], L[14], L[15]);
      hudDelta(t, delta, L[13], y);
    }
    if (cpOn > 0) {
      t.drawImage(H.bgCp, L[51], L[52]);
      const cy = L[56], cpNone = typeof GH_NONE !== 'undefined' ? GH_NONE : -999999;
      let cx = L[53];
      cx += hudCh(t, B, 17, cx, cy, 1);
      cx += hudCh(t, B, 18, cx, cy, 1);
      hudCh(t, B, cpOn === 2 ? 2 : 1, cx, cy, 1);
      if (cpDelta !== cpNone) hudDelta(t, cpDelta, L[54], cy);
      else hudTime(t, B, cpTime, L[55], cy);
    }
  }
  const px = V[8], py = V[9], pa = V[10], gv = V[11], gx = V[12], gy = V[13];
  if (px !== K[9] || py !== K[10] || pa !== K[11] || gv !== K[12] || gx !== K[13] || gy !== K[14] ||
      ra !== K[17] || V[17] !== K[18] || V[18] !== K[19] || V[19] !== K[20] || V[20] !== K[21] || V[21] !== K[22] || V[22] !== K[23]) {
    K[9] = px; K[10] = py; K[11] = pa; K[12] = gv; K[13] = gx; K[14] = gy;
    K[17] = ra; K[18] = V[17]; K[19] = V[18]; K[20] = V[19]; K[21] = V[20]; K[22] = V[21]; K[23] = V[22];
    const m = H.m;
    if (m) {
      m.clearRect(0, 0, L[30], L[31]); m.drawImage(H.bgM, 0, 0);
      if (gv === 1) {
        m.beginPath(); m.arc(gx, gy, L[32], 0, TAU);
        m.fillStyle = '#4be3ff'; m.fill();
        m.lineWidth = L[34]; m.strokeStyle = '#07222b'; m.stroke();
      }
      if (ra === 1) {
        for (let i = 0; i < 3; i++) {
          const rx = V[17 + i * 2], ry = V[18 + i * 2];
          if (rx >= 0) {
            m.beginPath(); m.arc(rx, ry, L[32], 0, TAU);
            m.fillStyle = H.rivCol[i]; m.fill();
            m.lineWidth = L[34]; m.strokeStyle = '#090b0e'; m.stroke();
          }
        }
      }
      const ar = L[33], co = H.MC[pa], si = H.MS[pa];
      m.beginPath();
      m.moveTo(px + Math.round(co * ar), py + Math.round(si * ar));
      m.lineTo(px + Math.round((-co * 0.75 + si * 0.65) * ar), py + Math.round((-si * 0.75 - co * 0.65) * ar));
      m.lineTo(px + Math.round(-co * 0.35 * ar), py + Math.round(-si * 0.35 * ar));
      m.lineTo(px + Math.round((-co * 0.75 - si * 0.65) * ar), py + Math.round((-si * 0.75 + co * 0.65) * ar));
      m.closePath();
      m.fillStyle = '#ff5a36'; m.fill();
      m.lineWidth = L[34]; m.strokeStyle = '#ffffff'; m.stroke();
    }
  }
}
// estatísticas de desempenho (tecla H): média de meio segundo de quadros; RT[3] = intervalo do último quadro (ms)
function hudStatsFrame() {
  const H = HUD, a = H.acc; a[0] += RT[3]; a[1]++;
  if (a[0] < 500) return;
  const L = H.L, s = H.s, C = H.C, y = L[26], fps = (a[1] * 1000 / a[0] + 0.5) | 0, ms = (a[0] / a[1] * 10 + 0.5) | 0, gpu = PERF.on && PERF.live[0] > 0 ? (PERF.live[0] * 10 + 0.5) | 0 : -1;
  a[0] = 0; a[1] = 0;
  s.clearRect(0, 0, L[27], L[28]); s.drawImage(H.bgS, 0, 0); hudInt(s, C, fps > 999 ? 999 : fps, 3, L[20], y, 1); hudDec(s, C, ms, L[21], y); hudDec(s, C, gpu, L[22], y);
}
function hudShow(on) { HUD.vis = on; const d = on ? 'block' : 'none'; HUD.cg.style.display = HUD.ct.style.display = d; if (HUD.cm) HUD.cm.style.display = d; HUD.K.fill(-1000001); }
function hudStats(on) { HUD.stats = on; HUD.cs.style.display = on ? 'block' : 'none'; HUD.acc[0] = 0; HUD.acc[1] = 0; if (on) { const L = HUD.L; HUD.s.clearRect(0, 0, L[27], L[28]); HUD.s.drawImage(HUD.bgS, 0, 0); } }
