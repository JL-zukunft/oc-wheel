(() => {
  'use strict';
  const D = window.OC_WHEEL_DATA;

  const COLOR_MAP = {
    '钛白': '#f4f1e6', '墨': '#2a2a2a', '赭石': '#9a5b34', '土黄': '#c9a158',
    '藤黄': '#e8b31c', '朱砂': '#e0452f', '朱磦': '#ef6a2f', '曙红': '#d63a2f',
    '胭脂': '#a43a4a', '花青': '#2f4e74', '酞青蓝': '#1f54a8', '石青': '#3a74b8',
    '石绿': '#2e9e6b', '汁绿': '#5a8a3a', '靛蓝': '#2c3e6e', '青莲': '#7a5fb8'
  };

  const ENV_STYLE = {
    '晨':   { bg: 'linear-gradient(180deg,#dbe9f4 0%,#f2e6cf 100%)', icon: '🌅', left: '18%' },
    '午':   { bg: 'linear-gradient(180deg,#fdf3d8 0%,#f7e8b8 100%)', icon: '☀️', left: '50%' },
    '暮':   { bg: 'linear-gradient(180deg,#f2c14e 0%,#e07040 100%)', icon: '🌇', left: '82%' },
    '夜':   { bg: 'linear-gradient(180deg,#1b2a4a 0%,#2e3b6e 100%)', icon: '🌙', left: '50%' },
    '烛火': { bg: 'radial-gradient(circle at 50% 62%,#f6c76a 0%,#3a2a1a 75%)', icon: '🕯️', left: '50%' },
    '阴天': { bg: 'linear-gradient(180deg,#b8bcc4 0%,#d8dade 100%)', icon: '☁️', left: '40%' }
  };

  const LIGHT_GRAD = {
    '平光': 'linear-gradient(120deg, rgba(255,255,255,.12), rgba(255,255,255,0))',
    '侧光': 'linear-gradient(90deg, rgba(255,250,230,.30) 0%, rgba(0,0,0,0) 62%)',
    '逆光': 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(255,240,200,.22) 100%)',
    '顶光': 'linear-gradient(180deg, rgba(255,250,230,.34) 0%, rgba(0,0,0,.10) 62%)',
    '底光': 'linear-gradient(0deg, rgba(255,220,180,.30) 0%, rgba(0,0,0,.08) 62%)',
    '剪影': 'radial-gradient(circle at 50% 50%, rgba(0,0,0,.45) 0%, rgba(255,235,200,.28) 100%)'
  };

  const PITCH_ICON = { '俯视':'⬇️','微俯':'🔽','平视':'➖','微仰':'🔼','仰视':'⬆️' };
  const YAW_ICON = { '正':'😐','左微侧':'◂','左¾侧':'◁','左大半侧':'←','左全侧':'⬅','右微侧':'▸','右¾侧':'▷','右大半侧':'→','右全侧':'➡' };
  const ENV_ICON = { '晨':'🌅','午':'☀️','暮':'🌇','夜':'🌙','烛火':'🕯️','阴天':'☁️' };

  const FIELD_ORDER = ['俯仰','水平','脸型','眉','眼','鼻','唇','表情','后发','前发','鬓发','肩颈与手','领口','锚点','头饰配饰','单色主色','光位','环境光'];
  const FIELD_LABEL = { '俯仰':'朝向·俯仰','水平':'朝向·水平','脸型':'脸型','眉':'眉','眼':'眼','鼻':'鼻','唇':'唇','表情':'表情','后发':'后发','前发':'前发','鬓发':'鬓发','肩颈与手':'肩颈与手','领口':'领口','锚点':'锚点','头饰配饰':'头饰配饰','单色主色':'单色主色','光位':'光位','环境光':'环境光' };
  const FACE_REELS = ['脸型','眉','眼','鼻','唇','表情','后发','前发','鬓发','肩颈与手','领口','锚点','头饰配饰'];
  const MODULES = [
    { label: '朝向', keys: ['俯仰','水平'] },
    { label: '形象角色', keys: FACE_REELS },
    { label: '主色', keys: ['单色主色'] },
    { label: '光与氛围', keys: ['光位','环境光'] }
  ];

  const RESULT = {};
  let running = false;
  let currentModule = null;
  let noPrelude = false;

  const $ = s => document.querySelector(s);
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const rand = n => Math.floor(Math.random() * n);
  const pick = arr => arr[rand(arr.length)];
  const flat = reel => Array.isArray(reel) ? reel : Object.values(reel).flat();

  function reelOf(key) {
    if (key === '俯仰' || key === '水平') return D.朝向[key];
    if (key === '单色主色') return D.单色主色;
    if (key === '光位' || key === '环境光') return D.光与氛围[key];
    return D.形象底子[key];
  }

  /* ---------- 像素风音效（Web Audio 合成） ---------- */
  let actx = null, soundOn = true;
  function ctx() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, dur, o) {
    o = o || {};
    const a = ctx(); if (!a || !soundOn) return;
    const t = a.currentTime + (o.when || 0);
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    g.gain.setValueAtTime(o.gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
  function noise(dur, o) {
    o = o || {};
    const a = ctx(); if (!a || !soundOn) return;
    const t = a.currentTime + (o.when || 0);
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.freq || 2000;
    const g = a.createGain(); g.gain.value = o.gain || 0.2;
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(t);
  }
  function beepSeq(notes, stepDur, gain) {
    gain = gain || 0.18;
    notes.forEach((f, i) => {
      const a = ctx(); if (!a || !soundOn) return;
      const t = a.currentTime + i * stepDur;
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(gain, t);
      g.gain.setValueAtTime(gain, t + stepDur * 0.55);
      g.gain.linearRampToValueAtTime(0.0001, t + stepDur);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + stepDur + 0.01);
    });
  }
  const playCoin = () => { noise(0.06, { freq: 2500, gain: 0.25 }); beepSeq([740, 1175], 0.07, 0.16); };
  const playReelTick = () => { tone(300 + Math.random() * 250, 0.045, { type: 'square', gain: 0.09 }); noise(0.025, { freq: 1500, gain: 0.1 }); };
  const playBall = () => tone(520, 0.12, { type: 'square', gain: 0.22, slide: 190 });
  const playBallHit = () => noise(0.035, { freq: 1200, gain: 0.09 });
  const playTick = () => tone(1900, 0.05, { type: 'square', gain: 0.1 });
  const playWin = () => beepSeq([523, 659, 784, 1046], 0.09, 0.2);
  const playEnvStep = () => tone(280, 0.24, { type: 'sine', gain: 0.12, slide: 640 });
  const playLightStep = () => tone(420, 0.2, { type: 'sawtooth', gain: 0.07, slide: 920 });
  const playSettle = () => tone(880, 0.42, { type: 'sine', gain: 0.15, slide: 1320 });
  const playLever = () => { noise(0.08, { freq: 900, gain: 0.28 }); tone(120, 0.12, { type: 'square', gain: 0.2, slide: 60 }); };
  function scheduleTicks(duration, fn, count) {
    for (let i = 0; i < count; i++) { const p = i / count; setTimeout(fn, duration * p * p); }
  }

  /* ---------- DOM ---------- */
  const stage = $('#stage');
  const stageStart = document.getElementById('stage-start');
  const gachaConsole = document.getElementById('gacha-console');
  const chips = $('#chips');
  const resultMask = $('#result-mask');
  const resultCard = $('#result-card');
  const resultList = $('#result-list');
  const backdrop = $('#backdrop');
  const btnSummon = $('#btn-summon');
  const btnRerollAll = $('#btn-reroll-all');
  const btnFav = $('#btn-fav');
  const btnPool = $('#btn-pool');
  const btnResultClose = $('#btn-result-close');
  const btnSound = $('#btn-sound');
  const poolMask = $('#pool-mask');
  const poolList = $('#pool-list');
  const btnPoolClose = $('#btn-pool-close');
  const toast = $('#toast');

  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 1600);
  }

  function addChip(label, value, color) {
    const c = document.createElement('span');
    c.className = 'chip';
    c.textContent = label + ' ' + value;
    if (color) c.style.borderColor = color;
    chips.appendChild(c);
  }

  /* 前摇：抽选悬念 */
  async function prelude(label) {
    if (noPrelude) return;
    stage.innerHTML = '<div class="module"><h3 class="stage-title prelude-title">' + label + ' · 抽选中 …</h3></div>';
    playTick();
    await delay(800);
  }

  /* ---------- ① 朝向：横向老虎机 ---------- */
  async function spin朝向(onlyKeys) {
    const order = ['俯仰', '水平', '环境光', '光位'];
    const keys = onlyKeys || order;
    await prelude(onlyKeys ? '重抽' : '朝向 · 光与氛围');
    stage.innerHTML = '<div class="module"><h3 class="stage-title">朝向 · 光与氛围</h3><div class="cabinet"><div class="neon-strip"></div><div class="lever-machine"><div class="lever" id="lever"></div><div class="vslots"><div class="vslot" id="vslot-pitch"></div><div class="vslot" id="vslot-yaw"></div><div class="vslot" id="vslot-env"></div><div class="vslot" id="vslot-light"></div></div></div><div class="neon-strip"></div></div></div>';

    const lever = $('#lever');
    lever.classList.add('pulled');
    playLever();

    const reels = {
      '俯仰': buildVSlot(D.朝向.俯仰, $('#vslot-pitch'), PITCH_ICON),
      '水平': buildVSlot(D.朝向.水平, $('#vslot-yaw'), YAW_ICON),
      '环境光': buildVSlot(D.光与氛围.环境光, $('#vslot-env'), ENV_ICON),
      '光位': buildVSlot(D.光与氛围.光位, $('#vslot-light'))
    };

    const spins = [];
    order.forEach((k, i) => {
      if (keys.indexOf(k) !== -1) {
        spins.push(spinVSlot(reels[k], 3200 + i * 600, playReelTick).then(v => { RESULT[k] = v; }));
      } else {
        centerVSlot(reels[k], RESULT[k]);
      }
    });
    await Promise.all(spins);
    playSettle();
    keys.forEach(k => addChip(k, RESULT[k]));
    await delay(500);
  }

  function centerVSlot(reel, value) {
    const { track, items, step } = reel;
    const container = track.parentElement;
    const len = items.length;
    const idx = items.indexOf(value);
    if (idx === -1) return;
    const targetCopy = 3;
    const endY = -((targetCopy * len + idx) * step) + (container.clientHeight - step) / 2;
    track.style.transform = 'translateY(' + endY + 'px)';
  }

  function buildSlot(items, container, icons) {
    const track = document.createElement('div');
    track.className = 'slot-track';
    const copies = 12;
    for (let c = 0; c < copies; c++) {
      for (const it of items) {
        const s = document.createElement('span');
        s.className = 'slot-item';
        if (icons && icons[it]) s.innerHTML = '<span class="slot-ico">' + icons[it] + '</span><span class="slot-txt">' + it + '</span>';
        else s.textContent = it;
        track.appendChild(s);
      }
    }
    container.appendChild(track);
    const itemEl = track.querySelector('.slot-item');
    const itemW = itemEl ? itemEl.offsetWidth : 130;
    const step = itemW + 12;
    return { track, items, step, itemW };
  }

  function spinSlot(reel, duration, tickFn, rounds) {
    rounds = rounds || 1;
    return new Promise(resolve => {
      const { track, items, step, itemW } = reel;
      const container = track.parentElement;
      const len = items.length;
      const idx = rand(len);
      const targetCopy = 6;
      const endX = -((targetCopy * len + idx) * step) + (container.clientWidth - itemW) / 2;
      const startX = endX - (rounds * len * step);
      track.style.transition = 'none';
      track.style.transform = 'translateX(' + startX + 'px)';
      void track.offsetHeight;
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(items[idx]); };
      track.addEventListener('transitionend', finish, { once: true });
      if (tickFn) scheduleTicks(duration, tickFn, 14);
      track.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.12,0.8,0.15,1)';
      track.style.transform = 'translateX(' + endX + 'px)';
      setTimeout(finish, duration + 250);
    });
  }

  /* ---------- ② 形象底子：球形玻璃摇号机 ---------- */
  async function spinFace(onlyKeys) {
    const keys = onlyKeys || FACE_REELS;
    await prelude(onlyKeys ? '重抽' : '形象底子');
    stage.innerHTML = '<div class="module"><h3 class="stage-title">形象底子</h3><div class="machine-row"><div class="machine"><div class="tube"></div><div class="sphere" id="sphere"><div class="ring"></div></div><div class="stand"></div></div><div class="draw-panel"><span class="draw-text" id="draw-text">抽选中</span></div></div><div class="face-balls" id="face-balls"></div></div>';
    const stopSim = mountBallSim($('#sphere'), 16);
    await delay(onlyKeys ? 700 : 3000);
    const box = $('#face-balls');
    const drawText = $('#draw-text');
    for (const key of FACE_REELS) {
      const isReroll = keys.indexOf(key) !== -1;
      let val;
      if (isReroll) {
        const reel = flat(D.形象底子[key]);
        val = pick(reel);
        if (drawText) await flashOptions(drawText, reel, val, 450);
        RESULT[key] = val;
      } else {
        val = RESULT[key];
      }
      const b = document.createElement('div');
      b.className = 'face-ball';
      b.dataset.key = key;
      const main = document.createElement('div');
      main.className = 'fb-main';
      const l = document.createElement('span'); l.className = 'fb-label'; l.textContent = FIELD_LABEL[key];
      const v = document.createElement('span'); v.className = 'fb-value'; v.textContent = val;
      main.appendChild(l); main.appendChild(v);
      b.appendChild(main);
      const rb = document.createElement('button');
      rb.className = 'fb-reroll'; rb.textContent = '↻'; rb.title = '重抽 ' + FIELD_LABEL[key];
      rb.addEventListener('click', () => rerollFaceField(key));
      b.appendChild(rb);
      box.appendChild(b);
      if (isReroll) { playBall(); await delay(220); }
    }
    stopSim();
    keys.forEach(key => addChip(FIELD_LABEL[key], RESULT[key]));
    await delay(380);
  }

  function mountBallSim(container, count) {
    const colors = ['#f6d77a','#e8a55a','#e0452f','#3a74b8','#5a8a3a','#7a5fb8','#1f54a8','#e8b31c','#9a5b34','#2e9e6b','#ef6a2f','#2c3e6e','#c9a158','#5a8a3a'];
    const size = 24;
    const balls = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'mb';
      el.style.width = el.style.height = size + 'px';
      el.style.background = colors[rand(colors.length)];
      el.style.left = '0'; el.style.top = '0';
      container.appendChild(el);
      balls.push({ el, x: 15 + Math.random() * 200, y: 15 + Math.random() * 200, vx: (Math.random() * 2 - 1) * 9, vy: (Math.random() * 2 - 1) * 9 });
    }
    let raf;
    let lastHit = 0;
    function tick() {
      const R = container.clientWidth / 2;
      const max = R - size / 2 - 4;
      for (const b of balls) {
        b.x += b.vx; b.y += b.vy;
        const dx = b.x - R, dy = b.y - R;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
        if (d > max) {
          const nx = dx / d, ny = dy / d;
          b.x = R + nx * max; b.y = R + ny * max;
          const dot = b.vx * nx + b.vy * ny;
          b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny;
          b.vx *= 0.99; b.vy *= 0.99;
          const now = performance.now();
          if (now - lastHit > 90) { playBallHit(); lastHit = now; }
        }
        const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (sp < 6) { b.vx *= 1.05; b.vy *= 1.05; }
        b.el.style.transform = 'translate(' + (b.x - size / 2) + 'px,' + (b.y - size / 2) + 'px)';
      }
      raf = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(raf);
  }

  async function flashOptions(el, reel, final, duration) {
    const steps = 7;
    const stepMs = duration / steps;
    for (let i = 0; i < steps; i++) {
      el.textContent = reel[rand(reel.length)];
      await delay(stepMs);
    }
    el.textContent = final;
  }

  /* ---------- ③ 单色主色：圆形霓虹转盘 ---------- */
  async function spinColor() {
    await prelude('单色主色');
    const colors = D.单色主色;
    stage.innerHTML = '<div class="module"><h3 class="stage-title">单色主色</h3><div class="wheel-wrap"><div class="wheel" id="wheel">' + buildWheel(colors) + '</div><div class="pointer"></div></div></div>';
    const wheel = $('#wheel');
    const idx = rand(colors.length);
    const slice = 360 / colors.length;
    const target = 360 * 6 + (360 - idx * slice - slice / 2);
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
    void wheel.offsetHeight;
    scheduleTicks(3600, playTick, 14);
    wheel.style.transition = 'transform 3600ms cubic-bezier(0.15,0.8,0.2,1)';
    wheel.style.transform = 'rotate(' + target + 'deg)';
    await delay(3850);
    const val = colors[idx];
    RESULT['单色主色'] = val;
    addChip('单色主色', val, COLOR_MAP[val]);
    await delay(450);
  }

  function buildWheel(colors) {
    const n = colors.length, r = 150, cx = 160, cy = 160;
    let paths = '', labels = '';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      paths += '<path d="M' + cx + ',' + cy + ' L' + x0.toFixed(1) + ',' + y0.toFixed(1) + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' Z" fill="' + (COLOR_MAP[colors[i]] || '#555') + '" stroke="rgba(255,255,255,.28)" stroke-width="1.5"/>';
      const am = (a0 + a1) / 2, lr = r * 0.56;
      const lx = cx + lr * Math.cos(am), ly = cy + lr * Math.sin(am);
      labels += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" fill="#fff" stroke="#0b0b10" stroke-width="2" paint-order="stroke" font-size="13" text-anchor="middle" dominant-baseline="middle">' + colors[i] + '</text>';
    }
    const ring = '<circle cx="160" cy="160" r="' + r + '" fill="none" stroke="#3ef2d0" stroke-width="3" opacity=".85"/>';
    return '<svg viewBox="0 0 320 320" class="wheel-svg">' + paths + ring + '<circle cx="160" cy="160" r="26" fill="#0b0b10" stroke="#3ef2d0" stroke-width="2"/><circle cx="160" cy="160" r="10" fill="#f6d77a"/>' + labels + '</svg>';
  }

  /* ---------- ④ 光与氛围：光位光束 + 日月轮换 ---------- */
  function buildVSlot(items, container, icons) {
    const track = document.createElement('div');
    track.className = 'vslot-track';
    const copies = 7;
    for (let c = 0; c < copies; c++) {
      for (const it of items) {
        const s = document.createElement('span');
        s.className = 'vslot-item';
        if (icons && icons[it]) s.innerHTML = '<span class="vslot-ico">' + icons[it] + '</span><span>' + it + '</span>';
        else s.textContent = it;
        track.appendChild(s);
      }
    }
    container.appendChild(track);
    const itemEl = track.querySelector('.vslot-item');
    const itemH = itemEl ? itemEl.offsetHeight : 56;
    return { track, items, step: itemH };
  }

  function spinVSlot(reel, duration, tickFn) {
    return new Promise(resolve => {
      const { track, items, step } = reel;
      const container = track.parentElement;
      const len = items.length;
      const idx = rand(len);
      const targetCopy = 3;
      const endY = -((targetCopy * len + idx) * step) + (container.clientHeight - step) / 2;
      const startY = endY - (len * step * 3);
      track.style.transition = 'none';
      track.style.transform = 'translateY(' + startY + 'px)';
      void track.offsetHeight;
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(items[idx]); };
      track.addEventListener('transitionend', finish, { once: true });
      if (tickFn) scheduleTicks(duration, tickFn, 12);
      track.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.12,0.8,0.15,1)';
      track.style.transform = 'translateY(' + endY + 'px)';
      setTimeout(finish, duration + 250);
    });
  }

  /* ---------- 结果卡（按模块排版，值可点重摇） ---------- */
  function renderResult() {
    resultList.innerHTML = '';
    MODULES.forEach(m => {
      const row = document.createElement('div');
      row.className = 'rc-module';
      const lab = document.createElement('span'); lab.className = 'rc-mlabel'; lab.textContent = m.label + '：';
      row.appendChild(lab);
      m.keys.forEach(key => {
        const chip = document.createElement('span');
        chip.className = 'rc-chip';
        chip.textContent = RESULT[key];
        row.appendChild(chip);
      });
      resultList.appendChild(row);
    });
    applyAccent();
  }

  function reroll(key, chipEl) {
    const val = pick(flat(reelOf(key)));
    RESULT[key] = val;
    chipEl.textContent = val;
    if (key === '单色主色') applyAccent();
  }

  function applyAccent() {
    const c = COLOR_MAP[RESULT['单色主色']] || '#e8e6df';
    resultCard.style.setProperty('--accent', c);
  }

  function applyAtmosphere() {
    const env = ENV_STYLE[RESULT['环境光']];
    backdrop.style.background = env.bg;
    backdrop.style.setProperty('--light-overlay', LIGHT_GRAD[RESULT['光位']]);
    backdrop.classList.add('lit');
  }

  function showNavBar() {
    const old = document.getElementById('nav-bar');
    if (old) old.remove();
    const bar = document.createElement('div');
    bar.id = 'nav-bar';
    const again = document.createElement('button');
    again.className = 'rb-btn'; again.textContent = '⟳'; again.title = '重抽本模块';
    const next = document.createElement('button');
    next.className = 'rb-btn rb-back'; next.textContent = '下一步'; next.title = '下一步';
    bar.appendChild(again); bar.appendChild(next);
    document.body.appendChild(bar);
    again.addEventListener('click', rerollCurrent);
    next.addEventListener('click', advance);
  }

  async function advance() {
    if (running) return;
    running = true;
    const bar = document.getElementById('nav-bar'); if (bar) bar.remove();
    if (currentModule === 'lever') {
      currentModule = 'lottery';
      await spinFace();
      showNavBar();
    } else if (currentModule === 'lottery') {
      currentModule = 'wheel';
      await spinColor();
      await delay(500);
      showResult();
    }
    running = false;
  }

  async function rerollCurrent() {
    if (running) return;
    running = true;
    const bar = document.getElementById('nav-bar'); if (bar) bar.remove();
    chips.innerHTML = '';
    noPrelude = true;
    if (currentModule === 'lever') { await spin朝向(); }
    else if (currentModule === 'lottery') { await spinFace(); }
    noPrelude = false;
    showNavBar();
    running = false;
  }

  async function rerollFaceField(key) {
    if (running) return;
    running = true;
    const drawText = $('#draw-text');
    const reel = flat(D.形象底子[key]);
    const val = pick(reel);
    if (drawText) await flashOptions(drawText, reel, val, 450);
    RESULT[key] = val;
    const ball = document.querySelector('.face-ball[data-key="' + key + '"]');
    if (ball) {
      const v = ball.querySelector('.fb-value');
      if (v) v.textContent = val;
      ball.style.transition = 'none';
      ball.style.transform = 'scale(1.12)';
      void ball.offsetWidth;
      ball.style.transition = 'transform .3s cubic-bezier(.2,.9,.3,1.4)';
      ball.style.transform = 'scale(1)';
      playBall();
    }
    running = false;
  }

  function showResult() {
    renderResult();
    applyAccent();
    applyAtmosphere();
    playWin();
    resultMask.classList.remove('hidden');
  }

  /* ---------- 收藏 / 待发展池 ---------- */
  function getPool() { try { return JSON.parse(localStorage.getItem('oc-wheel-pool') || '[]'); } catch (e) { return []; } }
  function setPool(p) { localStorage.setItem('oc-wheel-pool', JSON.stringify(p)); }

  function favorite() {
    const pool = getPool();
    pool.unshift({ t: Date.now(), d: Object.assign({}, RESULT) });
    setPool(pool);
    btnFav.textContent = '♥';
    showToast('已收藏进待发展池 ♡');
  }

  function openPool() {
    const pool = getPool();
    poolList.innerHTML = '';
    if (!pool.length) { poolList.innerHTML = '<li class="empty">还没有收藏，先摇个带感的</li>'; }
    pool.forEach((item, i) => {
      const li = document.createElement('li');
      const d = new Date(item.t);
      const keys = ['俯仰','水平','脸型','眉','眼','唇','后发','前发','单色主色','光位','环境光'];
      const summary = keys.map(k => item.d[k]).join(' · ');
      const head = document.createElement('div'); head.className = 'p-head';
      head.innerHTML = '<span>' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span><button class="p-del" data-i="' + i + '">删除</button>';
      const sum = document.createElement('div'); sum.className = 'p-sum'; sum.textContent = summary;
      li.appendChild(head); li.appendChild(sum);
      poolList.appendChild(li);
    });
    poolMask.classList.remove('hidden');
  }

  /* ---------- 主流程 ---------- */
  async function run() {
    if (running) return;
    running = true;
    gachaConsole.classList.add('active');
    playCoin();
    await delay(350);
    gachaConsole.classList.remove('active');

    stageStart.classList.add('hidden');
    chips.classList.remove('hidden'); chips.innerHTML = '';
    resultMask.classList.add('hidden');
    backdrop.classList.remove('lit');
    backdrop.style.background = 'transparent';
    Object.keys(RESULT).forEach(k => delete RESULT[k]);
    btnFav.textContent = '♡';
    const oldBar = document.getElementById('nav-bar'); if (oldBar) oldBar.remove();

    currentModule = 'lever';
    await spin朝向();
    showNavBar();
    running = false;
  }

  /* ---------- init ---------- */
  btnSummon.addEventListener('click', run);
  btnRerollAll.addEventListener('click', () => { resultMask.classList.add('hidden'); run(); });
  btnResultClose.addEventListener('click', () => resultMask.classList.add('hidden'));
  resultMask.addEventListener('click', e => { if (e.target === resultMask) resultMask.classList.add('hidden'); });
  btnFav.addEventListener('click', favorite);
  btnPool.addEventListener('click', openPool);
  btnPoolClose.addEventListener('click', () => poolMask.classList.add('hidden'));
  poolList.addEventListener('click', e => {
    if (e.target.classList.contains('p-del')) {
      const arr = getPool();
      arr.splice(+e.target.dataset.i, 1);
      setPool(arr);
      openPool();
    }
  });
  poolMask.addEventListener('click', e => { if (e.target === poolMask) poolMask.classList.add('hidden'); });
  btnSound.addEventListener('click', () => {
    soundOn = !soundOn;
    btnSound.textContent = soundOn ? '🔊' : '🔇';
    ctx();
  });
})();
