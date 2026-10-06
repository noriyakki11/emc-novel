'use strict';

// Relationship preview player. ?who=jane|jane2|maya plays one evening and ends on the locked next stories (Maya's
// Lv.2 bed scene was cut from the contest build, 10-07; an unknown name shows the picker).
// The game cannot read anything back from the page (the evening screen records the visit itself), so nothing is sent.
// A story with `space` starts in Maya's 3D room (space.js): the house door opens and the camera walks in; 'living'
// then stands her character card in that room, 'bedroom' walks on to the closed bedroom door and cuts under black
// to the complete bedroom CGs (`sc` per line). Without WebGL (or ?flat) the 2D background / CGs show at once.
const params = new URLSearchParams(location.search);
// The source folder has no 3D room nor loader beside it (build.py puts them in web_dist/rel and web_dist/jane/3d): opened
// from here the rooms could not load and the scenes fell back to 2D. Go to the built copy instead.
if (/\/relationship_preview\/(index\.html)?$/.test(location.pathname)) location.replace(`../web_dist/rel/${location.search}`);
const WHO = params.get('who');
const story = PREVIEW_STORIES[WHO];
const $ = id => document.getElementById(id);
const ui = {
  app: $('app'), bg: $('bg'), bgB: $('bgB'), spaceRoom: $('spaceRoom'), actor: $('actor'), body: $('actorBody'),
  cards: [$('cardA'), $('cardB')], title: $('title'), place: $('place'), hearts: $('hearts'), chapter: $('chapter'),
  chapterNum: $('chapterNum'), chapterTitle: $('chapterTitle'), box: $('dialogueBox'), speaker: $('speaker'),
  text: $('text'), choices: $('choicePanel'), next: $('nextBtn'), end: $('endCard'), endName: $('endName'),
  endHearts: $('endHearts'), endLevel: $('endLevel'), endNext: $('endNext'), picker: $('picker'), black: $('black'),
  status: $('spaceStatus'), door: $('doorBtn')
};

const MAX_LEVEL = 5;
const LEVEL = story ? (story.level || 1) : 1;
let queue = [];          // lines still to play (a choice splices its branch in)
let typing = null;       // { full, shown, timer }
let current = null;      // the line on screen
let shownCard = -1;      // which of the two card images is visible
let cardEmotion = '';
let cardToken = 0;
let state = 'intro';     // intro | line | choice | end
let choiceAt = 0;        // when the choices appeared (a click in the first moment is the previous line's)
let space = null;        // the 3D room (space.js) once it is up
let roomCard = null;     // her card standing in the 3D room
let queueEnd = null;     // set while a short run of lines plays before the main ones (the lines at the door)
let autoOn = false;
let screen = '', screenLayer = 0;

const wait = ms => new Promise(r => setTimeout(r, ms));

function heartsHtml(on) {
  let html = '';
  for (let i = 1; i <= MAX_LEVEL; i++) html += i <= on ? '<span class="on">♥</span>' : '<span>♡</span>';
  return html;
}

function preload(src) { const im = new Image(); im.src = src; }

// a line's sound (the 3D room's player when it is up; the same files otherwise). 'knock' is two soft thuds.
function sfx(name, volume = .3) {
  if (!name) return;
  if (name === 'knock') { sfx('thud', .32); setTimeout(() => sfx('thud', .28), 260); return; }
  if (space) { space.sound(name, volume); return; }
  const a = new Audio(`../jane/assets/sfx/${name}.ogg`);
  a.volume = volume;
  a.play().catch(() => {});
}

function setCard(emotion) {
  if (!emotion || emotion === cardEmotion || !story.card) return;
  cardEmotion = emotion;
  const motion = (PREVIEW_EMOTIONS[emotion] || {}).motion;
  if (roomCard) {
    roomCard.setImage(story.card(emotion));
    if (motion) roomCard.act(motion, story.cardFit === 'full');
    return;
  }
  const token = ++cardToken;           // fast clicking: only the latest face may show
  const nextIndex = shownCard === 0 ? 1 : 0;
  const img = ui.cards[nextIndex];
  const show = () => {
    if (token !== cardToken) return;
    img.onload = null;
    ui.cards.forEach((c, i) => c.classList.toggle('shown', i === nextIndex));
    shownCard = nextIndex;
  };
  img.onload = show;
  img.src = story.card(emotion);
  if (img.complete && img.naturalWidth > 0) show();
  ui.body.className = 'actor-body';
  if (motion) { void ui.body.offsetWidth; ui.body.classList.add('act-' + motion); }
}

