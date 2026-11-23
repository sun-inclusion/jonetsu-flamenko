// app/menkoData.js
// 『情熱のフラ・メンコ』全100種キモカワ動物メンコ＆CPU対戦データ

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
    // Lv10のフラミンゴは特別仕様（丸メン・最強カルメン）
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
      shape, // 'round' | 'square'
      rarity: st.rarity, // 'N' | 'R' | 'SR' | 'UR'
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
