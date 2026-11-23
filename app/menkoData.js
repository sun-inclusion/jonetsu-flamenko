// app/menkoData.js
// 『情熱のフラ・メンコ』全100種キモカワ動物メンコ＆CPU＆全5章ストーリーデータ

export const TRIBES = [
  { id: 'flamingo', name: 'フラミンゴ', baseColor: '#f472b6', subColor: '#fbcfe8', eye: 'sharp', mouth: 'beak', trait: '曲がりすぎたクチバシ' },
  { id: 'giraffe', name: 'キリン', baseColor: '#fbbf24', subColor: '#fef3c7', eye: 'droopy', mouth: 'derp', trait: '虚無を見つめる半目' },
  { id: 'frog', name: 'カエル', baseColor: '#4ade80', subColor: '#dcfce7', eye: 'bulge', mouth: 'drool', trait: '飛び出たギョロ目とヨダレ' },
  { id: 'alpaca', name: 'アルパカ', baseColor: '#f8fafc', subColor: '#e2e8f0', eye: 'smug', mouth: 'bucktooth', trait: 'ニヤついた出っ歯' },
  { id: 'octopus', name: 'タコ', baseColor: '#fb7185', subColor: '#ffe4e6', eye: 'dot', mouth: 'pucker', trait: '吸盤だらけのすぼみ口' },
  { id: 'gorilla', name: 'ゴリラ', baseColor: '#78716c', subColor: '#d6d3d1', eye: 'sad', mouth: 'jaw', trait: '哀愁漂う太眉とデカ顎' },
  { id: 'shoebill', name: 'ハシビロコウ', baseColor: '#94a3b8', subColor: '#e2e8f0', eye: 'stare', mouth: 'hugebeak', trait: '瞬きゼロの巨大クチバシ' },
  { id: 'otter', name: 'カワウソ', baseColor: '#d97706', subColor: '#fde68a', eye: 'scheming', mouth: 'grin', trait: '悪巧みするニヤケ顔' },
  { id: 'panda', name: 'パンダ', baseColor: '#ffffff', subColor: '#1e293b', eye: 'offset', mouth: 'chew', trait: '左右ズレた目の黒ブチ' },
  { id: 'uma', name: 'UMA・幻獣', baseColor: '#a855f7', subColor: '#f3e8ff', eye: 'three', mouth: 'zigzag', trait: '正体不明の三つ目とギザ口' },
];

const STAGES = [
  { lv: 1, prefix: 'ぼんやり', shape: 'round', rarity: 'N', rose: false, castanet: false, frill: false, hat: false },
  { lv: 2, prefix: 'よだれ', shape: 'round', rarity: 'N', rose: false, castanet: false, frill: false, hat: false },
  { lv: 3, prefix: 'でか顔', shape: 'round', rarity: 'N', rose: false, castanet: false, frill: false, hat: false },
  { lv: 4, prefix: '角ばり', shape: 'square', rarity: 'R', rose: false, castanet: false, frill: false, hat: true },
  { lv: 5, prefix: '伊達男', shape: 'square', rarity: 'R', rose: false, castanet: false, frill: false, hat: true },
  { lv: 6, prefix: 'リズム', shape: 'square', rarity: 'R', rose: false, castanet: true, frill: false, hat: false },
  { lv: 7, prefix: '薔薇噛み', shape: 'round', rarity: 'SR', rose: true, castanet: false, frill: false, hat: true },
  { lv: 8, prefix: '乱れ打ち', shape: 'square', rarity: 'SR', rose: false, castanet: true, frill: true, hat: false },
  { lv: 9, prefix: '情熱の', shape: 'round', rarity: 'SR', rose: true, castanet: true, frill: true, hat: false },
  { lv: 10, prefix: '伝説の舞姫', shape: 'square', rarity: 'UR', rose: true, castanet: true, frill: true, hat: true },
];

const SKILLS = {
  N: { name: 'なし', desc: '素朴なキモカワメンコ。軽くて扱いやすい。', bonusWind: 0, bonusWeight: 0 },
  R: { name: '角の踏ん張り', desc: '風圧＋15%。角やハットで場外に飛びにくい。', bonusWind: 0.15, bonusWeight: 0.15 },
  SR: { name: '薔薇の旋風', desc: '風圧＋30%。情熱のステップで相手を揺らす！', bonusWind: 0.30, bonusWeight: 0.25 },
  UR: { name: 'オーレ！大爆発', desc: '風圧＋50%＆超重量！カスタネット連打で全メンコを巻き込む！', bonusWind: 0.50, bonusWeight: 0.45 },
};

export const MENKO_LIST = [];

