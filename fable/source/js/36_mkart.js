// Mini-Bólido estilo Mario Kart Realista em Meia Escala (~2,02 m):
// monoposto com bico esculpido, splitter dianteiro, emblemas 'M' / '1', defletor fumê,
// pods laterais com tomadas de ar, chassi tubular exposto, suspensão double-wishbone c/ molas nos 4 cubos,
// motor traseiro em alumínio aletado, santo-antônio cromado, lanterna central de chuva LED,
// dois escapamentos cônicos inclinados para cima, pneus slick largos + aros 5 raios e piloto centralizado.
const MK = {
  AXF: 0.62, AXR: -0.62, WR: 0.185,
  TF: 0.90, TR: 0.94,
};
const _muv = [0, 0];

function mkNoseTopY(x) {
  const t = sat((1.02 - x) / 0.86);
  return 0.205 + 0.335 * smooth(0.0, 0.92, t) + 0.032 * Math.sin(t * PI);
}
function mkNoseBotY(x) {
  const t = sat((1.02 - x) / 0.86);
  return 0.108 + 0.012 * smooth(0.0, 0.5, t);
}
function mkNoseHalfW(x) {
  const t = sat((1.02 - x) / 0.86);
  const waist = -0.022 * Math.sin(sat((t - 0.15) / 0.55) * PI);
  return 0.140 + 0.105 * smooth(0.42, 1.0, t) + waist;
}

function mkCoilover(mb, x0, y0, z0, x1, y1, z1) {
  let dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  const len = Math.hypot(dx, dy, dz) || 1;
  dx /= len; dy /= len; dz /= len;
  // base ortonormal com +Y_local = direção do amortecedor e det = +1
  let rx = dy * 0 - dz * 0, ry = dz * 1 - dx * 0, rz = dx * 0 - dy * 1;
  if (Math.hypot(rx, ry, rz) < 0.2) { rx = dy * 1 - dz * 0; ry = dz * 0 - dx * 1; rz = 0; }
  const rl = 1 / (Math.hypot(rx, ry, rz) || 1); rx *= rl; ry *= rl; rz *= rl;
  const zx = ry * dz - rz * dy, zy = rz * dx - rx * dz, zz = rx * dy - ry * dx;
  const B = m4basis(m4(), rx, ry, rz, dx, dy, dz, zx, zy, zz, x0, y0, z0);
  mb.push(B);
  mb.mat(CM.CHROME).color(0.86, 0.88, 0.92);
  mb.cyl(0, 0.0, 0, 0.007, len, 0.007, 8, true, true);
  mb.mat(CM.ALU, 1).color(0.62, 0.65, 0.70);
  mb.cyl(0, 0.015, 0, 0.013, len * 0.56, 0.013, 10, true, true);
  mb.cyl(0, len * 0.14, 0, 0.019, len * 0.17, 0.019, 10, true, true);
  mb.cyl(0, len * 0.80, 0, 0.018, len * 0.83, 0.018, 10, true, true);
  // mola helicoidal vermelha real
  const coil = [];
  const turns = 5.5, steps = 36, rC = 0.0175, yA = len * 0.17, yB = len * 0.80;
  for (let k = 0; k <= steps; k++) {
    const f = k / steps, a = f * turns * TAU;
    coil.push([Math.cos(a) * rC, lerp(yA, yB, f), Math.sin(a) * rC]);
  }
  mb.mat(CM.STRAP).color(0.84, 0.12, 0.08);
  mb.tube(coil, 0.0038, 6);
  mb.pop();
}

