'use strict';

// 제인 성장 노벨 카드판 재생기. story.js의 buildTimeline()이 대사를, staging.js가 배경과 카드를 정한다.
// story.js가 참조하는 전역(assets, state)을 여기서 둔다. 장면 그림은 staging.js가 정하므로 assets는 단계 번호만 담는다.
const assets = { scene1: 1, scene2: 2, scene3: 3, scene4: 4, scene5: 5 };
const CHOICE_COUNT = 5;
const initialState = () => ({
  opening: null, feedback: null, research: null,
  philosophy: null, closing: null, selectedLabel: null, choices: [],
});
const state = initialState();
function flattenTimeline(items) { return items.flat(Infinity); }

// Game mode (the in-game WebView): ?stage=N plays only growth stage N (stage 5 also plays the ending) and starts at once.
// The game cannot read anything back from the page, so earlier stages' choices are kept in this browser's storage;
// a choice that was never stored (cleared storage, first visit at a later stage) falls back to the 'honest' reply.
const params = new URLSearchParams(location.search);
const ONLY_STAGE = Math.min(Math.max(Number(params.get('stage')) || 0, 0), 5);
const GAME_MODE = ONLY_STAGE > 0;
const CHOICE_KEYS = ['opening', 'feedback', 'research', 'philosophy', 'closing'];
const STORE_KEY = 'emc.jane.growth.choices';
function loadChoices() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function saveChoice(id, value) {
  try { const all = loadChoices(); all[id] = value; localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) { /* storage blocked */ }
}
// the shared story ends on a demo note pointing at '선택 다시', which the game build does not have
const withoutDemoNotes = nodes => GAME_MODE
  ? nodes.filter(n => !(n.type === 'line' && n.speaker === '시스템' && n.text.startsWith('데모 종료')))
  : nodes;

function stageSlice(items, stage) {
  const sceneAt = n => items.findIndex(x => x.type === 'scene' && x.tag.startsWith(`${n}단계`));
  const from = sceneAt(stage);
  const to = stage < 5 ? sceneAt(stage + 1) : items.length;
  return items.slice(from, to < 0 ? items.length : to);
}

const $ = id => document.getElementById(id);
const ui = {
  app: $('app'), bgA: $('bgA'), bgB: $('bgB'), cardA: $('cardA'), cardB: $('cardB'),
  speaker: $('speaker'), text: $('text'), nextBtn: $('nextBtn'), choicePanel: $('choicePanel'),
  sceneTag: $('sceneTag'), startModal: $('startModal'), startBtn: $('startBtn'), restartBtn: $('restartBtn'),
  dialogueBox: $('dialogueBox'), rewindBtn: $('rewindBtn'), choiceCount: $('choiceCount'), hint: $('hint'),
  emotionTag: $('emotionTag'), cue: $('cue'), cueBox: $('cueBox'), actingToggle: $('actingToggle'),
  announcement: $('announcement'), locationLabel: $('locationLabel'), reviewChip: $('reviewChip'),
  hideDialogueBtn: $('hideDialogueBtn'), restoreDialogueBtn: $('restoreDialogueBtn'),
};

let timeline = [], pointer = 0, checkpoints = [];
let waitingChoice = false, started = false, finished = false;
let currentScene = 1, mood = SCENE_MOODS[1];
let shownBg = null, shownCard = null, cardNote = '';
let fullText = '', typing = false, typingTimer = null, typingEpoch = 0;
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let actingEnabled = !motionPreference.matches;
let dialogueHidden = false;

function setDialogueHidden(hidden) {
  dialogueHidden = hidden && started;
  ui.app.classList.toggle('ui-hidden', dialogueHidden);
  ui.hideDialogueBtn.setAttribute('aria-pressed', String(dialogueHidden));
  ui.restoreDialogueBtn.classList.toggle('hidden', !dialogueHidden);
  updateButtons();
  if (dialogueHidden) ui.restoreDialogueBtn.focus({ preventScroll: true });
  else if (started) (Playback.busy ? ui.app : ui.dialogueBox).focus({ preventScroll: true });
}

const cardUrl = id => `${CARD_ROOT}/${id.split('_')[0]}/${id}.${IMG_EXT}`;
const bgUrl = id => `${BG_ROOT}/${id}.${IMG_EXT}`;
const outfitOf = scene => STAGES[scene].outfit;
const BACK_CARD = 'back_workbench';   // Jane from behind at her bench (opening of the first visit)