TRIBES.forEach((tribe, tIdx) => {
  STAGES.forEach((st, sIdx) => {
    const id = tIdx * 10 + sIdx + 1;
    const isCarmen = id === 10;
    const shape = isCarmen ? 'round' : st.shape;
    const name = isCarmen
      ? '情熱のカルメン・フラミンゴ'
      : `${st.prefix}${tribe.name}`;

    const power = Math.round(45 + sIdx * 6 + (tIdx === 0 ? 5 : 0));
    const weight = Math.round(40 + sIdx * 6 + (shape === 'square' ? 8 : 0));

    MENKO_LIST.push({
      id,
      no: String(id).padStart(3, '0'),
      name,
      tribeId: tribe.id,
      tribeName: tribe.name,
      lv: st.lv,
      shape,
      rarity: st.rarity,
      baseColor: tribe.baseColor,
      subColor: tribe.subColor,
      eye: tribe.eye,
      mouth: tribe.mouth,
      rose: st.rose,
      castanet: st.castanet,
      frill: st.frill,
      hat: st.hat,
      power,
      weight,
      skill: SKILLS[st.rarity],
      desc: `${tribe.trait}が特徴の${shape === 'square' ? '角メン' : '丸メン'}。${
        st.rose ? '情熱のバラをくわえ、' : ''
      }${st.castanet ? 'カスタネットを打ち鳴らして' : ''}相手を威嚇する。`,
    });
  });
});

export const CPU_RIVALS = [
  { id: 1, name: '路地裏のタカシ', title: 'まずは小手調べ', deck: [1, 11, 21], reward: 100, aiAccuracy: 0.45, desc: 'ノーマル丸メンばかりの初心者。ジャストタイミングの練習台や！' },
  { id: 2, name: '駄菓子屋のトメさん', title: '角メン使いの老婆', deck: [4, 14, 24], reward: 150, aiAccuracy: 0.55, desc: '重い角メンを並べてくる。端っこを狙って風圧を当てろ！' },
  { id: 3, name: 'ニヤケ顔のケンジ', title: 'カワウソ愛好家', deck: [72, 75, 76], reward: 200, aiAccuracy: 0.62, desc: 'カスタネット持ちの角メンでじわじわ攻めてくる曲者。' },
  { id: 4, name: '哀愁の課長・佐藤', title: 'ゴリラと生きる男', deck: [53, 55, 58], reward: 280, aiAccuracy: 0.68, desc: '超重量級のゴリラ角メンが壁になる。高レアメンコで吹き飛ばせ！' },
  { id: 5, name: '踊るセニョリータ美咲', title: '薔薇を愛する女', deck: [7, 37, 87], reward: 360, aiAccuracy: 0.74, desc: 'SR薔薇噛みメンコ軍団！風圧範囲が広いから油断禁物やで。' },
  { id: 6, name: '謎のUMAハンター', title: '未確認生物マニア', deck: [94, 96, 99], reward: 450, aiAccuracy: 0.80, desc: '三つ目のUMAメンコが並ぶ不気味なデッキ。' },
  { id: 7, name: '情熱の闘牛士ホセ', title: '本場スペインからの刺客', deck: [19, 29, 69], reward: 550, aiAccuracy: 0.85, desc: 'Lv9「情熱の」シリーズ揃い踏み！一撃の威力が桁違いや。' },
  { id: 8, name: 'フラメンコ師範・カルロス', title: '伝説の舞姫使い', deck: [10, 60, 100], reward: 800, aiAccuracy: 0.92, desc: '最強UR「カルメン・フラミンゴ」を含む最終決戦デッキ！' },
];

