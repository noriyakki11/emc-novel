'use strict';

// 제인 성장 노벨(카드판) 연출표. 대사는 ../jane_novel_emotions/story.js가 정본이고 여기서는 복제하지 않는다.
// 단계마다 복장·배경을 정하고, 대사 지문(cue)이나 대사(text)에 들어 있는 문구로 행동 카드와 배경 전환을 건다.
// 행동 카드는 그 대사에서만 쓰고, 다음 제인 대사부터는 표정(emotion) 카드로 돌아간다.
// 감정이 없는 제인 대사와 기록·플레이어 대사는 직전 카드를 유지한다.
const CARD_ROOT = 'assets/cards';
const BG_ROOT = 'assets/bg';
const IMG_EXT = 'webp';   // build_web.py rewrites the three lines above for the deployed copy (WebP next to the page)
const STAGE3D_ROOT = './3d';   // the live 3D workshop (room3d.js, out/, vendor/); build_web.py copies it to '3d'
const STAGE3D_V = '308eecd2';                        // build_web.py: a hash of the 3D files, so a new bake skips the cache

const BACKGROUNDS = Object.freeze({
  home_workbench_day: '제인의 집 · 작업대',
  home_workbench_night: '제인의 집 · 밤의 작업대',
  home_entrance_day: '제인의 집 · 현관',
});

const STAGES = Object.freeze({
  1: { outfit: 'bunny', bg: 'home_workbench_day' },
  2: { outfit: 'bunny', bg: 'home_workbench_day' },
  3: { outfit: 'hood', bg: 'home_workbench_night' },
  // 4단계는 제인이 먼저 문을 열어 맞이하는 장면으로 시작해, 작업대 앞으로 옮겨 간다.
  4: { outfit: 'alchemist', bg: 'home_entrance_day' },
  5: { outfit: 'alchemist', bg: 'home_workbench_day' },
});

// stage: 단계, match: 지문 또는 대사에 들어 있는 문구, card: 그 대사에서만 띄울 행동 카드, bg: 이 대사부터 바뀔 배경
const BEATS = Object.freeze([
  { stage: 1, match: '주문서 묶음을 쫙 펼친다', card: 'bunny_scroll_bundle' },
  { stage: 1, match: '자기 시험용 금속판에 연습 문양을 붙인다', card: 'bunny_practice_sheet' },
  { stage: 2, match: '연습 문양 두 장과 시험용 금속판을 나란히 편다', card: 'bunny_practice_sheet' },
  { stage: 3, match: '플레이어가 내민 손바닥 위에 작은 시험 문양을 놓는다', card: 'hood_palm_pattern' },
  { stage: 4, match: '소매를 정리해 작업대 앞에 선다', bg: 'home_workbench_day' },
  { stage: 4, match: '두 금속판에 각 시험 문양을 놓는다', card: 'alchemist_metal_plates' },
  { stage: 5, match: '새 노트를 활짝 펼친다', card: 'alchemist_new_notebook' },
]);

// ---- 연출 -------------------------------------------------------------------------------------------------
// 효과 이미지: jane_grouth_novel/assets/cg/growth_scenes_20260930/FX_*.png를 내용 부분만 잘라 둔 사본
const FX_ROOT = 'assets/fx';

// 카드 안 머리 위치(카드 너비·높이에 대한 %). 카드는 머리 크기·위치 기준으로 맞춰져 있어 복장마다 고정이다.
const HEAD = Object.freeze({
  bunny: { cx: 50, top: 13, forehead: 21, eyes: 29, left: 32, right: 68 },
  hood: { cx: 49, top: 10, forehead: 24, eyes: 30, left: 31, right: 68 },
  alchemist: { cx: 49, top: 10, forehead: 26, eyes: 31, left: 31, right: 68 },
});

// 감정마다 머리 옆에 뜨는 기호. 대사가 떠 있는 동안 남고 다음 대사에서 사라진다.
const EMOTION_MARKS = Object.freeze({
  startled: ['surprise', 'exclaim'],
  annoyed: ['anger'],
  sheepish: ['sweat'],
  hurt: ['gloom'],
  joy: ['sparkles'],
  proud: ['sparkles'],
  confident: ['shine'],
  quiet_pride: ['shine'],
  curious: ['question'],
  pensive: ['dots'],
  tired: ['sigh'],
  relieved: ['sigh'],
  playful: ['note'],
  resolute: ['fired'],
  sincere: [],
});

