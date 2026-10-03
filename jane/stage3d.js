// The novel's background as Jane's live 3D workshop (falls back to the 2D renders when 3D cannot start, or with ?flat).
// The room is drawn in 3D; Jane stays the novel's own 2D card, moved and sized every frame to where she stands in the
// room, so all card acting and effects keep working and her lines keep the browser's 2D quality.
// app.js waits for window.stage3dReady and then calls show(background id, how) instead of swapping 2D backgrounds.

const root = typeof STAGE3D_ROOT === 'string' ? STAGE3D_ROOT : '../jane_growth_3d';
const version = typeof STAGE3D_V === 'string' ? STAGE3D_V : '';   // build_web.py stamps the deployed copy
const params = new URLSearchParams(location.search);

const JANE_HEIGHT = 1.5;      // hair top to feet, metres
const CARD_BODY = 0.87;       // the cards' hair top sits at 13% of their height, feet at the bottom edge
const CARD_H = JANE_HEIGHT / CARD_BODY;
const DOOR_OPEN = Math.PI * 100 / 180;

// camera spots (the 2D background renders' eyes and targets) and where Jane stands there (Blender coordinates).
// 'talk' is about 2 m in front of the camera, so her card fills the frame like the 2D novel's.
const CAMS = {
  bench: { eye: [-0.3, -0.75, 1.32], target: [-0.5, 1.55, 1.2], lens: 22, talk: [-0.47, 1.24], work: [-0.5, 1.8] },
  entrance: { eye: [-2.4, -3.1, 1.32], target: [-2.1, -1.9, 1.2], lens: 22, talk: [-1.91, -1.16] },
};
const PLACES = {
  home_workbench_day: { cam: 'bench', light: 'day' },
  home_workbench_night: { cam: 'bench', light: 'night' },
  home_entrance_day: { cam: 'entrance', light: 'day' },
};
// The arrival: the closed door seen from outside, a step back so the whole door and its frame are in the shot (the
// outer face is dressed in the bake: frame, window, knob), then through the doorway to the place.
// (2.15 m from the wall: even a very wide window keeps the wall's left end, x -4.21, out of the shot)
const DOOR_VIEW = { eye: [-1.95, -5.6, 1.32], look: [-2.25, -3.4, 1.1] };
const ARRIVE = {
  bench: { eye: [DOOR_VIEW.eye, [-2.4, -4.3, 1.32], [-2.4, -3.38, 1.32], [-2.05, -2.3, 1.32]],
    look: [DOOR_VIEW.look, [-2.4, -2.6, 1.2], [-2.3, -1.0, 1.25], [-1.0, 1.2, 1.2]], ms: 5600 },
  entrance: { eye: [DOOR_VIEW.eye, [-2.4, -4.3, 1.32], [-2.4, -3.6, 1.32]],
    look: [DOOR_VIEW.look, [-2.35, -2.8, 1.18], [-2.25, -2.5, 1.18]], ms: 3200 },
};
const WALKS = { 'entrance>bench': { eye: [[-1.6, -2.0, 1.32]], look: [[-1.0, 0.5, 1.2]], ms: 2600 } };

// The game opens one stage (?stage=N): load only the lighting its places use (each atlas is 4096 px, about 90 MB on
// the GPU). The whole novel loads both.
function lightingsToLoad() {
  const only = Number(params.get('stage'));
  if (!only || typeof STAGES !== 'object' || !STAGES[only]) return ['day', 'night'];
  const ids = [STAGES[only].bg, ...(typeof BEATS === 'object' ? BEATS : []).filter(b => b.stage === only && b.bg).map(b => b.bg)];
  const lights = [...new Set(ids.map(id => PLACES[id] && PLACES[id].light).filter(Boolean))];
  return lights.length ? lights : ['day', 'night'];
}

