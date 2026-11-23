// app/graphics.js
// 『情熱のフラ・メンコ』100種キモカワ動物SVG＆Canvas描画エンジン

import React from 'react';

// UI用：キモカワ動物メンコSVGコンポーネント
export function MenkoSVG({ menko, size = 80, flipped = false }) {
  if (!menko) return null;
  const isSquare = menko.shape === 'square';
  const r = 44;

  if (flipped) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        {isSquare ? (
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#991b1b" stroke="#fbbf24" strokeWidth="4" />
        ) : (
          <circle cx="50" cy="50" r={r} fill="#991b1b" stroke="#fbbf24" strokeWidth="4" />
        )}
        <circle cx="50" cy="50" r="28" fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray="4 3" />
        <text x="50" y="56" textAnchor="middle" fill="#fef08a" fontSize="18" fontWeight="900">情熱</text>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
      {/* 情熱フリル（SR/UR） */}
      {menko.frill && (
        <g>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <circle
              key={deg}
              cx={50 + Math.cos((deg * Math.PI) / 180) * 46}
              cy={50 + Math.sin((deg * Math.PI) / 180) * 46}
              r="7"
              fill={deg % 60 === 0 ? '#dc2626' : '#facc15'}
            />
          ))}
        </g>
      )}

      {/* メンコ本体（丸メン or 角メン） */}
      {isSquare ? (
        <rect x="7" y="7" width="86" height="86" rx="12" fill={menko.baseColor} stroke="#1e293b" strokeWidth="4" />
      ) : (
        <circle cx="50" cy="50" r={r} fill={menko.baseColor} stroke="#1e293b" strokeWidth="4" />
      )}

      {/* 内枠 */}
      {isSquare ? (
        <rect x="13" y="13" width="74" height="74" rx="8" fill="none" stroke={menko.subColor} strokeWidth="2.5" />
      ) : (
        <circle cx="50" cy="50" r="38" fill="none" stroke={menko.subColor} strokeWidth="2.5" />
      )}

      {/* 系統ごとの耳・ツノ・模様 */}
      {menko.tribeId === 'giraffe' && (
        <g fill="#92400e">
          <rect x="33" y="10" width="5" height="12" rx="2" />
          <rect x="62" y="10" width="5" height="12" rx="2" />
          <circle cx="35.5" cy="10" r="4" />
          <circle cx="64.5" cy="10" r="4" />
          <circle cx="24" cy="40" r="5" opacity="0.5" />
          <circle cx="76" cy="42" r="6" opacity="0.5" />
        </g>
      )}
      {menko.tribeId === 'panda' && (
        <g fill="#1e293b">
          <circle cx="22" cy="16" r="10" />
          <circle cx="78" cy="16" r="10" />
          <ellipse cx="34" cy="41" rx="11" ry="9" transform="rotate(-18 34 41)" />
          <ellipse cx="66" cy="45" rx="11" ry="9" transform="rotate(22 66 45)" />
        </g>
      )}
      {menko.tribeId === 'frog' && (
        <g>
          <circle cx="33" cy="22" r="11" fill={menko.baseColor} stroke="#1e293b" strokeWidth="3" />
          <circle cx="67" cy="22" r="11" fill={menko.baseColor} stroke="#1e293b" strokeWidth="3" />
        </g>
      )}
      {menko.tribeId === 'octopus' && (
        <g fill="#fda4af">
          <circle cx="24" cy="70" r="4" />
          <circle cx="34" cy="76" r="3.5" />
          <circle cx="76" cy="70" r="4" />
          <circle cx="66" cy="76" r="3.5" />
        </g>
      )}

      {/* キモカワ目パーツ */}
      {menko.eye === 'three' ? (
        <g>
          <circle cx="50" cy="27" r="7" fill="#fff" stroke="#1e293b" strokeWidth="2.5" />
          <circle cx="50" cy="27" r="3" fill="#dc2626" />
          <circle cx="34" cy="42" r="7" fill="#fff" stroke="#1e293b" strokeWidth="2.5" />
          <circle cx="35" cy="42" r="3" fill="#1e293b" />
          <circle cx="66" cy="42" r="7" fill="#fff" stroke="#1e293b" strokeWidth="2.5" />
          <circle cx="65" cy="42" r="3" fill="#1e293b" />
        </g>
      ) : (
        <g>
          <circle cx="35" cy={menko.tribeId === 'frog' ? 22 : 42} r="8" fill="#fff" stroke="#1e293b" strokeWidth="2.5" />
          <circle cx="65" cy={menko.tribeId === 'frog' ? 22 : 42} r="8" fill="#fff" stroke="#1e293b" strokeWidth="2.5" />
          <circle cx="36" cy={menko.tribeId === 'frog' ? 21 : 42} r="3.2" fill="#1e293b" />
          <circle cx="64" cy={menko.tribeId === 'frog' ? 23 : 42} r="3.2" fill="#1e293b" />
          {menko.eye === 'droopy' && (
            <g fill={menko.baseColor} stroke="#1e293b" strokeWidth="2">
              <rect x="26" y="34" width="18" height="8" />
              <rect x="56" y="34" width="18" height="8" />
            </g>
          )}
          {menko.eye === 'sad' && (
            <g stroke="#1e293b" strokeWidth="3.5" strokeLinecap="round">
              <line x1="26" y1="35" x2="41" y2="31" />
              <line x1="74" y1="35" x2="59" y2="31" />
            </g>
          )}
        </g>
      )}

      {/* キモカワ口・クチバシパーツ */}
      {menko.mouth === 'beak' || menko.mouth === 'hugebeak' ? (
        <path
          d={menko.mouth === 'hugebeak' ? 'M 34 52 Q 50 45 66 52 L 54 78 Q 42 78 34 52 Z' : 'M 38 52 Q 55 48 64 60 Q 52 74 42 66 Z'}
          fill="#f97316"
          stroke="#1e293b"
          strokeWidth="2.5"
        />
      ) : menko.mouth === 'bucktooth' ? (
        <g>
          <path d="M 36 60 Q 50 54 64 60 Q 50 72 36 60 Z" fill="#991b1b" stroke="#1e293b" strokeWidth="2" />
          <rect x="44" y="58" width="5" height="7" fill="#fff" stroke="#1e293b" strokeWidth="1.5" />
          <rect x="51" y="58" width="5" height="7" fill="#fff" stroke="#1e293b" strokeWidth="1.5" />
        </g>
      ) : menko.mouth === 'pucker' ? (
        <circle cx="50" cy="63" r="8" fill="#fb7185" stroke="#1e293b" strokeWidth="2.5" />
      ) : menko.mouth === 'zigzag' ? (
        <polyline points="32,63 40,57 46,67 54,57 60,67 68,61" fill="none" stroke="#1e293b" strokeWidth="3" />
      ) : (
        <g>
          <path d="M 34 62 Q 50 74 66 62" fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
          {menko.mouth === 'drool' && (
            <path d="M 60 65 Q 63 77 59 80 Q 56 77 58 66 Z" fill="#38bdf8" />
          )}
        </g>
      )}

      {/* 伊達ハット */}
      {menko.hat && (
        <g transform="translate(50, 12)">
          <ellipse cx="0" cy="4" rx="26" ry="5" fill="#1e293b" />
          <rect x="-14" y="-12" width="28" height="16" rx="3" fill="#1e293b" />
          <rect x="-14" y="-2" width="28" height="4" fill="#dc2626" />
        </g>
      )}

      {/* 情熱のバラ（口にくわえる） */}
      {menko.rose && (
        <g transform="translate(68, 66) rotate(18)">
          <line x1="-18" y1="0" x2="10" y2="0" stroke="#15803d" strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="-4,0 -10,-6 -2,-5" fill="#16a34a" />
          <circle cx="12" cy="0" r="8" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
          <path d="M 9 -3 Q 13 0 9 3 M 14 -2 Q 11 1 15 3" fill="none" stroke="#fca5a5" strokeWidth="1.5" />
        </g>
      )}

      {/* カスタネット（両サイドで打ち鳴らす） */}
      {menko.castanet && (
        <g>
          <g transform="translate(10, 56) rotate(-20)">
            <ellipse cx="0" cy="0" rx="8" ry="6" fill="#7c2d12" stroke="#1e293b" strokeWidth="2" />
            <ellipse cx="2" cy="-4" rx="8" ry="5" fill="#b45309" stroke="#1e293b" strokeWidth="2" />
          </g>
          <g transform="translate(90, 56) rotate(20)">
            <ellipse cx="0" cy="0" rx="8" ry="6" fill="#7c2d12" stroke="#1e293b" strokeWidth="2" />
            <ellipse cx="-2" cy="-4" rx="8" ry="5" fill="#b45309" stroke="#1e293b" strokeWidth="2" />
          </g>
        </g>
      )}
    </svg>
  );
}

