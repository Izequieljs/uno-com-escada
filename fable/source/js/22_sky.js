// Geração única das texturas de ruído e do céu; cor do sol; harmônicos esféricos do ambiente.
const SUN_EL = 17 * PI / 180, SUN_AZ = 180.5 * PI / 180;
const ENV = {
  idx: 0,
  wet: 0,
  grip: 1,
  presets: [
    { nome: 'Sol (Manhã)', el: SUN_EL, az: SUN_AZ, colEl: 14.5 * PI / 180, colMul: 1.5, turb: 0.57, fog: [0.0008, 1 / 55, 0, 0.05], exposure: 1, wet: 0, grip: 1.0 },
    { nome: 'Pôr do Sol', el: 5.5 * PI / 180, az: 212 * PI / 180, colEl: 5.0 * PI / 180, colMul: 1.85, turb: 0.72, fog: [0.0011, 1 / 50, 0, 0.065], exposure: 1.08, wet: 0, grip: 1.0 },
    { nome: 'Pista Molhada', el: 11.5 * PI / 180, az: 192 * PI / 180, colEl: 11.5 * PI / 180, colMul: 0.95, turb: 0.88, fog: [0.0016, 1 / 45, 0, 0.08], exposure: 1.05, wet: 0.92, grip: 0.84 },
  ],
};
let SKY_PIPE = null, SKY_UB = null, SKY_BG = null;
let _envBusy = null, _envNext = null;
const _skyU = new Float32Array(8);
function atmSunColor(dirY) {
  // mesma atmosfera do shader (atmos.wgsl): transmitância do sol até o chão
  const RP = 6360e3, RA = 6440e3, o = RP + 40, n = 32;
  const b = o * dirY, cc = o * o - RA * RA, t = -b + Math.sqrt(b * b - cc), dt = t / n; let oR = 0, oM = 0, oO = 0;
  for (let i = 0; i < n; i++) { const s = (i + 0.5) * dt, h = Math.sqrt(o * o + s * s + 2 * o * s * dirY) - RP; oR += Math.exp(-h / 8000) * dt; oM += Math.exp(-h / 1300) * dt; oO += Math.max(0, 1 - Math.abs(h - 25000) / 15000) * dt; }
  const BR = [5.8e-6, 13.6e-6, 33.1e-6], BO = [0.65e-6, 1.881e-6, 0.085e-6], BM = 26e-6 * 1.11;
  return [0, 1, 2].map(i => 22 * Math.exp(-(BR[i] * oR + BM * oM + BO[i] * oO)));
}
function envSyncCpu(idx, opts) {
  const n = ENV.presets.length, i = ((idx | 0) % n + n) % n, p = ENV.presets[i];
  ENV.idx = i; ENV.wet = p.wet; ENV.grip = p.grip;
  R.sun[0] = Math.cos(p.el) * Math.cos(p.az); R.sun[1] = Math.sin(p.el); R.sun[2] = Math.cos(p.el) * Math.sin(p.az);
  // cor do sol: transmitância da atmosfera com ganho artístico
  const sc = atmSunColor(Math.sin(p.colEl)); R.sunCol[0] = sc[0] * p.colMul; R.sunCol[1] = sc[1] * p.colMul; R.sunCol[2] = sc[2] * p.colMul;
  R.fog[0] = p.fog[0]; R.fog[1] = p.fog[1]; R.fog[2] = p.fog[2]; R.fog[3] = p.fog[3];
  R.exposure = p.exposure;
  if (typeof GS !== 'undefined' && (!opts || !opts.keepLights)) GS.lightsOn = i > 0;
  return i;
}
async function skyBake(progress) {
  const dev = G.dev, skyView = R.view.sky, strips = 16;
  for (let i = 0; i < strips; i++) {
    const enc = dev.createCommandEncoder();
    const p = enc.beginRenderPass({ colorAttachments: [{ view: skyView, loadOp: i ? 'load' : 'clear', storeOp: 'store' }] });
    p.setPipeline(SKY_PIPE); p.setBindGroup(0, SKY_BG); p.setScissorRect(i * SKY_W / strips, 0, SKY_W / strips, SKY_H); p.draw(3); p.end();
    dev.queue.submit([enc.finish()]);
    await dev.queue.onSubmittedWorkDone(); if (progress) progress(i / strips);
  }
}
async function skyInit(progress) {
  const dev = G.dev, T = R.tex, V = R.view;
  const idx = envSyncCpu(ENV.idx, { keepLights: true });
  // ruído
  const nb = mkPost('noisebake', {}, ['rgba8unorm']);
  const ub = mkBuf(65 * 256, BU.U), ud = new Float32Array(65 * 64);
  for (let z = 0; z < 64; z++) { ud[z * 64] = (z + 0.5) / 64; ud[z * 64 + 1] = 0; } ud[64 * 64 + 1] = 1;
  dev.queue.writeBuffer(ub, 0, ud);
  const nbp = nb, nbg = dev.createBindGroup({ layout: nb.bgls[0], entries: [{ binding: 0, resource: { buffer: ub, size: 16 } }] });
  let enc = dev.createCommandEncoder();
  { const p = enc.beginRenderPass({ colorAttachments: [{ view: T.noise.createView({ baseMipLevel: 0, mipLevelCount: 1 }), loadOp: 'clear', storeOp: 'store' }] }); p.setPipeline(nbp); p.setBindGroup(0, nbg, [64 * 256]); p.draw(3); p.end(); }
  for (let z = 0; z < 64; z++) { const p = enc.beginRenderPass({ colorAttachments: [{ view: V.noise3, depthSlice: z, loadOp: 'clear', storeOp: 'store' }] }); p.setPipeline(nbp); p.setBindGroup(0, nbg, [z * 256]); p.draw(3); p.end(); }
  dev.queue.submit([enc.finish()]);
  genMips(T.noise, 'rgba8unorm');
  // céu, em faixas (para não travar a GPU num único comando longo)
  SKY_PIPE = mkPost('skybake', {}, ['rgba16float']);
  _skyU[0] = R.sun[0]; _skyU[1] = R.sun[1]; _skyU[2] = R.sun[2]; _skyU[3] = 0;
  _skyU[4] = ENV.presets[idx].turb; _skyU[5] = 0; _skyU[6] = 0; _skyU[7] = 0;
  SKY_UB = mkBuf(32, BU.U, _skyU);
  SKY_BG = bgOf(SKY_PIPE, 0, [SKY_UB, V.noise3, V.noise, R.sLin]);
  await skyBake(progress);
}
async function envDrain() {
  let last = ENV.idx;
  try {
    while (_envNext !== null) {
      const i = _envNext;
      _envNext = null;
      last = i;
      _skyU[0] = R.sun[0]; _skyU[1] = R.sun[1]; _skyU[2] = R.sun[2]; _skyU[3] = 0;
      _skyU[4] = ENV.presets[i].turb; _skyU[5] = 0; _skyU[6] = 0; _skyU[7] = 0;
      G.dev.queue.writeBuffer(SKY_UB, 0, _skyU);
      await skyBake();
      if (_envNext !== null) continue;
      if (typeof renderStaticShadow === 'function') renderStaticShadow();
      if (typeof renderFrame === 'function') for (let k = 0; k < 3; k++) renderFrame();
      if (typeof computeSH === 'function') await computeSH();
      if (_envNext !== null) continue;
      if (typeof renderFrame === 'function') for (let k = 0; k < 3; k++) renderFrame();
    }
  } finally {
    _envBusy = null;
  }
  return last;
}
async function envApply(idx, opts) {
  const i = envSyncCpu(idx, opts);
  if (typeof G !== 'undefined' && G.dev && SKY_PIPE && SKY_UB && SKY_BG) {
    _envNext = i;
    if (!_envBusy) _envBusy = envDrain();
    return _envBusy;
  }
  return i;
}
function halfToFloat(h) { const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 31, f = h & 1023; if (e === 0) return s * Math.pow(2, -14) * (f / 1024); if (e === 31) return f ? NaN : s * Infinity; return s * Math.pow(2, e - 15) * (1 + f / 1024); }
// lê um mip do cubemap de ambiente e projeta em SH de ordem 2 (irradiância/π)
async function computeSH() {
  const dev = G.dev, mip = 3, n = ENV_RES >> mip, bpr = Math.ceil(n * 8 / 256) * 256;
  const buf = dev.createBuffer({ size: bpr * n * 6, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const enc = dev.createCommandEncoder();
  for (let f = 0; f < 6; f++) enc.copyTextureToBuffer({ texture: R.tex.env, mipLevel: mip, origin: [0, 0, f] }, { buffer: buf, offset: f * bpr * n, bytesPerRow: bpr, rowsPerImage: n }, [n, n, 1]);
  dev.queue.submit([enc.finish()]); await buf.mapAsync(GPUMapMode.READ);
  const u16 = new Uint16Array(buf.getMappedRange()), sh = new Float64Array(27); let wsum = 0;
  const AX = [[0, 0, -1, 0, -1, 0, 1, 0, 0], [0, 0, 1, 0, -1, 0, -1, 0, 0], [1, 0, 0, 0, 0, 1, 0, 1, 0], [1, 0, 0, 0, 0, -1, 0, -1, 0], [1, 0, 0, 0, -1, 0, 0, 0, 1], [-1, 0, 0, 0, -1, 0, 0, 0, -1]];
  for (let f = 0; f < 6; f++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const qx = (x + 0.5) / n * 2 - 1, qy = (y + 0.5) / n * 2 - 1, a = AX[f];
    let dx = a[6] + a[0] * qx + a[3] * qy, dy = a[7] + a[1] * qx + a[4] * qy, dz = a[8] + a[2] * qx + a[5] * qy; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    const w = 1 / (l * l * l); wsum += w; const o = (f * bpr * n + y * bpr) / 2 + x * 4;
    const Y = [0.282095, 0.488603 * dy, 0.488603 * dz, 0.488603 * dx, 1.092548 * dx * dy, 1.092548 * dy * dz, 0.315392 * (3 * dz * dz - 1), 1.092548 * dx * dz, 0.546274 * (dx * dx - dy * dy)];
    for (let c = 0; c < 3; c++) { const v = Math.min(halfToFloat(u16[o + c]), 50) * w; for (let k = 0; k < 9; k++) sh[k * 3 + c] += v * Y[k]; }
  }
  buf.unmap(); buf.destroy();
  const K = [0.282095, 0.488603 * 2 / 3, 0.488603 * 2 / 3, 0.488603 * 2 / 3, 1.092548 / 4, 1.092548 / 4, 0.315392 / 4, 1.092548 / 4, 0.546274 / 4], nrm = 4 * PI / wsum;
  for (let k = 0; k < 9; k++) for (let c = 0; c < 3; c++) FR.data[FR.o.sh + k * 4 + c] = sh[k * 3 + c] * nrm * K[k];
}
