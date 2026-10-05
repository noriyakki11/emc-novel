'use strict';

// 제인 성장 노벨(카드판) 연출표. 대사는 ../jane_novel_emotions/story.js가 정본이고 여기서는 복제하지 않는다.
// 단계마다 복장·배경을 정하고, 대사 지문(cue)이나 대사(text)에 들어 있는 문구로 행동 카드와 배경 전환을 건다.
// 행동 카드는 그 대사에서만 쓰고, 다음 제인 대사부터는 표정(emotion) 카드로 돌아간다.
// 감정이 없는 제인 대사와 기록·플레이어 대사는 직전 카드를 유지한다.
const CARD_ROOT = 'assets/cards';
const BG_ROOT = 'assets/bg';
const IMG_EXT = 'webp';   // build_web.py rewrites the three lines above for the deployed copy (WebP next to the page)
const STAGE3D_ROOT = './3d';   // the live 3D workshop (room3d.js, out/, vendor/); build_web.py copies it to '3d'
const STAGE3D_V = '8f83153d';                        // build_web.py: a hash of the 3D files, so a new bake skips the cache

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
  { stage: 1, match: '자기 시험용 금속판에 연습 주문서를 붙인다', card: 'bunny_proud' },
  { stage: 2, match: '연습 주문서 두 장과 시험용 금속판을 나란히 편다', card: 'bunny_proud' },
  { stage: 3, match: '플레이어가 내민 손바닥 위에 작은 시험 주문서를 놓는다', card: 'hood_curious' },
  { stage: 4, match: '소매를 정리해 작업대 앞에 선다', bg: 'home_workbench_day' },
  { stage: 4, match: '두 금속판에 각 시험 주문서를 놓는다', card: 'alchemist_curious' },
  { stage: 5, match: '새 노트를 활짝 펼친다', card: 'alchemist_joy' },
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

// First-meeting hand positions differ with the expression card (card width/height %).
const PAPER_HANDS_POSES = Object.freeze({
  bunny_startled: [[31, 43], [70, 41]],
  bunny_sheepish: [[45.5, 45.5], [54.5, 46]],
  bunny_annoyed: [[47.5, 46], [61, 46.8]],
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

// on/off = 사건 및 장면 상태. pause = 대화창을 비우고 끝까지 볼 핵심 장면만 지정한다.
const FX_BEATS = Object.freeze([
  { stage: 1, match: '자기 시험용 금속판에 연습 주문서를 붙인다', on: ['scroll_focus'] },
  { stage: 1, match: '모인 빛이 팍 튀며 꺼진다', on: ['spark_pop'], pause: true },
  { stage: 1, match: '반대 손으로 떼려다 그쪽에도 붙고 만다', on: ['paper_hands', 'shake'], off: ['scroll_focus'] },
  { stage: 1, match: '간신히 종이를 떼어내고', off: ['paper_hands'] },
  { stage: 1, match: '구겨진 종이를 접어 주머니에 넣는다', off: ['paper_hands'] },
  { stage: 1, match: '종이를 마저 떼어낸다', off: ['paper_hands'] },
  { stage: 1, match: '연습지를 작업대 옆으로 휙 던져놓고', on: ['paper_flick'] },
  { stage: 1, match: '"정수"라고 크게 적은 의뢰서', on: ['request'] },
  { stage: 2, match: '연습 주문서 두 장과 시험용 금속판을 나란히 편다', on: ['scroll_focus'] },
  { stage: 2, match: '첫 주문서에서 작은 빛이 나왔다가 꺼진다', on: ['flicker'] },
  { stage: 2, match: '두 번째 주문서를 시험용 금속판 위에 올리고', on: ['scroll_second'] },
  { stage: 2, match: '작은 연기와 종잇조각을 뿜는다', on: ['poof'], off: ['scroll_focus'], pause: true },
  { stage: 2, match: '종잇조각이 이마에 붙자', on: ['forehead_paper'] },
  { stage: 2, match: '종잇조각을 빈 노트 위에 모은다', off: ['forehead_paper'] },
  { stage: 2, match: '이마의 종잇조각을 떼고', off: ['forehead_paper'] },
  { stage: 2, match: '종잇조각을 쥔 손을 등 뒤로 숨긴다', off: ['forehead_paper'] },
  { stage: 2, match: '방금 쓴 의뢰서를 플레이어 쪽으로 민다', on: ['request'] },
  { stage: 3, match: '시험 주문서와 세 번의 기록을 가까이 보여준다', on: ['research_focus'] },
  { stage: 3, match: '새 주문서에서도 같은 끝에서 빛이 시작된다', on: ['research_repeat'] },
  { stage: 3, match: '플레이어가 내민 손바닥 위에 작은 시험 주문서를 놓는다', on: ['hand_focus'], off: ['research_focus'] },
  { stage: 3, match: '토끼 귀 모양으로 떠오른다', on: ['rabbit_ears'], pause: true },
  { stage: 3, match: '빛이 시작된 지점을 손가락으로 짚는다', off: ['hand_focus'] },
  { stage: 3, match: '같은 위치가 표시된 세 기록을 펼친다', off: ['hand_focus'] },
  { stage: 3, match: '후드 끈을 만지려던 손이 멈춘다', off: ['hand_focus'] },
  { stage: 3, match: '새 의뢰서를 적어 플레이어에게 내민다', on: ['request'] },
  { stage: 4, match: '왼쪽 방패 그림은 철벽 주문서', on: ['plate_focus'] },
  { stage: 4, match: '다음 빛은 넓게 번진 뒤 잦아든다', on: ['plate_compare'], pause: true },
  { stage: 4, match: '두 묶음 옆에 의뢰서를 내려놓는다', on: ['request'], off: ['plate_focus'] },
  { stage: 5, match: '새 노트를 활짝 펼친다', on: ['notebook_focus'] },
  { stage: 5, match: '다음 장을 넘기자 텅 빈 페이지가 나온다', on: ['notebook_blank'] },
  { stage: 5, match: '노트 맨 앞장에 끼워둔 의뢰서를 꺼내 내민다', on: ['request'] },
  { stage: 5, match: '익숙한 자신만만한 미소를 짓는다', off: ['notebook_focus'] },
]);

// 의뢰서를 받는 순간의 알림 문구(대사 속 사정을 그대로 옮김)
const REQUESTS = Object.freeze({
  1: '정수 · B등급 공격력 주문서의 새 배합',
  2: '정수 · 실패한 배합을 비교하고 기록할 만큼',
  3: '정수 · 실험 기록지를 다른 주문서에도 시험할 만큼',
  4: '정수 · 철벽·광전사의 효과와 대가를 시험할 만큼',
  5: '가장 큰 의뢰 · 혼돈 주문서의 변화 폭 연구',
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
