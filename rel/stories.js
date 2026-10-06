'use strict';

// Relationship preview (EMC contest build, 2026-10-06): one Lv.1 evening per heroine, card + background, one choice.
// Script source: EMC docs/design/2026-10-06-relationship-preview.md (cut from jane private 01 and maya talk_01/02).
// Line kinds: {n} narration, {p} the player, {s, e, t} a heroine line with its card emotion, {choice: [{label, lines}]}.
// Jane's workshop at night, shared by her evenings (Lv.1, Lv.2): the room, the camera and how her card stands.
const JANE_ROOM = Object.freeze({
  // she stays at her growth novel's spot in front of the bench, but the camera stops 3 m from her (its 2 m looked
  // close and made her small beside the furniture), the lens lengthened so she is not smaller on the screen
  // (tuned 10-06 at 933x525); a camera spot further in would put the bench in front of her
  kind: 'living', height: 1.78, dist: 3.0, offset: 0.09, sink: 0.022, card3d: true,
  // the lean-in once she stands (space.js frameOn): her card carries the tall hood ears, so a little less than Maya's
  // 1.45 keeps her hands at the chest above the dialogue box
  fill: 1.25,
  talk: { eye: [-0.215, -1.745, 1.32], target: [-0.45, 1.55, 1.1], lens: 37 },
  rig: {
    assets: '../jane/3d/out', exterior: '../jane/3d/out/harbor', light: 'night', version: 'rel-jane-20261006', smooth: true,
    tone: [0.86, 0.92], startLens: 22, doorOpen: Math.PI * 100 / 180, entryMs: 7200,
    outside: { eye: [-5.7, -8.2, 1.48], target: [-3.65, -3.45, 1.45], lens: 22 },
    arrival: {
      eyes: [[-5.7, -8.2, 1.48], [-2.4, -4.3, 1.32], [-2.4, -3.38, 1.32], [-2.05, -2.3, 1.32], [-0.215, -1.745, 1.32]],
      targets: [[-3.65, -3.45, 1.45], [-2.4, -2.6, 1.2], [-2.3, -1.0, 1.25], [-1.0, 1.2, 1.2], [-0.45, 1.55, 1.1]]
    }
  }
});

