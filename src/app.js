(() => {
  'use strict';
  const D = window.OC_WHEEL_DATA;

  const LIGHT_GRAD = {
    '正面光/顺光': 'linear-gradient(120deg, rgba(255,255,255,.16), rgba(255,255,255,0) 70%)',
    '蝴蝶光/派拉蒙光': 'linear-gradient(180deg, rgba(255,250,230,.32) 0%, rgba(0,0,0,0) 55%)',
    '逆光': 'linear-gradient(180deg, rgba(0,0,0,.14) 0%, rgba(255,240,200,.26) 50%, rgba(0,0,0,0) 100%)',
    '分割光/阴阳光': 'linear-gradient(90deg, rgba(255,250,230,.34) 0%, rgba(0,0,0,0) 49%, rgba(0,0,0,.20) 51%, rgba(0,0,0,0) 100%)',
    '伦勃朗光': 'linear-gradient(135deg, rgba(255,250,230,.32) 0%, rgba(0,0,0,0) 55%)',
    '轮廓光': 'radial-gradient(circle at 50% 50%, rgba(0,0,0,.42) 0%, rgba(255,240,200,.30) 100%)',
    '环形光': 'linear-gradient(120deg, rgba(255,250,230,.26) 0%, rgba(0,0,0,0) 55%)',
    '底光/鬼光': 'linear-gradient(0deg, rgba(255,220,180,.34) 0%, rgba(0,0,0,.12) 62%)',
    '顶光': 'linear-gradient(180deg, rgba(255,250,230,.34) 0%, rgba(0,0,0,.14) 62%)',
    '侧逆光': 'linear-gradient(135deg, rgba(0,0,0,0) 35%, rgba(255,240,200,.26) 100%)'
  };

  const PITCH_ICON = { '超绝大俯视':'▼','微俯视':'▾','平视':'─','微仰视':'▴','超绝大仰视':'▲' };
  const YAW_ICON = { '正':'│','左微侧':'◂','左半侧':'◁','左¾侧':'←','左全侧':'⬅','右微侧':'▸','右半侧':'▷','右¾侧':'→','右全侧':'➡' };
  const FACE_REELS = ['脸型','眉','眼','鼻','唇','表情','后发','前发','鬓发','肩颈与手','领口','锚点','头饰配饰'];
  const MODULES = [
    { label: '朝向', keys: ['俯仰','水平'] },
    { label: '形象角色', keys: FACE_REELS },
    { label: '主色', keys: ['节气', '组'] },
    { label: '打光', keys: ['打光'] }
  ];

  const RESULT = {};
  let running = false;

  const $ = s => document.querySelector(s);
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const rand = n => Math.floor(Math.random() * n);
  const pick = arr => arr[rand(arr.length)];
  function deepFlat(x) {
    if (Array.isArray(x)) return x;
    return Object.values(x).flatMap(v => deepFlat(v));
  }
  const g = (o, k) => (o && o[k]) || [];
  const 气质FIELDS = ['脸型', '眉', '眼', '鼻', '唇'];
  const 性别风格FIELDS = ['前发', '后发', '鬓发', '锚点', '头饰配饰'];
  function pickSoft(pool, fullPool, rate) {
    rate = rate || 0.1;
    if (!pool.length) return pick(fullPool);
    return Math.random() < rate ? pick(fullPool) : pick(pool);
  }
  function 气质兼容(v, 气质, map) {
    if (!map || !map[v]) return true;
    return map[v].indexOf(气质) !== -1;
  }
  function 加权抽(items, 权重Map) {
    if (!权重Map) return pick(items);
    const weights = items.map(it => 权重Map[it] || 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  function 情绪类别(表情) {
    const map = D.约束.表情情绪;
    for (const cat in map) if (map[cat].indexOf(表情) !== -1) return cat;
    return null;
  }
  function 动作兼容(动作, 类别) {
    if (!类别) return true;
    const map = D.约束.肩颈与手情绪;
    for (const cat in map) if (map[cat].indexOf(动作) !== -1) return cat === 类别;
    return true;
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
  const playWin = () => {
    const seq = [[523, 0.08], [659, 0.08], [784, 0.08], [1046, 0.08], [1319, 0.08], [1568, 0.5]];
    let t = 0;
    seq.forEach(([f, gap]) => {
      tone(f, gap + 0.05, { type: 'square', gain: 0.18, when: t });
      t += gap;
    });
  };
  const playSuccess = () => {
    tone(784, 0.06, { type: 'square', gain: 0.16 });
    tone(880, 0.09, { type: 'square', gain: 0.16, when: 0.06 });
  };
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
  const btnAgain = $('#btn-again');
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
    c.textContent = label ? (label + ' ' + value) : value;
    if (color) c.style.borderColor = color;
    chips.appendChild(c);
  }

  /* 前摇：抽选悬念 */
  async function prelude(label) {
    stage.innerHTML = '<div class="module"><h3 class="stage-title prelude-title">' + label + ' · 抽选中 …</h3></div>';
    playTick();
    await delay(800);
  }

  /* ---------- ① 朝向 + 打光：三排拉杆老虎机 ---------- */
  async function spin朝向() {
    const order = ['俯仰', '水平', '打光'];
    stage.innerHTML = '<div class="module"><h3 class="stage-title">朝向 · 打光</h3><div class="cabinet"><div class="neon-strip"></div><div class="lever-machine"><div class="lever" id="lever"></div><div class="vslots"><div class="vslot" id="vslot-pitch"></div><div class="vslot" id="vslot-yaw"></div><div class="vslot" id="vslot-light"></div></div></div><div class="neon-strip"></div></div></div>';

    await delay(300);

    const lever = $('#lever');
    lever.classList.add('pulled');
    playLever();

    const reels = {
      '俯仰': buildVSlot(D.朝向.俯仰, $('#vslot-pitch'), PITCH_ICON),
      '水平': buildVSlot(D.朝向.水平, $('#vslot-yaw'), YAW_ICON),
      '打光': buildVSlot(D.打光, $('#vslot-light'))
    };

    // 预选结果：俯仰/水平加权，打光按水平朝向约束
    RESULT['俯仰'] = 加权抽(D.朝向.俯仰, D.约束.俯仰权重);
    RESULT['水平'] = 加权抽(D.朝向.水平, D.约束.水平权重);
    let 打光候选 = D.打光.slice();
    if (D.约束.打光朝向.正面水平.indexOf(RESULT['水平']) === -1) {
      打光候选 = 打光候选.filter(v => D.约束.打光朝向.正面偏好.indexOf(v) === -1);
    }
    RESULT['打光'] = 加权抽(打光候选, D.约束.打光权重);
    const spins = order.map((k, i) =>
      spinVSlot(reels[k], 3200 + i * 600, playReelTick, RESULT[k])
    );
    await Promise.all(spins);
    playSuccess();
    addChip('', RESULT['俯仰'] + '×' + RESULT['水平']);
    addChip('', RESULT['打光']);
    await delay(500);
  }

  /* ---------- ② 形象底子：球形玻璃摇号机（三轴约束 + 需盘发） ---------- */
  async function spinFace() {
    // 三轴：气质（脸/眉/眼/鼻/唇）+ 性别 × 风格（前发/后发/鬓发/锚点/头饰配饰）
    const 气质 = pick(['清冷英气', '成熟柔美', '可爱软萌']);
    const 性别 = pick(['男', '女']);
    const 风格 = pick(['古风', '现代']);

    stage.innerHTML = '<div class="module"><h3 class="stage-title">形象底子</h3><div class="machine-row"><div class="machine"><div class="tube"></div><div class="sphere" id="sphere"><div class="ring"></div></div><div class="stand"></div></div><div class="draw-panel"><span class="draw-text" id="draw-text">抽选中</span></div></div><div class="face-balls" id="face-balls"></div></div>';
    const stopSim = mountBallSim($('#sphere'), 26);
    await delay(1400);
    const box = $('#face-balls');
    const drawText = $('#draw-text');
    let 后发结果 = null;
    for (let bi = 0; bi < FACE_REELS.length; bi++) {
      const key = FACE_REELS[bi];
      const field = D.形象底子[key];
      const 全池 = deepFlat(field);
      let val, flash池;
      if (气质FIELDS.indexOf(key) !== -1) {
        const 气质池 = g(field, 气质).concat(g(field, '通用'));
        val = pickSoft(气质池, 全池);
        flash池 = 气质池.length ? 气质池 : 全池;
      } else if (性别风格FIELDS.indexOf(key) !== -1) {
        const 风 = g(field, 风格);
        const 通 = g(field, '通用');
        let 性别风格池 = g(风, 性别).concat(g(风, '无性')).concat(g(通, 性别)).concat(g(通, '无性'));
        // 需盘发硬约束：后发非可插簪时，头饰排除发簪类
        if (key === '头饰配饰' && 后发结果 && D.约束.可插簪发型.indexOf(后发结果) === -1) {
          性别风格池 = 性别风格池.filter(v => D.约束.需盘发头饰.indexOf(v) === -1);
        }
        // 气质软过滤（后发盘发髻 / 锚点胡子）
        const 气质Map = key === '后发' ? D.约束.后发气质 : key === '锚点' ? D.约束.锚点气质 : key === '鬓发' ? D.约束.鬓发气质 : null;
        if (气质Map) {
          const 兼容池 = 性别风格池.filter(v => 气质兼容(v, 气质, 气质Map));
          const rate = key === '鬓发' ? 0.25 : 0.1; // 鬓发更软
          val = pickSoft(兼容池, 性别风格池, rate);
          flash池 = 兼容池.length ? 兼容池 : 性别风格池;
        } else {
          val = pick(性别风格池);
          flash池 = 性别风格池;
        }
      } else if (key === '肩颈与手') {
        // 情绪软约束：表情先出，肩颈与手按表情情绪过滤
        const 类别 = 情绪类别(RESULT['表情']);
        const 兼容池 = 全池.filter(v => 动作兼容(v, 类别));
        val = pickSoft(兼容池, 全池);
        flash池 = 兼容池.length ? 兼容池 : 全池;
      } else {
        val = pick(全池);
        flash池 = 全池;
      }
      if (drawText) await flashOptions(drawText, flash池, val, Math.round(200 + 300 * Math.pow((bi - 6) / 6, 2)));
      RESULT[key] = val;
      if (key === '后发') 后发结果 = val;
      const b = document.createElement('div');
      b.className = 'face-ball';
      const main = document.createElement('div');
      main.className = 'fb-main';
      const l = document.createElement('span'); l.className = 'fb-label'; l.textContent = key;
      const v = document.createElement('span'); v.className = 'fb-value'; v.textContent = val;
      main.appendChild(l); main.appendChild(v);
      b.appendChild(main);
      box.appendChild(b);
      playBall(); await delay(90);
    }
    stopSim();
    playSuccess();
    FACE_REELS.forEach(key => addChip('', RESULT[key]));
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
      balls.push({ el, x: 15 + Math.random() * 200, y: 15 + Math.random() * 200, vx: (Math.random() * 2 - 1) * 18, vy: (Math.random() * 2 - 1) * 18 });
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
        if (sp < 12) { b.vx *= 1.05; b.vy *= 1.05; }
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

  /* ---------- ③ 单色主题：节气转盘 + 起承转合四灯 ---------- */
  async function spin节气() {
    await prelude('单色主题');
    const solars = Object.keys(D.节气色);
    stage.innerHTML = '<div class="module"><h3 class="stage-title">单色主题</h3><div class="solar-layout"><div class="wheel-wrap"><div class="wheel" id="wheel">' + buildSolarWheel(solars) + '</div><div class="pointer"></div></div><div class="group-lights" id="group-lights">' + buildGroupLights() + '</div></div></div>';
    const wheel = $('#wheel');
    const idx = rand(solars.length);
    const slice = 360 / solars.length;
    const target = 360 * 6 + (360 - idx * slice - slice / 2);
    const groups = ['起','承','转','合'];
    const gIdx = rand(4);

    const wheelSpin = (async () => {
      wheel.style.transition = 'none';
      wheel.style.transform = 'rotate(0deg)';
      void wheel.offsetHeight;
      scheduleTicks(3600, playTick, 14);
      wheel.style.transition = 'transform 3600ms cubic-bezier(0.15,0.8,0.2,1)';
      wheel.style.transform = 'rotate(' + target + 'deg)';
      await delay(3850);
    })();
    const lightFlash = flashGroupLights(groups, gIdx, 3600);
    await Promise.all([wheelSpin, lightFlash]);

    const solar = solars[idx];
    RESULT['节气'] = solar;
    RESULT['组'] = groups[gIdx];
    addChip('', solar + '·' + groups[gIdx]);
    playSuccess();
    await delay(400);
  }

  function buildSolarWheel(solars) {
    const n = solars.length, r = 150, cx = 160, cy = 160;
    let paths = '', labels = '';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const large = (a1 - a0) > Math.PI ? 1 : 0;
      const repHex = D.节气色[solars[i]]['起'][0].split(' #')[1];
      paths += '<path d="M' + cx + ',' + cy + ' L' + x0.toFixed(1) + ',' + y0.toFixed(1) + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' Z" fill="#' + repHex + '" stroke="#0b0b10" stroke-width="2.5"/>';
      const am = (a0 + a1) / 2, lr = r * 0.68;
      const lx = cx + lr * Math.cos(am), ly = cy + lr * Math.sin(am);
      labels += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" fill="#fff" stroke="#0b0b10" stroke-width="2.5" paint-order="stroke" font-size="12" text-anchor="middle" dominant-baseline="middle">' + solars[i] + '</text>';
    }
    const coinEdge = '<circle cx="160" cy="160" r="' + (r + 6) + '" fill="none" stroke="#0b0b10" stroke-width="7" stroke-dasharray="9 7"/>';
    const ring = '<circle cx="160" cy="160" r="' + r + '" fill="none" stroke="#3ef2d0" stroke-width="3" opacity=".85"/>';
    return '<svg viewBox="0 0 320 320" class="wheel-svg">' + coinEdge + paths + ring + '<circle cx="160" cy="160" r="26" fill="#0b0b10" stroke="#3ef2d0" stroke-width="2"/><circle cx="160" cy="160" r="10" fill="#f6d77a"/>' + labels + '</svg>';
  }

  function buildGroupLights() {
    return ['起','承','转','合'].map(g => '<span class="gl" title="' + g + '"></span>').join('');
  }

  async function flashGroupLights(groups, gIdx, duration) {
    const lights = document.querySelectorAll('.gl');
    const steps = 12;
    const stepMs = duration / steps;
    for (let i = 0; i < steps; i++) {
      const act = rand(4);
      lights.forEach((l, j) => l.classList.toggle('gl-on', j === act));
      playTick();
      await delay(stepMs);
    }
    lights.forEach((l, j) => l.classList.toggle('gl-on', j === gIdx));
  }

  /* ---------- 纵向滚轮：老虎机四列复用组件 ---------- */
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

  function spinVSlot(reel, duration, tickFn, target) {
    return new Promise(resolve => {
      const { track, items, step } = reel;
      const container = track.parentElement;
      const len = items.length;
      const idx = target ? items.indexOf(target) : rand(len);
      if (idx === -1) { resolve(items[rand(len)]); return; }
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

  /* ---------- 结果卡（按模块排版） ---------- */
  function buildModuleRow(m) {
    const row = document.createElement('div');
    row.className = 'rc-module' + (m.label === '形象角色' ? ' rc-stack' : '') + (m.label === '主色' ? ' rc-center' : '');
    const lab = document.createElement('span'); lab.className = 'rc-mlabel'; lab.textContent = m.label + '：';
    if (m.label === '主色') {
      const solar = RESULT['节气'], group = RESULT['组'];
      const left = document.createElement('span');
      left.className = 'rc-solar-left';
      left.appendChild(lab);
      const t = document.createElement('span');
      t.className = 'rc-chip';
      t.textContent = solar + '·' + group;
      left.appendChild(t);
      row.appendChild(left);
      const band = document.createElement('span');
      band.className = 'rc-colorband';
      if (solar && group && D.节气色[solar] && D.节气色[solar][group]) {
        D.节气色[solar][group].forEach(c => {
          const parts = c.split(' #');
          const sw = document.createElement('span');
          sw.className = 'rc-swatch';
          sw.innerHTML = '<span class="rc-swatch-color" style="background:#' + parts[1] + '"></span><span class="rc-swatch-name">' + parts[0] + '</span><span class="rc-swatch-hex">#' + parts[1] + '</span>';
          band.appendChild(sw);
        });
      }
      row.appendChild(band);
    } else {
      row.appendChild(lab);
      m.keys.forEach(key => {
        const chip = document.createElement('span');
        chip.className = 'rc-chip';
        chip.textContent = RESULT[key];
        row.appendChild(chip);
      });
    }
    return row;
  }

  function renderResult() {
    resultList.innerHTML = '';
    ['朝向', '打光', '形象角色', '主色'].forEach(label => {
      resultList.appendChild(buildModuleRow(MODULES.find(x => x.label === label)));
    });
    applyAccent();
  }

  function applyAccent() {
    const solar = RESULT['节气'], group = RESULT['组'];
    let c = '#e8e6df';
    if (solar && group && D.节气色[solar] && D.节气色[solar][group]) {
      c = '#' + D.节气色[solar][group][0].split(' #')[1];
    }
    resultCard.style.setProperty('--accent', c);
  }

  function applyAtmosphere() {
    backdrop.style.setProperty('--light-overlay', LIGHT_GRAD[RESULT['打光']]);
    backdrop.classList.add('lit');
  }

  function showResult() {
    renderResult();
    applyAccent();
    applyAtmosphere();
    playWin();
    resultMask.classList.remove('hidden');
  }

  function goHome() {
    resultMask.classList.add('hidden');
    stage.innerHTML = '';
    stageStart.classList.remove('hidden');
    chips.classList.add('hidden'); chips.innerHTML = '';
    backdrop.classList.remove('lit');
  }

  /* ---------- 收藏 / 待发展池 ---------- */
  function getPool() { try { return JSON.parse(localStorage.getItem('oc-wheel-pool') || '[]'); } catch (e) { return []; } }
  function setPool(p) { localStorage.setItem('oc-wheel-pool', JSON.stringify(p)); }

  function favorite() {
    const pool = getPool();
    if (btnFav.classList.contains('fav-on')) {
      const idx = pool.findIndex(x => JSON.stringify(x.d) === JSON.stringify(RESULT));
      if (idx !== -1) pool.splice(idx, 1);
      setPool(pool);
      btnFav.classList.remove('fav-on');
      btnFav.textContent = '♡';
      btnFav.title = '收藏';
      showToast('已从收藏池移除');
    } else {
      pool.unshift({ t: Date.now(), d: Object.assign({}, RESULT) });
      setPool(pool);
      btnFav.classList.add('fav-on');
      btnFav.textContent = '♥';
      btnFav.title = '已收藏（点击取消）';
      showToast('已加入收藏池 ♥');
    }
  }

  function openPool() {
    const pool = getPool();
    poolList.innerHTML = '';
    if (!pool.length) { poolList.innerHTML = '<li class="empty">还没有收藏，先摇个带感的</li>'; }
    pool.forEach((item, i) => {
      const li = document.createElement('li');
      const d = new Date(item.t);
      const keys = ['俯仰','水平','脸型','眉','眼','唇','后发','前发','节气','组','打光'];
      const summary = keys.map(k => item.d[k]).join(' · ');
      const head = document.createElement('div'); head.className = 'p-head';
      head.innerHTML = '<span>' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span><button class="p-del" data-i="' + i + '">删除</button>';
      const sum = document.createElement('div'); sum.className = 'p-sum'; sum.textContent = summary;
      li.appendChild(head); li.appendChild(sum);
      li.addEventListener('click', e => {
        if (e.target.classList.contains('p-del')) return;
        viewPoolItem(i);
      });
      poolList.appendChild(li);
    });
    poolMask.classList.remove('hidden');
  }

  function viewPoolItem(i) {
    const item = getPool()[i];
    if (!item) return;
    Object.keys(RESULT).forEach(k => delete RESULT[k]);
    Object.assign(RESULT, item.d);
    poolMask.classList.add('hidden');
    renderResult();
    applyAccent();
    applyAtmosphere();
    btnFav.classList.add('fav-on');
    btnFav.textContent = '♥';
    btnFav.title = '已收藏（点击取消）';
    resultMask.classList.remove('hidden');
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
    Object.keys(RESULT).forEach(k => delete RESULT[k]);
    btnFav.classList.remove('fav-on');
    btnFav.textContent = '♡';
    btnFav.title = '收藏';

    await spin朝向();
    await spinFace();
    await spin节气();
    showResult();
    running = false;
  }

  /* ---------- init ---------- */
  btnSummon.addEventListener('click', run);
  btnAgain.addEventListener('click', run);
  btnResultClose.addEventListener('click', goHome);
  resultMask.addEventListener('click', e => { if (e.target === resultMask) goHome(); });
  btnFav.addEventListener('click', favorite);
  btnPool.addEventListener('click', openPool);
  document.getElementById('btn-pool-top').addEventListener('click', openPool);
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