// Canvas用：対戦フィールド上のメンコ描画
export function drawMenkoCanvas(ctx, item) {
  const { menko, x, y, radius, angle, flipped, flipProgress = 0, owner } = item;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 回転裏返りアニメーションの横幅圧縮
  const scaleX = Math.max(0.15, Math.abs(Math.cos(flipProgress * Math.PI)));
  ctx.scale(scaleX, 1);

  const isSquare = menko.shape === 'square';
  const r = radius;

  // 影
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  if (isSquare) {
    ctx.fillRect(-r + 4, -r + 6, r * 2, r * 2);
  } else {
    ctx.beginPath();
    ctx.arc(4, 6, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 所有者リング（プレイヤー青 / CPU赤）
  ctx.strokeStyle = owner === 'player' ? '#2563eb' : '#dc2626';
  ctx.lineWidth = 3;
  if (isSquare) {
    ctx.strokeRect(-r - 3, -r - 3, (r + 3) * 2, (r + 3) * 2);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (flipped) {
    // 裏面（昭和レトロ赤×金）
    ctx.fillStyle = '#991b1b';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    if (isSquare) {
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.strokeRect(-r, -r, r * 2, r * 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#fef08a';
    ctx.font = `900 ${Math.round(r * 0.48)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('裏', 0, 0);
    ctx.restore();
    return;
  }

  // 表面本体
  ctx.fillStyle = menko.baseColor;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  if (isSquare) {
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeRect(-r, -r, r * 2, r * 2);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 簡易キモカワ顔（高速Canvas描画）
  const eyeY = -r * 0.18;
  const eyeX = r * 0.32;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  [-eyeX, eyeX].forEach((ex) => {
    ctx.beginPath();
    ctx.arc(ex, eyeY, r * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(ex, eyeY, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
  });

  // 口
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, r * 0.22, r * 0.3, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  // バラ表示（SR/UR）
  if (menko.rose) {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(r * 0.45, r * 0.35, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // カスタネット表示
  if (menko.castanet) {
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.arc(-r * 0.72, r * 0.15, r * 0.16, 0, Math.PI * 2);
    ctx.arc(r * 0.72, r * 0.15, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