function preloadStage(scene) {
  const { outfit, bg } = STAGES[scene];
  [bgUrl(bg), ...CARDS[outfit].map(k => cardUrl(`${outfit}_${k}`))].forEach(preload);
  BEATS.filter(b => b.stage === scene && b.bg).forEach(b => preload(bgUrl(b.bg)));
}

// ---- background and card layers: two of each, the newest request wins -------------------------------------
// With the 3D workshop (stage3d.js) the background is a camera place instead of a picture.
// how: 'arrive' (a stage starts: the door opens and the hero walks in), 'walk' (moving inside), 'instant' (rewind, setup).
let Stage3D = null;
let bgToken = 0;
function showBackground(id, how = 'walk', opts = {}) {
  if (id === shownBg && how !== 'arrive') return;
  shownBg = id;
  ui.app.classList.toggle('night', id.endsWith('_night'));
  if (Stage3D && Stage3D.show(id, how, opts)) {
    ui.locationLabel.textContent = BACKGROUNDS[id] || id;
    updateReviewChip();
    return;
  }
  const token = ++bgToken;
  const [front, back] = ui.bgA.classList.contains('shown') ? [ui.bgA, ui.bgB] : [ui.bgB, ui.bgA];
  const img = new Image();
  img.onload = () => {
    if (token !== bgToken) return;
    back.style.backgroundImage = `url('${bgUrl(id)}')`;
    back.classList.add('shown'); front.classList.remove('shown');
  };
  img.src = bgUrl(id);
  ui.locationLabel.textContent = BACKGROUNDS[id] || id;
  updateReviewChip();
}

let cardToken = 0;
function showCard(id, note = '') {
  cardNote = note;
  FX.setCard(id);
  if (id === shownCard) { updateReviewChip(); return; }
  // from her back to a front card: a paper-doll turn, and in the 3D room she steps up to the hero
  if (shownCard && shownCard.includes(BACK_CARD) && !id.includes(BACK_CARD)) {
    FX.act('turn');
    if (Stage3D) Stage3D.turn();
  }
  shownCard = id;
  const token = ++cardToken;
  const [front, back] = ui.cardA.classList.contains('shown') ? [ui.cardA, ui.cardB] : [ui.cardB, ui.cardA];
  back.onload = () => {
    if (token !== cardToken) return;
    back.classList.add('shown'); front.classList.remove('shown');
  };
  back.onerror = () => {
    if (token !== cardToken) return;
    if (!back.src.includes('?retry')) { back.src = `${cardUrl(id)}?retry`; return; }
    const fallback = `${id.split('_')[0]}_neutral`;
    if (id !== fallback) showCard(fallback, `${id} 없음 → 기본 표정`);
  };
  back.src = cardUrl(id);
  updateReviewChip();
}

function expressionCard(emotion) {
  const outfit = outfitOf(currentScene);
  const id = `${outfit}_${emotion}`;
  if (CARDS[outfit].includes(emotion)) return [id, ''];
  const fallback = EXPRESSION_FALLBACK[id] || `${outfit}_neutral`;
  return [fallback, `${emotion} 카드 없음 → ${fallback.slice(outfit.length + 1)}`];
}

function updateReviewChip() {
  ui.reviewChip.textContent = `${currentScene}단계 · 배경 ${shownBg || '-'} · 카드 ${shownCard || '-'}${cardNote ? ` (${cardNote})` : ''}`;
}

// ---- staging per node ---------------------------------------------------------------------------------------
function beatFor(node) {
  const hay = `${node.cue || ''} ${node.text || ''}`;
  return BEATS.find(b => b.stage === currentScene && hay.includes(b.match));
}

function stageScene(node) {
  ui.sceneTag.textContent = node.tag;
  const n = Number(node.tag.match(/^[1-5]/)?.[0] || 0);
  if (n) currentScene = n;
  ui.app.dataset.scene = String(currentScene);
  mood = SCENE_MOODS[currentScene];
  preloadStage(currentScene);
  FX.setOutfit(outfitOf(currentScene));
  FX.scene(node.tag, currentScene);
  // the first visit opens on Jane at her bench with her back to the door; she turns on her first line
  const back = n === 1 && CARDS[outfitOf(1)].includes(BACK_CARD);
  if (n) showBackground(STAGES[currentScene].bg, 'arrive', { back, welcome: n === 4 });
  if (back) { showCard(`${outfitOf(1)}_${BACK_CARD}`, '뒷모습'); return; }
  const [id, note] = expressionCard(mood);
  showCard(id, note);
}