function mkartBuildBody(mb, gl) {
  const v0 = mb.nv, i0 = mb.ni;

  // ---------------- 1. Bico carenado esculpido + carenagem do cockpit (metade direita Z >= 0) ----------------
  const noseUV = (u, v, P) => {
    const x = P[0];
    _muv[0] = v > 0.24 ? Math.abs(x - 0.56) : 1.0; // fenda realista do bico destacável
    _muv[1] = v;
    return _muv;
  };
  mb.mat(CM.PAINT).color(1, 1, 1);
  const noseSec = (x, v, o) => {
    const yt = mkNoseTopY(x), yb = mkNoseBotY(x), hw = mkNoseHalfW(x);
    let y, z;
    if (v < 0.22) {
      const f = v / 0.22;
      z = hw * lerp(0.82, 1.0, f);
      y = lerp(yb, yb + (yt - yb) * 0.24, f);
    } else {
      const f = (v - 0.22) / 0.78;
      const th = f * PI * 0.5;
      z = hw * Math.pow(Math.cos(th), 0.78);
      y = lerp(yb + (yt - yb) * 0.24, yt, Math.pow(Math.sin(th), 0.72));
    }
    o[0] = x; o[1] = y; o[2] = z;
  };
  mb.patch((u, v, o) => noseSec(lerp(1.02, 0.16, u), v, o), 0, 1, 0, 1, { nu: 44, nv: 22, flip: true, uv: noseUV });

  // Ponta frontal arredondada do bico fechando exatamente a seção de x = 1.02
  {
    const x0 = 1.02, yt = mkNoseTopY(x0), yb = mkNoseBotY(x0), ym = (yb + yt) * 0.5;
    const rim = [0, 0, 0];
    mb.patch((u, v, o) => {
      noseSec(x0, v, rim);
      const yCtr = ym + 0.008 * (2 * v - 1);
      o[0] = x0 + 0.018 * Math.cos(u * PI * 0.5);
      o[1] = lerp(yCtr, rim[1], u);
      o[2] = rim[2] * u;
    }, 0, 1, 0, 1, { nu: 10, nv: 22, flip: true, uv: () => { _muv[0] = 1; _muv[1] = 0.5; return _muv; } });
  }

  // Parede interna do cockpit sob o bico (para não enxergar vão oco pelos pés)
  mb.mat(CM.UNDER).color(0.018, 0.018, 0.020);
  mb.quad(0.16, 0.115, 0, 0.16, 0.115, 0.245, 0.16, 0.535, 0.01, 0.16, 0.54, 0);

  // ---------------- 2. Pods laterais aerodinâmicos + tomadas de ar ----------------
  const podUV = (u, v, P) => {
    _muv[0] = (v > 0.1 && v < 0.85) ? Math.abs(P[0] + 0.08) : 1.0;
    _muv[1] = v;
    return _muv;
  };
  const podPt = (u, v, out) => {
    const x = lerp(0.24, -0.36, u);
    const bulge = 1.0 - 0.12 * Math.pow(2 * u - 1, 2);
    const zIn = 0.225, zOut = 0.225 + 0.210 * bulge;
    const yBot = 0.112, yTop = 0.355 - 0.018 * u;
    if (v < 0.38) {
      const f = v / 0.38;
      out[1] = lerp(yTop, yTop - 0.045, f * f);
      out[2] = lerp(zIn, zOut - 0.01, smooth(0, 1, f));
    } else if (v < 0.72) {
      const f = (v - 0.38) / 0.34;
      out[1] = lerp(yTop - 0.045, yBot + 0.028, f);
      out[2] = zOut - 0.01 + 0.012 * Math.sin(f * PI) - 0.025 * f * f;
    } else {
      const f = (v - 0.72) / 0.28;
      out[1] = lerp(yBot + 0.028, yBot, f);
      out[2] = lerp(zOut - 0.023, zIn, f);
    }
    out[0] = x;
  };
  mb.mat(CM.PAINT).color(1, 1, 1);
  mb.patch(podPt, 0, 1, 0, 1, { nu: 24, nv: 18, flip: false, uv: podUV });

  // Moldura preta e grade da tomada de ar dianteira do pod (x = 0.24, normal +X)
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.024);
  mb.quad(0.242, 0.135, 0.245, 0.242, 0.135, 0.395, 0.242, 0.335, 0.380, 0.242, 0.335, 0.245);
  mb.mat(CM.GRILLE, 1).color(0.012, 0.012, 0.014);
  mb.quad(0.245, 0.155, 0.262, 0.245, 0.155, 0.378, 0.245, 0.315, 0.365, 0.245, 0.315, 0.262);
  // Extrator traseiro do pod (x = -0.36, normal -X)
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.024);
  mb.quad(-0.362, 0.132, 0.385, -0.362, 0.132, 0.235, -0.362, 0.320, 0.235, -0.362, 0.320, 0.375);
  mb.mat(CM.GRILLE, 1).color(0.012, 0.012, 0.014);
  mb.quad(-0.365, 0.152, 0.368, -0.365, 0.152, 0.252, -0.365, 0.302, 0.252, -0.365, 0.302, 0.358);

  // ---------------- 3. Carenagem traseira e ombros do cockpit ----------------
  mb.mat(CM.PAINT).color(1, 1, 1);
  mb.patch((u, v, o) => {
    const x = lerp(-0.22, -0.82, u);
    const zIn = lerp(0.225, 0.175, u), zOut = lerp(0.32, 0.24, u);
    const yTop = lerp(0.395, 0.285, u), yBot = 0.135;
    if (v < 0.45) {
      const f = v / 0.45;
      o[1] = lerp(yTop, yTop - 0.035, f * f);
      o[2] = lerp(zIn, zOut, f);
    } else {
      const f = (v - 0.45) / 0.55;
      o[1] = lerp(yTop - 0.035, yBot, f);
      o[2] = lerp(zOut, zOut - 0.025, f);
    }
    o[0] = x;
  }, 0, 1, 0, 1, { nu: 20, nv: 14, flip: false, uv: () => { _muv[0] = 1; _muv[1] = 0.5; return _muv; } });
  // Fechamento traseiro da carenagem lateral
  mb.quad(-0.82, 0.135, 0.215, -0.82, 0.135, 0.175, -0.82, 0.285, 0.175, -0.82, 0.250, 0.240);

  // ---------------- 4. Splitter dianteiro + winglets + assoalho plano ----------------
  mb.mat(CM.PLASTIC).color(0.022, 0.022, 0.025);
  mb.patch((u, v, o) => {
    const z = u * 0.375;
    const xLead = 1.04 - 0.08 * Math.pow(u, 1.8);
    const x = lerp(xLead, 0.87, v);
    o[0] = x; o[1] = 0.106; o[2] = z;
  }, 0, 1, 0, 1, { nu: 14, nv: 4, flip: false });
  mb.patch((u, v, o) => {
    const z = u * 0.375;
    const xLead = 1.04 - 0.08 * Math.pow(u, 1.8);
    const x = lerp(xLead, 0.87, v);
    o[0] = x; o[1] = 0.086; o[2] = z;
  }, 0, 1, 0, 1, { nu: 14, nv: 4, flip: true });
  // Borda dianteira arredondada da asa/splitter
  mb.patch((u, v, o) => {
    const z = u * 0.375;
    const xLead = 1.04 - 0.08 * Math.pow(u, 1.8);
    o[0] = xLead; o[1] = lerp(0.086, 0.106, v); o[2] = z;
  }, 0, 1, 0, 1, { nu: 14, nv: 2, flip: false });
  // Endplates laterais da asa dianteira + pilares de sustentação do bico
  mb.rbox(0.925, 0.132, 0.375, 0.135, 0.095, 0.014, 0.004, 1);
  mb.box(0.955, 0.125, 0.085, 0.080, 0.045, 0.014);

  // Assoalho plano escuro (recortado longe das 4 rodas!)
  mb.mat(CM.UNDER).color(0.014, 0.014, 0.016);
  mb.box(0.55, 0.092, 0.10, 0.72, 0.024, 0.20);   // sob o bico (|z| <= 0.20, bem livre das rodas dianteiras)
  mb.box(-0.06, 0.092, 0.20, 0.62, 0.024, 0.40);  // centro/sob pods (x = -0.37..+0.25, |z| <= 0.40)
  mb.box(-0.62, 0.092, 0.14, 0.52, 0.024, 0.28);  // traseiro entre rodas (x = -0.88..-0.36, |z| <= 0.28)

  // ---------------- 5. Estrutura tubular aparente em aço grafite ----------------
  mb.mat(CM.STEEL).color(0.14, 0.15, 0.17);
  mb.tube([[0.74, 0.135, 0.155], [0.46, 0.135, 0.165], [0.24, 0.130, 0.235], [0.22, 0.130, 0.432], [-0.36, 0.130, 0.432], [-0.42, 0.145, 0.255], [-0.88, 0.165, 0.225]], 0.016, 8);
  mb.tube([[0.22, 0.365, 0.232], [0.02, 0.370, 0.232], [-0.24, 0.380, 0.225]], 0.014, 8); // longarina superior do cockpit
  mb.tube([[0.72, 0.245, 0.145], [0.46, 0.245, 0.155], [0.24, 0.355, 0.225]], 0.013, 8); // barra superior dianteira
  mb.tube([[-0.48, 0.150, 0.235], [-0.48, 0.330, 0.210], [-0.84, 0.310, 0.205], [-0.88, 0.165, 0.225]], 0.014, 8, { up: [1, 0, 0] }); // berço traseiro do motor
  // Ponteira traseira de proteção (bumper tubular lateral)
  mb.tube([[-0.88, 0.165, 0.225], [-0.94, 0.175, 0.16], [-0.94, 0.175, 0.0]], 0.015, 8);

  // ---------------- 6. Braços duplos de suspensão + amortecedores c/ molas ----------------
  // Dianteira (hub em [0.62, 0.185, 0.45], porta-manga interno em z = 0.355)
  mb.mat(CM.STEEL).color(0.16, 0.17, 0.19);
  mb.rbox(0.62, 0.185, 0.355, 0.070, 0.084, 0.032, 0.008, 2); // porta-manga
  mb.tube([[0.71, 0.135, 0.155], [0.62, 0.152, 0.355]], 0.010, 7);
  mb.tube([[0.50, 0.135, 0.165], [0.62, 0.152, 0.355]], 0.010, 7);
  mb.tube([[0.69, 0.238, 0.145], [0.62, 0.218, 0.355]], 0.0085, 7);
  mb.tube([[0.51, 0.238, 0.155], [0.62, 0.218, 0.355]], 0.0085, 7);
  mb.mat(CM.CHROME).color(0.84, 0.86, 0.90);
  mb.tube([[0.56, 0.175, 0.125], [0.57, 0.175, 0.355]], 0.0065, 6); // barra de direção
  mb.mat(CM.ALU, 1).color(0.56, 0.58, 0.62);
  mb.push(m4translate(m4(), 0.62, 0.185, 0.370)); mb.push(m4rotX(m4(), PI / 2));
  mb.cyl(0, -0.006, 0, 0.072, 0.006, 0.072, 18, true, true); // disco de freio dianteiro
  mb.pop(); mb.pop();
  mb.mat(CM.STRAP).color(0.84, 0.12, 0.08);
  mb.rbox(0.662, 0.205, 0.366, 0.032, 0.048, 0.024, 0.005, 1); // pinça de freio dianteira
  mkCoilover(mb, 0.60, 0.315, 0.160, 0.62, 0.168, 0.340);

  // Traseira (hub em [-0.62, 0.185, 0.47], porta-manga interno em z = 0.375)
  mb.mat(CM.STEEL).color(0.16, 0.17, 0.19);
  mb.rbox(-0.62, 0.185, 0.375, 0.074, 0.086, 0.034, 0.008, 2); // porta-manga traseiro
  mb.tube([[-0.62, 0.190, 0.11], [-0.62, 0.185, 0.382]], 0.013, 8); // semi-eixo de transmissão
  mb.tube([[-0.49, 0.140, 0.215], [-0.62, 0.152, 0.375]], 0.0105, 7);
  mb.tube([[-0.74, 0.140, 0.215], [-0.62, 0.152, 0.375]], 0.0105, 7);
  mb.tube([[-0.51, 0.242, 0.205], [-0.62, 0.218, 0.375]], 0.009, 7);
  mb.tube([[-0.73, 0.242, 0.205], [-0.62, 0.218, 0.375]], 0.009, 7);
  mb.mat(CM.ALU, 1).color(0.56, 0.58, 0.62);
  mb.push(m4translate(m4(), -0.62, 0.185, 0.390)); mb.push(m4rotX(m4(), PI / 2));
  mb.cyl(0, -0.006, 0, 0.076, 0.006, 0.076, 18, true, true); // disco de freio traseiro
  mb.pop(); mb.pop();
  mb.mat(CM.STRAP).color(0.84, 0.12, 0.08);
  mb.rbox(-0.578, 0.205, 0.386, 0.034, 0.050, 0.025, 0.005, 1); // pinça traseira
  mkCoilover(mb, -0.60, 0.330, 0.210, -0.62, 0.168, 0.360);

  // ---------------- 7. Santo-antônio cromado (metade direita) + escapamento ----------------
  mb.mat(CM.CHROME).color(0.90, 0.92, 0.95);
  mb.tube([[-0.34, 0.33, 0.17], [-0.36, 0.55, 0.15], [-0.37, 0.64, 0.08], [-0.37, 0.66, 0.0]], 0.017, 10, { up: [1, 0, 0] });
  mb.tube([[-0.36, 0.60, 0.11], [-0.60, 0.35, 0.14]], 0.013, 8);

  // Coletor e megafone cônico cromado inclinado ~25° para cima com bocal em (-0.98, 0.40, ±0.21)
  mb.mat(CM.STEEL, 1).color(0.18, 0.19, 0.21);
  mb.tube([[-0.56, 0.31, 0.115], [-0.69, 0.28, 0.175], [-0.79, 0.31, 0.21]], 0.018, 10);
  {
    const dl = Math.hypot(-0.90, 0.42), ux = -0.90 / dl, uy = 0.42 / dl;
    const BE = m4basis(m4(), ux, uy, 0, -uy, ux, 0, 0, 0, 1, -0.98, 0.40, 0.21);
    mb.push(BE);
    mb.mat(CM.CHROME, 1).color(0.88, 0.90, 0.94);
    mb.lathe([[-0.22, 0.019], [-0.02, 0.047], [0.0, 0.048], [0.0, 0.041]], 22);
    mb.mat(CM.UNDER).color(0.008, 0.008, 0.010);
    mb.lathe([[0.0, 0.041], [-0.15, 0.019], [-0.15, 0.0]], 18);
    mb.pop();
  }

  // ---------------- 8. Defletor acrílico fumê curto (glassMesh) ----------------
  {
    const gv0 = gl.nv, gi0 = gl.ni;
    gl.mat(0).color(0.75, 0.80, 0.82);
    gl.patch((u, v, o) => {
      const z = u * 0.165 * (1 - 0.14 * v);
      const x = 0.27 - 0.095 * u * u - 0.085 * v;
      const y = 0.525 - 0.045 * u * u + 0.098 * v;
      o[0] = x; o[1] = y; o[2] = z;
    }, 0, 1, 0, 1, { nu: 12, nv: 6, flip: true });
    gl.mirror(gv0, gi0, 2);
  }
  // Base de borracha do defletor
  mb.mat(CM.RUBBER).color(0.02, 0.02, 0.022);
  mb.patch((u, v, o) => {
    const z = u * 0.168;
    const x = 0.275 - 0.095 * u * u - 0.015 * v;
    const y = 0.522 - 0.045 * u * u + 0.016 * v;
    o[0] = x; o[1] = y; o[2] = z;
  }, 0, 1, 0, 1, { nu: 12, nv: 2, flip: true });

  mb.mirror(v0, i0, 2);

  // ======================= Peças centrais e assimétricas (sem espelhamento) =======================

  // ---------------- 9. Cockpit aberto: assoalho interno, pedais, banco concha e coluna de direção ----------------
  mb.mat(CM.INTERIOR).color(0.038, 0.040, 0.045);
  mb.box(0.05, 0.112, 0, 0.68, 0.016, 0.42);
  mb.mat(CM.ALU, 1).color(0.70, 0.72, 0.76);
  mb.box(0.32, 0.165, 0.075, 0.014, 0.075, 0.048); // pedal acelerador
  mb.box(0.30, 0.170, -0.075, 0.014, 0.068, 0.056); // pedal freio

  // Banco concha anatômico (CM.INTERIOR, 4)
  mb.mat(CM.INTERIOR, 4).color(0.055, 0.058, 0.065);
  mb.rbox(-0.07, 0.162, 0, 0.34, 0.068, 0.34, 0.028, 3);  // assento
  mb.rbox(-0.07, 0.215, 0.165, 0.32, 0.095, 0.055, 0.022, 2); // aba lateral direita
  mb.rbox(-0.07, 0.215, -0.165, 0.32, 0.095, 0.055, 0.022, 2); // aba lateral esquerda
  mb.push(m4translate(m4(), -0.22, 0.185, 0)); mb.push(m4rotZ(m4(), 0.36));
  mb.rbox(0, 0.21, 0, 0.075, 0.42, 0.33, 0.032, 3); // encosto principal
  mb.rbox(0.025, 0.21, 0.155, 0.095, 0.36, 0.055, 0.022, 2); // suporte costela dir.
  mb.rbox(0.025, 0.21, -0.155, 0.095, 0.36, 0.055, 0.022, 2); // suporte costela esq.
  mb.mat(CM.STRAP).color(0.76, 0.10, 0.08);
  mb.rbox(0.036, 0.20, 0, 0.02, 0.32, 0.17, 0.008, 1); // inserto vermelho racing
  mb.mat(CM.INTERIOR, 2).color(0.045, 0.048, 0.052);
  mb.rbox(0.01, 0.45, 0, 0.068, 0.10, 0.17, 0.025, 3); // apoio de cabeça
  mb.pop(); mb.pop();

  // Coluna de direção fixa + suporte do painel
  mb.mat(CM.STEEL).color(0.14, 0.15, 0.17);
  mb.tube([[0.36, 0.40, 0], [0.19, 0.49, 0]], 0.016, 10);
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.024);
  mb.rbox(0.24, 0.47, 0, 0.08, 0.05, 0.10, 0.012, 2);

  // ---------------- 10. Motor compacto aletado em alumínio (CM.ALU) + barbatana + lanterna LED ----------------
  mb.mat(CM.ALU, 1).color(0.62, 0.64, 0.68);
  mb.rbox(-0.58, 0.215, 0, 0.28, 0.155, 0.25, 0.018, 2); // cárter e câmbio
  mb.rbox(-0.60, 0.340, 0, 0.21, 0.110, 0.20, 0.014, 2); // bloco de cilindros
  // Aletas usinadas de refrigeração a ar
  for (let k = 0; k < 6; k++) {
    mb.rbox(-0.60, 0.295 + k * 0.019, 0, 0.245, 0.0065, 0.235, 0.002, 1);
  }
  // Cabeçote e tampa de válvulas + cornetas de admissão cromadas
  mb.mat(CM.STEEL, 1).color(0.22, 0.24, 0.26);
  mb.rbox(-0.59, 0.408, 0, 0.19, 0.024, 0.19, 0.006, 1);
  mb.mat(CM.CHROME).color(0.88, 0.90, 0.94);
  for (const iz of [-0.055, 0.055]) {
    mb.cyl(-0.53, 0.42, iz, 0.024, 0.47, 0.032, 14, true, true);
    mb.mat(CM.UNDER).color(0.01, 0.01, 0.012);
    mb.cyl(-0.53, 0.465, iz, 0.022, 0.472, 0.022, 12, false, true);
    mb.mat(CM.CHROME).color(0.88, 0.90, 0.94);
  }
  // Barbatana dorsal pintável atrás do santo-antônio + difusor inferior
  mb.mat(CM.PAINT, 255).color(1, 1, 1);
  mb.rbox(-0.62, 0.455, 0, 0.38, 0.105, 0.044, 0.014, 2);
  mb.mat(CM.PLASTIC).color(0.02, 0.02, 0.024);
  mb.rbox(-0.84, 0.135, 0, 0.14, 0.075, 0.38, 0.008, 1);
  for (const dz of [-0.14, -0.05, 0.05, 0.14]) mb.box(-0.87, 0.115, dz, 0.12, 0.045, 0.010);

  // Lanterna traseira central de chuva / freio em LED (uv dentro da zona rubi pura de mat 9)
  mb.mat(CM.PLASTIC).color(0.018, 0.018, 0.020);
  mb.rbox(-0.905, 0.245, 0, 0.052, 0.078, 0.098, 0.008, 2);
  mb.mat(CM.LENS, 1).color(0.82, 0.03, 0.02);
  mb.quad(-0.933, 0.214, 0.040, -0.933, 0.214, -0.040, -0.933, 0.276, -0.040, -0.933, 0.276, 0.040, 0.48, 0.28, 0.92, 0.56);

  // ---------------- 11. Emblema circular 'M' no bico e numerais '1' nas laterais ----------------
  {
    const x0 = 0.72, y0 = mkNoseTopY(x0), y1 = mkNoseTopY(x0 + 0.02), sl = (y1 - y0) / 0.02;
    const l = Math.hypot(1, sl), nx = -sl / l, ny = 1 / l;
    const ux = -1 / l, uy = -sl / l;
    // base circular saliente rente ao bico curvo
    const B = m4basis(m4(), 0, 0, -1, nx, ny, 0, -ux, -uy, 0, x0 + nx * 0.003, y0 + ny * 0.003, 0);
    mb.push(B);
    mb.mat(CM.CHROME, 2).color(0.84, 0.86, 0.90);
    mb.cyl(0, -0.008, 0, 0.078, 0.003, 0.076, 24, true, true);
    mb.pop();
    // decalque CAT.mk (normal = +nx, +ny)
    const cx = x0 + nx * 0.007, cy = y0 + ny * 0.007, hw = 0.074, hh = 0.074, r = CAT.mk;
    mb.mat(CM.DECAL, 1).color(1, 1, 1);
    mb.quad(
      cx - ux * hh, cy - uy * hh, hw,
      cx - ux * hh, cy - uy * hh, -hw,
      cx + ux * hh, cy + uy * hh, -hw,
      cx + ux * hh, cy + uy * hh, hw,
      r[0], r[3], r[2], r[1]
    );
  }
  // Numerais '1' nos flancos dos pods laterais (legíveis em ambos os lados sem espelhamento)
  {
    const r1 = CAT.mk1, hw = 0.068, hh = 0.068, cx = -0.06, cy = 0.235, zs = 0.434;
    mb.mat(CM.DECAL, 1).color(1, 1, 1);
    // Lado direito (+Z)
    mb.quad(cx - hw, cy - hh, zs, cx + hw, cy - hh, zs, cx + hw, cy + hh, zs, cx - hw, cy + hh, zs, r1[0], r1[3], r1[2], r1[1]);
    // Lado esquerdo (-Z)
    mb.quad(cx + hw, cy - hh, -zs, cx - hw, cy - hh, -zs, cx - hw, cy + hh, -zs, cx + hw, cy + hh, -zs, r1[0], r1[3], r1[2], r1[1]);
  }
}

