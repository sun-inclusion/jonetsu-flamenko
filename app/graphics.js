// app/graphics.js
// 『情熱のフラ・メンコ』10系統高精細キモカワ動物ベクター＆Canvas描画エンジン

import React from 'react';

// 10系統それぞれのキモカワ動物イラスト（SVG内部要素）を文字列で生成
function buildAnimalInnerSVG(menko) {
  const { tribeId, baseColor, subColor, lv, rose, castanet, frill, hat, rarity } = menko;
  const isUR = rarity === 'UR';
  const isSR = rarity === 'SR';

  let bgDecor = '';
  // レア度に応じた昭和メンコ風・集中線＆キラ背景
  if (isUR || isSR) {
    const lines = [];
    for (let i = 0; i < 16; i++) {
      const ang = (i * Math.PI) / 8;
      const x1 = 50 + Math.cos(ang) * 18;
      const y1 = 50 + Math.sin(ang) * 18;
      const x2 = 50 + Math.cos(ang) * 44;
      const y2 = 50 + Math.sin(ang) * 44;
      lines.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${isUR ? '#fef08a' : '#fed7aa'}" stroke-width="2.2" opacity="0.75" />`);
    }
    bgDecor = lines.join('');
  }

  // 系統別の専用キャラアート
  let charArt = '';
  switch (tribeId) {
    case 'flamingo':
      charArt = `
        <!-- 冠羽 -->
        <path d="M 38 14 Q 44 3 50 13 Q 56 3 62 14" fill="#db2777" stroke="#1e293b" stroke-width="2.5" />
        <!-- 顔の輪郭とほっぺ -->
        <ellipse cx="50" cy="48" rx="31" ry="29" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <ellipse cx="31" cy="54" rx="6" ry="4" fill="#f43f5e" opacity="0.55" />
        <ellipse cx="69" cy="54" rx="6" ry="4" fill="#f43f5e" opacity="0.55" />
        <!-- ギョロッとした情熱の目 -->
        <circle cx="37" cy="36" r="8.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.5" />
        <circle cx="63" cy="36" r="8.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.5" />
        <circle cx="39" cy="36" r="3.5" fill="#1e293b" />
        <circle cx="61" cy="36" r="3.5" fill="#1e293b" />
        <circle cx="40" cy="34.5" r="1.3" fill="#ffffff" />
        <circle cx="62" cy="34.5" r="1.3" fill="#ffffff" />
        <!-- 異様に曲がった巨大クチバシ -->
        <path d="M 35 47 Q 50 41 65 47 Q 71 67 51 77 Q 38 73 43 60 Q 49 56 35 47 Z" fill="#fb923c" stroke="#1e293b" stroke-width="2.8" />
        <path d="M 41 59 Q 53 60 58 68 L 51 77 Q 41 72 41 59 Z" fill="#1e293b" />
        <path d="M 47 45 L 47 48 M 53 45 L 53 48" stroke="#1e293b" stroke-width="2" stroke-linecap="round" />
      `;
      break;

    case 'giraffe':
      charArt = `
        <!-- ツノ（オシコーン）と耳 -->
        <rect x="34" y="9" width="5" height="14" rx="2" fill="#b45309" stroke="#1e293b" stroke-width="2" />
        <rect x="61" y="9" width="5" height="14" rx="2" fill="#b45309" stroke="#1e293b" stroke-width="2" />
        <circle cx="36.5" cy="9" r="4.5" fill="#78350f" stroke="#1e293b" stroke-width="2" />
        <circle cx="63.5" cy="9" r="4.5" fill="#78350f" stroke="#1e293b" stroke-width="2" />
        <ellipse cx="21" cy="28" rx="8" ry="4.5" transform="rotate(-25 21 28)" fill="${baseColor}" stroke="#1e293b" stroke-width="2.5" />
        <ellipse cx="79" cy="28" rx="8" ry="4.5" transform="rotate(25 79 28)" fill="${baseColor}" stroke="#1e293b" stroke-width="2.5" />
        <!-- 縦長アホ面輪郭 -->
        <rect x="25" y="19" width="50" height="63" rx="24" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <!-- キリン斑点 -->
        <circle cx="31" cy="48" r="4.5" fill="#b45309" opacity="0.65" />
        <circle cx="70" cy="44" r="5" fill="#b45309" opacity="0.65" />
        <circle cx="50" cy="25" r="4" fill="#b45309" opacity="0.65" />
        <!-- 虚無の半目 -->
        <circle cx="37" cy="36" r="8" fill="#ffffff" stroke="#1e293b" stroke-width="2.3" />
        <circle cx="63" cy="36" r="8" fill="#ffffff" stroke="#1e293b" stroke-width="2.3" />
        <circle cx="37" cy="38" r="3" fill="#1e293b" />
        <circle cx="63" cy="38" r="3" fill="#1e293b" />
        <path d="M 29 35 L 45 35 L 45 29 L 29 29 Z" fill="${baseColor}" stroke="#1e293b" stroke-width="2" />
        <path d="M 55 35 L 71 35 L 71 29 L 55 29 Z" fill="${baseColor}" stroke="#1e293b" stroke-width="2" />
        <!-- 巨大な鼻面とアホ口 -->
        <ellipse cx="50" cy="64" rx="21" ry="15" fill="${subColor}" stroke="#1e293b" stroke-width="2.5" />
        <circle cx="43" cy="57" r="2.5" fill="#78350f" />
        <circle cx="57" cy="57" r="2.5" fill="#78350f" />
        <path d="M 38 66 Q 50 74 62 66 Q 50 62 38 66 Z" fill="#991b1b" stroke="#1e293b" stroke-width="2" />
      `;
      break;

    case 'frog':
      charArt = `
        <!-- 飛び出たギョロ目ベース -->
        <circle cx="33" cy="24" r="13" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <circle cx="67" cy="24" r="13" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <!-- ワイド顔 -->
        <ellipse cx="50" cy="53" rx="34" ry="26" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <ellipse cx="50" cy="61" rx="26" ry="15" fill="${subColor}" />
        <!-- ギョロ目玉 -->
        <circle cx="33" cy="24" r="9" fill="#fef08a" stroke="#1e293b" stroke-width="2.2" />
        <circle cx="67" cy="24" r="9" fill="#fef08a" stroke="#1e293b" stroke-width="2.2" />
        <ellipse cx="34" cy="24" rx="2.5" ry="6" fill="#1e293b" />
        <ellipse cx="66" cy="24" rx="2.5" ry="6" fill="#1e293b" />
        <!-- デカい口とヨダレ -->
        <path d="M 24 53 Q 50 68 76 53" fill="none" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" />
        <path d="M 63 58 Q 67 74 62 79 Q 57 74 60 59 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5" />
      `;
      break;

    case 'alpaca':
      charArt = `
        <!-- モフモフ頭 -->
        <path d="M 26 32 Q 20 20 33 18 Q 41 10 50 16 Q 59 10 67 18 Q 80 20 74 32 Q 82 48 73 64 Q 65 80 50 79 Q 35 80 27 64 Q 18 48 26 32 Z" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <!-- ニヤケ目 -->
        <path d="M 30 39 Q 37 33 44 39" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
        <path d="M 56 39 Q 63 33 70 39" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
        <circle cx="37" cy="41" r="2.8" fill="#1e293b" />
        <circle cx="63" cy="41" r="2.8" fill="#1e293b" />
        <!-- Y字の口と出っ歯 -->
        <path d="M 50 49 L 50 56 M 50 56 Q 41 62 36 57 M 50 56 Q 59 62 64 57" fill="none" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" />
        <rect x="44" y="57" width="5.5" height="8" rx="1" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
        <rect x="50.5" y="57" width="5.5" height="8" rx="1" fill="#ffffff" stroke="#1e293b" stroke-width="2" />
      `;
      break;

    case 'octopus':
      charArt = `
        <!-- タコ頭と足 -->
        <ellipse cx="50" cy="42" rx="30" ry="27" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <path d="M 22 58 Q 16 74 26 77 Q 32 72 34 64 Q 38 78 46 78 Q 50 70 50 65 Q 50 70 54 78 Q 62 78 66 64 Q 68 72 74 77 Q 84 74 78 58" fill="${baseColor}" stroke="#1e293b" stroke-width="2.8" />
        <!-- 吸盤 -->
        <circle cx="25" cy="71" r="3" fill="#fff1f2" />
        <circle cx="42" cy="72" r="3" fill="#fff1f2" />
        <circle cx="58" cy="72" r="3" fill="#fff1f2" />
        <circle cx="75" cy="71" r="3" fill="#fff1f2" />
        <!-- 怒り眉と点目 -->
        <line x1="29" y1="31" x2="43" y2="35" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
        <line x1="71" y1="31" x2="57" y2="35" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
        <circle cx="37" cy="40" r="4.5" fill="#1e293b" />
        <circle cx="63" cy="40" r="4.5" fill="#1e293b" />
        <!-- すぼみ口 -->
        <circle cx="50" cy="54" r="8.5" fill="#be123c" stroke="#1e293b" stroke-width="2.8" />
        <circle cx="50" cy="54" r="4" fill="#4c0519" />
      `;
      break;

    case 'gorilla':
      charArt = `
        <!-- ゴリラ頭とデカ顎 -->
        <path d="M 28 24 Q 50 12 72 24 L 78 58 Q 76 80 50 81 Q 24 80 22 58 Z" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <path d="M 28 45 Q 50 38 72 45 L 72 68 Q 50 77 28 68 Z" fill="${subColor}" stroke="#1e293b" stroke-width="2.2" />
        <!-- 哀愁の太眉 -->
        <path d="M 26 36 Q 38 28 48 35" fill="none" stroke="#1e293b" stroke-width="5" stroke-linecap="round" />
        <path d="M 74 36 Q 62 28 52 35" fill="none" stroke="#1e293b" stroke-width="5" stroke-linecap="round" />
        <circle cx="38" cy="41" r="4" fill="#1e293b" />
        <circle cx="62" cy="41" r="4" fill="#1e293b" />
        <!-- 鼻の穴とへの字口 -->
        <circle cx="45" cy="52" r="2.8" fill="#1e293b" />
        <circle cx="55" cy="52" r="2.8" fill="#1e293b" />
        <path d="M 35 66 Q 50 58 65 66" fill="none" stroke="#1e293b" stroke-width="3.2" stroke-linecap="round" />
      `;
      break;

    case 'shoebill':
      charArt = `
        <!-- 寝癖の冠羽 -->
        <path d="M 44 17 L 39 8 L 50 15 L 57 7 L 55 17" fill="${baseColor}" stroke="#1e293b" stroke-width="2.3" />
        <ellipse cx="50" cy="42" rx="29" ry="25" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <!-- 瞬きゼロの三白眼 -->
        <circle cx="35" cy="35" r="8" fill="#fef08a" stroke="#1e293b" stroke-width="2.5" />
        <circle cx="65" cy="35" r="8" fill="#fef08a" stroke="#1e293b" stroke-width="2.5" />
        <circle cx="35" cy="36" r="3.2" fill="#1e293b" />
        <circle cx="65" cy="36" r="3.2" fill="#1e293b" />
        <line x1="26" y1="28" x2="44" y2="31" stroke="#1e293b" stroke-width="3.2" />
        <line x1="74" y1="28" x2="56" y2="31" stroke="#1e293b" stroke-width="3.2" />
        <!-- 木靴のような巨大クチバシ -->
        <path d="M 30 45 Q 50 39 70 45 L 64 75 Q 50 82 36 75 Z" fill="#f59e0b" stroke="#1e293b" stroke-width="3" />
        <path d="M 46 75 L 50 81 L 54 75" fill="#d97706" stroke="#1e293b" stroke-width="2" />
      `;
      break;

    case 'otter':
      charArt = `
        <!-- 丸耳と輪郭 -->
        <circle cx="24" cy="29" r="8" fill="${baseColor}" stroke="#1e293b" stroke-width="2.8" />
        <circle cx="76" cy="29" r="8" fill="${baseColor}" stroke="#1e293b" stroke-width="2.8" />
        <ellipse cx="50" cy="49" rx="32" ry="27" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <ellipse cx="50" cy="57" rx="23" ry="16" fill="${subColor}" />
        <!-- 悪巧み目とニヤリ口 -->
        <path d="M 29 38 L 43 41" stroke="#1e293b" stroke-width="3" />
        <path d="M 71 38 L 57 41" stroke="#1e293b" stroke-width="3" />
        <circle cx="37" cy="43" r="3.5" fill="#1e293b" />
        <circle cx="63" cy="43" r="3.5" fill="#1e293b" />
        <ellipse cx="50" cy="51" rx="5" ry="3.5" fill="#1e293b" />
        <path d="M 34 61 Q 50 71 66 59" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round" />
      `;
      break;

    case 'panda':
      charArt = `
        <!-- パンダ耳 -->
        <circle cx="24" cy="22" r="11" fill="#1e293b" />
        <circle cx="76" cy="22" r="11" fill="#1e293b" />
        <ellipse cx="50" cy="50" rx="33" ry="29" fill="#ffffff" stroke="#1e293b" stroke-width="3" />
        <!-- 左右ズレた黒ブチ -->
        <ellipse cx="34" cy="40" rx="11" ry="8.5" transform="rotate(-24 34 40)" fill="#1e293b" />
        <ellipse cx="66" cy="47" rx="11" ry="8.5" transform="rotate(28 66 47)" fill="#1e293b" />
        <circle cx="35" cy="40" r="3.5" fill="#ffffff" />
        <circle cx="65" cy="46" r="3.5" fill="#ffffff" />
        <circle cx="35" cy="40" r="1.5" fill="#dc2626" />
        <circle cx="65" cy="46" r="1.5" fill="#dc2626" />
        <!-- 鼻と口 -->
        <ellipse cx="50" cy="56" rx="5" ry="3" fill="#1e293b" />
        <path d="M 41 65 Q 50 60 59 65" fill="none" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" />
      `;
      break;

    default:
      // UMA・幻獣
      charArt = `
        <!-- 触角と謎の輪郭 -->
        <path d="M 34 20 Q 25 8 19 13 M 66 20 Q 75 8 81 13" fill="none" stroke="#6b21a8" stroke-width="3.5" stroke-linecap="round" />
        <path d="M 22 46 Q 22 18 50 18 Q 78 18 78 46 Q 82 76 50 78 Q 18 76 22 46 Z" fill="${baseColor}" stroke="#1e293b" stroke-width="3" />
        <!-- 三つ目 -->
        <circle cx="50" cy="29" r="7.5" fill="#fef08a" stroke="#1e293b" stroke-width="2.3" />
        <circle cx="50" cy="29" r="3" fill="#dc2626" />
        <circle cx="34" cy="45" r="7.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.3" />
        <circle cx="35" cy="45" r="3" fill="#1e293b" />
        <circle cx="66" cy="45" r="7.5" fill="#ffffff" stroke="#1e293b" stroke-width="2.3" />
        <circle cx="65" cy="45" r="3" fill="#1e293b" />
        <!-- ギザギザ口 -->
        <polyline points="31,64 39,57 45,67 51,57 57,67 63,57 69,64" fill="none" stroke="#1e293b" stroke-width="3" stroke-linejoin="round" />
      `;
      break;
  }

  // オプション装備（ハット・バラ・カスタネット）
  const hatSVG = hat
    ? `<g transform="translate(50, 12)">
         <ellipse cx="0" cy="4" rx="25" ry="4.5" fill="#1e293b" />
         <rect x="-13" y="-11" width="26" height="15" rx="2.5" fill="#1e293b" />
         <rect x="-13" y="-2" width="26" height="3.5" fill="#ef4444" />
       </g>`
    : '';

  const roseSVG = rose
    ? `<g transform="translate(65, 67) rotate(16)">
         <line x1="-22" y1="0" x2="11" y2="0" stroke="#15803d" stroke-width="3.8" stroke-linecap="round" />
         <polygon points="-6,0 -13,-6 -3,-5" fill="#22c55e" />
         <circle cx="13" cy="0" r="8.5" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.8" />
         <path d="M 10 -3 Q 14 0 10 3 M 15 -2 Q 12 1 16 3" fill="none" stroke="#fecaca" stroke-width="1.6" />
       </g>`
    : '';

  const castanetSVG = castanet
    ? `<g>
         <g transform="translate(13, 57) rotate(-22)">
           <ellipse cx="0" cy="0" rx="8.5" ry="6" fill="#7c2d12" stroke="#1e293b" stroke-width="2.2" />
           <ellipse cx="2" cy="-4.5" rx="8.5" ry="5" fill="#d97706" stroke="#1e293b" stroke-width="2.2" />
         </g>
         <g transform="translate(87, 57) rotate(22)">
           <ellipse cx="0" cy="0" rx="8.5" ry="6" fill="#7c2d12" stroke="#1e293b" stroke-width="2.2" />
           <ellipse cx="-2" cy="-4.5" rx="8.5" ry="5" fill="#d97706" stroke="#1e293b" stroke-width="2.2" />
         </g>
       </g>`
    : '';

  // キラ光沢ハイライト
  const glossSVG =
    lv >= 4
      ? `<path d="M 20 22 Q 45 14 76 24" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="3.5" stroke-linecap="round" />`
      : '';

  return `${bgDecor}${charArt}${hatSVG}${roseSVG}${castanetSVG}${glossSVG}`;
}