// A complete CG fills the screen (the bedroom scenes); a change crossfades between the two background layers.
function setScreen(id) {
  if (!id || id === screen || !story.screen) return;
  screen = id;
  const layers = [ui.bg, ui.bgB];
  const next = layers[screenLayer ^ 1];
  next.style.backgroundImage = `url("${story.screen(id)}")`;
  next.classList.add('shown');
  layers[screenLayer].classList.remove('shown');
  screenLayer ^= 1;
}

function stopTyping() {
  if (typing) { clearInterval(typing.timer); ui.text.textContent = typing.full; typing = null; }
}

function typeText(full, pace) {
  stopTyping();
  const chars = Array.from(full);
  typing = { full, shown: 0, timer: 0 };
  ui.text.textContent = '';
  typing.timer = setInterval(() => {
    if (!typing) return;
    typing.shown += 1;
    ui.text.textContent = chars.slice(0, typing.shown).join('');
    if (typing.shown >= chars.length) { clearInterval(typing.timer); typing = null; }
  }, pace);
}

// Line fields beyond {n}/{p}/{s, e, t}: `a` an action card for that line (her hood cards like record_stacks), `sfx` a
// sound as it shows, `off` a voice from where she is not seen (her card stays as it is).
function showLine(line) {
  current = line;
  if (line.sc) setScreen(line.sc);
  if (line.sfx) sfx(line.sfx, line.vol);
  // `prop`: a thing set down in the 3D room as the line shows (her Lv.2 gift vial, at story.space.props[name])
  if (line.prop && space && story.space.props && story.space.props[line.prop]) space.placeVial(story.space.props[line.prop]);
  ui.box.classList.remove('narration', 'player');
  if (line.n) {
    ui.box.classList.add('narration');
    ui.speaker.textContent = '';
    if (line.a) setCard(line.a);
    typeText(line.n, 24);
  } else if (line.p) {
    ui.box.classList.add('player');
    ui.speaker.textContent = '나';
    typeText(line.p, 24);
  } else {
    ui.speaker.textContent = story.name;
    if (!line.off) setCard(line.a || line.e);
    typeText(line.t, (PREVIEW_EMOTIONS[line.e] || {}).pace || 26);
  }
  ui.next.textContent = queue.length || queueEnd ? '다음' : '마치기';   // the lines at the door are not the end
}

function showChoice(options) {
  state = 'choice';
  ui.choices.innerHTML = '';
  options.forEach((opt, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice-button';
    b.innerHTML = `<span class="choice-number">${i + 1}</span><span></span>`;
    b.lastChild.textContent = '「' + opt.label + '」';
    b.addEventListener('click', ev => { ev.stopPropagation(); pick(i); });
    ui.choices.appendChild(b);
  });
  ui.choices.classList.remove('hidden');
  ui.next.classList.add('hidden');
  // no focus on a button: a held Enter / Space must not pick for the player
  choiceAt = Date.now();
}

function pick(i) {
  if (state !== 'choice' || Date.now() - choiceAt < 400) return;
  const opt = current.choice[i];
  if (!opt) return;
  ui.choices.classList.add('hidden');
  ui.next.classList.remove('hidden');
  queue = [{ p: opt.label }].concat(opt.lines, queue);
  state = 'line';
  advance();
}

function advance() {
  if (state === 'end' || state === 'intro') return;
  if (state === 'choice') return;
  if (typing) { stopTyping(); return; }
  const line = queue.shift();
  if (!line) {
    if (queueEnd) { const done = queueEnd; queueEnd = null; done(); return; }
    finish(); return;
  }
  if (line.choice) {
    current = line;
    ui.box.classList.remove('narration', 'player');
    ui.speaker.textContent = '';
    ui.text.textContent = '무엇이라고 할까?';
    showChoice(line.choice);
    return;
  }
  showLine(line);
}

