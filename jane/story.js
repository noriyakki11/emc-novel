function line(speaker, text, emotion = null, cue = '') {
  return { type: 'line', speaker, text, emotion, cue };
}

function emotionLine(emotion, text, cue = '') {
  return line('제인', text, emotion, cue);
}

function choice(id, prompt, options) {
  return { type: 'choice', id, prompt, options };
}

function action(run) {
  return { type: 'action', run };
}

function scene(tag, image) {
  return { type: 'scene', tag, image };
}

function dominantAttitude() {
  const values = [state.opening, state.feedback, state.research, state.philosophy, state.closing];
  const counts = { harsh: 0, honest: 0, flirt: 0 };
  values.forEach(value => {
    if (Object.hasOwn(counts, value)) counts[value] += 1;
  });
  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (ordered[0][1] === ordered[1][1]) return 'mixed';
  return ordered[0][0];
}

function buildTimeline() {
  const t = [];

  t.push(
    scene('1단계 · 제인과의 첫 만남', assets.scene1),
    line('기록', '런이 끝난 뒤, 제인의 개인 작업실을 찾았다. 상인 매대에서 본 주문서 묶음이 이제 작은 작업대 위에 놓여 있다.'),
    emotionLine('curious', '어? 용사님 맞죠? 설마 여기까지 와주실 줄은 몰랐는데.', '바니 의상의 토끼 귀 한쪽을 바로잡고 금세 활짝 웃는다.'),
    emotionLine('proud', '저는 제인이에요. 연금술사! 요즘은 주문서 만드는 데 푹 빠져 있고요.', '기다렸다는 듯 주문서 묶음을 쫙 펼친다.'),
    line('제인', '이거 하나 붙이면 장비가 힘을 더 내요. 잘 붙으면요. ……보통은 잘 붙어요.'),
    emotionLine('proud', '말로만 들으면 모르죠? 마침 연습하던 게 있어요. 여기 빛이 딱 남을 거예요. 잘 봐요!', '작업대 위의 판매용 묶음을 옆으로 밀고 자기 시험용 금속판에 연습 문양을 붙인다.'),
    emotionLine('startled', '……잠깐만요. 인사가 좀 짧네.', '작은 빛이 깜빡이다 꺼지고, 종이를 떼려던 양손에 번갈아 달라붙는다.'),
    emotionLine('sheepish', '종이 말고 빛이 붙어야 되는데!', '양손을 벌린 채 손끝에 달린 종이를 내려다본다.'),
    choice('opening', '첫 시연을 본 뒤 한마디 건넨다.', [
      {
        label: '말하는 것만 들으면 벌써 대연금술사네.',
        onSelect: () => {
          state.opening = 'harsh';
          return [
            emotionLine('startled', '와, 첫 만남부터 그러기예요?', '잠깐 눈을 크게 뜬다.'),
            emotionLine('annoyed', '연금술사도 가끔은 실수하거든요. 하필 그 가끔을 보신 거예요!', '붙은 종이를 떼려던 손으로 금속판을 가리킨다.'),
            emotionLine('resolute', '다음엔 눈 크게 뜨고 봐요. 이렇게 금방 끝나지도 않을 거고요.', '간신히 종이를 떼어내고 다시 턱을 든다.'),
          ];
        },
      },
      {
        label: '방금 건 안 됐지만, 직접 만든 건 맞네.',
        onSelect: () => {
          state.opening = 'honest';
          return [
            emotionLine('startled', '그건 알아보셨네요?', '손을 털던 동작이 멈춘다.'),
            emotionLine('sheepish', '네! 문양도 제가 옮기고, 배합도 직접…… 아, 자랑부터 할 때가 아니지.', '다시 신나서 설명하다 꺼진 금속판을 본다.'),
            emotionLine('confident', '다음엔 붙는 것 말고도 잘하는 걸 보여드릴게요.', '구겨진 종이를 접어 주머니에 넣는다.'),
          ];
        },
      },
      {
        label: '주문서보다 만든 사람이 더 눈에 띄네.',
        onSelect: () => {
          state.opening = 'flirt';
          return [
            emotionLine('startled', '네?!', '준비해둔 설명이 그대로 끊긴다.'),
            emotionLine('sheepish', '그, 그건…… 지금 이런 꼴인데요?', '토끼 귀를 고치려다가 손에 붙은 종이를 보고 도로 내린다.'),
            emotionLine('playful', '……그럼 딴 데 좀 봐주세요. 눈에 띄는 사람도 정리는 해야죠.', '웃음을 숨기지 못한 채 종이를 마저 떼어낸다.'),
          ];
        },
      },
    ]),
    emotionLine('pensive', '원래는 저도 모험 다니고 싶었어요. ……집에서 허락을 안 해줘서요.', '웃던 입꼬리가 잠깐 내려간다.'),
    emotionLine('pensive', '근데 빛이 왜 안 붙어 있지…… 아, 문양만으로는 붙잡아 둘 힘이 모자란 거구나.', '둘이 실패한 연습지를 반듯한 것과 탄 것으로 나눠둔 뒤, 꺼진 금속판을 손끝으로 두드린다.'),
    emotionLine('curious', '아, 맞다! 용사님, 싸우고 나면 반짝이는 가루 남잖아요. 정수요. 그거 섞으면 빛이 버틸지도 몰라요. ……다음에 나가시면 좀 모아다 주실래요?', '작업대 서랍에서 종이 한 장을 꺼내 급히 적어 내려간다.'),
    emotionLine('joy', '정식 의뢰예요. 이름도 제대로 썼어요.', '맨 위에 "정수"라고 크게 적은 의뢰서를 플레이어에게 내민다.'),

    scene('2단계 · 아직 미숙하다', assets.scene2),
    line('기록', '다음 런을 마치고 다시 제인의 개인 작업실로 갔다. 지난번 나눠둔 연습지와 새 기록 두 장이 같은 작업대에 펼쳐져 있다.'),
    emotionLine('joy', '왔다!', '플레이어를 보자마자 손부터 흔든다.'),
    emotionLine('sheepish', '……아니, 그렇게 기다린 건 아니고요. 마침 보여드릴 게 있었어요.', '너무 반가워한 걸 깨닫고 슬쩍 말을 고친다.'),
    emotionLine('proud', '지난번에 모아다 주신 정수, 하나도 안 남기고 다 써봤어요. 문양에도 섞고, 금속판에도 바르고, 그래도 남은 건…… 또 섞었고요.', '연습 문양 두 장과 시험용 금속판을 나란히 편다.'),
    line('제인', '이번엔 달라요. 한 장 안 되면 다른 것도 준비했거든요. 흐흥.'),
    emotionLine('startled', '먼저 이쪽부터…… 어?', '첫 문양에서 작은 빛이 나왔다가 꺼진다.'),
    emotionLine('sheepish', '괜찮아요. 그래서 두 장인 거예요. 이건 좀 더 세게…….', '두 번째 문양이 부풀더니 작은 연기와 종잇조각을 뿜는다. 다친 곳은 없다.'),
    emotionLine('startled', '앗, 이건 또 왜 여기 붙어! 거울…… 거울 어디 갔지?', '종잇조각이 이마에 붙자 노트를 거울처럼 들었다가 내려놓는다.'),
    choice('feedback', '두 번째 시연까지 수습하는 제인에게 답한다.', [
      {
        label: '이 정도로 그렇게 들뜬 거야?',
        onSelect: () => {
          state.feedback = 'harsh';
          return [
            emotionLine('startled', '……아.', '웃고 있던 얼굴이 잠깐 멈춘다.'),
            emotionLine('hurt', '보여드릴 때는 잘될 줄 알았죠…….', '두 문양을 내려다보며 목소리가 작아진다.'),
            emotionLine('sheepish', '아니, 그래도 두 번째까지는 좀 기다려주…… 두 번째도 했네.', '반박하다가 손에 든 실패한 문양을 본다.'),
            emotionLine('resolute', '장수 문제가 아니지. 일단 이것부터 다시 볼래요.', '종잇조각을 빈 노트 위에 모은다.'),
          ];
        },
      },
      {
        label: '잘되진 않았지만, 며칠 붙잡은 건 알겠네.',
        onSelect: () => {
          state.feedback = 'honest';
          return [
            emotionLine('startled', '……그건 티 나요?', '연습지 옆에 쌓인 기록을 본다.'),
            emotionLine('joy', '그렇죠? 제가 이거 보여드리려고…….', '잠깐 밝아졌다가 손에 묻은 종잇가루를 턴다.'),
            emotionLine('sheepish', '이런 걸 보여드리려던 건 아닌데……', '이마의 종잇조각을 떼고 작게 웃는다.'),
          ];
        },
      },
      {
        label: '내가 올 때 보여주려고 계속 기다렸나 보네.',
        onSelect: () => {
          state.feedback = 'flirt';
          return [
            emotionLine('startled', '아니거든요?!', '반응이 지나치게 빠르다.'),
            emotionLine('sheepish', '그냥…… 두 번 정도 밖에 나와본 것뿐이에요. 세 번인가.', '말할수록 스스로 불리해진다.'),
            emotionLine('startled', '……왜 제가 횟수까지 말하고 있죠?', '뒤늦게 입을 다문다.'),
            emotionLine('playful', '다음에는 먼저 불러드릴게요. 이마에 아무것도 안 붙어 있을 때.', '종잇조각을 쥔 손을 등 뒤로 숨긴다.'),
          ];
        },
      },
    ]),
    emotionLine('pensive', '이쪽은 왜 바로 꺼지고, 저쪽은 왜…… 으음. 용사님, 첫 번째 기록 좀 잡아주실래요?', '플레이어가 한 장을 눌러주는 사이 두 문양의 기록을 찾다가 종이를 이리저리 바꿔놓는다.'),
    emotionLine('startled', '……어느 게 먼저 쓴 거였지? 아, 섞지 말걸.', '정리하려고 모아놓은 기록 앞에서 멈춘다.'),
    emotionLine('pensive', '같은 조건으로 몇 번은 더 해봐야 어디서 꺼지는지 알겠어요. 그러려면 정수가 꾸준히 있어야 하고요.', '섞인 기록을 다시 순서대로 놓으려다 손을 멈춘다.'),
    emotionLine('confident', '……그래서 이거요. 방금 쓴 거라 글씨가 좀 급해요. 저 아직 해볼 게 잔뜩 있거든요.', '노트에서 눈을 떼지 않은 채 방금 쓴 의뢰서를 플레이어 쪽으로 민다.'),

    scene('3단계 · 밤샘 실험', assets.scene3),
    line('기록', '또 한 번의 런을 마치고 개인 작업실에 들렀다. 창밖은 어두운데 제인은 아직 같은 작업대 앞에 앉아 있다.'),
    emotionLine('tired', '아니, 왜 이번엔 색이…… 아.', '한참 기록을 들여다보다가 뒤늦게 고개를 든다.'),
    emotionLine('startled', '용사님?!', '후드와 헝클어진 머리를 이제야 의식한다.'),
    emotionLine('sheepish', '잠깐만요. 오늘 오는 날이었어요? 아니, 그게 아니라…… 하필 지금…….', '소매를 당겨보지만 잉크 자국만 더 보인다.'),
    action(() => {
      const callbacks = {
        harsh: emotionLine('annoyed', '지난번에 그렇게까지 들뜰 일이냐고 했죠? ……그래서 좀 더 해봤어요. 딱히 그 말 때문만은 아니고요.', '분명 그 말 때문인 얼굴로 노트를 펼친다.'),
        honest: emotionLine('sheepish', '지난번에 며칠 붙잡은 건 알겠다고 했잖아요. ……이번엔 제대로 보여주고 싶어서요.', '밤새 적은 기록을 펴다가 문양 쪽으로 눈이 간다.'),
        flirt: emotionLine('sheepish', '지난번에 제가 기다렸냐고 했죠. 이번엔 진짜 아니에요. 정신 차려보니까 밖이 깜깜했던 것뿐이에요. ……진짜로요.', '먼저 해명하고 나서 괜히 얼굴이 붉어진다.'),
      };
      return [callbacks[state.feedback]];
    }),
    emotionLine('joy', '아, 그것보다 이거 봐요! 용사님이 갖다주신 재료에서 진짜 웃긴 반응이 나왔어요.', '자기 몰골은 금세 잊고 플레이어에게 익숙한 작업대 앞자리를 내준다.'),
    line('제인', '여기서 먼저 켜져요. 이 선 끝. 한 번만 그런 줄 알았는데…….'),
    emotionLine('curious', '봐요. 또 여기부터죠? 세 번 다요. 이번엔 섞이기 전에 적어뒀어요.', '번호가 붙은 세 기록을 짚는다. 새 문양에서도 같은 끝에서 빛이 시작된다.'),
    emotionLine('curious', '손 좀 줘보세요. 이 문양만 받쳐줘요.', '플레이어가 내민 손바닥 위에 작은 시험 문양을 놓는다.'),
    line('제인', '여기까진 같은데, 끝을 조금 바꾸면…….'),
    emotionLine('startled', '어?', '빛이 같은 끝에서 출발하더니 플레이어 머리 위에 토끼 귀 모양으로 떠오른다.'),
    emotionLine('sheepish', '……모양은 이게 아닌데. 잠깐만요. 사라지기 전에 이 끝만 볼게요.', '토끼 귀를 올려다보다 곧바로 문양의 끝선을 들여다본다.'),
    choice('research', '실험 결과를 보고 한마디 한다.', [
      {
        label: '밤새 만든 게 내 머리 위 토끼 귀야?',
        onSelect: () => {
          state.research = 'harsh';
          return [
            emotionLine('annoyed', '토끼 귀가 핵심이 아니거든요!', '피곤한 것도 잊고 바로 목소리가 커진다.'),
            emotionLine('pensive', '……저 모양은 저도 모르겠고요. 근데 시작하는 곳은 맞았어요. 방금도.', '빛이 시작된 지점을 손가락으로 짚는다.'),
            emotionLine('resolute', '토끼 귀 얘기는 나중에요. 지금은 이 끝선이요.', '문양과 빛을 번갈아 본다.'),
          ];
        },
      },
      {
        label: '모양은 이상해도, 네가 짚은 데서 다시 시작했네.',
        onSelect: () => {
          state.research = 'honest';
          return [
            emotionLine('relieved', '맞아요! 거기 보셨어요?', '피곤한 얼굴이 바로 밝아진다.'),
            emotionLine('joy', '이제 안 나오면 처음부터 다 뜯을 필요는 없겠죠. 여기부터 보면 되니까.', '같은 위치가 표시된 세 기록을 펼친다.'),
            emotionLine('sheepish', '……토끼 귀는 따로 적어둘게요. 왜 하필 귀람.', '기록 옆에 귀 모양을 작게 그린다.'),
          ];
        },
      },
      {
        label: '난 지금 그 모습도 꽤 마음에 드는데.',
        onSelect: () => {
          state.research = 'flirt';
          return [
            emotionLine('startled', '……네?', '이번엔 연구 얘기도 바로 끊긴다.'),
            emotionLine('sheepish', '안경도 쓰고, 머리도 이런데…… 진짜 지금요?', '후드 끈을 만지려던 손이 멈춘다.'),
            emotionLine('playful', '아, 대답은 이따 해요! 지금 들으면 이거 다 까먹을 것 같으니까.', '귀가 붉어진 채 번호가 붙은 연습지를 다시 당긴다.'),
          ];
        },
      },
    ]),
    emotionLine('pensive', '여기서 켜지는 건 같고…… 끝을 바꾸니까 모양이 달라졌고.', '방금 바꾼 부분에만 작은 표시를 남긴다.'),
    emotionLine('curious', '근데 용사님 손 위에서는 왜 이렇게 크게 떴을까요. ……아, 손에 정수 기운이 남아 있구나. 싸우고 오셨으니까.', '플레이어의 손바닥과 문양을 번갈아 본다.'),
    emotionLine('sheepish', '그렇다고 용사님 손을 매번 빌릴 순 없잖아요. 그만큼 모으려면 정수가 훨씬 많이 필요하겠네요.', '밤새 쓴 기록 아래에 새 의뢰서를 적어 플레이어에게 내민다.'),
    emotionLine('quiet_pride', '표지는 아직 못 꾸몄어요. 원래 같았으면 리본 색부터 골랐을 텐데.', '장식 없는 노트를 넘기다가 쓰지 않은 페이지를 찾는다.'),
    emotionLine('joy', '리본은 이따 고르고요. ……손은 오늘만 빌릴게요. 한 번만 더요, 이번엔 이 선만 바꿔서.', '새 연습지를 놓고 플레이어에게 받침 역할을 다시 부탁한다.'),

    scene('4단계 · 처음으로 자기 방식', assets.scene4),
    line('기록', '다음 방문에는 제인이 먼저 작업실 문을 열었다. 지난번의 기록은 두 새 문양 옆에 순서대로 놓여 있다.'),
    emotionLine('joy', '오셨어요? 오늘은 멀쩡하죠? 잤어요. 무려 여섯 시간!', '긴 흰 토끼 귀가 달린 분홍 연금술사 후드 차림으로 일어나 옷깃을 펴고, 두 주문서와 기록을 나란히 놓는다.'),
    emotionLine('sheepish', '옷도 좀 어울리죠? ……잠깐, 옷만 보라는 건 아니고. 오늘은 이것도 봐요.', '소매를 정리해 작업대 앞에 선다.'),
    action(() => {
      const callbacks = {
        harsh: emotionLine('playful', '그리고 오늘 실험은 머리 위에 뜨는 토끼 귀 아니에요. 말하기 전에 미리 막았습니다.', '선수를 쳤다는 듯 씩 웃는다.'),
        honest: emotionLine('quiet_pride', '지난번에 같은 데서 시작한 거 봤죠? 그다음엔 어디로 보내느냐를 바꿔봤어요.', '세 번째 실험의 기록을 새 주문서 옆에 펼친다.'),
        flirt: emotionLine('sheepish', '……오늘 모습 얘기는 나중에요. 저도 거울 봤거든요. 꽤 괜찮던데요?', '잠깐 시선을 피했다가 두 주문서를 다시 집는다.'),
      };
      return [callbacks[state.research]];
    }),
    line('제인', '시작하는 곳은 그대로 뒀어요. 대신 끝을 두 가지로. 하나는 최대한 얌전하게, 하나는 확 퍼지게.'),
    emotionLine('curious', '자, 이번엔 끝까지 봐요. 용사님은 어느 쪽이 먼저인지 기록 좀 짚어줘요.', '플레이어가 순서를 표시한 두 금속판에 각 시험 문양을 놓는다. 첫 빛은 좁은 선 안에 머물고, 다음 빛은 넓게 번진 뒤 잦아든다.'),
    emotionLine('joy', '……됐죠? 헤헤. 혼자 됐을 때도 좋았는데, 같이 보니까 더 좋네요.', '두 결과를 급히 가리지 않고 플레이어를 돌아보며 활짝 웃는다.'),
    emotionLine('sheepish', '처음엔 타고, 또 타고…… 서랍도 한 칸 날아갔어요. 저기요. 아직 못 고쳤어요.', '빈 서랍칸을 가리킨 뒤 기록을 제자리에 놓는다.'),
    emotionLine('quiet_pride', '책에는 둘 중 어느 걸 만들라고 안 써 있더라고요. 그래서 둘 다 해봤어요.', '예전 배합 기록 옆에 새로 그린 두 문양을 놓는다.'),
    choice('philosophy', '서로 다른 두 결과를 직접 본 뒤 말한다.', [
      {
        label: '이제야 좀 네가 만든 것 같네.',
        onSelect: () => {
          state.philosophy = 'harsh';
          return [
            emotionLine('annoyed', '말을 꼭 그렇게 해야 해요?', '반사적으로 발끈한다.'),
            emotionLine('pensive', '그래도 이번엔 안 치울 거예요. 둘 다 제가 생각한 대로 나왔으니까.', '주문서를 가지런히 펴둔 채 플레이어를 본다.'),
            emotionLine('playful', '더 봐도 돼요. 이름도 적을 거거든요. 제인 거라고.', '펜을 집으며 씩 웃는다.'),
          ];
        },
      },
      {
        label: '이런 게 네 답이었나 보네.',
        onSelect: () => {
          state.philosophy = 'honest';
          return [
            emotionLine('startled', '……제 답?', '그 표현을 입안에서 한 번 굴리듯 되묻는다.'),
            emotionLine('joy', '그 말 되게 좋네요.', '생각보다 솔직하게 튀어나오고 만다.'),
            emotionLine('quiet_pride', '둘 다 남겨둘래요. 제가 골라서 만든 거니까.', '한 장만 치우려던 손을 거두고 둘을 나란히 둔다.'),
          ];
        },
      },
      {
        label: '실험 얘기할 때 제일 반짝반짝하네.',
        onSelect: () => {
          state.philosophy = 'flirt';
          return [
            emotionLine('startled', '반짝…… 뭐요?', '잠깐 말 뜻을 따라가지 못한다.'),
            emotionLine('sheepish', '그, 그렇게 빤히 봤어요?', '자기도 모르게 머리카락을 정리한다.'),
            emotionLine('playful', '……그럼 좀 더 봐요. 오늘은 보여줄 것도 있으니까.', '붉어진 얼굴로 주문서를 내민다.'),
          ];
        },
      },
    ]),
    emotionLine('sheepish', '어라, 왜 안 써져…… 아. 뚜껑.', '서명하려던 펜의 뚜껑을 뒤늦게 벗긴다.'),
    emotionLine('pensive', '……이름, 어디에 쓰지. 가운데? 너무 큰가.', '두 주문서를 번갈아 보며 펜 끝을 댄다.'),
    emotionLine('quiet_pride', '……써야겠다. 제가 만든 거니까.', '대답을 기다리던 손이 움직인다. 두 주문서에 자기 이름을 적고 잠깐 바라본다.'),
    line('제인', '둘 다 둘 거예요. 얌전한 게 필요한 날도 있고, 확 터지는 게 필요한 날도 있잖아요.'),
    emotionLine('playful', '고르는 건 쓰는 사람이 하면 되고요. 전 둘 다 만들 수 있으면 그만이죠.', '두 묶음을 나란히 밀어놓는다.'),
    emotionLine('pensive', '근데 넓은 쪽은 정수를 꽤 먹네요. 얌전한 쪽보다 몇 배는 들었어요.', '바닥이 보이는 정수 병을 기울여 본다.'),
    emotionLine('playful', '그러니까…… 의뢰서, 또 있어요. 이번엔 양이 좀 많아요. 미리 사과할게요.', '두 묶음 옆에 의뢰서를 내려놓는다.'),
    emotionLine('confident', '……그래도 이제 좀 재밌어졌어요.', '완성된 진열보다 다음 실험 쪽에 먼저 눈이 간다.'),

    scene('5단계 · 천지를 뒤바꿀 주문서', assets.scene5),
    line('기록', '런이 끝난 뒤 찾은 개인 작업실. 둘이 정리했던 기록과 제인이 서명한 두 주문서 옆에 새 노트 한 권이 펼쳐져 있다.'),
    emotionLine('joy', '용사님! 딱 잘 왔어요.', '이번에는 먼저 손짓해 가까이 부른다.'),
    emotionLine('proud', '제목부터 봐요. “천지를 뒤바꿀 주문서.” 어때요? 좀 세죠?', '새 노트를 활짝 펼친다.'),
    emotionLine('playful', '아직 주문서는 없어요. 제목부터 정한 거 맞아요. 왜요, 멋있잖아요.', '지적받기 전에 먼저 웃는다.'),
    line('제인', '요즘 계속 궁금했어요. 주문 하나에 힘을 대체 어디까지 욱여넣을 수 있을까.'),
    emotionLine('pensive', '……이번에도 안 될 수는 있죠. 그럼 같이 봤던 기록처럼 어디서 달라졌는지 찾으면 되고요.', '노트의 빈 페이지와 둘이 정리했던 번호 기록을 번갈아 본다.'),
    emotionLine('confident', '그래도 해볼래요. 진짜로 천지가 뒤집히나.', '펜을 고쳐 쥔다. 이번에는 플레이어의 반응보다 빈 페이지에 먼저 눈이 간다.'),
    action(() => {
      const callbacks = {
        harsh: emotionLine('playful', '이제야 제 것 같다면서요? 이번에는 아예 비교할 것도 없는 걸 만들어볼게요. 그러면 또 뭐라고 할지 궁금하네요.', '도발을 기다리듯 먼저 웃는다.'),
        honest: emotionLine('sheepish', '지난번에 제 답 같다고 해준 거…… 사실 계속 생각났어요. 그래서 그다음이 궁금해졌어요. 제 답이 어디까지 가나.', '말하고는 조금 민망한 듯 노트를 내려다본다.'),
        flirt: emotionLine('playful', '제가 반짝반짝해 보인다면서요? 오늘은 더 반짝일 거니까 눈 잘 뜨고 있어요.', '이번에는 먼저 눈을 맞추고 웃는다.'),
      };
      return [callbacks[state.philosophy]];
    }),
    choice('closing', '새 연구를 선언한 제인에게 답한다.', [
      {
        label: '뒤집고 나서 자랑해. 제목만 거창한 건 사양이야.',
        onSelect: () => {
          state.closing = 'harsh';
          return [
            emotionLine('annoyed', '에이, 끝까지 얄밉다니까요.', '입은 삐죽이지만 웃고 있다.'),
            emotionLine('playful', '좋아요. 그럼 뒤집고 나서 제일 먼저 찾아갈게요. 그때 딴소리하지 마세요.', '약속을 받아내듯 손가락으로 플레이어를 가리킨다.'),
            emotionLine('confident', '아, 기대 안 하는 척해도 소용없어요. 얼굴에 다 보여요.', '아무 근거 없이 단정하고 혼자 만족해한다.'),
          ];
        },
      },
      {
        label: '이제는 결과보다 네가 뭘 만들지가 더 궁금해.',
        onSelect: () => {
          state.closing = 'honest';
          return [
            emotionLine('startled', '……진짜요?', '대답이 너무 빨리 나온다.'),
            emotionLine('sincere', '그 말은…… 좀 반칙인데.', '잠깐 목소리가 작아진다.'),
            emotionLine('sheepish', '……고마워요. 완성된 것도 없는데 그렇게 말해줘서.', '시선을 내렸다가 다시 플레이어를 본다.'),
            emotionLine('joy', '그럼 기대해도 돼요. 저도 엄청 궁금하니까.', '결국 활짝 웃는다.'),
          ];
        },
      },
      {
        label: '완성되면 다른 사람 말고 나부터 불러.',
        onSelect: () => {
          state.closing = 'flirt';
          return [
            emotionLine('startled', '……다른 사람 말고?', '한 박자 늦게 같은 말을 되풀이한다.'),
            emotionLine('sheepish', '그렇게 말하면 제가 이상하게 생각하잖아요.', '시선을 피하면서도 웃음이 난다.'),
            emotionLine('playful', '좋아요. 제일 먼저 불러드릴게요. 대신 늦게 오면 저 삐질 거예요.', '이제는 말을 주워 담지 않고 그대로 받아친다.'),
            emotionLine('joy', '……약속한 거예요.', '마지막 한마디만 조금 작다.'),
          ];
        },
      },
    ]),
    action(() => {
      const dominant = dominantAttitude();
      if (dominant === 'harsh') {
        return [emotionLine('playful', '다음에도 분명 첫마디부터 흠잡겠죠? 좋아요. 이제는 그거 기다리는 것도 좀 재밌어요.', '예전처럼 발끈하기보다 먼저 웃는다.')];
      }
      if (dominant === 'honest') {
        return [emotionLine('sincere', '용사님은 괜히 좋다고 하는 사람은 아니잖아요. 그래서 가끔 한마디 해주면…… 꽤 오래 가요. 비밀이에요.', '말하고 바로 시선을 피한다.')];
      }
      if (dominant === 'flirt') {
        return [emotionLine('playful', '처음에는 말 한마디 할 때마다 놀랐는데…… 이제는 저도 좀 알겠어요. 다음엔 제가 먼저 해볼까요?', '장난스럽게 웃고는 반응을 살핀다.')];
      }
      return [emotionLine('quiet_pride', '맨날 하는 말은 달라도 계속 와주긴 하네요. 그럼 다음에도 올 거라고 생각할게요.', '당연한 일처럼 말하면서도 표정은 꽤 기쁘다.')];
    }),
    emotionLine('pensive', '이 노트를 다 채우려면…… 지금까지 모아주신 정수를 다 합쳐도 모자라겠죠.', '빈 페이지를 손바닥으로 쓸어본다.'),
    emotionLine('sincere', '그래서 이건 제일 큰 의뢰예요. 급하진 않아요. 대신 오래 걸려도 같이 채워줘요.', '노트 맨 앞장에 끼워둔 의뢰서를 꺼내 내민다.'),
    emotionLine('confident', '아무튼 다음엔 더 재밌는 거 보여드릴게요. 진짜로 “그게 돼?” 싶은 거요. 흐흥.', '노트를 덮고 익숙한 자신만만한 미소를 짓는다.'),

    scene('엔딩 · 제인의 다음 실험', assets.scene5),
    action(() => {
      const dominant = dominantAttitude();
      const relationshipNotes = {
        harsh: '툭하면 자존심을 건드리는 말은 어느새 제인에게 다음 결과를 보여주고 싶은 승부욕이 되었다.',
        honest: '빈말 없는 한마디는 생각보다 오래 남았다. 제인은 그 평가를 믿고, 또 은근히 기다리게 되었다.',
        flirt: '처음에는 말 한마디에도 휘청였지만, 이제는 제인도 웃으면서 한마디쯤 되돌려줄 수 있게 되었다.',
        mixed: '놀림도, 칭찬도, 장난도 제각각이었다. 제인은 그때마다 금세 흔들렸다가 또 금세 웃으며 돌아왔다.',
      };
      return [
        line('기록', '용사가 모아 온 정수는 제인의 작업대에서 섞이고, 타고, 엉뚱한 모양이 되었다가 다시 주문서가 되었다.'),
        line('기록', '그러는 사이 제인은 남들이 만들어둔 답을 따라가는 대신, 자기가 궁금한 걸 직접 시험하기 시작했다.'),
        line('기록', relationshipNotes[dominant]),
        line('기록', '다음 실험은 아직 제목밖에 없다. 제인은 이미 그걸 꽤 마음에 들어 한다.'),
        line('시스템', '데모 종료 — “선택 다시”로 다른 관계 톤을 확인해보세요.'),
      ];
    })
  );

  return flattenTimeline(t);
}
