// Maya's room in 3D for the relationship preview (Lv.1 workroom, Lv.2 bedroom door). Same room, loader and paths as
// her growth novel's space pages (maya_growth_novel/growth-space.js): the house door opens, the camera walks in along
// the authored arrival curve, and the bedroom is only ever entered under black (its empty 3D bed must not show — the
// 2D bedroom screen takes over). Built copies live in web_dist/rel/, next to web_dist/jane/3d (loader + three.js).
import { createRoom } from '../jane/3d/room3d.js';

const ease = t => t * t * (3 - 2 * t);
const SFX = '../jane/assets/sfx/';

// `eyeHeight`: the player's eye for the whole visit, in the room's units (Maya's room is built ~1.7x life size). The
// authored paths are her growth novel's seated eye (1.4–1.7); the preview walks them at this one height from the house
// door on, only the gaze changing — entering low and rising at the end did not read as walking (user 10-06). 0 keeps them.
// `rig`: a room that has no authored arrival in its shots file (Jane's workshop, whose camera spots live in her growth
// novel's stage3d.js) brings its own: {assets, exterior, light, version, dim, saturate, smooth, tone, startLens, doorOpen,
// entryMs, outside, arrival}, all in Blender units, copied from that novel.
// The 2D card's acting keyframes (rel.css act-rise / act-recoil / act-sink / act-settle) in the card's own terms:
// tx, ty = shift as a share of its width and height (up is +, unlike CSS), sx, sy = scale, rot = tilt in radians
// (counter-clockwise +, unlike CSS); all about the feet, as the CSS transform-origin is the bottom middle.
const REST = { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0 };
const k = (at, o = {}) => ({ at, ...REST, ...o });
const deg = d => -d * Math.PI / 180;
const cubic = (x1, y1, x2, y2) => t => {          // CSS cubic-bezier(x1, y1, x2, y2), solved for x = t
  let u = t;
  for (let i = 0; i < 6; i++) {
    const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u - t;
    const dx = 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    u = Math.min(1, Math.max(0, u - x / dx));
  }
  return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
};
const ACTS = {
  rise: { ms: 500, ease: cubic(.3, 1.4, .5, 1), keys: [k(0), k(.35, { ty: .032, sx: 1.012, sy: .99 }), k(.7, { ty: -.004, sx: .995, sy: 1.008 }), k(1)] },
  rise_s: { ms: 500, ease: cubic(.3, 1.4, .5, 1), keys: [k(0), k(.35, { ty: .018, sx: 1.008, sy: .995 }), k(1)] },
  recoil: { ms: 450, ease: cubic(0, 0, .58, 1), keys: [k(0), k(.18, { ty: .026, sx: 1.02, sy: 1.02 }), k(.36, { tx: -.01, ty: .014 }),
    k(.54, { tx: .01, ty: .006 }), k(.72, { tx: -.005 }), k(1)] },
  sink: { ms: 700, ease: cubic(.42, 0, .58, 1), keys: [k(0), k(.45, { ty: -.016, sx: 1.01, sy: .975 }), k(1)] },
  settle: { ms: 1000, ease: cubic(.42, 0, .58, 1), keys: [k(0), k(.33, { rot: deg(-1) }), k(.66, { rot: deg(.8) }), k(1)] },
};
// like CSS, the timing function runs within each pair of keyframes
function posePart(keys, t, ease) {
  let i = 1;
  while (i < keys.length - 1 && keys[i].at < t) i++;
  const a = keys[i - 1], b = keys[i], f = ease(b.at > a.at ? Math.min(1, Math.max(0, (t - a.at) / (b.at - a.at))) : 1);
  const out = {};
  for (const key of Object.keys(REST)) out[key] = a[key] + (b[key] - a[key]) * f;
  return out;
}