// 完全なSVG文字列を生成（UIとCanvasキャッシュの両方で共用）
export function getMenkoSVGString(menko, flipped = false) {
  const isSquare = menko.shape === 'square';
  if (flipped) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      ${
        isSquare
          ? '<rect x="5" y="5" width="90" height="90" rx="12" fill="#991b1b" stroke="#fbbf24" stroke-width="4" />'
          : '<circle cx="50" cy="50" r="45" fill="#991b1b" stroke="#fbbf24" stroke-width="4" />'
      }
      <circle cx="50" cy="50" r="29" fill="none" stroke="#fde047" stroke-width="2.2" stroke-dasharray="5 3" />
      <text x="50" y="56" text-anchor="middle" fill="#fef08a" font-size="19" font-weight="900" font-family="sans-serif">情熱</text>
    </svg>`;
  }

  let frillSVG = '';
  if (menko.frill) {
    const dots = [];
    for (let deg = 0; deg < 360; deg += 30) {
      const cx = 50 + Math.cos((deg * Math.PI) / 180) * 45;
      const cy = 50 + Math.sin((deg * Math.PI) / 180) * 45;
      dots.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6.5" fill="${deg % 60 === 0 ? '#dc2626' : '#facc15'}" stroke="#1e293b" stroke-width="1.5" />`);
    }
    frillSVG = dots.join('');
  }

  const baseBg = menko.rarity === 'UR' ? '#fef08a' : menko.rarity === 'SR' ? '#ffedd5' : '#fffbeb';
  const frameSVG = isSquare
    ? `<rect x="6" y="6" width="88" height="88" rx="12" fill="${baseBg}" stroke="#1e293b" stroke-width="4" />
       <rect x="11" y="11" width="78" height="78" rx="8" fill="none" stroke="#d97706" stroke-width="2.5" />`
    : `<circle cx="50" cy="50" r="44" fill="${baseBg}" stroke="#1e293b" stroke-width="4" />
       <circle cx="50" cy="50" r="39" fill="none" stroke="#d97706" stroke-width="2.5" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    ${frillSVG}
    ${frameSVG}
    ${buildAnimalInnerSVG(menko)}
  </svg>`;
}