function mkartBuildDriver(mb) {
  // Piloto centralizado (z = 0) dimensionado ao cockpit aberto, olhos em [-0.14, 0.76, 0] e mãos no volante em [0.17, 0.50, ±0.125]
  mb.mat(CM.INTERIOR, 2).color(0.50, 0.036, 0.030); // macacão vermelho racing
  mb.push(m4translate(m4(), -0.195, 0.21, 0)); mb.push(m4rotZ(m4(), 0.34));
  mb.rbox(0.03, 0.18, 0, 0.145, 0.36, 0.26, 0.058, 4);  // tronco
  mb.rbox(0.03, 0.34, 0, 0.130, 0.085, 0.32, 0.036, 3); // ombros
  mb.pop(); mb.pop();

  // Coxas e pernas entrando no bico
  mb.rbox(-0.02, 0.225, -0.068, 0.31, 0.095, 0.115, 0.042, 3);
  mb.rbox(-0.02, 0.225, 0.068, 0.31, 0.095, 0.115, 0.042, 3);
  mb.mat(CM.INTERIOR, 3).color(0.024, 0.024, 0.028); // sapatilhas racing
  mb.rbox(0.20, 0.185, -0.072, 0.14, 0.065, 0.085, 0.024, 2);
  mb.rbox(0.20, 0.185, 0.072, 0.14, 0.065, 0.085, 0.024, 2);

  // Cinto de 4 pontos
  mb.mat(CM.INTERIOR, 3).color(0.015, 0.015, 0.018);
  for (const sg of [-1, 1]) {
    mb.sweep([[-0.22, 0.54, sg * 0.09], [-0.14, 0.40, sg * 0.06], [-0.08, 0.25, sg * 0.04]], [[-0.016, 0.003], [0.016, 0.003], [0.016, -0.003], [-0.016, -0.003]], { closedProfile: true, hard: true, up: [1, 0.3, 0] });
  }

  // Braços e luvas alcançando exatamente as pegas do volante (0.17, 0.50, ±0.125)
  mb.mat(CM.INTERIOR, 2).color(0.50, 0.036, 0.030);
  for (const sg of [-1, 1]) mb.tube([[-0.25, 0.52, sg * 0.155], [-0.04, 0.43, sg * 0.168], [0.165, 0.50, sg * 0.125]], 0.032, 8);
  mb.mat(CM.INTERIOR, 3).color(0.022, 0.022, 0.026);
  for (const sg of [-1, 1]) mb.rbox(0.172, 0.502, sg * 0.126, 0.064, 0.052, 0.054, 0.022, 2);

  // Pescoço e capacete integral esportivo branco com faixa vermelha e viseira fumê escura
  mb.mat(CM.INTERIOR, 3).color(0.022, 0.022, 0.025);
  mb.rbox(-0.22, 0.60, 0, 0.082, 0.060, 0.092, 0.025, 2);
  mb.mat(CM.GLOSS).color(0.84, 0.86, 0.88);
  mb.rbox(-0.195, 0.742, 0, 0.218, 0.215, 0.194, 0.096, 7);  // casco
  mb.rbox(-0.170, 0.678, 0, 0.162, 0.092, 0.176, 0.042, 5);  // queixeira
  mb.mat(CM.STRAP).color(0.82, 0.10, 0.08);
  mb.rbox(-0.205, 0.846, 0, 0.145, 0.016, 0.038, 0.006, 2);  // faixa racing no topo do capacete
  mb.mat(CM.GLOSS, 1).color(0.01, 0.012, 0.015);
  mb.rbox(-0.140, 0.752, 0, 0.115, 0.068, 0.198, 0.028, 5);  // viseira alinhada a eyePos[0..1] = [-0.14, 0.76]
}

