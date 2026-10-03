'use strict';

// 효과음. 소리 파일은 Kenney 오디오 팩(CC0: RPG Audio, Interface Sounds, Impact Sounds, Music Jingles)에서 골라
// assets/sfx/에 둔 사본이고, 제인의 말소리(타자 소리 같은 짧은 '삐')는 여기서 직접 만든다.
// 브라우저는 페이지를 한 번 누르기 전에는 소리를 막으므로, 첫 클릭·키 입력에서 소리를 연다(오프닝은 '문을 연다' 클릭).
const SFX_ROOT = 'assets/sfx';
// name: [files (one is picked at random), volume]
const SFX = Object.freeze({
  door_open: [['door_open'], 0.7], door_creak: [['door_creak'], 0.45],
  step: [['step_0', 'step_1', 'step_2', 'step_3', 'step_4'], 0.32],
  turn: [['turn'], 0.55], chapter: [['chapter'], 0.35],
  // scene effects (fx.js effect names)
  fx_flicker: [['ding_small'], 0.4], fx_glyph: [['rise'], 0.4], fx_broad_glow: [['rise_big'], 0.45],
  fx_poof: [['poof'], 0.7], fx_poof_paper: [['paper_scatter'], 0.5], fx_paper_hands: [['paper_stick'], 0.5],
  fx_forehead_paper: [['paper_stick'], 0.6], fx_rabbit_ears: [['chime'], 0.5], fx_title_flash: [['title_jingle'], 0.45],
  fx_sparkles_screen: [['sparkle'], 0.35], fx_request: [['paper_open', 'request'], 0.5], fx_shake: [['thud'], 0.55],
  peel: [['paper_rustle'], 0.35],
  // Jane's emotion marks (fx.js mark kinds)
  mark_surprise: [['mark_surprise'], 0.45], mark_exclaim: [['mark_surprise'], 0.45], mark_question: [['mark_question'], 0.4],
  mark_sweat: [['mark_sweat'], 0.45], mark_anger: [['mark_anger'], 0.3], mark_note: [['mark_note'], 0.4],
  mark_sparkles: [['ding'], 0.35], mark_shine: [['ding_small'], 0.3], mark_gloom: [['fall'], 0.35],
  mark_sigh: [['cloth'], 0.3], mark_dots: [['mark_dots'], 0.5], mark_fired: [['mark_pluck'], 0.4],
  // interface
  ui_next: [['ui_next'], 0.25], ui_choice: [['ui_choice'], 0.5], ui_toggle: [['ui_toggle'], 0.3],
});
// Jane's voice blips: pitch by feeling (1 = her ordinary voice)
const VOICE = Object.freeze({
  joy: 1.14, playful: 1.1, startled: 1.24, sheepish: 1.02, pensive: 0.9, annoyed: 0.96, sincere: 0.95, confident: 1.05,
  proud: 1.08, quiet_pride: 1.0, curious: 1.12, resolute: 0.97, relieved: 0.93, tired: 0.82, hurt: 0.86, neutral: 1.0,
});

const Sound = (() => {
  let ctx = null, master = null, opened = false;
  let muted = false;
  try { muted = localStorage.getItem('emc.novel.muted') === '1'; } catch (e) { /* storage may be blocked */ }
  const buffers = new Map();

  function load(file) {
    if (buffers.has(file)) return buffers.get(file);
    const p = fetch(`${SFX_ROOT}/${file}.ogg`)
      .then(r => { if (!r.ok) throw new Error(`${r.status} ${file}`); return r.arrayBuffer(); })
      .then(b => new Promise((ok, fail) => ctx.decodeAudioData(b, ok, fail)))
      .catch(() => null);
    buffers.set(file, p);
    return p;
  }

  // the first click or key opens the audio (browsers keep it shut until the page is used)
  function open() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      // a few at a time: simple static servers drop connections under many parallel requests
      const files = [...new Set(Object.values(SFX).flatMap(([f]) => f))];
      (async () => { for (let i = 0; i < files.length; i += 4) await Promise.all(files.slice(i, i + 4).map(load)); })();
    }
    if (ctx.state === 'suspended') ctx.resume();
    opened = true;
  }
  ['pointerdown', 'keydown'].forEach(t => addEventListener(t, open, { capture: true, passive: true }));

  async function play(name, { volume = 1, rate = 1, delay = 0 } = {}) {
    const spec = SFX[name];
    if (!spec || !ctx || muted) return;
    const [files, vol] = spec;
    const buf = await load(files[Math.floor(Math.random() * files.length)]);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (0.96 + Math.random() * 0.08);
    const g = ctx.createGain();
    g.gain.value = vol * volume;
    src.connect(g).connect(master);
    src.start(ctx.currentTime + delay);
  }

  // a short soft 'pi' for each few characters Jane types; brighter when she is excited, lower when tired
  function blip(emotion) {
    if (!ctx || muted) return;
    const t = ctx.currentTime, f = 640 * (VOICE[emotion] || 1) * (0.94 + Math.random() * 0.12);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 1.08, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.connect(g).connect(master);
    osc.start(t); osc.stop(t + 0.08);
  }

  return {
    play, blip, open,
    get opened() { return opened; },
    get muted() { return muted; },
    setMuted(v) {
      muted = v;
      try { localStorage.setItem('emc.novel.muted', v ? '1' : '0'); } catch (e) { /* ignore */ }
      if (master) master.gain.value = v ? 0 : 1;
    },
  };
})();