function stageLine(node) {
  const beat = beatFor(node);
  if (beat?.bg) showBackground(beat.bg);
  FX.line(node, currentScene);
  if (node.speaker !== '제인') { FX.marks(null); return; }
  const prevMood = mood, prevCard = shownCard;
  if (node.emotion) mood = node.emotion;
  if (beat?.card) showCard(beat.card, '행동 카드');
  else if (node.emotion) { const [id, note] = expressionCard(node.emotion); showCard(id, note); }
  FX.marks(node.emotion || null);
  if (node.emotion && (node.emotion !== prevMood || shownCard !== prevCard)) FX.act(EMOTIONS[node.emotion].motion);
}

// ---- dialogue (same reading rules as the growth novel) -------------------------------------------------------
function updateEmotionView(node) {
  const profile = EMOTIONS[mood];
  const isJane = node.speaker === '제인';
  ui.app.style.setProperty('--emotion-color', profile.color);
  ui.emotionTag.textContent = profile.label;
  ui.emotionTag.classList.toggle('hidden', !isJane);
  const cue = isJane ? (node.cue || '') : node.type === 'choice' ? (CHOICE_CUES[node.id] || '') : '';
  ui.cue.textContent = cue;
  ui.cueBox.classList.toggle('hidden', !cue);
}

function cancelTyping() { typingEpoch += 1; clearTimeout(typingTimer); typingTimer = null; typing = false; }

function updateButtons() {
  const presenting = Playback.busy;
  const doorReady = Boolean(Stage3D && Stage3D.waitingForDoor());
  const autoHidden = started && presenting;
  const wasAutoHidden = ui.app.classList.contains('dialogue-auto-hidden');
  ui.app.classList.toggle('presenting', presenting);
  ui.app.classList.toggle('dialogue-auto-hidden', autoHidden);
  ui.dialogueBox.setAttribute('aria-hidden', String(dialogueHidden || autoHidden));
  // Keep keyboard input available while the dialogue is temporarily off screen.
  if (autoHidden && ui.dialogueBox.contains(document.activeElement)) ui.app.focus({ preventScroll: true });
  else if (wasAutoHidden && !autoHidden && !dialogueHidden && document.activeElement === ui.app) {
    ui.dialogueBox.focus({ preventScroll: true });
  }
  ui.hideDialogueBtn.disabled = !started;
  ui.choiceCount.textContent = `선택 기록 ${state.choices.length} / ${CHOICE_COUNT}`;
  ui.rewindBtn.disabled = checkpoints.length === 0 || presenting;
  ui.choicePanel.querySelectorAll('button').forEach(btn => { btn.disabled = presenting || dialogueHidden; });
  ui.actingToggle.textContent = actingEnabled ? '연출 켜짐' : '즉시 표시';
  ui.actingToggle.setAttribute('aria-pressed', String(actingEnabled));
  ui.app.classList.toggle('instant', !actingEnabled);
  if (doorReady) { ui.nextBtn.disabled = false; ui.nextBtn.textContent = '문을 연다'; }
  else if (presenting) { ui.nextBtn.disabled = true; ui.nextBtn.textContent = '연출 중…'; }
  else if (waitingChoice) { ui.nextBtn.disabled = true; ui.nextBtn.textContent = '선택 대기'; }
  else {
    // in game mode the last line leads to the end card, so the button stays live as '마치기'
    ui.nextBtn.disabled = finished && !typing && !GAME_MODE;
    ui.nextBtn.textContent = typing ? '문장 펼치기' : finished ? (GAME_MODE ? '마치기' : '완료') : '다음';
  }
  ui.hint.textContent = doorReady ? '문을 열면 이야기가 시작됩니다'
    : presenting ? '연출이 끝나면 진행할 수 있어요'
    : waitingChoice ? '선택지 클릭 · 숫자 1–3' : typing ? '클릭하면 문장 전체 표시'
    : finished ? (GAME_MODE ? '클릭 · Space · Enter로 마치기' : '선택 다시 · 다른 반응 확인') : '클릭 · Space · Enter로 진행';
}