function mkartBuildWheel(mb, mbBlur) {
  mb.push(m4rotY(m4(), -PI / 2));
  mb.push(m4translate(m4(), -0.008, 0, 0));
  const R = MK.WR, seg = 56;
  // Pneu slick largo de perfil quadrado (CM.TIRE, 255 evita lamelas de carro de passeio)
  mb.mat(CM.TIRE, 255).color(0.022, 0.022, 0.024);
  mb.lathe([
    [-0.066, 0.106], [-0.076, 0.118], [-0.082, 0.140], [-0.083, 0.162], [-0.079, 0.177], [-0.070, 0.184],
    [-0.056, R], [-0.020, R], [0.020, R], [0.056, R],
    [0.070, 0.184], [0.079, 0.177], [0.083, 0.162], [0.082, 0.140], [0.076, 0.118], [0.066, 0.106],
  ], seg);

  // Tambor interno escuro atrás dos raios
  mb.mat(CM.STEEL, 1).color(0.035, 0.036, 0.042);
  mb.lathe([[0.066, 0.106], [0.072, 0.108], [0.074, 0.103], [0.036, 0.098], [0.020, 0.060], [0.018, 0.0]], 32);
  mb.lathe([[-0.022, 0.0], [-0.022, 0.068], [-0.056, 0.100], [-0.068, 0.105], [-0.066, 0.106]], 28);

  // Borda externa usinada côncava do aro
  mb.mat(CM.ALU, 1).color(0.84, 0.78, 0.56);
  mb.lathe([[0.074, 0.103], [0.076, 0.107], [0.070, 0.108], [0.056, 0.102], [0.044, 0.095], [0.040, 0.095]], 36);

  // Cubo central + 5 raios côncavos tridimensionais + 5 porcas cromadas + porca central vermelha
  mb.mat(CM.ALU, 1).color(0.84, 0.78, 0.56);
  mb.lathe([[0.032, 0.0], [0.032, 0.034], [0.056, 0.034], [0.058, 0.026], [0.058, 0.0]], 20);
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * TAU;
    mb.push(m4rotX(m4(), a));
    mb.push(m4translate(m4(), 0.053, 0.064, 0));
    mb.push(m4rotZ(m4(), -0.16));
    mb.rbox(0, 0, 0, 0.016, 0.068, 0.020, 0.004, 1);
    mb.pop(); mb.pop();
    mb.mat(CM.CHROME, 2).color(0.86, 0.88, 0.92);
    mb.rbox(0.058, Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0.010, 0.007, 0.007, 0.002, 1);
    mb.mat(CM.ALU, 1).color(0.84, 0.78, 0.56);
    mb.pop();
  }
  mb.mat(CM.STRAP).color(0.84, 0.12, 0.08);
  mb.lathe([[0.058, 0.0], [0.058, 0.013], [0.066, 0.011], [0.066, 0.0]], 14);

  // Disco de borrão em alta velocidade
  const bm = mbBlur || mb;
  if (mbBlur) { bm.push(m4rotY(m4(), -PI / 2)); bm.push(m4translate(m4(), -0.008, 0, 0)); }
  bm.mat(CM.HUBCAP, 1).color(0.82, 0.77, 0.58);
  bm.patch((u, v, o) => {
    const a = u * TAU, r = 0.026 + v * 0.072;
    o[0] = lerp(0.060, 0.052, v) + 0.002;
    o[1] = r * Math.cos(a);
    o[2] = r * Math.sin(a);
  }, 0, 1, 0, 1, { nu: 40, nv: 6, flip: true, uv: (u, v) => { _muv[0] = u; _muv[1] = v; return _muv; } });
  if (mbBlur) { bm.pop(); bm.pop(); }
  mb.pop(); mb.pop();
}

