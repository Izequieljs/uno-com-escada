// Interface do jogo aberto por uma pessoa (GAME.ui): tela de início, pausa, seletores, benchmark, volta roteirizada para assistir,
// poses, teclas de ferramenta e leitura do controle. Nas ferramentas de trabalho/ (captura, poses, teste, medição) nada
// disto é ligado: sem menu, sem painel, sem som.
const ST = { INICIO: 0, JOGO: 1, PAUSA: 2, BENCH: 3, FITA: 4, RESULT: 5, POSE: 6 };
const UI = {
  st: ST.INICIO, back: ST.JOGO, el: null, tag: null, res: null, med: null, cfg: null, tit: null, sub: null, b0: null, b1: null,
  bench: null, benchN: 0, padPrev: 0, padN: 0, pose: -1, stats: false, warm: false, raceDone: false,
  lastNavUrl: '',
  navTrack(url, idx) {
    if (typeof location !== 'undefined') {
      if (typeof location.assign === 'function') location.assign(url);
      else location.search = '?track=' + idx;
    }
  },
};
const MED_UI = [
  { nome: 'Firma', tempo: '0:53,50', cor: '#4be3ff', sym: '★' },
  { nome: 'Ouro',  tempo: '0:56,00', cor: '#ffd23f', sym: '●' },
  { nome: 'Prata', tempo: '1:00,00', cor: '#cfd6de', sym: '●' },
  { nome: 'Bronze', tempo: '1:06,00', cor: '#cd7f32', sym: '●' },
];
const $ = id => document.getElementById(id);
function uiPaintCss(rgb) {
  let s = 'rgb(';
  for (let c = 0; c < 3; c++) {
    const v = rgb[c] <= 0.0031308 ? 12.92 * rgb[c] : 1.055 * Math.pow(rgb[c], 1 / 2.4) - 0.055;
    s += (c ? ',' : '') + Math.max(0, Math.min(255, Math.round(v * 255)));
  }
  return s + ')';
}
function uiFmtTime(sec) {
  const cs = Math.max(0, Math.round(sec * 100));
  const m = (cs / 6000) | 0, s = ((cs / 100) | 0) % 60, c = cs % 100;
  return m + ':' + (s < 10 ? '0' : '') + s + ',' + (c < 10 ? '0' : '') + c;
}
function uiSetBtn(btn, on) {
  if (btn.classList) { btn.classList.toggle('on', on); return; }
  const sw = btn.hasAttribute && btn.hasAttribute('data-paint');
  const pl = btn.hasAttribute && btn.hasAttribute('data-track');
  btn.className = sw ? (on ? 'sw on' : 'sw') : pl ? (on ? 'pill on' : 'pill') : (on ? 'on' : '');
}
function uiCarIdx(v) {
  const n = typeof VEH_SPECS !== 'undefined' ? VEH_SPECS.length : 5;
  return clamp(+v | 0, 0, n - 1);
}
const UI_CAR_TIT = ['Uno com escada', 'Gol Quadrado', 'DeLorean BTTF', 'Mini-Bólido MK', 'Top Gear 2 GT'];
const UI_CAR_SUB = ['Fiat Uno Mille EP 1996', 'VW Gol AP 1.8 1993', 'DeLorean DMC-12 1981', 'Mini-Bólido estilo Mario Kart', 'Supercarro estilo Top Gear 2'];
function uiSavePrefs(overrideTrackIdx) {
  try {
    const ti = overrideTrackIdx !== undefined ? (overrideTrackIdx ? 1 : 0) : (typeof TRK !== 'undefined' ? (TRK.idx | 0) : 0);
    localStorage.setItem('uno-prefs-v1', JSON.stringify({
      raceMode: typeof GS !== 'undefined' && !!GS.raceMode,
      carIdx: typeof GS !== 'undefined' ? uiCarIdx(GS.carIdx) : 0,
      paintIdx: typeof GS !== 'undefined' ? (GS.paintIdx | 0) : 0,
      envIdx: typeof ENV !== 'undefined' ? (ENV.idx | 0) : 0,
      trackIdx: ti,
      qualIdx: typeof QUAL !== 'undefined' && QUAL.idx === 1 ? 1 : 0,
    }));
  } catch (e) { /* sem armazenamento local */ }
}
function uiSelectTrack(idx) {
  const next = (idx | 0) === 1 ? 1 : 0;
  const cur = typeof TRK !== 'undefined' ? (TRK.idx | 0) : 0;
  uiSavePrefs(next);
  if (next === cur) {
    uiSyncCfg();
    return false;
  }
  const p = new URLSearchParams(typeof location !== 'undefined' && location.search ? location.search : '');
  p.set('track', String(next));
  const qs = '?' + p.toString();
  const base = typeof location !== 'undefined' ? (location.href ? location.href.split(/[?#]/)[0] : (location.pathname || '')) : '';
  const hash = typeof location !== 'undefined' && location.hash ? location.hash : '';
  const targetUrl = base + qs + hash;
  UI.lastNavUrl = targetUrl;
  if (typeof UI.navTrack === 'function') UI.navTrack(targetUrl, next);
  return true;
}
function uiRenderMed() {
  if (!UI.med) return;
  if (typeof GS !== 'undefined' && GS.raceMode) {
    const laps = typeof RACE_LAPS !== 'undefined' ? RACE_LAPS : 3;
    UI.med.innerHTML = 'Corrida de ' + laps + ' voltas · Grid com 3 rivais (largada em 4º)';
    return;
  }
  const cs = LAP[2] > 0 ? Math.round(LAP[2] * 100) : 0;
  const m = typeof medalOf === 'function' ? medalOf(cs) : -1;
  const M = (typeof TRK !== 'undefined' && TRK.medals) ? TRK.medals : (typeof MEDALS !== 'undefined' ? MEDALS : null);
  let html = '';
  for (let i = 0; i < MED_UI.length; i++) {
    const d = MED_UI[i], hit = i === m;
    const tempo = M && M[i] > 0 ? uiFmtTime(M[i] / 100) : d.tempo;
    if (i > 0) html += ' · ';
    html += '<span' + (hit ? ' class="on" data-hit="1" style="color:' + d.cor + '"' : ' style="opacity:.78"') + '>' +
      '<span style="color:' + d.cor + '">' + d.sym + '</span> ' + d.nome + ' ' + tempo + '</span>';
  }
  UI.med.innerHTML = html;
}
function uiSyncCfg() {
  const ci = typeof GS !== 'undefined' ? uiCarIdx(GS.carIdx) : 0;
  const pi = typeof GS !== 'undefined' ? (GS.paintIdx | 0) : 0;
  const ei = typeof ENV !== 'undefined' ? (ENV.idx | 0) : 0;
  const ti = typeof TRK !== 'undefined' ? (TRK.idx | 0) : 0;
  const trkSub = typeof TRK !== 'undefined' && TRK.sub ? TRK.sub : 'Circuito da Serra · 1,64 km';
  const rm = typeof GS !== 'undefined' && !!GS.raceMode;
  if (UI.tit) UI.tit.textContent = UI_CAR_TIT[ci];
  if (UI.sub) UI.sub.textContent = UI_CAR_SUB[ci] + ' · ' + trkSub;
  let sawTrack = false;
  if (UI.cfg && UI.cfg.querySelectorAll) {
    const btns = UI.cfg.querySelectorAll('button');
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      const dt = b.getAttribute ? b.getAttribute('data-track') : null;
      if (dt !== null) { sawTrack = true; uiSetBtn(b, (+dt | 0) === ti); continue; }
      const dm = b.getAttribute ? b.getAttribute('data-mode') : null;
      if (dm !== null) { uiSetBtn(b, (+dm === 1) === rm); continue; }
      const dc = b.getAttribute ? b.getAttribute('data-car') : null;
      if (dc !== null) { uiSetBtn(b, +dc === ci); continue; }
      const dq = b.getAttribute ? b.getAttribute('data-qual') : null;
      if (dq !== null) { uiSetBtn(b, (+dq | 0) === (typeof QUAL !== 'undefined' ? QUAL.idx : 0)); continue; }
      const dp = b.getAttribute ? b.getAttribute('data-paint') : null;
      if (dp !== null) {
        const idx = +dp | 0;
        if (typeof PAINTS !== 'undefined' && PAINTS[idx]) {
          b.title = PAINTS[idx].nome;
          if (b.style) b.style.background = uiPaintCss(PAINTS[idx].rgb);
        }
        uiSetBtn(b, idx === pi);
        continue;
      }
      const de = b.getAttribute ? b.getAttribute('data-env') : null;
      if (de !== null) uiSetBtn(b, +de === ei);
    }
  }
  if (!sawTrack) {
    const trkEl = $('cfgTrack');
    if (trkEl && trkEl.querySelectorAll) {
      const tb = trkEl.querySelectorAll('button');
      for (let i = 0; i < tb.length; i++) {
        const dt = tb[i].getAttribute ? tb[i].getAttribute('data-track') : null;
        if (dt !== null) uiSetBtn(tb[i], (+dt | 0) === ti);
      }
    }
  }
}
function uiPreview() { if (typeof GAME !== 'undefined' && GAME.ready && typeof renderFrame === 'function') renderFrame(); }
function uiBindCfg() {
  let sawTrack = false;
  if (UI.cfg && UI.cfg.querySelectorAll) {
    const btns = UI.cfg.querySelectorAll('button');
    for (let i = 0; i < btns.length; i++) {
      const b = btns[i];
      const dt = b.getAttribute ? b.getAttribute('data-track') : null;
      if (dt !== null) {
        sawTrack = true;
        b.onclick = () => { uiSelectTrack(+dt | 0); };
        continue;
      }
      const dm = b.getAttribute ? b.getAttribute('data-mode') : null;
      if (dm !== null) {
        b.onclick = () => {
          const next = +dm === 1;
          if (typeof GS !== 'undefined' && 'raceMode' in GS && GS.raceMode !== next) {
            GS.raceMode = next;
            if (UI.st === ST.PAUSA || UI.st === ST.RESULT) UI.back = ST.JOGO;
            if (GS.replayOn) GS.replayOn = false;
            if (typeof gameRestart === 'function') gameRestart();
            if (UI.st === ST.RESULT) { UI.raceDone = false; uiSet(ST.PAUSA); }
          }
          uiSavePrefs(); uiSyncCfg(); uiRenderMed(); uiPreview();
        };
        continue;
      }
      const dc = b.getAttribute ? b.getAttribute('data-car') : null;
      if (dc !== null) {
        b.onclick = () => {
          const next = uiCarIdx(+dc);
          if (typeof GS !== 'undefined' && 'carIdx' in GS && GS.carIdx !== next) {
            GS.carIdx = next;
            if (typeof carSyncActive === 'function') carSyncActive(false);
            if (UI.st === ST.PAUSA || UI.st === ST.RESULT) UI.back = ST.JOGO;
            if (GS.replayOn) GS.replayOn = false;
            if (typeof gameRestart === 'function') gameRestart();
            else if (typeof ghRestart === 'function') ghRestart();
            if (UI.st === ST.RESULT) { UI.raceDone = false; uiSet(ST.PAUSA); }
          }
          uiSavePrefs(); uiSyncCfg(); uiRenderMed(); uiPreview();
        };
        continue;
      }
      const dq = b.getAttribute ? b.getAttribute('data-qual') : null;
      if (dq !== null) {
        b.onclick = () => { if (typeof qualApply === 'function') qualApply(+dq | 0); uiSavePrefs(); uiSyncCfg(); uiPreview(); };
        continue;
      }
      const dp = b.getAttribute ? b.getAttribute('data-paint') : null;
      if (dp !== null) {
        b.onclick = () => {
          const next = +dp | 0;
          if (typeof GS !== 'undefined' && 'paintIdx' in GS) GS.paintIdx = next;
          if (typeof carApplyPaint === 'function' && typeof CAR !== 'undefined' && CAR.slotBody) {
            carApplyPaint(CAR.slotBody, next, CAR.bodyKind);
          }
          uiSavePrefs(); uiSyncCfg(); uiPreview();
        };
        continue;
      }
      const de = b.getAttribute ? b.getAttribute('data-env') : null;
      if (de !== null) {
        b.onclick = () => {
          const next = +de | 0;
          if (typeof envApply === 'function') envApply(next, { keepLights: !!(typeof GS !== 'undefined' && (GS.replayOn || GS.poseOn)) });
          if (typeof gamePose === 'function') gamePose();
          uiSavePrefs(); uiSyncCfg(); uiPreview();
        };
      }
    }
  }
  if (!sawTrack) {
    const trkEl = $('cfgTrack');
    if (trkEl && trkEl.querySelectorAll) {
      const tb = trkEl.querySelectorAll('button');
      for (let i = 0; i < tb.length; i++) {
        const dt = tb[i].getAttribute ? tb[i].getAttribute('data-track') : null;
        if (dt !== null) tb[i].onclick = () => { uiSelectTrack(+dt | 0); };
      }
    }
  }
}
function uiInit() {
  UI.el = $('ui'); UI.tag = $('tag'); UI.res = $('res'); UI.med = $('med'); UI.cfg = $('cfg');
  UI.tit = $('tit') || (document.querySelector ? document.querySelector('#ui h1') : null);
  UI.sub = $('sub') || (document.querySelector ? document.querySelector('#ui .sub') : null);
  UI.b0 = $('b0'); UI.b1 = $('b1');
  hudInit(); uiWarmup();
  try {
    for (let ci = 0; ci < 5; ci++) {
      const pfx = typeof ghStoragePrefix === 'function' ? ghStoragePrefix(ci) : 'uno';
      const bt = +localStorage.getItem(pfx + '-melhor');
      if (bt > 20 && bt < 600) {
        if (typeof GS !== 'undefined' && GS.carBest) GS.carBest[ci] = bt;
        if (typeof GS !== 'undefined' ? uiCarIdx(GS.carIdx) === ci : ci === 0) LAP[2] = bt;
      }
      if (typeof ghLoadData === 'function') ghLoadData(localStorage.getItem(pfx + '-ta-v1'), bt, ci);
    }
  } catch (e) { /* sem armazenamento local: a melhor volta vale só nesta sessão */ }
  try {
    const raw = localStorage.getItem('uno-prefs-v1');
    if (raw) {
      const pr = JSON.parse(raw);
      if (pr && typeof pr === 'object' && typeof GS !== 'undefined') {
        if (typeof pr.raceMode === 'boolean' && 'raceMode' in GS) GS.raceMode = pr.raceMode;
        if (typeof pr.carIdx === 'number' && 'carIdx' in GS) GS.carIdx = uiCarIdx(pr.carIdx);
        if (typeof pr.paintIdx === 'number' && typeof PAINTS !== 'undefined' && PAINTS.length) {
          const pn = PAINTS.length;
          GS.paintIdx = ((pr.paintIdx | 0) % pn + pn) % pn;
        }
        const activeOk = !GS.replayOn && !GS.poseOn;
        if (activeOk) {
          if (typeof carSyncActive === 'function') carSyncActive(false);
          if (typeof pr.envIdx === 'number' && typeof envApply === 'function' && typeof ENV !== 'undefined') {
            const en = ENV.presets.length, ei = ((pr.envIdx | 0) % en + en) % en;
            if (ei > 0 || ei !== ENV.idx) envApply(ei);
          }
          if (typeof gameRestart === 'function') gameRestart();
        } else if (typeof carSyncLapBest === 'function') {
          carSyncLapBest(uiCarIdx(GS.carIdx));
        }
      }
    }
  } catch (e) { /* ignora preferências inválidas */ }
  uiBindCfg();
  UI.b0.onclick = () => { if (UI.st === ST.INICIO) { sndStart(); uiSet(ST.JOGO); } else uiResume(); };
  UI.b1.onclick = () => {
    if (UI.st === ST.RESULT && UI.raceDone) {
      if (typeof GS !== 'undefined' && 'raceMode' in GS) GS.raceMode = false;
      uiSavePrefs(); uiSyncCfg(); uiDrive();
    } else {
      benchStart();
    }
  };
  addEventListener('keydown', uiKey);
  document.addEventListener('visibilitychange', () => { if (document.hidden && (UI.st === ST.JOGO || UI.st === ST.FITA || UI.st === ST.BENCH)) uiPause(); });
  addEventListener('gamepadconnected', padCount); addEventListener('gamepaddisconnected', padCount);
  const h = $('hint'); if (h) h.style.display = 'none';
  uiSet(ST.INICIO);
}
// troca de estado: mostra/esconde menu, painel e etiqueta, pausa/retoma o som
function uiSet(st) {
  const menu = st === ST.INICIO || st === ST.PAUSA || st === ST.RESULT;
  if (st !== ST.RESULT) UI.raceDone = false;
  UI.st = st; UI.el.style.display = menu ? 'flex' : 'none'; UI.el.className = st === ST.INICIO ? 'ini' : '';
  UI.b0.textContent = st === ST.INICIO ? 'Começar' : st === ST.RESULT ? (UI.raceDone ? 'Correr novamente' : 'Voltar a dirigir') : 'Continuar';
  UI.b1.style.display = st === ST.INICIO ? 'none' : '';
  UI.b1.textContent = st === ST.RESULT ? (UI.raceDone ? 'Volta livre' : 'Repetir benchmark') : 'Benchmark';
  UI.res.style.display = st === ST.RESULT ? 'block' : 'none';
  if (menu) { uiSyncCfg(); uiRenderMed(); }
  UI.tag.textContent = st === ST.BENCH ? 'Benchmark: volta roteirizada de 60 s · Esc cancela' : st === ST.FITA ? 'Volta roteirizada · R assume o volante · Esc menu' : st === ST.POSE ? 'Pose ' + (UI.pose + 1) + ' · ' + POSES[UI.pose].nome + ' · 1 a 6 trocam · Esc volta a dirigir' : '';
  UI.tag.style.display = UI.tag.textContent ? 'block' : 'none';
  hudShow(st === ST.JOGO || st === ST.FITA || (st === ST.PAUSA && UI.back !== ST.BENCH));
  sndRun(st === ST.JOGO || st === ST.FITA || st === ST.BENCH);
  if (menu) UI.b0.focus(); else UI.b0.blur();
  _lastT = 0;
}
function uiPause() { if (UI.st === ST.BENCH) { benchStop(); gameRestart(); } UI.back = UI.st === ST.FITA ? ST.FITA : ST.JOGO; uiSet(ST.PAUSA); }
function uiResume() {
  if (UI.st === ST.RESULT || UI.st === ST.POSE) uiDrive(); else if (UI.st === ST.PAUSA) uiSet(UI.back);
}
// volta ao volante: carro no grid, câmeras e simulação soltas
function uiDrive() { GS.frozen = false; GS.freeCam = false; GS.replayOn = false; gameRestart(); uiSet(ST.JOGO); }
function uiReplay() { if (!GS.replay) return; GS.frozen = false; GS.freeCam = false; GS.replayOn = true; gameRestart(); uiSet(ST.FITA); }
function uiPose(i) { if (UI.st === ST.BENCH) benchStop(); UI.pose = i; poseApply(i); GS.replayOn = false; uiSet(ST.POSE); }
function uiKey(e) {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const c = e.code, st = UI.st;
  if (c === 'KeyM') { sndMute(!SND.mute); return; }
  if (c === 'KeyH') { UI.stats = !UI.stats; hudStats(UI.stats); if (st !== ST.BENCH) perfAttach(UI.stats, 12); return; }
  if (c === 'KeyG') { if (typeof ghToggle === 'function') ghToggle(); return; }
  if (st === ST.INICIO) return;                                   // na tela de início só o botão começa o jogo (e o som)
  if (c === 'Escape') { if (st === ST.JOGO || st === ST.FITA || st === ST.BENCH) uiPause(); else uiResume(); e.preventDefault(); }
  else if (c === 'KeyB') benchStart();
  else if (c === 'KeyF') uiReplay();
  else if (c === 'KeyR' && st === ST.FITA) uiDrive();
  else if (c.length === 6 && c.startsWith('Digit') && c[5] >= '1' && c[5] <= '6') uiPose(+c[5] - 1);
}
function raceEnd() {
  const ci = typeof GS !== 'undefined' ? uiCarIdx(GS.carIdx) : 0;
  const carName = typeof VEH_SPECS !== 'undefined' && VEH_SPECS[ci] ? VEH_SPECS[ci].name : UI_CAR_TIT[ci];
  const laps = typeof RACE_LAPS !== 'undefined' ? RACE_LAPS : 3;
  let rows = '';
  for (let k = 0; k < 4; k++) {
    const id = RIV.finishOrder[k], isMe = id === 0;
    const nome = isMe ? ('Você (' + carName + ')') : (RIV.cars[id - 1] ? RIV.cars[id - 1].nome : ('Rival ' + id));
    rows += '<tr' + (isMe ? ' class="me"' : '') + '><td>' + (k + 1) + 'º</td><td style="text-align:left">' + nome + '</td><td>' + uiFmtTime(RIV.finishTime[k]) + '</td></tr>';
  }
  UI.res.innerHTML = '<h2>Corrida encerrada · ' + laps + ' voltas · ' + RIV.playerRank + 'º lugar</h2>' +
    '<table><tr><th>Pos.</th><th style="text-align:left">Piloto / Carro</th><th>Tempo</th></tr>' + rows + '</table>';
  UI.raceDone = true;
  uiSet(ST.RESULT);
}
// ---- benchmark: a volta roteirizada de 60 s em tempo real, sem painel, medindo tempo de quadro e (se houver) tempo de GPU
function benchStart() {
  if (!GS.replay || UI.st === ST.INICIO) return;
  GS.frozen = false; GS.freeCam = false; GS.replayOn = true; gameRestart(); UI.bench = null; UI.benchN++; UI.res.innerHTML = '<h2>Benchmark · calculando…</h2>';
  perfAttach(true, 1); perfStart(); uiSet(ST.BENCH);
}
function benchStop() { PERF.rec = false; perfAttach(UI.stats, 12); GS.replayOn = false; }
function benchEnd() {
  const id = UI.benchN; PERF.rec = false; UI.raceDone = false; uiSet(ST.RESULT);
  setTimeout(() => {   // espera as últimas leituras de tempo de GPU chegarem
    if (id !== UI.benchN || UI.st !== ST.RESULT) return;
    const r = perfReport(), stat = a => { a = a.slice(5).filter(x => x > 0).sort((p, q) => p - q); const n = a.length; return n ? { n, media: a.reduce((p, q) => p + q, 0) / n, p99: a[Math.min(n - 1, Math.round(0.99 * (n - 1)))], max: a[n - 1], acima: a.filter(x => Math.round(x * 10) > 167).length } : null; };   // acima: quadros que passaram de 16,7 ms (na resolução de 0,1 ms do relógio)
    const q = stat(r.raf), g = PERF.qs ? stat(r.gpu) : null, f = x => x.toFixed(2).replace('.', ',');
    benchStop(); gameRestart();
    UI.bench = { quadros: r.n, quadro_ms: q, gpu_ms: g, fps: q ? 1000 / q.media : 0, acima_16_7: q ? q.acima : 0, gpu_acima_16_7: g ? g.acima : null, tick: 3600, resolucao: G.W + '×' + G.H };
    const row = (n, s) => '<tr><th>' + n + '</th>' + (s ? '<td>' + f(s.media) + '</td><td>' + f(s.p99) + '</td><td>' + f(s.max) + '</td>' : '<td colspan=3>indisponível neste navegador</td>') + '</tr>';
    UI.res.innerHTML = '<h2>Benchmark · volta roteirizada de 60 s · ' + G.W + '×' + G.H + '</h2><table><tr><th></th><th>média (ms)</th><th>percentil 99 (ms)</th><th>máximo (ms)</th></tr>' + row('Tempo de quadro', q) + row('Tempo de GPU', g) + '</table>' +
      '<p>' + (q ? q.acima + ' de ' + q.n + ' quadros passaram de 16,7 ms de intervalo' + (g ? ' · ' + g.acima + ' passaram de 16,7 ms de GPU' : '') + ' · ' + f(1000 / q.media) + ' quadros por segundo' : '') + '</p>';
  }, 400);
}
// ---- controle (Gamepad API, layout padrão). Só é consultado enquanto houver um controle ligado.
function padCount() { let n = 0; const l = navigator.getGamepads ? navigator.getGamepads() : []; for (let i = 0; i < l.length; i++) if (l[i] && l[i].connected) n++; UI.padN = n; if (!n) { GS.padKeys = 0; UI.padPrev = 0; } }
// A API devolve um retrato novo dos controles a cada consulta (vetor e números criados pelo navegador): fica isolado aqui.
const PADR = new Float64Array(3), PADB = new Int32Array(1);
function apiGamepad() {
  const l = navigator.getGamepads(); let p = null;
  for (let i = 0; i < l.length; i++) { const g = l[i]; if (g && g.connected && (!p || (g.mapping === 'standard' && p.mapping !== 'standard'))) p = g; }
  if (!p) { PADB[0] = -1; return; }
  const b = p.buttons, n = b.length; let m = 0; for (let i = 0; i < n && i < 16; i++) if (b[i].pressed) m |= 1 << i;
  PADB[0] = m; PADR[0] = n > 7 ? b[7].value : 0; PADR[1] = n > 6 ? b[6].value : 0; PADR[2] = p.axes.length ? p.axes[0] : 0;
}
// traduz a leitura do controle (PADB, PADR) para as mesmas teclas do jogo + valores analógicos (PADV)
function padPoll() { apiGamepad(); padApply(); }
function padApply() {
  const m = PADB[0]; if (m < 0) { GS.padKeys = 0; return; }
  let k = K_PAD | K_PADS, x = PADR[2]; const rt = PADR[0], lt = PADR[1], ax = x < 0 ? -x : x;
  PADV[0] = rt < 0.04 ? 0 : rt; PADV[1] = lt < 0.04 ? 0 : lt;
  if (ax < 0.12) x = 0; else { const u = (ax - 0.12) / 0.88; x = (x < 0 ? -1 : 1) * u * (0.45 + 0.55 * u); }   // zona morta + curva suave no centro
  PADV[2] = x;
  if (rt > 0.06) k |= K_W; if (lt > 0.06) k |= K_S;
  if (m & 1) k |= K_SPACE; if (m & 8) k |= K_C; if (m & 4) k |= K_R; if (m & 32) k |= K_V;
  if (typeof K_BOOST !== 'undefined' && (m & 2)) k |= K_BOOST;
  if (typeof K_HORN !== 'undefined' && (m & 1024)) k |= K_HORN;
  GS.padKeys = k;
  const edge = m & ~UI.padPrev; UI.padPrev = m;
  if (edge & 516) padMenu(edge);
}
// botões de menu do controle, na borda: Start abre/fecha o menu; X assume o volante durante a volta roteirizada
function padMenu(edge) {
  if (UI.warm) return;
  if (edge & 512) { if (UI.st === ST.JOGO || UI.st === ST.FITA || UI.st === ST.BENCH) uiPause(); else if (UI.st !== ST.INICIO) uiResume(); }
  else if (UI.st === ST.FITA) uiDrive();
}
// Aquece o JIT das funções novas que rodam uma vez por quadro (controle, painel, estatísticas): são baratas, e sem isto o V8
// levaria dezenas de segundos de jogo para otimizá-las — rodando até lá no interpretador, que aloca a cada conta.
// (A parte do som que lê a simulação, sndControl, é aquecida junto com a física em gameWarmup.)
function uiWarmup() {
  const H = HUD, g = H.g, t = H.t, s = H.s, m = H.m, sc = document.createElement('canvas'); sc.width = sc.height = 4; const x = sc.getContext('2d'), V = H.V, rt3 = RT[3];
  const po = PERF.on; UI.warm = true; H.g = H.t = H.s = H.m = x; PERF.on = true;
  for (let i = 0; i < 6000; i++) {
    PADB[0] = i % 97 === 0 ? -1 : (i * 7919) & 0xffff; PADR[0] = (i % 50) / 49; PADR[1] = (i % 31) / 60; PADR[2] = Math.sin(i * 0.7); padApply();
    if (i % 2) continue;
    const j = i >> 1, dc = j % 6;
    V[0] = (i * 7) % 2100; V[1] = (i * 13) % 7400; V[2] = j % 6; V[3] = (i * 331) % 70000; V[4] = i % 5 ? (i * 17) % 9000 : -1; V[5] = i % 3 ? (i * 19) % 9000 : -1;
    V[6] = dc === 0 ? -999999 : dc === 1 ? 0 : dc === 2 ? -245 : dc === 3 ? 245 : dc === 4 ? -1234 : 1234;
    V[7] = (j % 5) - 1; V[8] = 10 + (j % 80); V[9] = 10 + (j % 60); V[10] = j & 63; V[11] = j & 1; V[12] = 15 + (j % 70); V[13] = 15 + (j % 50);
    V[14] = (i * 7) % 101; V[15] = (j >> 1) & 1; V[16] = j % 3 === 0 ? 1 : 0;
    V[17] = 12 + (j % 70); V[18] = 12 + (j % 50); V[19] = 18 + (j % 60); V[20] = 18 + (j % 45); V[21] = 24 + (j % 50); V[22] = 24 + (j % 40);
    V[23] = 1 + (j & 3); V[24] = 1 + (j % 3);
    V[25] = j % 4 === 0 ? 0 : (j % 2) + 1;
    V[26] = 1500 + (i * 13) % 4500;
    V[27] = dc === 0 ? -999999 : dc === 1 ? 0 : dc === 2 ? -145 : dc === 3 ? 215 : dc === 4 ? -1120 : 1120;
    hudDraw(); hudRead();
    RT[3] = 300 + i % 300; PERF.live[0] = i % 4 ? i % 40 : 0; hudStatsFrame();
  }
  H.g = g; H.t = t; H.s = s; H.m = m; H.K.fill(-1000001); H.V.fill(0); H.acc.fill(0); RT[3] = rt3; PERF.live[0] = 0; GS.padKeys = 0; UI.padPrev = 0; PADB[0] = -1; PERF.on = po; UI.warm = false;
}
// chamado no começo de cada quadro; devolve true quando o jogo está parado num menu (não simula nem renderiza)
function uiFrame() {
  if (UI.padN) padPoll();
  const st = UI.st;
  return st === ST.INICIO || st === ST.PAUSA || st === ST.RESULT || st === ST.POSE;
}
// chamado depois de simular e renderizar o quadro
function uiAfter() {
  const st = UI.st;
  if (st === ST.BENCH) { if (GS.tick60 >= 3600) benchEnd(); }
  else {
    if (st === ST.FITA && GS.tick60 >= GS.replay.length) uiDrive();
    if (HUD.vis) hudFrame();
    if (GS.lapNew) {
      GS.lapNew = false;
      const pfx = typeof ghStoragePrefix === 'function' ? ghStoragePrefix() : 'uno';
      try { localStorage.setItem(pfx + '-melhor', LAP[2].toFixed(3)); } catch (e) { /* idem */ }
    }
    if (typeof GH !== 'undefined' && GH.savePending) {
      GH.savePending = false;
      const pfx = typeof ghStoragePrefix === 'function' ? ghStoragePrefix() : 'uno';
      const d = ghSaveData();
      if (d) { try { localStorage.setItem(pfx + '-ta-v1', d); } catch (e) { /* idem */ } }
    }
    if (st === ST.JOGO && typeof GS !== 'undefined' && GS.raceMode && typeof RIV !== 'undefined' && RIV.finished) raceEnd();
  }
  if (HUD.stats) hudStatsFrame();
  sndFrame();
}
