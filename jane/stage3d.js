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
// the walk in from the open door (the house's outside is not modelled, so it starts right at the door)
const ARRIVE = {
  bench: { eye: [[-2.4, -4.15, 1.32], [-2.4, -3.38, 1.32], [-2.05, -2.3, 1.32]], look: [[-2.4, -3.38, 1.15], [-2.3, -1.0, 1.25], [-1.0, 1.2, 1.2]], ms: 4400 },
  entrance: { eye: [[-2.4, -4.15, 1.32], [-2.4, -3.6, 1.32]], look: [[-2.4, -3.38, 1.15], [-2.25, -2.5, 1.18]], ms: 2000 },
};
const WALKS = { 'entrance>bench': { eye: [[-1.6, -2.0, 1.32]], look: [[-1.0, 0.5, 1.2]], ms: 2600 } };

async function start() {
  const world = document.getElementById('world');
  const actor = document.getElementById('actor');
  const app = document.getElementById('app');
  const { createRoom } = await import(`${root}/room3d.js${version ? `?v=${version}` : ''}`);
  const room = await createRoom({ container: world, assets: `${root}/out`, lightings: ['day', 'night'], version });
  const { THREE, b2t } = room;

  const fade = document.createElement('div');
  fade.className = 'stage3d-fade';
  world.appendChild(fade);
  app.classList.add('three');
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
  const pose = cam => ({ eye: b2t(CAMS[cam].eye), target: b2t(CAMS[cam].target), lens: CAMS[cam].lens });
  const spot = (cam, which = 'talk') => b2t(CAMS[cam][which] || CAMS[cam].talk);
  function setActorShown(v) { actorShown = v; actor.style.opacity = v ? '' : '0'; }
  function settle(id, janeAt = 'talk') {
    const p = PLACES[id];
    room.setLighting(p.light);
    room.setDoor(DOOR_OPEN);
    const q = pose(p.cam);
    room.setLens(q.lens); room.look(q.eye, q.target);
    jane.copy(spot(p.cam, janeAt)); janeBob = 0;
    fade.style.opacity = 0; setActorShown(true);
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
    fade.style.opacity = 1; setActorShown(false);
    await hold(1300);                                // the stage title shows on black
    if (!alive()) return;
    const swing = tween(1600, k => {
      room.setDoor(DOOR_OPEN * k);
      if (k > 0.35 && !actorShown) setActorShown(true);   // she is seen once the door is part open
    }, t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2));
    await hold(250);
    await tween(700, k => { fade.style.opacity = 1 - k; });
    await swing;
    if (!alive()) return;
    await tween(a.ms, walk);
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
    await tween(w.ms, k => {
      if (my !== run) return;
      walk(k);
      jane.lerpVectors(j0, j1, Math.min(1, k * 1.15));   // she walks a little ahead of the camera
      janeBob = Math.abs(Math.sin(k * Math.PI * 5)) * 0.025 * (1 - k);
    });
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
      tween(520, k => { jane.lerpVectors(j0, j1, k); janeBob = Math.sin(k * Math.PI) * 0.04; });
    },
    setInstant(v) { instant = v; },
  };
}

let api = null;
if (!params.has('flat')) {
  try { api = await start(); } catch (e) {
    console.warn('[3D] background unavailable, using 2D renders:', e);
    document.querySelectorAll('#world > canvas').forEach(c => c.remove());
    document.getElementById('app').classList.remove('three');
  }
}
window.__stage3dResolve?.(api);