function mkartBuildSteer(mb) {
  // Volante esportivo compacto de 3 raios (r = 0.125 m) com faixa 12h vermelha e painel digital no cubo
  mb.mat(CM.INTERIOR, 3).color(0.032, 0.032, 0.036);
  const ring = [];
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; ring.push([0, 0.125 * Math.cos(a), 0.125 * Math.sin(a)]); }
  mb.tube(ring, 0.012, 9, { closed: true, up: [1, 0, 0] });
  // Marca vermelha 12 horas no topo do aro (-Y local após rotZ(152°))
  mb.mat(CM.STRAP).color(0.86, 0.12, 0.08);
  mb.rbox(0, -0.125, 0, 0.027, 0.027, 0.018, 0.005, 1);

  // 3 raios em alumínio escovado
  mb.mat(CM.ALU, 1).color(0.68, 0.70, 0.75);
  mb.rbox(-0.010, 0, 0.072, 0.012, 0.024, 0.095, 0.004, 1);
  mb.rbox(-0.010, 0, -0.072, 0.012, 0.024, 0.095, 0.004, 1);
  mb.rbox(-0.010, 0.068, 0, 0.012, 0.095, 0.026, 0.004, 1);

  // Cubo + painel digital de telemetria voltado para o piloto (+X local)
  mb.mat(CM.PLASTIC).color(0.020, 0.020, 0.024);
  mb.rbox(-0.014, -0.004, 0, 0.026, 0.066, 0.092, 0.010, 2);
  mb.mat(CM.INTERIOR).color(0.10, 0.78, 0.92);
  mb.box(0.001, -0.012, 0, 0.005, 0.028, 0.062); // visor digital LCD
  mb.mat(CM.STRAP).color(0.24, 0.92, 0.34);
  mb.box(0.002, -0.030, -0.018, 0.005, 0.006, 0.020); // LED shift verde
  mb.mat(CM.STRAP).color(0.95, 0.22, 0.10);
  mb.box(0.002, -0.030, 0.016, 0.005, 0.006, 0.020); // LED shift vermelho

  const t0 = m4translate(m4(), 0.17, 0.50, 0.0), t1 = m4rotZ(m4(), 152 * PI / 180);
  return m4mul(m4(), t0, t1);
}