// 「フラ」を掛けた全5章ストーリー（全15ステージ）
export const STORY_CHAPTERS = [
  {
    ch: 1,
    title: '第1章：フラッと昭和の路地裏',
    subtitle: '基本の1枚タイマン修行',
    gimmickLabel: '通常ルール（1枚タイマン）',
    stages: [
      { id: '1-1', name: '1-1 路地裏のタカシ', mode: 'single', rivalId: 1, enemyDeck: [1], gimmick: 'none', rewardCoins: 120, bonusMenkoId: 2, desc: '夕焼けの空き地でメンコ勝負！まずは丸メンをひっくり返せ！' },
      { id: '1-2', name: '1-2 ガキ大将・ゴリ太', mode: 'single', rivalId: 1, enemyDeck: [52], gimmick: 'none', rewardCoins: 150, bonusMenkoId: 54, desc: '重めのゴリラメンコが登場。赤芯の「バチコーンッ！！」で飛ばせ！' },
      { id: '1-3', name: '1-3 駄菓子屋のトメさん', mode: 'single', rivalId: 2, enemyDeck: [4], gimmick: 'intruder', intruderId: 6, rewardCoins: 220, bonusMenkoId: 6, desc: '【章ボス】角メン使いの老婆！途中「フラッと乱入」するレア札も狙え！' },
    ],
  },
  {
    ch: 2,
    title: '第2章：フラフラ酔っ払い横丁',
    subtitle: '照準が揺れる千鳥足ステージ',
    gimmickLabel: '特殊：照準が左右にフラフラ揺れる！',
    stages: [
      { id: '2-1', name: '2-1 千鳥足の田中さん', mode: 'single', rivalId: 2, enemyDeck: [14], gimmick: 'wobble', rewardCoins: 240, bonusMenkoId: 15, desc: '横丁の熱気で照準がフラフラ揺れる！タイミングを見極めろ！' },
      { id: '2-2', name: '2-2 ニヤケ顔のケンジ', mode: 'single', rivalId: 3, enemyDeck: [75], gimmick: 'wobble', rewardCoins: 280, bonusMenkoId: 76, desc: '揺れる照準で伊達男カワウソを狙い撃て！' },
      { id: '2-3', name: '2-3 哀愁の課長・佐藤', mode: 'single', rivalId: 4, enemyDeck: [55], gimmick: 'wobble_intruder', intruderId: 57, rewardCoins: 350, bonusMenkoId: 57, desc: '【章ボス】酔いどれ課長の重厚ゴリラ角メン！乱入SRも出現！' },
    ],
  },
  {
    ch: 3,
    title: '第3章：フラッシュ輝く太陽堂',
    subtitle: '累積バトル＆現地調達解禁',
    gimmickLabel: '特殊：複数枚累積バトル（2〜3枚戦）',
    stages: [
      { id: '3-1', name: '3-1 太陽堂の常連トリオ', mode: 'cumulative', handLimit: 2, rivalId: 3, enemyDeck: [24, 34], gimmick: 'none', rewardCoins: 380, bonusMenkoId: 26, desc: 'ここから累積バトル！裏返した相手メンコをその場で手札にして使え！' },
      { id: '3-2', name: '3-2 パンダ大好き少年', mode: 'cumulative', handLimit: 3, rivalId: 4, enemyDeck: [83, 85, 86], gimmick: 'intruder', intruderId: 87, rewardCoins: 420, bonusMenkoId: 87, desc: 'パンダ3連星との累積戦！薔薇噛みパンダがフラッと乱入するぞ！' },
      { id: '3-3', name: '3-3 謎のUMAハンター', mode: 'cumulative', handLimit: 3, rivalId: 6, enemyDeck: [94, 96, 98], gimmick: 'intruder', intruderId: 99, rewardCoins: 500, bonusMenkoId: 99, desc: '【章ボス】三つ目UMA軍団との総力奪い合い！' },
    ],
  },
  {
    ch: 4,
    title: '第4章：フラダンス＆フラメンコ酒場',
    subtitle: '情熱の風圧1.5倍ヒートステージ',
    gimmickLabel: '特殊：お互いの風圧範囲1.5倍！',
    stages: [
      { id: '4-1', name: '4-1 南国のフラガール', mode: 'single', rivalId: 5, enemyDeck: [7], gimmick: 'high_wind', rewardCoins: 520, bonusMenkoId: 8, desc: '南国の情熱風で風圧が1.5倍！一撃で吹っ飛ぶ超ハイスピード戦！' },
      { id: '4-2', name: '4-2 踊るセニョリータ美咲', mode: 'cumulative', handLimit: 3, rivalId: 5, enemyDeck: [7, 37, 87], gimmick: 'high_wind', rewardCoins: 580, bonusMenkoId: 9, desc: 'SR薔薇噛み軍団と風圧1.5倍の累積バトル！' },
      { id: '4-3', name: '4-3 情熱の闘牛士ホセ', mode: 'cumulative', handLimit: 4, rivalId: 7, enemyDeck: [19, 29, 69], gimmick: 'high_wind_intruder', intruderId: 49, rewardCoins: 680, bonusMenkoId: 49, desc: '【章ボス】Lv9情熱シリーズ勢揃い！激しい風圧戦を制せ！' },
    ],
  },
  {
    ch: 5,
    title: '第5章：フラッグを奪え！フラミンゴ城',
    subtitle: '伝説の舞姫カルメン最終決戦',
    gimmickLabel: '最終決戦：全ギミック複合バトル',
    stages: [
      { id: '5-1', name: '5-1 近衛騎士ハシビロン', mode: 'single', rivalId: 7, enemyDeck: [70], gimmick: 'wobble', rewardCoins: 750, bonusMenkoId: 70, desc: 'URハシビロコウとの一騎打ち！瞬き厳禁のタイマン勝負！' },
      { id: '5-2', name: '5-2 四天王・乱れ打ち軍団', mode: 'cumulative', handLimit: 4, rivalId: 8, enemyDeck: [60, 80, 90, 100], gimmick: 'high_wind', rewardCoins: 850, bonusMenkoId: 100, desc: 'UR4体が立ちはだかる累積戦！奪ったURを即戦力にして押し切れ！' },
      { id: '5-3', name: '5-3 師範カルロス＆カルメン', mode: 'cumulative', handLimit: 5, rivalId: 8, enemyDeck: [10, 20, 30, 60, 100], gimmick: 'high_wind_intruder', intruderId: 10, rewardCoins: 1500, bonusMenkoId: 10, desc: '【最終決戦】最強UR「情熱のカルメン・フラミンゴ」を奪い取り、メンコ王になれ！' },
    ],
  },
];
