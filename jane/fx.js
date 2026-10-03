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
  let enabled = true, outfit = 'bunny';
  const persistent = new Map();   // name -> element (forehead_paper, paper_hands, rabbit_ears)
  const fxUrl = name => `${FX_ROOT}/${name}.${IMG_EXT}`;
  ['FX_PINPRICK', 'FX_BROAD_GLOW', 'FX_GLYPH_LINE', 'FX_SMOKE', 'FX_PAPER_v03', 'FX_RABBIT_EARS']
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

  function marks(emotion) {
    head.replaceChildren(...[...head.children].filter(c => c.dataset.keep));
    if (!emotion) return;
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
    body.classList.remove('act-rise', 'act-recoil', 'act-sink', 'act-settle');
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
  function transient(parent, node, ms) { parent.appendChild(node); setTimeout(() => node.remove(), ms); }
  function shake() { if (!enabled) return; world.classList.remove('shake'); void world.offsetWidth; world.classList.add('shake'); }
  function flash(strength = 0.55) {
    if (!enabled) return;
    flashEl.style.setProperty('--flash', strength);
    flashEl.classList.remove('on'); void flashEl.offsetWidth; flashEl.classList.add('on');
  }

  // ---- event effects --------------------------------------------------------------------------------------
  const EFFECTS = {
    flicker() {
      if (!enabled) return;
      transient(body, sprite(fxUrl('FX_PINPRICK'), 'left:50%;top:44%;width:9%', 'flicker'), 1500);
      transient(body, sprite(fxUrl('FX_BROAD_GLOW'), 'left:50%;top:46%;width:30%', 'flicker dim'), 1500);
    },
    glyph() {
      if (!enabled) return;
      transient(body, sprite(fxUrl('FX_GLYPH_LINE'), 'left:50%;top:44%;width:42%', 'sweep'), 1700);
    },
    broad_glow() {
      if (!enabled) return;
      setTimeout(() => { transient(screen, sprite(fxUrl('FX_BROAD_GLOW'), 'left:50%;top:50%;width:72%', 'bloom'), 2200); flash(0.35); }, 650);
    },
    poof() {
      if (!enabled) return;
      const puff = document.createElement('div');
      puff.className = 'puff'; puff.style.cssText = 'left:50%;top:43%;width:46%';
      // one clump of overlapping balls (a cartoon "poof"), not separate bubbles
      const balls = [[0, 0, 1.25], [-.42, .12, 1], [.44, .1, 1.05], [-.2, -.34, .95], [.24, -.32, .9],
        [-.62, -.12, .75], [.64, -.16, .7], [0, .36, .85], [-.38, .4, .7], [.4, .4, .72]];
      balls.forEach(([x, y, s], i) => {
        const c = document.createElement('span');
        c.style.cssText = `--dx:${x * 100}%;--dy:${y * 100}%;--s:${s};animation-delay:${i * 18}ms`;
        puff.appendChild(c);
      });
      transient(body, puff, 1400);
      transient(body, sprite(fxUrl('FX_SMOKE'), 'left:52%;top:30%;width:16%', 'rise'), 2200);
      for (let i = 0; i < 5; i++) {
        const p = sprite(fxUrl('FX_PAPER_v03'), `left:50%;top:44%;width:${4 + (i % 2) * 2}%;--tx:${(i - 2) * 70}%;--ty:${-60 - (i % 3) * 40}%;--r:${(i - 2) * 70}deg`, 'scatter');
        transient(body, p, 1300);
      }
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
    },
    rabbit_ears() {
      if (persistent.has('rabbit_ears')) return;
      const s = sprite(fxUrl('FX_RABBIT_EARS'), 'left:50%;top:6%;width:66%', enabled ? 'ears' : 'ears-still');
      screen.appendChild(s); persistent.set('rabbit_ears', s);
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
      request._t = setTimeout(() => request.classList.add('hidden'), 3200);
    },
  };

  let currentStage = 1;
  function off(name) {
    const node = persistent.get(name);
    if (!node) return;
    persistent.delete(name);
    if (!enabled) { node.remove(); return; }
    node.classList.add('peel');
    setTimeout(() => node.remove(), 420);
  }

  function clearAll() {
    [...persistent.keys()].forEach(n => { persistent.get(n).remove(); persistent.delete(n); });
    head.replaceChildren(); request.classList.add('hidden');
  }

  return {
    setEnabled(v) { enabled = v; },
    setOutfit(o) { outfit = o; },
    marks, act,
    line(node, stage) {
      currentStage = stage;
      const hay = `${node.cue || ''} ${node.text || ''}`;
      FX_BEATS.filter(b => b.stage === stage && hay.includes(b.match)).forEach(b => {
        (b.off || []).forEach(off);
        (b.on || []).forEach(n => EFFECTS[n]?.());
      });
    },
    scene(tag, stage) {
      currentStage = stage;
      clearAll();
      const [num, title] = tag.split(' · ');
      chapterNum.textContent = num; chapterTitle.textContent = title || '';
      if (!enabled) return;
      chapter.classList.remove('on'); void chapter.offsetWidth; chapter.classList.add('on');
    },
    snapshot: () => [...persistent.keys()],
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