function finish() {
  state = 'end';
  ui.endName.textContent = story.name;
  ui.endHearts.innerHTML = heartsHtml(LEVEL);
  ui.endLevel.textContent = `인연 ${LEVEL}단계`;
  ui.hearts.innerHTML = heartsHtml(LEVEL);
  ui.endNext.innerHTML = '';
  story.next.forEach((n, i) => {
    const li = document.createElement('li');
    li.style.animationDelay = (0.6 + i * 0.12) + 's';
    li.innerHTML = `<span class="lv">♡${n.level}</span><span class="tt"></span><span class="lock" aria-label="잠김"></span>`;
    const tt = li.querySelector('.tt');
    if (n.title) tt.textContent = '「' + n.title + '」'; else { tt.textContent = '???'; tt.classList.add('unknown'); }
    ui.endNext.appendChild(li);
  });
  ui.end.classList.remove('hidden');
}

function firstOf(key) { const l = story.lines.find(x => x[key]); return l ? l[key] : ''; }

function beginLines() {
  ui.box.classList.add('shown');
  state = 'line';
  advance();
  if (AUTO && !autoOn) { autoOn = true; setTimeout(autoTick, AUTO_MS); }
}

// A few lines before the main ones (at the closed door), then the box goes away for the walk in.
function playLines(lines) {
  const main = queue;
  queue = lines.slice();
  return new Promise(resolve => {
    queueEnd = () => { state = 'intro'; ui.box.classList.remove('shown'); queue = main; resolve(); };
    beginLines();
  });
}

function chapterTitle() {
  ui.chapterNum.textContent = `인연 ${LEVEL}단계`;
  ui.chapterTitle.textContent = `「${story.title}」`;
  ui.chapter.classList.remove('on'); void ui.chapter.offsetWidth;
  ui.chapter.classList.add('on');
}

// 2D: the background (or the first CG) and her card, at once.
function start2D() {
  ui.app.classList.remove('space');
  if (story.space && story.space.door) queue = story.space.door.concat(queue);   // the lines at the door come first
  if (story.screen) setScreen(firstOf('sc'));
  else { ui.bg.style.backgroundImage = `url("${story.background}")`; ui.bg.classList.add('shown'); }
  chapterTitle();
  setTimeout(() => {
    if (!story.screen) { ui.actor.classList.add('shown'); const f = firstOf('e'); if (f) setCard(f); }
    beginLines();
  }, 1900);
}

// Where she stands to talk: `dist` metres in front of the talking view's camera, on its line of sight (Jane's growth
// novel stands her about 2 m away so the card fills the frame like the 2D novel's). ?cam=eyeZ,targetZ,lens,dist tunes
// it in check runs.
function talkSpot() {
  const s = story.space;
  const talk = { eye: s.talk.eye.slice(), target: s.talk.target.slice(), lens: s.talk.lens };
  let dist = s.dist || 2, offset = s.offset || 0, height = s.height;
  if (AUTO && params.get('cam')) {
    const [ez, tz, ln, d, off, h] = params.get('cam').split(',').map(Number);
    if (ez) talk.eye[2] = ez;
    if (tz) talk.target[2] = tz;
    if (ln) talk.lens = ln;
    if (d) dist = d;
    if (!Number.isNaN(off) && off !== undefined) offset = off;
    if (h) height = h;
  }
  const dx = talk.target[0] - talk.eye[0], dy = talk.target[1] - talk.eye[1], len = Math.hypot(dx, dy);
  // `sink`: the card stands lowered by this share of its height (cards whose drawn feet end above the lower edge)
  const z = s.sink ? -s.sink * height : 0.03;
  if (s.foot && !(AUTO && params.get('cam'))) return { talk, offset, height, foot: [s.foot[0], s.foot[1], z] };
  return { talk, offset, height, foot: [talk.eye[0] + dx / len * dist, talk.eye[1] + dy / len * dist, z] };
}