const PREVIEW_STORIES = Object.freeze({
  jane: {
    name: '제인',
    color: '#efaac4',
    // her cutscene CGs to come, a short strip on the end card (user 10-07); assets/preview/<name>(_thumb).webp
    preview: ['jane_1', 'jane_2', 'jane_3'],
    title: '용건은 없는데요',
    place: '리스항구 · 제인의 집 겸 작업실 · 밤',
    background: 'assets/bg/jane_workbench_night.webp',
    night: true,
    card: emotion => `assets/cards/jane/hood_${emotion}.webp`,
    cardFit: 'bust',
    // her workshop in 3D (space.js with a rig): the harbor door, the walk in along her growth novel's arrival (stage3d.js
    // ARRIVE.bench, Blender units, true scale — eye 1.32) to the bench view where she stands ~2 m away (CAMS.bench.talk).
    // Her cards are one body: the approved hood front redrawn per expression with its face and hands only
    // (make_jane_faces.py; the growth novel's cards drift in legs, build and kangaroo pocket, user 10-06/07). Hair top to
    // soles is 79.7% of the card, the soles 2.2% above its lower edge (sink); a 1.78 card puts a 1.42 m Jane (hair top).
    // She stays a 3D card through the talk (card3d, user 10-06).
    space: {
      ...JANE_ROOM,
      // the evening opens at her door (user 10-06: start at the door like Maya, with a little staging before the talk):
      // a light in the window, a knock, her voice from inside; through the door she is at the bench end, busy, sets a
      // vial down, starts at seeing who it is, turns and comes over (`arrive`, rel.js). Her one body throughout: the
      // vial card's own drawing had no kangaroo pocket and stood shorter (user 10-07).
      door: [
        { n: '밤의 리스항구. 제인의 작업실 창에는 아직 불이 켜져 있다.' },
        { n: '문을 두드리자, 안에서 유리병이 달그락거리는 소리가 난다.', sfx: 'knock' },
        { s: 'jane', off: true, t: '네에— 열려 있어요! 들어오세요!' }
      ],
      arrive: { from: [0.45, 1.3], card: 'neutral', put: 'ding_small', notice: 'startled', ms: 1000 }
    },
    lines: [
      { s: 'jane', e: 'joy', t: '어, 오셨어요? 잘됐다! 이쪽으로 와요. 잠깐 앉았다 가요.' },
      { n: '맞은편 의자에 쌓아 둔 주문서 묶음을 작업대 한쪽으로 옮긴다.', sfx: 'paper_rustle' },
      { s: 'jane', e: 'tired', t: '오늘은 주문서 말고 딴 얘기 해요. "더 좋은 거 없어요?"를 하도 들었더니, 아직도 누가 옆에서 그러는 것 같아요.' },
      { p: '처음 주문서를 만들 땐 어땠어?' },
      { s: 'jane', e: 'neutral', t: '연금술 배운 지 얼마 안 됐을 때요. 손님이 재료를 가져오면 만들어 드리고, 품삯 조금 받고.' },
      { s: 'jane', e: 'joy', t: '그러다 어느 날 문을 열었는데… 어? 밖에 사람들이 쭉 서 있는 거예요. 전부 재료 꾸러미 하나씩 들고!' },
      { s: 'jane', e: 'annoyed', t: '근데 똑같이 만들어도 육십 퍼센트짜리가 나올 때가 있고, 십 퍼센트짜리가 나올 때가 있거든요. 십이 나오면 얼굴이 딱 굳어요. "왜 이걸 줘요!"' },
      { n: '높아졌던 목소리가 낮아진다. 가방 끈을 손가락에 감는다.' },
      { s: 'jane', e: 'hurt', t: '가게 앞에서 계속 소리를 지르니까, 말이 안 나오더라고요. 그날은 정말 그만둘까 했어요.' },
      { choice: [
        { label: '실망했다고 소리 질러도 되는 건 아니지.', lines: [
          { s: 'jane', e: 'startled', t: '그렇죠? …그렇죠.' },
          { n: '대답하고 나서야 가방 끈을 놓는다.' },
          { s: 'jane', e: 'relieved', t: '옛날 얘기라 아무렇지도 않은 줄 알았는데. 편들어 주니까… 좀 좋네요.' },
          { s: 'jane', e: 'sheepish', t: '아, 가방 끈 다 꼬였네. 저 이거 언제부터 만지고 있었어요?' }
        ] },
        { label: '그래도 다시 가게를 열었네.', lines: [
          { s: 'jane', e: 'sincere', t: '안 열려고 했어요. 진짜로요.' },
          { s: 'jane', e: 'neutral', t: '근데 아침에 보니까 문 앞에 재료가 또 와 있더라고요. 쪽지도 같이요. 이번에도 부탁한다고.' },
          { s: 'jane', e: 'sheepish', t: '주문서 보러 오는 거지, 저 보러 오는 것도 아닌데. 부탁한다니까 또 신났어요.' },
          { s: 'jane', e: 'quiet_pride', t: '…그래도 아주 조금은, 저한테 맡기고 싶었던 거겠죠?' }
        ] }
      ] },
      { s: 'jane', e: 'playful', t: '아, 저 혼자 너무 떠들었다. 다음엔 용사님 차례예요. 카니발에서 뭐 봤는지, 하나도 빼지 말고요.' },
      { n: '작업대 끝에 펼쳐 둔 여행 안내서가 눈에 들어오자, 제인이 황급히 덮는다.', sfx: 'paper_open' },
      { s: 'jane', e: 'sheepish', t: '아, 이건… 다음에요. 다음에 얘기해 줄게요.' },
      { s: 'jane', e: 'joy', t: '조심히 가요. 내일도 카니발이죠? 오늘보다 좋은 주문서 붙게 빌어 줄게요. 흐흥.' }
    ],
    next: [
      { level: 2, title: '이거, 마가티아 거예요?' },
      { level: 2, title: '오늘은 구경만' },
      { level: 3, title: '손, 잠깐만' },
      { level: 4, title: null },
      { level: 5, title: null }
    ]
  },
  // Lv.2 — jane_private 04 「이거, 마가티아 거예요?」 cut for the preview: the player brings a small vial said to come
  // from Magatia; it answers the travel guide she hid at the end of Lv.1. Her room and card as in Lv.1; at the end the
  // vial stands on the bench in the 3D room (`prop`).
  jane2: {
    name: '제인',
    color: '#efaac4',
    // her cutscene CGs to come, a short strip on the end card (user 10-07); assets/preview/<name>(_thumb).webp
    preview: ['jane_1', 'jane_2', 'jane_3'],
    level: 2,
    title: '이거, 마가티아 거예요?',
    place: '리스항구 · 제인의 집 겸 작업실 · 밤',
    background: 'assets/bg/jane_workbench_night.webp',
    night: true,
    card: emotion => `assets/cards/jane/hood_${emotion}.webp`,
    cardFit: 'bust',
    space: {
      ...JANE_ROOM,
      door: [
        { n: '다음 날 밤. 제인의 작업실 창에는 오늘도 불이 켜져 있다. 주머니 속에서 작은 유리병이 달그락거린다.' },
        { n: '문을 두드리자, 기다렸다는 듯 대답이 돌아온다.', sfx: 'knock' },
        { s: 'jane', off: true, t: '열려 있어요! 오늘은 일찍 왔네요?' }
      ],
      arrive: { from: [0.45, 1.3], card: 'pensive', put: 'paper_rustle', ms: 1000 },
      // on the bench top right of her, by the grey book (picked in the talk view: the top is z 1.015 from y 2.0 back;
      // 0.745 was a shelf seen through the drawer gap and showed the vial stuck to the drawer front)
      props: { vial: [0.5, 2.2, 1.015] }
    },
    lines: [
      { s: 'jane', e: 'joy', t: '어서 와요! 오늘은 카니발 얘기부터 해 줘요. 어제 약속했잖아요.' },
      { p: '그 전에, 이거.' },
      { n: '항구의 여행 상인에게서 산 손바닥만 한 유리병을 건넨다. 상인은 마가티아에서 넘어온 물건이라고 했다.', a: 'vial_hold', sfx: 'ding_small' },
      { s: 'jane', e: 'curious', a: 'vial_up', t: '어? 잠깐만요. 이 표시… 어디서 구했어요?' },
      { n: '병을 등불 쪽으로 들어 올리자, 밑바닥의 희미한 각인이 빛에 떠오른다.' },
      { s: 'jane', e: 'pensive', t: '책에서 봤는데. 항구에 들어온 연금술 책이요. 마가티아 쪽 유리 기구에 이런 게 있다고…' },
      { s: 'jane', e: 'curious', a: 'vial_up', t: '이거 진짜 그쪽에서 왔어요?' },
      { choice: [
        { label: '상인이 마가티아에서 가져왔다길래 네 생각이 났어.', lines: [
          { s: 'jane', e: 'startled', t: '저 생각나서요?' },
          { n: '제인이 병을 내려다보며 입구를 한 번 매만진다.', a: 'vial_hold' },
          { s: 'jane', e: 'sheepish', t: '마가티아 물건 보다가, 저 주려고 사 오신 거죠? …헤헤.' },
          { s: 'jane', e: 'curious', a: 'vial_up', t: '아, 이 눈금 좀 봐요. 되게 가늘게 새겼네. 유리 두께도…' },
          { s: 'jane', e: 'sincere', t: '…네, 좋아요. 병도 좋고, 제 생각나서 사 오셨다는 것도요.' }
        ] },
        { label: '직접 가보기 전까지는 이걸로 구경하라고.', lines: [
          { s: 'jane', e: 'pensive', t: '직접 가보기 전까지…' },
          { n: '제인이 양손으로 병을 감싸 쥔다.', a: 'vial_hold' },
          { s: 'jane', e: 'sincere', a: 'vial_hold', t: '저 진짜 가보고 싶어요. 마가티아.' },
          { s: 'jane', e: 'joy', t: '연금술 연구로 유명하잖아요. 제뉴미스트 연구실도 보고, 알카드노 기계도 보고! 책에 없는 것도 잔뜩 있을 텐데.' },
          { s: 'jane', e: 'sheepish', t: '아직 안 가봤으면서 벌써 구경 순서 정하네. …저 지금 말 빨라졌죠?' }
        ] }
      ] },
      { s: 'jane', e: 'quiet_pride', t: '…어제 황급히 덮은 거 있죠. 그거, 마가티아 여행 안내서였어요.' },
      { s: 'jane', e: 'resolute', t: '나중에 마가티아 가면, 이런 병이 얼마나 많은지 꼭 보고 올래요.' },
      { n: '제인은 유리병을 천으로 한 번 닦아, 작업대 위 연금술 책 옆에 세워 둔다. 다음에 들어와도 바로 보이는 자리다.', prop: 'vial', sfx: 'ding_small' },
      { s: 'jane', e: 'playful', t: '자, 이제 진짜 카니발 얘기요. 하나도 빼지 말고!' }
    ],
    next: [
      { level: 3, title: '손, 잠깐만' },
      { level: 4, title: null },
      { level: 5, title: null }
    ]
  },
  maya: {
    name: '마야',
    color: '#a9dc8f',
    // her cutscene CGs to come, a short strip on the end card (user 10-07); assets/preview/<name>(_thumb).webp
    preview: ['maya_1', 'maya_2', 'maya_3'],
    title: '닫힌 창문이 마음에 걸려서요',
    place: '헤네시스 · 마야의 집 · 작업실',
    background: 'assets/bg/maya_living.webp',
    night: false,
    card: emotion => `assets/cards/maya/travel_${emotion}.webp`,
    cardFit: 'full',
    // her 3D room (space.js): walk in through the house door to the talking view; she stands `dist` m in front of the
    // camera on its line of sight, and the picture is lifted by `offset` so her face sits in the upper middle and the
    // dialogue box covers her waist — Jane's growth-novel framing (tuned 10-06 at the game's 933×525 web view).
    // Units are the room's: it is built about 1.7x life size (doors 2.8 m, nightstand 1.3 m; her growth novel's seated
    // card is 1.85), so she is a 2.64 card (~2.55 figure) and the player's eye is 2.6, looking a little down at her.
    // She stays a 3D card through the talk (card3d, user 10-06: with the right view, 3D all the way is fine).
    space: { kind: 'living', height: 2.64, dist: 2.9, offset: 0.1, card3d: true, talk: { eye: [-0.8, -1.2, 2.6], target: [1.15, 2.55, 1.9], lens: 22 } },
    lines: [
      { n: '작업실 문을 열자, 후드 여행복 차림의 마야가 마법진 가운데 서서 수첩에 무언가를 적고 있다. 문 옆에는 꾸리다 만 탐사 가방이 놓여 있다.' },
      { s: 'maya', e: 'thinking', t: '창문은 전부 닫혀 있었고…… 자국은 바닥에만…… 아니, 순서가 틀렸네.' },
      { p: '마야?' },
      { s: 'maya', e: 'surprised', t: '앗……! 아, 용사님이었군요. 언제 오셨어요?' },
      { s: 'maya', e: 'shy', t: '문 여는 소리는 들었는데, 바람인 줄 알았어요. ……요즘 그런 이야기만 적어서 그런가 봐요.' },
      { s: 'maya', e: 'smile', t: '어서 오세요. 카니발은 무사히 끝났어요? 다친 데는…… 없어 보이네요. 다행이에요.' },
      { p: '뭘 그렇게 열심히 적고 있었어?' },
      { s: 'maya', e: 'explain', t: '아, 이거요? 그 집에서 난 소리 이야기, 들으셨어요? 밤마다 가구를 끄는 소리가 났다던 곳이요.' },
      { p: '그래서 직접 확인하고 왔어?' },
      { s: 'maya', e: 'neutral', t: '낮에만요. 소리는 못 들었고, 바닥에 끌린 자국이 있는 건 봤어요.' },
      { s: 'maya', e: 'thinking', t: '아마 의자를 옮긴 흔적이겠죠. 아니… 창문이 전부 닫혀 있었다는 말이 마음에 걸려서요.' },
      { choice: [
        { label: '자국이 창문 쪽으로 이어졌는지 보자.', lines: [
          { n: '수첩을 돌려 봐도 되는지 묻자, 마야가 종이 모서리를 내 쪽으로 밀었다.' },
          { s: 'maya', e: 'surprised', t: '여기서 끊겼어요. ……아니, 창문보다 벽의 이 틈에 더 가까웠네요.' },
          { p: '바람이 들어올 틈이 있었을 수도 있겠네.' },
          { s: 'maya', e: 'smile', t: '그건 확인할 수 있겠어요. 다음에 볼 항목에 적어 둘게요. 용사님이 짚어 주신 곳이라고요.' }
        ] },
        { label: '직접 본 것과 들은 이야기를 나눠 볼까?', lines: [
          { s: 'maya', e: 'earnest', t: '네. 제가 직접 본 건 자국이고, 밤의 소리는 그곳 사람들이 해 준 이야기예요.' },
          { n: '마야는 한 줄로 이어 썼던 기록 사이에 선을 긋고, 소문 옆에는 작은 물음표를 붙였다.' },
          { s: 'maya', e: 'happy', t: '이렇게 나누니까 빈칸이 더 잘 보이네요.' },
          { p: '빈칸이 늘었는데도 좋아 보여.' },
          { s: 'maya', e: 'shy', t: '……어디부터 확인하면 되는지 알게 됐으니까요.' }
        ] }
      ] },
      { s: 'maya', e: 'worried', t: '설마 벽 안에서 누가 의자를 옮긴 건…… 아니, 아직 그쪽으로 갈 필요는 없겠네요.' },
      { n: '수첩을 덮으려던 마야의 손이 멈춘다. 빈칸이 남은 준비물 목록이 보인다.' },
      { s: 'maya', e: 'thinking', t: '다음 조사는 숲이에요. 돌무더기에 묶인 표시가 있대요. 혹시……' },
      { s: 'maya', e: 'blush', t: '아니, 아니에요. 준비가 다 끝나면, 그때 말씀드릴게요.' },
      { n: '마야는 목록 맨 아래 빈칸에 무언가를 적다가, 손바닥으로 가렸다.' }
    ],
    next: [
      { level: 2, title: '체온계는 오른쪽 서랍에' },
      { level: 2, title: '처음으로 같은 지도' },
      { level: 3, title: null },
      { level: 4, title: null },
      { level: 5, title: null }
    ]
  }
  // Lv.2 (the bed scene, complete CGs) was cut from the contest build (user 10-07: no time) — its title stays a locked
  // next story above; the bedroom walk in space.js / rel.js is kept for when it comes back.
});

// Card motion and typing pace per emotion (Jane's growth novel table, Maya's card set added).
const PREVIEW_EMOTIONS = Object.freeze({
  joy: { pace: 17, motion: 'rise' }, tired: { pace: 33, motion: 'settle' }, neutral: { pace: 26, motion: '' },
  annoyed: { pace: 15, motion: 'recoil' }, hurt: { pace: 36, motion: 'sink' }, startled: { pace: 32, motion: 'recoil' },
  relieved: { pace: 28, motion: 'settle' }, sheepish: { pace: 29, motion: 'sink' }, sincere: { pace: 26, motion: 'settle' },
  quiet_pride: { pace: 27, motion: 'settle' }, playful: { pace: 23, motion: 'rise' },
  explain: { pace: 25, motion: 'rise' }, thinking: { pace: 30, motion: 'settle' }, surprised: { pace: 30, motion: 'recoil' },
  smile: { pace: 26, motion: 'rise' }, earnest: { pace: 26, motion: 'settle' }, happy: { pace: 22, motion: 'rise' },
  shy: { pace: 32, motion: 'sink' }, worried: { pace: 31, motion: 'sink' }, blush: { pace: 33, motion: 'sink' }
});