function revealText() { cancelTyping(); ui.text.textContent = fullText; updateButtons(); }

function renderText(text, node) {
  cancelTyping();
  fullText = text;
  ui.announcement.textContent = `${node.speaker}. ${text}`;
  if (!actingEnabled || node.speaker !== '제인') { ui.text.textContent = text; updateButtons(); return; }
  const chars = typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(text), x => x.segment)
    : Array.from(text);
  const epoch = typingEpoch, profile = EMOTIONS[mood];
  let i = 0;
  ui.text.textContent = ''; typing = true; updateButtons();
  const step = () => {
    if (epoch !== typingEpoch) return;
    if (Playback.busy || dialogueHidden) { typingTimer = setTimeout(step, 50); return; }
    if (i >= chars.length) { revealText(); return; }
    const ch = chars[i++];
    ui.text.textContent = chars.slice(0, i).join('');
    if (i % 3 === 1 && !/[\s.,!?…~'"“”‘’()·]/u.test(ch)) Sound.blip(mood);   // her voice: a soft blip every few letters
    typingTimer = setTimeout(step, /[.!?…]/u.test(ch) && chars[i] !== ch ? profile.pause : profile.pace);
  };
  step();
}

function renderCurrent() {
  cancelTyping();
  while (pointer < timeline.length) {
    const node = timeline[pointer];
    if (node.type === 'action') { timeline.splice(pointer, 1, ...withoutDemoNotes(node.run() || [])); continue; }
    if (node.type === 'scene') { stageScene(node); pointer += 1; continue; }
    ui.dialogueBox.dataset.speaker = node.speaker || '선택';
    if (node.type === 'line') {
      ui.choicePanel.classList.add('hidden');
      waitingChoice = false;
      finished = pointer === timeline.length - 1;
      stageLine(node);
      ui.speaker.textContent = node.speaker;
      updateEmotionView(node);
      renderText(node.text, node);
      return;
    }
    if (node.type === 'choice') {
      finished = false; waitingChoice = true;
      ui.speaker.textContent = '플레이어의 선택';
      FX.marks(null);
      fullText = node.prompt; ui.text.textContent = node.prompt; ui.announcement.textContent = node.prompt;
      updateEmotionView(node); updateButtons(); renderChoices(node);
      return;
    }
    throw new Error(`Unknown timeline node: ${node.type}`);
  }
  finished = true; updateButtons();
}

function renderChoices(node) {
  ui.choicePanel.replaceChildren();
  ui.choicePanel.classList.remove('hidden');
  node.options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'choice-button';
    btn.disabled = Playback.busy || dialogueHidden;
    btn.innerHTML = `<span class="choice-number">${String(index + 1).padStart(2, '0')}</span>`;
    btn.append(document.createTextNode(opt.label));
    btn.addEventListener('click', () => {
      if (!waitingChoice || timeline[pointer] !== node || Playback.busy || dialogueHidden) return;
      checkpoints.push({
        timeline: timeline.slice(), pointer, state: JSON.parse(JSON.stringify(state)),
        scene: currentScene, mood, bg: shownBg, card: shownCard, tag: ui.sceneTag.textContent, fx: FX.snapshot(),
      });
      waitingChoice = false;
      ui.choicePanel.classList.add('hidden');
      Sound.play('ui_choice');
      const replies = opt.onSelect() || [];
      state.choices.push({ id: node.id, index, label: opt.label });
      saveChoice(node.id, state[node.id]);
      timeline.splice(pointer, 1, line('플레이어', opt.label), ...replies);
      renderCurrent();
      ui.dialogueBox.focus({ preventScroll: true });
    });
    ui.choicePanel.appendChild(btn);
  });
}

function next() {
  if (!started) return;
  if (dialogueHidden) { setDialogueHidden(false); return; }
  if (Stage3D && Stage3D.consumeInput()) return;   // the first press at a stage start opens the door
  if (Playback.busy || waitingChoice) return;
  if (typing) { revealText(); return; }
  if (finished) { if (GAME_MODE) $('endCard').classList.remove('hidden'); return; }
  Sound.play('ui_next');
  pointer += 1;
  renderCurrent();
}