function doorClick() {
  return new Promise(resolve => {
    ui.door.classList.remove('hidden');
    const go = () => { ui.door.classList.add('hidden'); document.removeEventListener('keydown', key); resolve(); };
    const key = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } };
    ui.door.onclick = ev => { ev.stopPropagation(); go(); };
    document.addEventListener('keydown', key);
    if (AUTO) setTimeout(go, 1200);
  });
}

// ?auto=1 (checks and recordings — tools cannot click inside the game's web view): the door opens by itself, lines
// advance every AUTO_MS and the first choice is taken.
const AUTO = params.has('auto');
const AUTO_MS = Math.max(600, Number(params.get('auto')) > 1 ? Number(params.get('auto')) : 2200);
function autoTick() {
  if (state === 'end') return;
  if (state === 'choice') { choiceAt = 0; pick(0); }
  else if (state === 'line') { stopTyping(); advance(); }
  setTimeout(autoTick, AUTO_MS);
}

async function startSpace() {
  ui.app.classList.add('space');
  ui.status.textContent = `${story.name}의 방을 준비하고 있어요…`;
  ui.status.classList.remove('hidden');
  const living = story.space.kind === 'living';
  const spot = living ? talkSpot() : null;
  // the player walks in at the talking view's eye height (or the scene's own), the same from the house door on
  const rig = story.space.rig || null;   // a room with its own authored camera path keeps it (eye height included)
  const eyeHeight = spot ? spot.talk.eye[2] : (story.space.eye || 0);
  const mod = await import('./space.js?v=9bd731b0');
  space = await Promise.race([
    mod.startSpace({ container: ui.spaceRoom, eyeHeight, rig,
      onStep: s => { if (AUTO) console.log('[rel] 3D step', s, Math.round(performance.now())); } }),
    wait(20000).then(() => { throw new Error('3D room timeout'); })
  ]);
  const arrive = story.space.arrive || null;
  if (living) {
    // she already stands in her room behind the closed door, so the walk-in finds her there (busy, where `arrive` says)
    const from = arrive && arrive.from ? [arrive.from[0], arrive.from[1], spot.foot[2]] : spot.foot;
    roomCard = space.addCard(from, spot.height);
    const f = (arrive && arrive.card) || firstOf('e');
    if (f) { cardEmotion = f; roomCard.setImage(story.card(f)); }
    const t0 = performance.now();
    while (!roomCard.ready && performance.now() - t0 < 4000) { await wait(50); space.tick(); }
    space.tick();
  }
  ui.status.classList.add('hidden');
  chapterTitle();
  await wait(2300);            // the chapter title has faded before the door prompt shows
  if (story.space.door) await playLines(story.space.door);
  await doorClick();
  await space.enterLiving(spot ? spot.offset : 0, spot ? spot.talk : null);
  if (living && arrive) {
    // she notices: puts down what she held, (a start on seeing who it is,) turns to the door (her first expression)
    // and comes over
    await wait(450);
    if (arrive.put) sfx(arrive.put, .35);
    if (arrive.notice) { await wait(220); setCard(arrive.notice); await wait(650); }
    else await wait(380);
    sfx('turn', .3);
    setCard(firstOf('e'));
    await wait(260);
    if (arrive.from) await roomCard.moveTo(spot.foot, arrive.ms || 900);
    await wait(250);
  }
  // ?pick=x,y;x,y (checks): the Blender points under those screen pixels, once she is in place
  if (AUTO && params.get('pick')) params.get('pick').split(';').forEach(xy => {
    const [x, y] = xy.split(',').map(Number);
    console.log('[rel] pick', x, y, JSON.stringify(space.pick(x, y)));
  });
  if (living && story.space.card3d) {
    // she stays the card standing in the room through the talk (user 10-06): lit, sized and hidden by the furniture
    // like the room around her; expressions swap on the same card. Standing there, the picture leans in on her
    // (user 10-07: small in the game's web view). ?fill=1.3 tunes it in check runs, ?fill=0 keeps the wide view.
    const fill = AUTO && params.has('fill') ? Number(params.get('fill')) : story.space.fill;
    if (fill !== 0) await space.frameOn(spot.foot, spot.height, fill ? { fill } : {});
    beginLines();
    return;
  }
  if (living) {
    // Jane's growth novel: a 3D card while the camera moves, the same spot and size as the 2D card once it stops —
    // sharp lines, and the card acting (rise, recoil, sink, settle) works as in the 2D scenes.
    const place = () => {
      const b = space.cardBox(spot.foot, spot.height);
      ui.actor.style.left = `${(b.left + b.width / 2).toFixed(1)}px`;
      ui.actor.style.bottom = `${(innerHeight - b.top - b.height).toFixed(1)}px`;
      ui.actor.style.height = `${b.height.toFixed(1)}px`;
    };
    place();
    space.onResize = place;
    const face = cardEmotion;
    cardEmotion = '';
    const card3d = roomCard;
    roomCard = null;
    setCard(face);
    await wait(80);
    ui.app.classList.add('card2d');
    ui.actor.classList.add('shown');
    await wait(120);
    card3d.hide();
    beginLines();
    return;
  }
  // bedroom: on to the closed door, its sound, black, then the first CG
  await space.toBedroomDoor();
  await wait(350);
  space.openBedroom();
  ui.black.classList.add('on');
  await wait(800);
  ui.app.classList.remove('space');
  ui.spaceRoom.style.display = 'none';
  setScreen(firstOf('sc'));
  await wait(400);
  ui.black.classList.remove('on');
  await wait(500);
  beginLines();
}

