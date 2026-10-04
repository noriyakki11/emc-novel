'use strict';

// Preload a few at a time: simple static servers drop connections when ~30 images are requested at once.
const preloadQueue = [];
let preloading = 0;
function preload(src) { preloadQueue.push(src); pumpPreload(); }
function pumpPreload() {
  while (preloading < 3 && preloadQueue.length) {
    const img = new Image();
    preloading += 1;
    img.onload = img.onerror = () => { preloading -= 1; pumpPreload(); };
    img.src = preloadQueue.shift();
  }
}

// 연출 층: 감정 연기(카드 움직임), 머리 옆 감정 기호, 지문에 거는 사건 연출, 단계 제목, 의뢰서 알림.
// 연출을 끄면(app의 '즉시 표시') 지나가는 연출은 생략하고, 이마 종이처럼 장면 상태인 것만 남긴다.
const FX = (() => {
  const el = id => document.getElementById(id);
  const world = el('world'), body = el('actorBody'), head = el('fxHead'), screen = el('fxScreen');
  const flashEl = el('flash'), chapter = el('chapter'), chapterNum = el('chapterNum'), chapterTitle = el('chapterTitle');
  const request = el('request'), requestText = el('requestText');
  let enabled = true, outfit = 'bunny', card = 'bunny_startled';
  const persistent = new Map();   // name -> element, including the stage 2 experiment preview
  const timers = new Set(), transients = new Set();
  let stopReveal = null;
  let soundEpoch = 0;
  const EFFECT_TIMES = {
    broad_glow: 2850, spark_pop: 1850, poof: 3400, rabbit_ears: 3500, title_flash: 2600, plate_compare: 2800,
  };
  function later(fn, ms) {
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms);
    timers.add(timer);
    return timer;
  }
  const fxUrl = name => `${FX_ROOT}/${name}.${IMG_EXT}`;
  ['FX_PINPRICK', 'FX_BROAD_GLOW', 'FX_GLYPH_LINE', 'FX_SMOKE', 'FX_PAPER_v03', 'FX_RABBIT_EARS', 'FX_SCROLL_MANGA_v02',
    'FX_HAND_MANGA_v02', 'FX_PLATES_MANGA_v02', 'FX_NOTEBOOK_MANGA_v01']
    .forEach(n => preload(fxUrl(n)));

  // ---- SVG marks ------------------------------------------------------------------------------------------
  const INK = '#2b1d2a';
  const svg = (vb, inner) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  const star = (fill = '#fff6c2', line = '#e3ad3f') =>
    svg('0 0 40 40', `<path d="M20 1 Q23 17 39 20 Q23 23 20 39 Q17 23 1 20 Q17 17 20 1Z" fill="${fill}" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/>`);
  const MARK_SVG = {
    surprise: svg('0 0 120 60', `<g stroke="${INK}" stroke-width="6" stroke-linecap="round"><path d="M60 54 L60 10"/><path d="M42 56 L24 22"/><path d="M78 56 L96 22"/></g>`),
    exclaim: svg('0 0 30 70', `<g fill="#ff5a6e" stroke="${INK}" stroke-width="3" stroke-linejoin="round"><path d="M8 4 H22 L19 46 H11Z"/><circle cx="15" cy="59" r="7"/></g>`),
    anger: svg('0 0 60 60', `<g fill="none" stroke="#e2384d" stroke-width="7" stroke-linecap="round"><path d="M10 25 Q25 25 25 10"/><path d="M35 10 Q35 25 50 25"/><path d="M50 35 Q35 35 35 50"/><path d="M25 50 Q25 35 10 35"/></g>`),
    sweat: svg('0 0 40 60', `<path d="M20 3 C28 19 36 30 36 41 A16 16 0 0 1 4 41 C4 30 12 19 20 3Z" fill="#9edcff" stroke="#2c6a9c" stroke-width="2.6"/><ellipse cx="14" cy="40" rx="4" ry="7" fill="#fff" opacity=".85"/>`),
    gloom: svg('0 0 100 50', `<g stroke="#6c5c9e" stroke-width="5" stroke-linecap="round" opacity=".75"><path d="M14 4 V30"/><path d="M32 4 V44"/><path d="M50 4 V36"/><path d="M68 4 V46"/><path d="M86 4 V28"/></g>`),
    question: svg('0 0 40 60', `<text x="20" y="48" text-anchor="middle" font-size="52" font-weight="900" font-family="Arial Black, sans-serif" fill="#7fc4ff" stroke="${INK}" stroke-width="3" paint-order="stroke">?</text>`),
    dots: svg('0 0 90 54', `<path d="M10 6 H80 Q86 6 86 12 V36 Q86 42 80 42 H34 L22 52 L24 42 H10 Q4 42 4 36 V12 Q4 6 10 6Z" fill="#fff" stroke="${INK}" stroke-width="3"/><g fill="${INK}"><circle cx="28" cy="24" r="5"/><circle cx="45" cy="24" r="5"/><circle cx="62" cy="24" r="5"/></g>`),
    sigh: svg('0 0 70 50', `<g fill="#fff" stroke="#8a7f93" stroke-width="2.5"><circle cx="22" cy="30" r="14"/><circle cx="40" cy="22" r="16"/><circle cx="54" cy="32" r="11"/></g>`),
    note: svg('0 0 40 60', `<path d="M14 44 V8 L34 4 V14 L18 18 V48" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><ellipse cx="11" cy="47" rx="9" ry="7" fill="#d7a0ff" stroke="${INK}" stroke-width="3"/>`),
    fired: svg('0 0 60 60', `<g stroke="#ff8a2a" stroke-width="6" stroke-linecap="round"><path d="M10 50 L26 30"/><path d="M28 54 L44 26"/><path d="M46 50 L56 34"/></g>`),
    star: star(),
  };
  // where each mark sits on her head (card %), size as % of card width, and its animation
  const MARK_PLACE = {
    surprise: h => [[h.cx, h.top - 6, 24, 'pop']],
    exclaim: h => [[h.right + 3, h.top + 1, 6, 'pop']],
    anger: h => [[h.right - 3, h.top + 4, 10, 'throb']],
    sweat: h => [[h.right + 2, h.eyes - 5, 6.5, 'drip']],
    gloom: h => [[h.cx, h.forehead - 2, 24, 'fade']],
    question: h => [[h.right + 3, h.top + 2, 8, 'bob']],
    dots: h => [[h.right + 6, h.top, 13, 'pop']],
    sigh: h => [[h.right + 4, h.eyes + 6, 10, 'float']],
    note: h => [[h.left - 4, h.top + 3, 7, 'bob']],
    fired: h => [[h.right + 4, h.eyes - 1, 9, 'pop']],
    sparkles: h => [[h.left - 3, h.top + 5, 6, 'twinkle'], [h.right + 4, h.top + 1, 7.5, 'twinkle'], [h.right + 6, h.eyes + 5, 5, 'twinkle']],
    shine: h => [[h.right + 4, h.eyes + 1, 6.5, 'twinkle']],
  };

  const sound = (name, opts) => {
    const epoch = soundEpoch;
    if (enabled && typeof Sound !== 'undefined') Sound.play(name, { ...opts, isCurrent: () => enabled && epoch === soundEpoch });
  };

  function marks(emotion) {
    head.replaceChildren(...[...head.children].filter(c => c.dataset.keep));
    if (!emotion) return;
    const first = (EMOTION_MARKS[emotion] || [])[0];
    if (first) sound(`mark_${first}`);
    const h = HEAD[outfit];
    (EMOTION_MARKS[emotion] || []).forEach(kind => {
      (MARK_PLACE[kind] || (() => []))(h).forEach(([x, y, w, anim], i) => {
        const m = document.createElement('div');
        m.className = `mark anim-${enabled ? anim : 'none'}`;
        m.style.cssText = `left:${x}%;top:${y}%;width:${w}%;animation-delay:${i * 120}ms`;
        m.innerHTML = MARK_SVG[kind === 'sparkles' || kind === 'shine' ? 'star' : kind];
        head.appendChild(m);
      });
    });
  }

  // ---- acting: a small whole-card motion when her feeling changes -------------------------------------------
  function act(motion) {
    if (!enabled || !motion) return;
    body.classList.remove('act-rise', 'act-recoil', 'act-sink', 'act-settle', 'act-turn');
    void body.offsetWidth;
    body.classList.add(`act-${motion}`);
  }

  // ---- helpers ----------------------------------------------------------------------------------------------
  function sprite(src, css, cls = '') {
    const s = document.createElement('img');
    s.onerror = () => { if (!s.src.includes('?retry')) s.src = `${src}?retry`; };
    s.src = src; s.alt = ''; s.className = `sprite ${cls}`; s.style.cssText = css;
    return s;
  }
  function transient(parent, node, ms) {
    parent.appendChild(node); transients.add(node);
    later(() => { transients.delete(node); node.remove(); }, ms);
  }

  function positionHandPapers() {
    const wrap = persistent.get('paper_hands');
    if (!wrap) return;
    const points = PAPER_HANDS_POSES[card] || PAPER_HANDS_POSES.bunny_startled;
    [...wrap.children].forEach((paper, i) => {
      paper.style.left = `${points[i][0]}%`;
      paper.style.top = `${points[i][1]}%`;
    });
  }

  // One generated manga scene, shown one frame at a time beside her face.
  function positionScrollFocus(pane = screen.querySelector('.scroll-test')) {
    if (!pane?.isConnected) return;
    const sr = screen.getBoundingClientRect(), ar = el('actor').getBoundingClientRect();
    const margin = 12, faceWidth = ar.width * .31;
    const size = Math.min(Math.max(80, faceWidth * 1.15), sr.width * .46, sr.height * .3);
    const gap = Math.max(12, size * .08);
    const faceLeft = ar.left - sr.left + ar.width * .33;
    const faceRight = ar.left - sr.left + ar.width * .67;
    const faceTop = ar.top - sr.top + ar.height * .2;
    let x = faceRight + gap, y = faceTop - size * .18;
    if (x + size > sr.width - margin) {
      if (faceLeft - gap - size >= margin) x = faceLeft - gap - size;
      else {
        x = sr.width - size - margin;
        const toolbar = el('app').querySelector('.overlay-top').getBoundingClientRect();
        const location = el('locationLabel').getBoundingClientRect();
        y = Math.max(toolbar.bottom - sr.top + 12, location.bottom - sr.top + 8, faceTop - size - 16);
      }
    }
    pane.style.width = `${size}px`;
    pane.style.height = `${size}px`;
    pane.style.setProperty('--cut-font', `${Math.min(15, Math.max(7, size * .07))}px`);
    pane.style.left = `${Math.max(margin, Math.min(x, sr.width - size - margin))}px`;
    pane.style.top = `${Math.max(margin, Math.min(y, sr.height - size - margin))}px`;
  }
  const positionPanels = () => screen.querySelectorAll('.scroll-test').forEach(p => positionScrollFocus(p));
  window.addEventListener('resize', () => requestAnimationFrame(positionPanels));

  function makeScrollFocus() {
    const pane = document.createElement('div');
    pane.className = `scroll-test${currentStage === 1 ? ' single' : ''}${enabled ? ' play' : ''}`;
    pane.dataset.phase = 'ready';
    const view = document.createElement('div'); view.className = 'scroll-test-view';
    const camera = document.createElement('div'); camera.className = 'manga-camera';
    const atlas = document.createElement('img'); atlas.className = 'manga-atlas';
    atlas.src = fxUrl('FX_SCROLL_MANGA_v02'); atlas.alt = '';
    camera.appendChild(atlas); view.appendChild(camera); pane.appendChild(view);
    screen.appendChild(pane);
    positionScrollFocus(pane);
    requestAnimationFrame(() => positionScrollFocus(pane));
    return pane;
  }

  function studyPane(name, asset, kind) {
    if (persistent.has(name)) return persistent.get(name);
    const pane = document.createElement('div');
    pane.className = `scroll-test study-cut ${kind}${enabled ? ' play' : ''}`;
    const view = document.createElement('div'); view.className = 'scroll-test-view';
    const art = document.createElement('img'); art.className = 'study-art'; art.alt = ''; art.src = fxUrl(asset);
    view.appendChild(art); pane.appendChild(view);
    screen.appendChild(pane); persistent.set(name, pane);
    positionScrollFocus(pane);
    requestAnimationFrame(() => positionScrollFocus(pane));
    return pane;
  }

  // Keep visual states, including a changed page/result, when hiding effects or rewinding a choice.
  function snapshot() {
    const names = [...persistent.keys()];
    if (persistent.get('scroll_focus')?.dataset.sheet === 'second') names.push('scroll_second');
    if (['narrow', 'broad', 'results'].includes(persistent.get('plate_focus')?.dataset.phase)) names.push('plate_compare');
    if (persistent.get('notebook_focus')?.dataset.page === 'blank') names.push('notebook_blank');
    return names;
  }

  function paperToForehead(cut) {
    const sr = screen.getBoundingClientRect(), cr = cut.getBoundingClientRect(), ar = el('actor').getBoundingClientRect();
    const h = HEAD[outfit], x = cr.left + cr.width * .5 - sr.left, y = cr.top + cr.height * .5 - sr.top;
    const dx = ar.left + ar.width * (h.cx + 2) / 100 - sr.left - x;
    const dy = ar.top + ar.height * (h.forehead + 3) / 100 - sr.top - y;
    const bit = sprite(fxUrl('FX_PAPER_v03'), `left:${x}px;top:${y}px;width:${ar.width * .12}px`, 'flying-scrap');
    transient(screen, bit, 820);
    bit.animate([
      { transform: 'translate(-50%,-50%) scale(.35) rotate(30deg)' },
      { transform: `translate(calc(-50% + ${dx * .55}px),calc(-50% + ${dy * .5 - 35}px)) scale(.8) rotate(150deg)`, offset: .5 },
      { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(348deg)` },
    ], { duration: 780, easing: 'ease-out', fill: 'both' });
    later(() => EFFECTS.forehead_paper(), 780);
  }

  function chargeManga(cut, ms) {
    cut.classList.add('zooming');
    const charge = document.createElement('div'); charge.className = 'manga-charge';
    charge.style.setProperty('--charge-time', `${ms}ms`);
    transient(cut.querySelector('.scroll-test-view'), charge, ms);
  }

  function burstManga(cut, word, fragments = false) {
    cut.classList.remove('burst'); void cut.offsetWidth; cut.classList.add('burst');
    const ink = document.createElement('div'); ink.className = 'manga-burst-ink';
    const core = document.createElement('div'); core.className = 'manga-impact-core';
    const caption = document.createElement('strong'); caption.className = 'manga-sfx'; caption.textContent = word;
    ink.append(core, caption);
    if (fragments) {
      for (let i = 0; i < 7; i++) {
        const bit = document.createElement('i'); bit.className = 'manga-fragment';
        const angle = (i * 51 - 120) * Math.PI / 180, radius = cut.offsetWidth * .54;
        bit.style.cssText = `--dx:${Math.cos(angle) * radius}px;--dy:${Math.sin(angle) * radius}px;--spin:${i % 2 ? 260 : -230}deg`;
        ink.appendChild(bit);
      }
    }
    transient(cut.querySelector('.scroll-test-view'), ink, 1050);
    act('recoil');
  }

  // the hero seen from behind: one dark shape (head with nape tufts, neck, shoulders), lit from above once the ears appear
  const HERO_HEAD = 'M128 334 L94 316 C58 266 46 186 70 136 C96 82 146 46 204 44 C266 42 318 80 336 138 '
    + 'C354 196 342 266 306 316 L272 334 L254 356 L236 328 L217 362 L199 330 L181 360 L163 328 L145 352 Z';
  const HERO_BODY = 'M150 330 H250 L262 372 C312 380 372 404 400 448 V520 H0 V448 C28 404 88 380 138 372 Z';
  const HERO_COLLAR = 'M138 372 C170 394 230 394 262 372';
  // a few loose hair strands near the crown so the shape reads as hair from behind, not a rock (not all meeting at one point)
  const HERO_STRANDS = ['M200 112 C176 140 140 186 122 250', 'M212 116 C204 170 196 226 192 300', 'M222 114 C252 150 280 196 290 262',
    'M196 106 C160 102 120 124 96 168', 'M228 108 C262 104 296 122 318 160'];
  const HERO_SVG = svg('0 0 400 520', '<defs>'
    + `<clipPath id="heroHeadClip"><path d="${HERO_HEAD}"/></clipPath>`
    + '<linearGradient id="heroRimGrad" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0" stop-color="#fff0c4" stop-opacity="1"/><stop offset=".3" stop-color="#ffd596" stop-opacity=".55"/>'
    + '<stop offset=".62" stop-color="#ffd596" stop-opacity="0"/></linearGradient></defs>'
    + `<g class="hero-shape"><path d="${HERO_BODY}"/><path d="${HERO_HEAD}"/></g>`
    + `<path d="${HERO_COLLAR}" fill="none" stroke="#2c2130" stroke-width="5" stroke-linecap="round"/>`
    + `<g clip-path="url(#heroHeadClip)" fill="none" stroke="#2a1f2d" stroke-width="4" stroke-linecap="round" opacity=".75">${HERO_STRANDS.map(d => `<path d="${d}"/>`).join('')}</g>`
    + `<path class="hero-rim" d="${HERO_HEAD}" fill="none" stroke="url(#heroRimGrad)" stroke-width="16" clip-path="url(#heroHeadClip)"/>`);

  // a light that leaves the glyph in front of her and arcs onto the hero's head, with a short trail
  function orb(cut) {
    const sr = screen.getBoundingClientRect(), ar = el('actor').getBoundingClientRect();
    const hr = persistent.get('hand_focus')?.getBoundingClientRect();
    const sx = (hr ? hr.left + hr.width * .47 : ar.left + ar.width * .5) - sr.left;
    const sy = (hr ? hr.top + hr.height * .53 : ar.top + ar.height * .55) - sr.top;
    const ex = cut.offsetLeft + cut.offsetWidth * .5, ey = cut.offsetTop + cut.offsetHeight * .1;
    const mx = (sx + ex) / 2, my = Math.min(sy, ey) - sr.height * .14;
    for (let i = 0; i < 5; i++) {
      const o = document.createElement('div');
      o.className = 'hero-orb';
      transient(screen, o, 1450);
      const s = 1 - i * .14;
      o.animate([
        { transform: `translate(${sx}px, ${sy}px) scale(${.4 * s})`, opacity: 0 },
        { transform: `translate(${mx}px, ${my}px) scale(${s})`, opacity: 1 - i * .16, offset: .55 },
        { transform: `translate(${ex}px, ${ey}px) scale(${1.4 * s})`, opacity: 1 - i * .16, offset: .9 },
        { transform: `translate(${ex}px, ${ey}px) scale(${2.4 * s})`, opacity: 0 },
      ], { duration: 1000, delay: 160 + i * 22, easing: 'cubic-bezier(.45, .05, .4, 1)', fill: 'both' }).onfinish = () => o.remove();
    }
  }
  function shake() { if (!enabled) return; world.classList.remove('shake'); void world.offsetWidth; world.classList.add('shake'); }
  function flash(strength = 0.55) {
    if (!enabled) return;
    flashEl.style.setProperty('--flash', strength);
    flashEl.classList.remove('on'); void flashEl.offsetWidth; flashEl.classList.add('on');
  }

  // ---- event effects --------------------------------------------------------------------------------------
  const EFFECTS = {
    scroll_focus() {
      if (!persistent.has('scroll_focus')) persistent.set('scroll_focus', makeScrollFocus());
    },
    scroll_second() {
      EFFECTS.scroll_focus();
      const cut = persistent.get('scroll_focus'); cut.dataset.sheet = 'second';
      if (!enabled || cut.classList.contains('sheet-swap')) return;
      cut.classList.add('sheet-swap');
      for (const kind of ['old', 'new']) {
        const sheet = document.createElement('div'); sheet.className = `swap-sheet ${kind}`;
        sheet.innerHTML = svg('0 0 50 60', '<path d="M25 7 L30 15 L28 35 L37 35 L37 39 L28 39 L28 50 L22 50 L22 39 L13 39 L13 35 L22 35 L20 15 Z" fill="none" stroke="#544946" stroke-width="2"/>');
        transient(cut.querySelector('.scroll-test-view'), sheet, 650);
      }
      sound('peel', { rate: 1.2 });
      later(() => cut.classList.remove('sheet-swap'), 640);
    },
    research_focus() {
      const pane = studyPane('research_focus', 'FX_HAND_MANGA_v02', 'research-cut');
      if (!pane.querySelector('.rune-point')) pane.querySelector('.scroll-test-view').insertAdjacentHTML('beforeend', '<i class="rune-point"></i>');
    },
    research_repeat() {
      EFFECTS.research_focus();
      const pane = persistent.get('research_focus');
      if (enabled) pane.classList.add('repeating');
    },
    hand_focus() {
      const pane = studyPane('hand_focus', 'FX_HAND_MANGA_v02', 'hand-cut');
      if (!pane.querySelector('.rune-point')) pane.querySelector('.scroll-test-view').insertAdjacentHTML('beforeend', '<i class="rune-point"></i>');
    },
    plate_focus() {
      const pane = studyPane('plate_focus', 'FX_PLATES_MANGA_v02', 'plate-cut');
      if (!pane.querySelector('.plate-light')) pane.querySelector('.scroll-test-view').insertAdjacentHTML('beforeend', '<i class="plate-light narrow"></i><i class="plate-light broad"></i>');
      pane.dataset.phase ||= 'ready';
    },
    plate_compare() {
      EFFECTS.plate_focus();
      const pane = persistent.get('plate_focus');
      if (!enabled) { pane.dataset.phase = 'results'; return; }
      pane.dataset.phase = 'narrow'; sound('fx_scroll_success');
      later(() => { pane.dataset.phase = 'broad'; sound('fx_scroll_success'); }, 1100);
      later(() => { pane.dataset.phase = 'results'; }, 2350);
    },
    notebook_focus() {
      const pane = studyPane('notebook_focus', 'FX_NOTEBOOK_MANGA_v01', 'notebook-cut');
      if (!pane.querySelector('.notebook-title')) {
        const title = document.createElement('span'); title.className = 'notebook-title';
        title.textContent = '천지를\n뒤바꿀\n주문서'; pane.querySelector('.scroll-test-view').appendChild(title);
      }
      pane.dataset.page ||= 'title';
    },
    notebook_blank() {
      EFFECTS.notebook_focus();
      const pane = persistent.get('notebook_focus'); pane.dataset.page = 'blank';
      if (enabled) { pane.classList.add('page-turn'); sound('peel'); }
    },
    flicker() {
      if (!enabled) return;
      const camera = persistent.get('scroll_focus')?.querySelector('.manga-camera');
      if (camera) {
        const light = document.createElement('div'); light.className = 'manga-light';
        transient(camera, light, 1500);
      } else {
        transient(body, sprite(fxUrl('FX_PINPRICK'), 'left:50%;top:44%;width:9%', 'flicker'), 1500);
        transient(body, sprite(fxUrl('FX_BROAD_GLOW'), 'left:50%;top:46%;width:30%', 'flicker dim'), 1500);
      }
    },
    spark_pop() {
      if (!enabled) return;
      const cut = persistent.get('scroll_focus');
      if (!cut) return;
      cut.dataset.phase = 'charge'; chargeManga(cut, 650);
      sound('fx_flicker');
      later(() => {
        cut.dataset.phase = 'spark'; burstManga(cut, '팍!');
        sound('fx_poof', { volume: .85 });
      }, 650);
      // This first mishap extinguishes the light, leaving the sheet for the hand accident.
      later(() => { cut.dataset.phase = 'ready'; cut.classList.remove('zooming', 'burst'); }, 1750);
    },
    glyph() {
      if (!enabled) return;
      transient(body, sprite(fxUrl('FX_GLYPH_LINE'), 'left:50%;top:44%;width:42%', 'sweep'), 1700);
    },
    broad_glow() {
      if (!enabled) return;
      later(() => { transient(screen, sprite(fxUrl('FX_BROAD_GLOW'), 'left:50%;top:50%;width:72%', 'bloom'), 2200); flash(0.35); }, 650);
    },
    poof() {
      const pane = persistent.get('scroll_focus');
      persistent.delete('scroll_focus');
      if (!enabled) { pane?.remove(); return; }
      const cut = pane || makeScrollFocus();
      cut.classList.remove('sheet-swap'); cut.querySelectorAll('.swap-sheet').forEach(n => n.remove());
      cut.dataset.phase = 'zoom'; chargeManga(cut, 950);
      transient(screen, cut, EFFECT_TIMES.poof);
      // Hold the impact long enough to read, then show where the sheet used to be.
      later(() => {
        cut.dataset.phase = 'burst'; burstManga(cut, '펑!', true);
        sound('fx_poof'); sound('fx_poof_paper', { delay: 0.08 });
        later(() => paperToForehead(cut), 350);
        later(() => { cut.dataset.phase = 'spent'; }, 1000);
        later(() => cut.classList.add('closing'), 1950);
      }, 950);
    },
    paper_flick() {
      if (!enabled) return;
      const sr = screen.getBoundingClientRect(), ar = el('actor').getBoundingClientRect();
      const x = ar.left - sr.left + ar.width * .61, y = ar.top - sr.top + ar.height * .45;
      const dx = sr.width - x + 60;
      for (let i = 0; i < 3; i++) {
        const paper = sprite(fxUrl('FX_PAPER_v03'),
          `left:${x + i * 3}px;top:${y + i * 4}px;width:${Math.max(24, ar.width * .085)}px;` +
          `--r:${i * 13 - 10}deg;--mx:${dx * .35}px;--my:${-sr.height * .1}px;` +
          `--dx:${dx}px;--dy:${sr.height * .08}px;animation-delay:${i * 25}ms`, 'paper-flick');
        transient(screen, paper, 650);
      }
      sound('peel', { volume: .65, rate: 1.35 });
    },
    forehead_paper() {
      if (persistent.has('forehead_paper')) return;
      const h = HEAD[outfit];
      const p = sprite(fxUrl('FX_PAPER_v03'), `left:${h.cx + 2}%;top:${h.forehead + 3}%;width:12%;--r:-12deg`, enabled ? 'stick' : 'stuck');
      p.dataset.keep = '1';
      head.appendChild(p); persistent.set('forehead_paper', p);
    },
    paper_hands() {
      if (persistent.has('paper_hands')) return;
      const wrap = document.createElement('div');
      wrap.className = 'paper-hands'; wrap.dataset.keep = '1';
      wrap.append(
        sprite(fxUrl('FX_PAPER_v03'), 'left:31%;top:43%;width:8%;--r:-20deg', enabled ? 'stick jiggle' : 'stuck'),
        sprite(fxUrl('FX_PAPER_v03'), 'left:70%;top:41%;width:7.5%;--r:16deg', enabled ? 'stick jiggle' : 'stuck'),
      );
      body.appendChild(wrap); persistent.set('paper_hands', wrap);
      positionHandPapers();
    },
    // Retreat behind the player's eye, reveal only a little of the head, then return before dialogue resumes.
    rabbit_ears() {
      if (!enabled || stopReveal) return;
      const cut = document.createElement('div');
      cut.className = 'hero-cut camera-reveal';
      cut.innerHTML = HERO_SVG;
      const ears = document.createElement('img');
      ears.className = 'hero-ears'; ears.alt = ''; ears.src = fxUrl('FX_RABBIT_EARS');
      cut.appendChild(ears);
      screen.appendChild(cut); transients.add(cut);
      orb(cut);
      const app = el('app'), hand = persistent.get('hand_focus');
      app.classList.add('cutin', 'player-reveal');
      const finish = Playback.begin();
      let frame = 0;
      const start = performance.now(), ease = t => t * t * (3 - 2 * t);
      const reset = () => {
        cancelAnimationFrame(frame);
        if (typeof Stage3D !== 'undefined') Stage3D?.playerReveal(0);
        app.classList.remove('cutin', 'player-reveal'); app.style.removeProperty('--reveal');
        if (hand) hand.style.opacity = '';
        cut.remove(); transients.delete(cut); stopReveal = null; positionPanels(); finish();
      };
      stopReveal = reset;
      const tick = now => {
        const t = now - start;
        const k = t < 1200 ? ease(Math.min(1, t / 1200)) : t < 2300 ? 1 : 1 - ease(Math.min(1, (t - 2300) / 1200));
        app.style.setProperty('--reveal', k);
        if (typeof Stage3D !== 'undefined') Stage3D?.playerReveal(k);
        cut.style.opacity = Math.min(1, k * 2);
        cut.style.transform = `translateY(${(1 - k) * 80}%)`;
        if (hand) hand.style.opacity = 1 - Math.min(1, k * 2);
        if (t >= 1200) cut.classList.add('ears-visible');
        if (t >= EFFECT_TIMES.rabbit_ears) { reset(); return; }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    },
    title_flash() {
      if (!enabled) return;
      const t = document.createElement('div');
      t.className = 'title-flash'; t.textContent = `“${TITLE_FLASH}”`;
      transient(screen, t, 2600);
      EFFECTS.sparkles_screen();
      flash(0.3);
    },
    sparkles_screen() {
      if (!enabled) return;
      for (let i = 0; i < 9; i++) {
        const s = document.createElement('div');
        s.className = 'mark anim-twinkle screen-spark';
        s.style.cssText = `left:${22 + (i * 37) % 56}%;top:${14 + (i * 23) % 40}%;width:${2.2 + (i % 3)}%;animation-delay:${i * 90}ms`;
        s.innerHTML = MARK_SVG.star;
        transient(screen, s, 2200);
      }
    },
    flash() { flash(0.5); },
    shake,
    request() {
      requestText.textContent = REQUESTS[currentStage] || '';
      request.classList.remove('hidden', 'show'); void request.offsetWidth;
      request.classList.add('show');
      clearTimeout(request._t);
      request._t = later(() => request.classList.add('hidden'), 3200);
    },
  };

  let currentStage = 1;
  function off(name) {
    const node = persistent.get(name);
    if (!node) return;
    persistent.delete(name);
    if (name === 'scroll_focus' || node.classList.contains('study-cut')) { node.remove(); return; }
    if (!enabled) { node.remove(); return; }
    sound('peel');
    node.classList.add('peel');
    transients.add(node);
    later(() => { transients.delete(node); node.remove(); }, name === 'rabbit_ears' ? 500 : 420);
  }

  function clearAll() {
    soundEpoch += 1;
    stopReveal?.();
    timers.forEach(clearTimeout); timers.clear();
    transients.forEach(node => node.remove()); transients.clear();
    [...persistent.keys()].forEach(n => { persistent.get(n).remove(); persistent.delete(n); });
    clearTimeout(el('app')._cutin); el('app').classList.remove('cutin');
    head.replaceChildren(); request.classList.add('hidden');
    chapter.classList.remove('on'); flashEl.classList.remove('on'); world.classList.remove('shake');
    body.classList.remove('act-rise', 'act-recoil', 'act-sink', 'act-settle', 'act-turn');
  }

  return {
    setEnabled(v) {
      Playback.setEnabled(v);
      enabled = v;
      if (!v) {
        const names = snapshot();
        clearAll();
        names.forEach(name => EFFECTS[name]?.());
      }
    },
    setOutfit(o) { outfit = o; },
    setCard(id) { card = id; positionHandPapers(); positionPanels(); },
    marks, act,
    line(node, stage) {
      currentStage = stage;
      const hay = `${node.cue || ''} ${node.text || ''}`;
      FX_BEATS.filter(b => b.stage === stage && hay.includes(b.match)).forEach(b => {
        if (enabled && b.pause) Playback.hold(Math.max(0, ...(b.on || []).map(n => EFFECT_TIMES[n] || 0)));
        (b.on || []).forEach(n => {
          EFFECTS[n]?.();
          if (n !== 'poof') sound(`fx_${n}`);
        });
        // poof takes ownership of the live preview before its persistent state is cleared.
        (b.off || []).forEach(off);
      });
    },
    scene(tag, stage) {
      currentStage = stage;
      clearAll();
      const [num, title] = tag.split(' · ');
      chapterNum.textContent = num; chapterTitle.textContent = title || '';
      if (!enabled) return;
      Playback.hold(1900);
      sound('chapter');
      chapter.classList.remove('on'); void chapter.offsetWidth; chapter.classList.add('on');
    },
    snapshot,
    restore(names, stage) {
      currentStage = stage;
      const was = enabled; enabled = false;
      clearAll();
      names.forEach(n => EFFECTS[n]?.());
      enabled = was;
    },
    clearAll,
  };
})();