// 지문·대사 문구로 거는 사건 연출. on = 켤 연출, off = 이 대사에서 끌 지속 연출(이마 종이·손 종이·빛 토끼 귀).
const FX_BEATS = Object.freeze([
  { stage: 1, match: '작은 빛이 깜빡이다 꺼지고', on: ['flicker', 'paper_hands', 'shake'] },
  { stage: 1, match: '간신히 종이를 떼어내고', off: ['paper_hands'] },
  { stage: 1, match: '구겨진 종이를 접어 주머니에 넣는다', off: ['paper_hands'] },
  { stage: 1, match: '종이를 마저 떼어낸다', off: ['paper_hands'] },
  { stage: 1, match: '웃던 입꼬리가 잠깐 내려간다', off: ['paper_hands'] },
  { stage: 1, match: '"정수"라고 크게 적은 의뢰서', on: ['request'] },
  { stage: 2, match: '첫 문양에서 작은 빛이 나왔다가 꺼진다', on: ['flicker'] },
  { stage: 2, match: '작은 연기와 종잇조각을 뿜는다', on: ['poof', 'shake'] },
  { stage: 2, match: '종잇조각이 이마에 붙자', on: ['forehead_paper'] },
  { stage: 2, match: '종잇조각을 빈 노트 위에 모은다', off: ['forehead_paper'] },
  { stage: 2, match: '이마의 종잇조각을 떼고', off: ['forehead_paper'] },
  { stage: 2, match: '종잇조각을 쥔 손을 등 뒤로 숨긴다', off: ['forehead_paper'] },
  { stage: 2, match: '방금 쓴 의뢰서를 플레이어 쪽으로 민다', on: ['request'] },
  { stage: 3, match: '새 문양에서도 같은 끝에서 빛이 시작된다', on: ['glyph'] },
  { stage: 3, match: '토끼 귀 모양으로 떠오른다', on: ['rabbit_ears', 'flash'] },
  { stage: 3, match: '빛이 시작된 지점을 손가락으로 짚는다', off: ['rabbit_ears'] },
  { stage: 3, match: '같은 위치가 표시된 세 기록을 펼친다', off: ['rabbit_ears'] },
  { stage: 3, match: '후드 끈을 만지려던 손이 멈춘다', off: ['rabbit_ears'] },
  { stage: 3, match: '새 의뢰서를 적어 플레이어에게 내민다', on: ['request'] },
  { stage: 4, match: '다음 빛은 넓게 번진 뒤 잦아든다', on: ['glyph', 'broad_glow'] },
  { stage: 4, match: '두 묶음 옆에 의뢰서를 내려놓는다', on: ['request'] },
  { stage: 5, match: '새 노트를 활짝 펼친다', on: ['title_flash'] },
  { stage: 5, match: '노트 맨 앞장에 끼워둔 의뢰서를 꺼내 내민다', on: ['request'] },
  { stage: 5, match: '익숙한 자신만만한 미소를 짓는다', on: ['sparkles_screen'] },
]);

// 의뢰서를 받는 순간의 알림 문구(대사 속 사정을 그대로 옮김)
const REQUESTS = Object.freeze({
  1: '정수 · 연습 문양에 섞어 볼 만큼',
  2: '정수 · 같은 조건으로 몇 번 더 시험할 만큼',
  3: '정수 · 손 대신 쓸 만큼 훨씬 많이',
  4: '정수 · 넓게 번지는 쪽에 쓸 만큼 (양이 많음)',
  5: '가장 큰 의뢰 · 새 노트를 채울 만큼, 오래 걸려도',
});
const TITLE_FLASH = '천지를 뒤바꿀 주문서';

// 그 복장에 아직 없는 표정은 가까운 표정으로 대신한다(카드가 생기면 이 줄을 지운다).
const EXPRESSION_FALLBACK = Object.freeze({
  'alchemist_proud': 'alchemist_joy',
});

const CARDS = Object.freeze({
  bunny: ['joy', 'playful', 'sheepish', 'startled', 'pensive', 'annoyed', 'sincere', 'confident', 'proud',
    'quiet_pride', 'curious', 'resolute', 'relieved', 'tired', 'hurt', 'neutral', 'scroll_bundle', 'practice_sheet',
    'back_workbench'],
  hood: ['joy', 'playful', 'sheepish', 'startled', 'pensive', 'sincere', 'curious', 'annoyed', 'tired', 'relieved',
    'confident', 'quiet_pride', 'hurt', 'resolute', 'proud', 'neutral', 'palm_pattern'],
  alchemist: ['joy', 'playful', 'sheepish', 'startled', 'pensive', 'sincere', 'curious', 'confident', 'resolute',
    'quiet_pride', 'relieved', 'annoyed', 'hurt', 'neutral', 'metal_plates', 'new_notebook'],
});