// React UI用コンポーネント
export function MenkoSVG({ menko, size = 80, flipped = false }) {
  if (!menko) return null;
  const svgStr = getMenkoSVGString(menko, flipped);
  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
  return (
    <img
      src={dataUri}
      alt={menko.name}
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle', userSelect: 'none' }}
    />
  );
}

// Canvas描画用イメージキャッシュ（高精細SVGをそのまま土俵に描画）
const imageCache = new Map();

function getCachedMenkoImage(menko, flipped) {
  if (typeof window === 'undefined') return null;
  const key = `${menko.id}_${flipped ? 'back' : 'front'}`;
  if (imageCache.has(key)) return imageCache.get(key);

  const img = new Image();
  const svgStr = getMenkoSVGString(menko, flipped);
  img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
  imageCache.set(key, img);
  return img;
}

// Canvas用：対戦フィールド上のメンコ描画
export function drawMenkoCanvas(ctx, item) {
  const { menko, x, y, radius, angle, flipped, flipProgress = 0, owner } = item;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 裏返り回転時の横幅圧縮
  const scaleX = Math.max(0.14, Math.abs(Math.cos(flipProgress * Math.PI)));
  ctx.scale(scaleX, 1);

  const isSquare = menko.shape === 'square';
  const r = radius;

  // 地面の影
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  if (isSquare) {
    ctx.fillRect(-r + 4, -r + 6, r * 2, r * 2);
  } else {
    ctx.beginPath();
    ctx.arc(4, 6, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 所有者識別リング（プレイヤー青 / CPU赤）
  ctx.strokeStyle = owner === 'player' ? '#2563eb' : '#dc2626';
  ctx.lineWidth = 3.5;
  if (isSquare) {
    ctx.strokeRect(-r - 3, -r - 3, (r + 3) * 2, (r + 3) * 2);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 高精細SVGイメージの転写
  const img = getCachedMenkoImage(menko, flipped);
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, -r, -r, r * 2, r * 2);
  } else {
    // 初回ロード一瞬のフォールバック
    ctx.fillStyle = flipped ? '#991b1b' : menko.baseColor;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