function startGame() {
  cancelTyping();
  Playback.reset();
  Object.assign(state, initialState());
  checkpoints = []; timeline = buildTimeline(); pointer = 0;
  currentScene = 1; mood = SCENE_MOODS[1];
  if (GAME_MODE) {
    // earlier stages' attitudes feed this stage's callbacks; missing ones read as 'honest'
    const stored = loadChoices();
    CHOICE_KEYS.slice(0, ONLY_STAGE - 1).forEach(k => { state[k] = stored[k] || 'honest'; });
    timeline = stageSlice(timeline, ONLY_STAGE);
    currentScene = ONLY_STAGE; mood = SCENE_MOODS[ONLY_STAGE];
    $('endCard').classList.add('hidden');
  }
  FX.clearAll();
  waitingChoice = false; started = true; finished = false;
  setDialogueHidden(false);
  ui.startModal.classList.add('hidden');
  renderCurrent();
  (Playback.busy ? ui.app : ui.dialogueBox).focus({ preventScroll: true });
}

function rewindChoice() {
  if (Playback.busy || dialogueHidden) return;
  const cp = checkpoints.pop();
  if (!cp) return;
  cancelTyping();
  Playback.reset();
  Object.assign(state, initialState(), cp.state);
  timeline = cp.timeline.slice(); pointer = cp.pointer;
  currentScene = cp.scene; mood = cp.mood;
  ui.app.dataset.scene = String(currentScene);
  ui.sceneTag.textContent = cp.tag;
  showBackground(cp.bg, 'instant'); showCard(cp.card);
  FX.setOutfit(outfitOf(currentScene));
  FX.restore(cp.fx, currentScene);
  finished = false;
  renderCurrent();
}

Playback.onChange(updateButtons);
ui.nextBtn.addEventListener('click', next);
ui.hideDialogueBtn.addEventListener('click', () => setDialogueHidden(true));
ui.restoreDialogueBtn.addEventListener('click', () => setDialogueHidden(false));
ui.app.addEventListener('click', e => {
  if (dialogueHidden && !e.target.closest('button')) setDialogueHidden(false);
});
ui.dialogueBox.addEventListener('click', e => { if (!e.target.closest('button')) next(); });
ui.startBtn.addEventListener('click', startGame);
ui.restartBtn.addEventListener('click', startGame);
ui.rewindBtn.addEventListener('click', rewindChoice);
const soundToggle = $('soundToggle');
function showSoundState() {
  soundToggle.textContent = Sound.muted ? '소리 꺼짐' : '소리 켜짐';
  soundToggle.setAttribute('aria-pressed', String(!Sound.muted));
}
soundToggle.addEventListener('click', () => { Sound.setMuted(!Sound.muted); showSoundState(); Sound.play('ui_toggle'); });
showSoundState();
ui.actingToggle.addEventListener('click', () => {
  actingEnabled = !actingEnabled; FX.setEnabled(actingEnabled);
  if (Stage3D) Stage3D.setInstant(!actingEnabled);
  if (typing) revealText(); updateButtons();
});
document.addEventListener('keydown', e => {
  if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  if (k === 'h') { e.preventDefault(); setDialogueHidden(!dialogueHidden); return; }
  if (k === 'r') { ui.reviewChip.classList.toggle('hidden'); return; }
  if (!started) return;
  if (dialogueHidden) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setDialogueHidden(false); }
    return;
  }
  if (waitingChoice && /^[1-3]$/.test(e.key)) { e.preventDefault(); ui.choicePanel.querySelectorAll('button')[Number(e.key) - 1]?.click(); return; }
  if (e.target.closest?.('button, input, textarea, select, a')) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); }
});

FX.setEnabled(actingEnabled);
const firstStage = GAME_MODE ? ONLY_STAGE : 1;
preloadStage(firstStage);
if (GAME_MODE) ui.app.classList.add('game');
ui.startBtn.disabled = true;
// the 3D workshop loads first (a few MB); without it the 2D background renders are used
(window.stage3dReady || Promise.resolve(null)).then(api => {
  Stage3D = api && api.active ? api : null;
  if (Stage3D) Stage3D.setInstant(!actingEnabled);
  ui.startBtn.disabled = false;
  if (GAME_MODE) { startGame(); return; }
  currentScene = firstStage;
  showBackground(STAGES[firstStage].bg, 'instant');
  showCard(expressionCard(SCENE_MOODS[firstStage])[0]);
  updateButtons();
});