export async function startSpace({ container, onStep = () => {}, eyeHeight = 0, rig = null }) {
  const room = await createRoom(rig
    ? { container, assets: rig.assets, exteriorAssets: rig.exterior, lightings: [rig.light], version: rig.version,
        cleanLines: true, smoothLines: !!rig.smooth, onStep }
    : { container, assets: 'space/maya', exteriorAssets: 'space/maya_exterior', dim: 1, saturate: 1, cleanLines: true,
        version: 'rel-maya-20261006', onStep });
  if (rig) room.setLighting(rig.light);
  const cfg = room.shots;
  const H = rig ? 0 : eyeHeight;
  // the gaze while walking: about the talking view's look down at her (~9.4°); at the house door, down at the door
  const DOWN = 0.165, DOOR_DOWN = 0.27;
  const lift = (view, slope = DOWN) => {
    if (!H) return view;
    const d = Math.hypot(view.target[0] - view.eye[0], view.target[1] - view.eye[1]);
    return { ...view, eye: [view.eye[0], view.eye[1], H], target: [view.target[0], view.target[1], H - d * slope] };
  };
  const R = rig
    ? { outside: rig.outside, arrival: rig.arrival, entryMs: rig.entryMs, doorOpen: rig.doorOpen, startLens: rig.startLens, tone: rig.tone }
    : { outside: lift(cfg.outside, DOOR_DOWN), arrival: cfg.arrival, entryMs: cfg.livingSearch.entryMs || 4400,
        doorOpen: cfg.door.openRadians, startLens: 25, tone: [0.9, 0.95] };
  const outside = R.outside;
  if (!room.door) throw new Error('Entrance door missing');
  const bedroomDoor = room.scene.getObjectByName(cfg.bedroomEntry && cfg.bedroomEntry.node);
  // The leaf is a little short for its jamb (growth-space.js): fit it so the bedroom stays hidden while closed.
  if (bedroomDoor) { bedroomDoor.scale.y = 1.055; bedroomDoor.scale.z = 1.06; }
  // The experimental props made for separated character cards are not part of this staging.
  for (const name of cfg.props || []) { const o = room.scene.getObjectByName(name); if (o) o.visible = false; }
  room.invalidate();
  await room.prepare();

  let muted = false, offsetValue = 0, view = null, run = 0;
  const sounds = new Set();
  function sound(name, volume) {
    if (muted) return;
    const a = new Audio(SFX + name + '.ogg');
    a.volume = volume; sounds.add(a);
    a.onended = a.onerror = () => sounds.delete(a);
    a.play().catch(() => sounds.delete(a));
  }
  function setOffset(v) {
    // shifts the picture up so the subject sits above the dialogue box
    offsetValue = v;
    room.camera.setViewOffset(innerWidth, innerHeight, 0, Math.round(innerHeight * v), innerWidth, innerHeight);
    room.invalidate();
  }
  // Character cards standing in the room turn to the camera on every frame the camera moves (she is visible from the
  // moment the door opens and keeps facing the viewer while the camera walks in, like Jane's growth novel).
  // They face it fully, parallel to the picture, not only about the vertical: the talking view looks down at her
  // (eye 2.6, her head 2.64), and an upright card seen from above draws ~10% wider at the head than the picture is,
  // so she seemed to slim down when the flat 2D card took over. Parallel, the 3D card keeps the drawing's 2:3.
  // Each card also carries its acting pose (the 2D novel's rise / recoil / sink / settle, see ACTS): a shift in the
  // card's own plane (share of its width and height), a scale and a tilt, all about its feet like the CSS ones.
  const standing = [];
  const turn = new room.THREE.Quaternion(), zAxis = new room.THREE.Vector3(0, 0, 1);
  const right = new room.THREE.Vector3(), up = new room.THREE.Vector3();
  function faceCards() {
    const camQ = room.camera.quaternion;
    right.set(1, 0, 0).applyQuaternion(camQ); up.set(0, 1, 0).applyQuaternion(camQ);
    for (const s of standing) {
      const m = s.card.mesh, a = s.pose;
      turn.setFromAxisAngle(zAxis, a.rot);
      const q = camQ.clone().multiply(turn);
      const pos = s.at.clone().addScaledVector(right, a.tx * s.w).addScaledVector(up, a.ty * s.h);
      if (q.equals(m.quaternion) && pos.equals(m.position) && m.scale.x === a.sx && m.scale.y === a.sy) continue;
      m.quaternion.copy(q); m.position.copy(pos); m.scale.set(a.sx, a.sy, 1);
      room.invalidate();
    }
  }
  function setView(spec, lens) {
    view = spec;
    room.setLens(lens || spec.lens || 25);
    room.look(room.b2t(spec.eye), room.b2t(spec.target));
    faceCards();
    room.render();
  }
  function setBedroomDoor(angle) { if (bedroomDoor) { bedroomDoor.rotation.y = angle; room.invalidate(); } }
  function resize() {
    room.resize(innerWidth, innerHeight);
    setOffset(offsetValue);
    if (view) setView(view);
  }
  addEventListener('resize', () => { resize(); api.onResize && api.onResize(); });
  resize();
  room.setDoor(0); setBedroomDoor(0);
  setView({ ...outside, lens: R.startLens });

  // A card picture arrives after setImage (decoded and sent to the GPU): draw it then, also while nothing moves
  // (a 3D card kept through the talk changes expressions with no camera motion).
  (function idle() { if (room.needsRender) room.render(); requestAnimationFrame(idle); })();

  function play(ms, frame) {
    const token = ++run;
    return new Promise(resolve => {
      let start;
      function tick(now) {
        if (token !== run) return resolve(false);
        if (start === undefined) start = now;
        const t = Math.min(1, (now - start) / ms);
        frame(t);
        faceCards();
        room.render();
        if (t < 1) requestAnimationFrame(tick); else resolve(true);
      }
      requestAnimationFrame(tick);
    });
  }

  const api = {
    onResize: null,
    setMuted(m) { muted = m; if (m) { sounds.forEach(a => a.pause()); sounds.clear(); } },
    // The house door opens and the camera walks to the workroom view (growth-space.js enterLiving). `talk` replaces
    // the walk's last stop with the scene's talking view (eye, target, lens); `offsetTo` eases the picture's lift in.
    async enterLiving(offsetTo = offsetValue, talk = null) {
      const living = talk || lift(cfg.livingSearch.living), ms = R.entryMs;
      let eyePts = R.arrival.eyes.slice(), targetPts = R.arrival.targets.slice();
      const n = eyePts.length - 1;
      if (H) {
        // one eye height through the 2.8 m doorway and the room; the gaze lifts from the door to the room
        targetPts = targetPts.map((t, i) => i ? lift({ eye: eyePts[i], target: t }).target : outside.target);
        eyePts = eyePts.map(p => [p[0], p[1], H]);
      }
      eyePts[n] = living.eye; targetPts[n] = living.target;
      const eyes = new room.THREE.CatmullRomCurve3(eyePts.map(room.b2t));
      const targets = new room.THREE.CatmullRomCurve3(targetPts.map(room.b2t));
      const offsetFrom = offsetValue;
      let steps = 0;
      sound('door_open', .26); sound('door_creak', .12);
      await play(ms, t => {
        const walk = ease(Math.max(0, (t - .28) / .72));
        room.setDoor(R.doorOpen * ease(Math.min(1, t / .26)));
        room.setLens(R.startLens + (living.lens - R.startLens) * walk);
        if (offsetTo !== offsetFrom) setOffset(offsetFrom + (offsetTo - offsetFrom) * walk);
        room.look(eyes.getPoint(walk), targets.getPoint(walk));
        const walked = [.34, .48, .62, .77, .91].filter(at => t >= at).length;
        if (walked > steps) { sound(walked % 2 ? 'step_1' : 'step_2', .10); steps = walked; }
      });
      setView(living);
    },
    // From the workroom along the hall to the closed bedroom door (growth-space.js animate + toBedroom).
    async toBedroomDoor() {
      const from = view, to = lift(cfg.bedroomEntry.closed), ms = cfg.livingSearch.bedroomMs || 4200;
      const hall = cfg.livingSearch.toBedroom.map(p => H ? [p[0], p[1], H] : p);
      const path = new room.THREE.CatmullRomCurve3([room.b2t(from.eye), ...hall.map(room.b2t), room.b2t(to.eye)]);
      const a = room.b2t(from.target), b = room.b2t(to.target);
      let steps = 0;
      await play(ms, t => {
        const p = ease(t);
        room.setLens((from.lens || 25) + ((to.lens || 25) - (from.lens || 25)) * p);
        room.look(path.getPoint(p), a.clone().lerp(b, p));
        const walked = [.12, .31, .50, .69, .88].filter(at => t >= at).length;
        if (walked > steps) { sound(walked % 2 ? 'step_1' : 'step_2', .10); steps = walked; }
      });
      setView(to);
    },
    // Only the door's sound: the 3D door stays shut (its empty bed must never show); the page fades to black and the
    // bedroom's complete CG takes over, as in her growth novel.
    openBedroom() { sound('door_open', .26); sound('door_creak', .12); },
    // A character card standing in the room: a plane in 3D at Blender point `foot`, `height` metres, 2:3, turned to the
    // current camera, so furniture in front of it hides it.
    addCard(foot, height, aspect = 2 / 3) {
      const card = room.makeCard(height, aspect);
      card.setTone(R.tone[0], R.tone[1]);   // the 2D card gets the same dimming from CSS
      const p = room.b2t(foot);
      const s = { card, at: p, w: height * aspect, h: height, pose: { ...REST }, run: 0 };
      card.mesh.visible = true;
      standing.push(s);
      faceCards();
      room.invalidate();
      return {
        setImage(src) { card.setImage(src); },
        face() { faceCards(); room.render(); },
        hide() { card.mesh.visible = false; room.invalidate(); room.render(); },
        // the 2D card's acting (rel.css .act-*), played on the standing card; `small` = the full-figure card's lighter rise
        act(kind, small = false) {
          const a = ACTS[kind === 'rise' && small ? 'rise_s' : kind];
          if (!a) return;
          const token = ++s.run;
          let start;
          const tick = now => {
            if (token !== s.run) return;
            if (start === undefined) start = now;
            const t = Math.min(1, (now - start) / a.ms);
            s.pose = posePart(a.keys, t, a.ease);
            faceCards(); room.render();
            if (t < 1) requestAnimationFrame(tick); else { s.pose = { ...REST }; faceCards(); room.render(); }
          };
          requestAnimationFrame(tick);
        },
        // she walks to another spot (Blender point) in `ms`, a light bob and footsteps on the way
        moveTo(foot, ms = 900) {
          const from = s.at.clone(), to = room.b2t(foot);
          return new Promise(done => {
            let start, steps = 0;
            const tick = now => {
              if (start === undefined) start = now;
              const t = Math.min(1, (now - start) / ms), e = ease(t);
              s.at.lerpVectors(from, to, e);
              s.pose = { ...s.pose, ty: Math.abs(Math.sin(t * Math.PI * 3)) * 0.012 * (1 - t) };
              const n = Math.floor(t * 3);
              if (n > steps && t < 1) { steps = n; sound(n % 2 ? 'step_1' : 'step_2', .1); }
              faceCards(); room.render();
              if (t < 1) requestAnimationFrame(tick); else { s.pose = { ...REST }; faceCards(); room.render(); done(); }
            };
            requestAnimationFrame(tick);
          });
        },
        get ready() { return card.mesh.material.visible; }
      };
    },
    // A small glass vial (her Lv.2 gift) set down at Blender point `foot` on a surface: a clear flask with a cork, about
    // `height` metres tall, faded and lifted in so its arrival reads as her placing it. Drawn in the overlay pass like
    // the cards (depth-tested against the room).
    placeVial(foot, height = 0.11, ms = 600) {
      const T = room.THREE, h = height;
      const profile = [[0, 0], [0.30, 0], [0.33, 0.04], [0.33, 0.48], [0.16, 0.62], [0.12, 0.72], [0.12, 0.86], [0.15, 0.9], [0, 0.9]]
        .map(([r, y]) => new T.Vector2(r * h, y * h));
      const glass = new T.Mesh(new T.LatheGeometry(profile, 24),
        new T.MeshBasicMaterial({ color: 0xcfe8f2, transparent: true, opacity: 0, depthWrite: false }));
      const cork = new T.Mesh(new T.CylinderGeometry(0.1 * h, 0.12 * h, 0.14 * h, 16),
        new T.MeshBasicMaterial({ color: 0x9a6b44, transparent: true, opacity: 0 }));
      cork.position.y = 0.95 * h;
      const rim = new T.Mesh(new T.TorusGeometry(0.33 * h, 0.02 * h, 6, 24),
        new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.3 * h;
      const vial = new T.Group();
      vial.add(glass, cork, rim);
      const at = room.b2t(foot);
      vial.position.copy(at);
      room.scene.add(vial);
      return new Promise(done => {
        let start;
        const tick = now => {
          if (start === undefined) start = now;
          const t = Math.min(1, (now - start) / ms), e = ease(t);
          vial.position.y = at.y + (1 - e) * 0.06;
          glass.material.opacity = 0.55 * e; cork.material.opacity = e; rim.material.opacity = 0.8 * e;
          room.invalidate(); room.render();
          if (t < 1) requestAnimationFrame(tick); else done();
        };
        requestAnimationFrame(tick);
      });
    },
    // checks: the Blender point under a screen pixel (CSS px), or null
    pick(x, y) {
      const T = room.THREE, ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), room.camera);
      const hit = ray.intersectObjects(room.scene.children, true).find(h => h.object.visible && h.object.type === 'Mesh');
      if (!hit) return null;
      const p = hit.point;
      return [+p.x.toFixed(3), +(-p.z).toFixed(3), +p.y.toFixed(3)];
    },
    // draws a frame when something changed (a card picture arrives a little later than setImage)
    tick() { if (room.needsRender) room.render(); },
    // Where a standing card of `height` metres stands at Blender point `foot`: CSS px of its box (2:3 card). Its top is
    // along the camera's up, as the 3D card is turned parallel to the picture (faceCards).
    cardBox(foot, height) {
      room.camera.updateMatrixWorld();
      const p = room.b2t(foot);
      const up = new room.THREE.Vector3(0, height, 0).applyQuaternion(room.camera.quaternion);
      const low = room.toScreen(p), high = room.toScreen(p.clone().add(up));
      const h = Math.abs(low.y - high.y);
      return { left: low.x - h / 3, top: high.y, width: h * 2 / 3, height: h };
    },
    setOffset,
    sound,
    get living() { return cfg.livingSearch && cfg.livingSearch.living; }
  };
  return api;
}