async function start() {
  const world = document.getElementById('world');
  const actor = document.getElementById('actor');
  const app = document.getElementById('app');
  const { createRoom } = await import(`${root}/room3d.js${version ? `?v=${version}` : ''}`);
  const room = await createRoom({ container: world, assets: `${root}/out`, lightings: lightingsToLoad(), version });
  const { THREE, b2t } = room;

  const fade = document.createElement('div');
  fade.className = 'stage3d-fade';
  world.appendChild(fade);
  // at a stage start the hero opens the door: this press is also what lets the browser play sound
  const doorPrompt = document.createElement('button');
  doorPrompt.type = 'button';
  doorPrompt.className = 'door-prompt hidden';
  doorPrompt.textContent = '문을 연다';
  app.appendChild(doorPrompt);
  let doorGate = null;
  // ?doordebug: the page notes the door state in its own address (#door=...), for checks from the game's side
  const note = params.has('doordebug') ? s => {
    const q = new URLSearchParams(location.search);
    q.set('door', s);
    history.replaceState(null, '', `${location.pathname}?${q}`);
  } : () => {};
  const waitForDoor = () => new Promise(ok => { doorGate = ok; doorPrompt.classList.remove('hidden'); note('waiting'); });
  function openDoor(by = 'press') {
    if (!doorGate) return false;
    note(`opened-by-${by}`);
    const go = doorGate;
    doorGate = null;
    doorPrompt.classList.add('hidden');
    Sound.open();
    go();
    return true;
  }
  doorPrompt.addEventListener('click', e => { e.stopPropagation(); openDoor('button'); });
  const sfx = (name, opts) => { if (!instant) Sound.play(name, opts); };
  // footsteps on the wooden floor while the camera walks (not in the last moment, when it settles)
  function steps(ms) {
    const t0 = performance.now();
    let next = 180;
    return () => {
      const t = performance.now() - t0;
      if (t >= next && t < ms - 350) { sfx('step'); next += 520; }
    };
  }
  window.stage3dRoom = room;   // for checks from the console

  const resize = () => room.resize(app.clientWidth, app.clientHeight);
  addEventListener('resize', resize);
  resize();

  // ---- timed steps ----------------------------------------------------------------------------------------------------
  const tweens = new Set();
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const tween = (ms, fn, easing = ease) => new Promise(ok => tweens.add({ t0: performance.now(), ms, fn, easing, ok }));
  const hold = ms => tween(ms, () => {});
  let instant = false, run = 0;

  // ---- state: camera, Jane's spot, card visibility ----------------------------------------------------------------------
  let place = null;
  const jane = new THREE.Vector3();
  let janeBob = 0, actorShown = true;
  // While the camera moves (the walk in, walking inside), Jane is a card standing in the 3D room so walls and the door
  // frame hide her; once the camera rests she is the novel's own 2D card again, at the same place and size.
  const card3d = room.makeCard(CARD_H, 832 / 1248);
  window.stage3dCard = card3d;   // for checks from the console
  await room.prepare();   // shaders and pictures onto the GPU before the opening starts (else its first frame stalls)
  app.classList.add('three');
  function inRoom(v) {
    card3d.mesh.visible = v;
    actor.style.transition = 'none';
    setActorShown(!v);
    void actor.offsetWidth;
    actor.style.transition = '';
  }
  const pose = cam => ({ eye: b2t(CAMS[cam].eye), target: b2t(CAMS[cam].target), lens: CAMS[cam].lens });
  const spot = (cam, which = 'talk') => b2t(CAMS[cam][which] || CAMS[cam].talk);
  function setActorShown(v) { actorShown = v; actor.style.opacity = v ? '' : '0'; }
  function settle(id, janeAt = 'talk') {
    const p = PLACES[id];
    doorGate = null; doorPrompt.classList.add('hidden');
    room.setLighting(p.light);
    room.setDoor(DOOR_OPEN);
    const q = pose(p.cam);
    room.setLens(q.lens); room.look(q.eye, q.target);
    jane.copy(spot(p.cam, janeAt)); janeBob = 0;
    fade.style.opacity = 0; inRoom(false);
  }
  // a camera path through the given points, ending on the place's own eye and target
  function pathTo(cam, via) {
    const q = pose(cam);
    const eye = new THREE.CatmullRomCurve3([...via.eye.map(b2t), q.eye]);
    const look = new THREE.CatmullRomCurve3([...via.look.map(b2t), q.target]);
    return k => room.look(eye.getPoint(k), look.getPoint(k));
  }

  async function arrive(id, back) {
    const my = ++run, p = PLACES[id], a = ARRIVE[p.cam];
    tweens.clear();
    if (instant) { settle(id, back ? 'work' : 'talk'); return; }
    const alive = () => my === run;
    room.setLighting(p.light);
    room.setLens(CAMS[p.cam].lens);
    room.setDoor(0);
    jane.copy(spot(p.cam, back ? 'work' : 'talk')); janeBob = 0;
    const walk = pathTo(p.cam, a);
    walk(0);
    fade.style.opacity = 1; inRoom(true);
    await hold(1300);                                // the stage title shows on black
    if (!alive()) return;
    await tween(800, k => { fade.style.opacity = 1 - k; });   // the closed door, from outside
    if (!alive()) return;
    await waitForDoor();                              // the hero opens it (the press also opens the sound)
    if (!alive()) return;
    sfx('door_open');
    sfx('door_creak', { delay: 0.55 });
    const swing = tween(1700, k => { room.setDoor(DOOR_OPEN * k); },
      t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2));
    await hold(1000);                                 // a beat to see the room open up, then step in
    if (!alive()) return;
    const step = steps(a.ms);
    await tween(a.ms, k => { walk(k); step(); });
    await swing;
    if (alive()) inRoom(false);
  }

  async function walkTo(id) {
    const from = place && PLACES[place], to = PLACES[id];
    const w = from && WALKS[`${from.cam}>${to.cam}`];
    if (instant || !w) { settle(id); return; }
    const my = ++run;
    tweens.clear();
    room.setLighting(to.light);
    const walk = pathTo(to.cam, { eye: [CAMS[from.cam].eye, ...w.eye], look: [CAMS[from.cam].target, ...w.look] });
    const j0 = jane.clone(), j1 = spot(to.cam);
    const step = steps(w.ms);
    inRoom(true);
    await tween(w.ms, k => {
      if (my !== run) return;
      walk(k); step();
      jane.lerpVectors(j0, j1, Math.min(1, k * 1.15));   // she walks a little ahead of the camera
      janeBob = Math.abs(Math.sin(k * Math.PI * 5)) * 0.025 * (1 - k);
    });
    if (my === run) inRoom(false);
  }

  // ---- every frame: advance steps, put the card where Jane stands, draw the room ---------------------------------------
  const top = new THREE.Vector3();
  function frame(now) {
    for (const tw of [...tweens]) {
      const t = Math.min(1, (now - tw.t0) / tw.ms);
      tw.fn(tw.easing(t));
      if (t >= 1) { tweens.delete(tw); tw.ok(); }
    }
    const foot = jane.clone(); foot.y += janeBob;
    if (card3d.mesh.visible) {
      card3d.setImage(actor.querySelector('.card.shown')?.src);
      const night = app.classList.contains('night');
      card3d.setTone(night ? 0.86 : 1, night ? 0.92 : 1);   // as .app.night .card dims the 2D card
      card3d.place(foot);
    }
    top.copy(foot); top.y += CARD_H;
    const a = room.toScreen(foot), b = room.toScreen(top);
    actor.style.left = `${a.x}px`;
    actor.style.bottom = `${room.viewH - a.y}px`;
    actor.style.height = `${Math.max(0, a.y - b.y)}px`;
    room.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    active: true,
    // how: 'arrive' (stage start: door opens, walk in), 'walk' (a move inside the house), 'instant' (rewind, setup)
    show(id, how = 'walk', { back = false } = {}) {
      if (!PLACES[id]) return false;
      const prev = place;
      place = id;
      if (how === 'arrive') arrive(id, back);
      else if (how === 'walk' && prev && prev !== id) walkTo(id);
      else { run++; tweens.clear(); settle(id); }
      return true;
    },
    // Jane turns from the bench to the hero and steps up to talking distance
    turn() {
      if (!place) return;
      const cam = PLACES[place].cam, j0 = jane.clone(), j1 = spot(cam, 'talk');
      if (instant) { jane.copy(j1); return; }
      sfx('turn');
      sfx('step', { delay: 0.3, volume: 0.7 });
      tween(520, k => { jane.lerpVectors(j0, j1, k); janeBob = Math.sin(k * Math.PI) * 0.04; });
    },
    setInstant(v) { instant = v; },
    // a press while the door is waiting opens it (and is not a dialogue advance)
    consumeInput: () => openDoor('next'),
  };
}

let api = null;
const debugNote = s => {   // ?doordebug: the outcome goes into the address too, readable from the game's side
  if (!params.has('doordebug')) return;
  const q = new URLSearchParams(location.search);
  q.set('stage3d', s.replace(/[^\w-]+/g, '-').slice(0, 80));
  history.replaceState(null, '', `${location.pathname}?${q}`);
};
if (!params.has('flat')) {
  try { api = await start(); debugNote('on'); } catch (e) {
    debugNote(`off-${e && e.message}`);
    console.warn('[3D] background unavailable, using 2D renders:', e);
    document.querySelectorAll('#world > canvas').forEach(c => c.remove());
    document.getElementById('app').classList.remove('three');
  }
}
window.__stage3dResolve?.(api);