function start() {
  document.documentElement.style.setProperty('--accent', story.color);
  ui.box.style.setProperty('--speaker-color', story.color);
  ui.app.classList.toggle('night', !!story.night);
  ui.app.classList.toggle('fit-full', story.cardFit === 'full');
  document.title = `${story.name} · ${story.title} — 인연 미리보기`;
  ui.title.textContent = `${story.name} · 「${story.title}」`;
  ui.place.textContent = story.place + (AUTO ? ` · ${innerWidth}×${innerHeight} @${devicePixelRatio}` : '');
  ui.hearts.innerHTML = heartsHtml(LEVEL - 1);
  // every picture this story uses, so a change never waits for the network
  const seen = {};
  const walk = lines => lines.forEach(l => {
    if (l.e && story.card && !seen['e' + l.e]) { seen['e' + l.e] = 1; preload(story.card(l.e)); }
    if (l.sc && story.screen && !seen['s' + l.sc]) { seen['s' + l.sc] = 1; preload(story.screen(l.sc)); }
    if (l.choice) l.choice.forEach(c => walk(c.lines));
  });
  walk(story.lines);
  queue = story.lines.slice();
  if (story.space && !params.has('flat')) {
    startSpace().catch(err => {
      console.warn('[rel] 3D room unavailable, 2D instead:', err);
      ui.status.classList.add('hidden'); ui.door.classList.add('hidden'); ui.black.classList.remove('on');
      ui.spaceRoom.style.display = 'none'; roomCard = null; space = null;
      start2D();
    });
  } else {
    start2D();
  }
}

ui.box.addEventListener('click', advance);
ui.next.addEventListener('click', ev => { ev.stopPropagation(); advance(); });
ui.app.addEventListener('click', ev => { if (ev.target === ui.app || ev.target === ui.bg || ev.target === ui.bgB || ui.spaceRoom.contains(ev.target)) advance(); });
document.addEventListener('keydown', ev => {
  if (state === 'choice' && (ev.key === '1' || ev.key === '2' || ev.key === '3')) { pick(Number(ev.key) - 1); return; }
  if (ev.key === ' ' || ev.key === 'Enter') {
    if (state === 'intro') return;      // the door button handles its own Enter
    ev.preventDefault();               // also keeps Enter from clicking a choice the mouse left focused
    if (state !== 'choice') advance();
  }
});

if (story) start();
else ui.picker.classList.remove('hidden');
