'use strict';

// Performance directions only. These are not affection or romance scores.
// The existing five scene CGs remain unchanged; emotion profiles control
// text delivery, captions, the emotion chip and small UI motion.
const EMOTIONS = Object.freeze({
  confident:   { label: '자신만만', color: '#efc67d', pace: 23, pause: 120, motion: 'rise' },
  curious:     { label: '호기심', color: '#c6dbae', pace: 26, pause: 160, motion: 'rise' },
  proud:       { label: '의기양양', color: '#eec477', pace: 19, pause: 110, motion: 'rise' },
  startled:    { label: '당황', color: '#e6c9b0', pace: 32, pause: 250, motion: 'recoil' },
  annoyed:     { label: '발끈', color: '#ef9b92', pace: 15, pause: 100, motion: 'recoil' },
  hurt:        { label: '낙담', color: '#c0b9d5', pace: 36, pause: 310, motion: 'sink' },
  pensive:     { label: '곰곰이', color: '#b9c8d6', pace: 30, pause: 230, motion: 'settle' },
  resolute:    { label: '다짐', color: '#dac492', pace: 24, pause: 170, motion: 'rise' },
  joy:         { label: '들뜸', color: '#efaac4', pace: 17, pause: 100, motion: 'rise' },
  relieved:    { label: '안도', color: '#bdd7c6', pace: 28, pause: 170, motion: 'settle' },
  sheepish:    { label: '머쓱', color: '#dbb5ca', pace: 29, pause: 230, motion: 'sink' },
  tired:       { label: '피곤', color: '#b8bdcf', pace: 33, pause: 220, motion: 'settle' },
  sincere:     { label: '진지', color: '#adcbd5', pace: 26, pause: 170, motion: 'settle' },
  quiet_pride: { label: '뿌듯', color: '#cfcca1', pace: 27, pause: 170, motion: 'settle' },
  playful:     { label: '능청', color: '#d7bde3', pace: 23, pause: 170, motion: 'rise' },
});

const SCENE_MOODS = Object.freeze({
  1: 'confident',
  2: 'proud',
  3: 'tired',
  4: 'quiet_pride',
  5: 'confident',
});

const CHOICE_CUES = Object.freeze({
  opening: '첫인사를 마친 제인이 반응을 기다린다. 같은 상황에도 말투에 따라 관계의 결은 달라질 수 있다.',
  feedback: '새 결과물을 펼쳐둔 제인이 가장 먼저 당신의 반응을 살핀다.',
  research: '밤샘 실험 직후. 피곤함과 부끄러움보다 연구 이야기에 더 몰두해 있다.',
  philosophy: '처음으로 자기 방식의 실험을 꺼내 보인 제인이 말을 기다린다.',
  closing: '새로운 목표를 말한 제인이 이번에는 먼저 시선을 맞춘다.',
});