function mkartBuildModel() {
  const mb = new MeshBuilder(1 << 16), gl = new MeshBuilder(1 << 11), fb = new MeshBuilder(1 << 12);
  mkartBuildBody(mb, gl);
  if (typeof carAddExhaustFlame === 'function') {
    carAddExhaustFlame(fb, -0.98, 0.40, -0.21, -0.90, 0.42, 0.46, 0.048);
    carAddExhaustFlame(fb, -0.98, 0.40,  0.21, -0.90, 0.42, 0.46, 0.048);
  }
  let tris = mb.ni / 3 + gl.ni / 3 + fb.ni / 3;
  const dm = new MeshBuilder(1 << 13); mkartBuildDriver(dm); tris += dm.ni / 3;
  const w = new MeshBuilder(1 << 14), wb = new MeshBuilder(1 << 10); mkartBuildWheel(w, wb); tris += 4 * (w.ni + wb.ni) / 3;
  const s = new MeshBuilder(1 << 12); const steerMat = mkartBuildSteer(s); tris += s.ni / 3;
  return {
    name: 'Mini-Bólido MK',
    bodyMesh: mb.upload(),
    driverMesh: dm.upload(),
    glassMesh: gl.upload(),
    flameMesh: fb.ni ? fb.upload() : null,
    wheelMesh: w.upload(),
    wheelBlurMesh: wb.upload(),
    steerMesh: s.upload(),
    steerMat,
    hubs: [[MK.AXF, MK.WR, -0.45], [MK.AXF, MK.WR, 0.45], [MK.AXR, MK.WR, -0.47], [MK.AXR, MK.WR, 0.47]],
    wheelR: MK.WR,
    eyePos: [-0.14, 0.76, 0.0],
    bodyKind: 3,
    aoScale: 0.54,
    exhausts: [
      [-0.98, 0.40, -0.21, -0.90, 0.42, 0.90],
      [-0.98, 0.40,  0.21, -0.90, 0.42, 0.90],
    ],
    tris,
  };
}
