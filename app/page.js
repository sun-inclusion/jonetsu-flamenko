'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MENKO_LIST, CPU_RIVALS, TRIBES } from './menkoData';
import { MenkoSVG, drawMenkoCanvas } from './graphics';

const STORAGE_KEY = 'jonetsu_flamenko_save_v1';

// Web Audio API 効果音エンジン（外部音声ファイル不要）
function playSe(type, muted) {
  if (muted || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'slam') {
      // バチーン！打撃音
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.21);
    } else if (type === 'flip') {
      // ひっくり返り音
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (type === 'castanet') {
      // カッ！カスタネット音
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'win') {
      // 勝利ファンファーレ
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.1);
      osc.frequency.setValueAtTime(784, now + 0.2);
      osc.frequency.setValueAtTime(1046, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.56);
    }
  } catch (e) {
    // 無視
  }
}

export default function FlamenkoGame() {
  // セーブデータ状態
  const [ownedIds, setOwnedIds] = useState([1, 11, 21]);
  const [deckIds, setDeckIds] = useState([1, 11, 21]);
  const [coins, setCoins] = useState(200);
  const [wins, setWins] = useState(0);
  const [muted, setMuted] = useState(false);

  // 画面モード: 'home' | 'battle' | 'gacha' | 'dex' | 'deck'
  const [screen, setScreen] = useState('home');
  const [selectedRivalId, setSelectedRivalId] = useState(1);
  const [isDebug, setIsDebug] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dexFilter, setDexFilter] = useState('all');
  const [selectedDexMenko, setSelectedDexMenko] = useState(null);
  const [gachaResult, setGachaResult] = useState(null);
  const [deckSlotIdx, setDeckSlotIdx] = useState(0);

  // バトル状態
  const canvasRef = useRef(null);
  const [battleState, setBattleState] = useState({
    turn: 'player', // 'player' | 'animating' | 'cpu' | 'result'
    winner: null,
    message: '狙う場所をタップして「叩きつける！」を押せ！',
    playerHandIdx: 0,
    aimX: 170,
    aimY: 165,
    gaugeVal: 50,
    gaugeDir: 1,
    playerScore: 0,
    cpuScore: 0,
  });
  const piecesRef = useRef([]);
  const effectsRef = useRef([]);
  const animFrameRef = useRef(null);

  // 初期ロード＆デバッグキー判定
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('key') === 'sun777fla') {
        setIsDebug(true);
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.ownedIds) && parsed.ownedIds.length > 0) setOwnedIds(parsed.ownedIds);
          if (Array.isArray(parsed.deckIds) && parsed.deckIds.length === 3) setDeckIds(parsed.deckIds);
          if (typeof parsed.coins === 'number') setCoins(parsed.coins);
          if (typeof parsed.wins === 'number') setWins(parsed.wins);
        }
      } catch (e) {
        // 初期値のまま
      }
    }
  }, []);

  // セーブ保存
  const saveProgress = useCallback((nextOwned, nextDeck, nextCoins, nextWins) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ownedIds: nextOwned,
          deckIds: nextDeck,
          coins: nextCoins,
          wins: nextWins,
        })
      );
    } catch (e) {
      // 無視
    }
  }, []);

  // バトル開始初期化
  const startBattle = (rivalId) => {
    const rival = CPU_RIVALS.find((r) => r.id === rivalId) || CPU_RIVALS[0];
    const initialPieces = [];

    // 場の中央にCPUの3枚とプレイヤーの2枚を初期配置
    rival.deck.forEach((mId, idx) => {
      const menko = MENKO_LIST.find((m) => m.id === mId) || MENKO_LIST[0];
      initialPieces.push({
        uid: `cpu_${idx}_${Date.now()}`,
        menko,
        owner: 'cpu',
        x: 105 + idx * 65,
        y: 135 + (idx % 2) * 28,
        vx: 0,
        vy: 0,
        radius: 26,
        angle: (idx - 1) * 0.15,
        flipped: false,
        flipProgress: 0,
      });
    });

    // プレイヤー初期場札（デッキの1枚目・2枚目）
    [deckIds[0], deckIds[1]].forEach((mId, idx) => {
      const menko = MENKO_LIST.find((m) => m.id === mId) || MENKO_LIST[0];
      initialPieces.push({
        uid: `ply_init_${idx}_${Date.now()}`,
        menko,
        owner: 'player',
        x: 130 + idx * 80,
        y: 205,
        vx: 0,
        vy: 0,
        radius: 26,
        angle: 0,
        flipped: false,
        flipProgress: 0,
      });
    });

    piecesRef.current = initialPieces;
    effectsRef.current = [];
    setBattleState({
      turn: 'player',
      winner: null,
      message: `${rival.name}と勝負！場をタップして狙いを定めろ！`,
      playerHandIdx: 0,
      aimX: 170,
      aimY: 150,
      gaugeVal: 50,
      gaugeDir: 1,
      playerScore: 0,
      cpuScore: 0,
    });
    setScreen('battle');
  };

  // パワーゲージ往復タイマー
  useEffect(() => {
    if (screen !== 'battle' || battleState.turn !== 'player') return;
    const timer = setInterval(() => {
      setBattleState((prev) => {
        let nextVal = prev.gaugeVal + prev.gaugeDir * 4.5;
        let nextDir = prev.gaugeDir;
        if (nextVal >= 100) {
          nextVal = 100;
          nextDir = -1;
        } else if (nextVal <= 0) {
          nextVal = 0;
          nextDir = 1;
        }
        return { ...prev, gaugeVal: nextVal, gaugeDir: nextDir };
      });
    }, 30);
    return () => clearInterval(timer);
  }, [screen, battleState.turn]);

  // メンコ叩きつけ実行処理（プレイヤー・CPU共通）
  const executeSlam = useCallback(
    (attackerOwner, menko, targetX, targetY, accuracyRatio) => {
      playSe('slam', muted);
      if (menko.castanet) {
        setTimeout(() => playSe('castanet', muted), 90);
      }

      // 叩きつけたメンコ自体を場に追加
      piecesRef.current.push({
        uid: `${attackerOwner}_slam_${Date.now()}_${Math.random()}`,
        menko,
        owner: attackerOwner,
        x: targetX,
        y: targetY,
        vx: 0,
        vy: 0,
        radius: 27,
        angle: (Math.random() - 0.5) * 0.4,
        flipped: false,
        flipProgress: 0,
      });

      // 風圧エフェクト発生
      const isJust = accuracyRatio >= 0.85;
      const windRadius = (75 + menko.power * 0.55) * (1 + menko.skill.bonusWind) * (isJust ? 1.25 : 0.95);
      effectsRef.current.push({
        x: targetX,
        y: targetY,
        r: 10,
        maxR: windRadius,
        alpha: 1,
        isJust,
        rose: menko.rose,
      });

      // 周囲の敵メンコに風圧＆裏返し判定
      let flippedCount = 0;
      piecesRef.current.forEach((p) => {
        if (p.owner === attackerOwner || p.flipped) return;
        const dx = p.x - targetX;
        const dy = p.y - targetY;
        const dist = Math.hypot(dx, dy);

        if (dist < windRadius) {
          const proximity = 1 - dist / windRadius;
          const attackForce = (menko.power * 0.7 + accuracyRatio * 45) * (1 + menko.skill.bonusWind) * (0.5 + proximity);
          const defense = p.menko.weight * (1 + p.menko.skill.bonusWeight);

          // 吹き飛ばし速度
          const pushAngle = Math.atan2(dy || 1, dx || 1);
          const pushSpeed = Math.max(2, (attackForce / Math.max(25, defense)) * 5.5);
          p.vx += Math.cos(pushAngle) * pushSpeed;
          p.vy += Math.sin(pushAngle) * pushSpeed;

          // 裏返し成功判定
          if (attackForce > defense * 0.68 || (isJust && proximity > 0.45)) {
            p.flipped = true;
            p.flipProgress = 0.05;
            flippedCount += 1;
          }
        }
      });

      if (flippedCount > 0) {
        setTimeout(() => playSe('flip', muted), 130);
      }

      return { isJust, flippedCount };
    },
    [muted]
  );

  // プレイヤーが「叩きつける！」を押した時
  const handlePlayerSlam = () => {
    if (battleState.turn !== 'player') return;
    const handMenkoId = deckIds[battleState.playerHandIdx % 3];
    const menko = MENKO_LIST.find((m) => m.id === handMenkoId) || MENKO_LIST[0];

    // ゲージ中央(50)に近いほど精度が高い（0.0〜1.0）
    const diffFromCenter = Math.abs(50 - battleState.gaugeVal);
    const accuracy = Math.max(0.2, 1 - diffFromCenter / 50);

    const { isJust, flippedCount } = executeSlam('player', menko, battleState.aimX, battleState.aimY, accuracy);

    setBattleState((prev) => ({
      ...prev,
      turn: 'animating',
      playerHandIdx: prev.playerHandIdx + 1,
      message: isJust
        ? `オーレ！ジャスト情熱撃！${flippedCount > 0 ? `${flippedCount}枚ひっくり返した！` : '強烈な風圧！'}`
        : `バチーン！${flippedCount > 0 ? `${flippedCount}枚ひっくり返した！` : '風圧発生！'}`,
    }));

    // 1.3秒後に勝敗判定またはCPUターンへ
    setTimeout(() => {
      const cpuRemaining = piecesRef.current.filter((p) => p.owner === 'cpu' && !p.flipped).length;
      if (cpuRemaining === 0) {
        finishBattle('player');
        return;
      }

      // CPUのターン開始
      setBattleState((prev) => ({
        ...prev,
        turn: 'cpu',
        message: '相手のターン！情熱の構えに入った…',
      }));

      setTimeout(() => {
        const rival = CPU_RIVALS.find((r) => r.id === selectedRivalId) || CPU_RIVALS[0];
        const cpuMenkoId = rival.deck[Math.floor(Math.random() * rival.deck.length)];
        const cpuMenko = MENKO_LIST.find((m) => m.id === cpuMenkoId) || MENKO_LIST[0];

        const playerTargets = piecesRef.current.filter((p) => p.owner === 'player' && !p.flipped);
        const target =
          playerTargets.length > 0
            ? playerTargets[Math.floor(Math.random() * playerTargets.length)]
            : { x: 170, y: 165 };

        const jitterX = (Math.random() - 0.5) * 35;
        const jitterY = (Math.random() - 0.5) * 35;
        const cpuRes = executeSlam('cpu', cpuMenko, target.x + jitterX, target.y + jitterY, rival.aiAccuracy);

        setBattleState((prev) => ({
          ...prev,
          message: `${rival.name}の攻撃！${cpuRes.flippedCount > 0 ? `${cpuRes.flippedCount}枚返された！` : '耐えきった！'}`,
        }));

        setTimeout(() => {
          const plyRemaining = piecesRef.current.filter((p) => p.owner === 'player' && !p.flipped).length;
          if (plyRemaining === 0) {
            finishBattle('cpu');
          } else {
            setBattleState((prev) => ({
              ...prev,
              turn: 'player',
              message: 'お前のターンや！狙いをつけて叩きつけろ！',
            }));
          }
        }, 1100);
      }, 900);
    }, 1200);
  };

  // バトル決着処理
  const finishBattle = (winner) => {
    const rival = CPU_RIVALS.find((r) => r.id === selectedRivalId) || CPU_RIVALS[0];
    if (winner === 'player') {
      playSe('win', muted);
      const nextCoins = coins + rival.reward;
      const nextWins = wins + 1;
      setCoins(nextCoins);
      setWins(nextWins);
      saveProgress(ownedIds, deckIds, nextCoins, nextWins);
    }
    setBattleState((prev) => ({
      ...prev,
      turn: 'result',
      winner,
      message: winner === 'player' ? `勝利！賞金 ${rival.reward} コイン獲得！` : '敗北…デッキを強化してリベンジや！',
    }));
  };

  // Canvasアニメーションループ
  useEffect(() => {
    if (screen !== 'battle') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const W = canvas.width;
      const H = canvas.height;

      // 背景（昭和の土俵・路地裏地面）
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(0, 0, W, H);

      // 土俵サークル
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 130, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 75, 0, Math.PI * 2);
      ctx.stroke();

      // メンコ物理移動＆描画
      piecesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.88;
        p.vy *= 0.88;

        // 場外判定（土俵の外に出たら裏返り扱い）
        const distFromCenter = Math.hypot(p.x - W / 2, p.y - H / 2);
        if (distFromCenter > 136 && !p.flipped) {
          p.flipped = true;
          p.flipProgress = 0.05;
        }
        // 壁バウンド
        if (p.x < 30) { p.x = 30; p.vx *= -0.5; }
        if (p.x > W - 30) { p.x = W - 30; p.vx *= -0.5; }
        if (p.y < 30) { p.y = 30; p.vy *= -0.5; }
        if (p.y > H - 30) { p.y = H - 30; p.vy *= -0.5; }

        if (p.flipped && p.flipProgress < 1) {
          p.flipProgress = Math.min(1, p.flipProgress + 0.08);
        }

        drawMenkoCanvas(ctx, p);
      });

      // 風圧・薔薇吹雪エフェクト描画
      effectsRef.current = effectsRef.current.filter((ef) => ef.alpha > 0.03);
      effectsRef.current.forEach((ef) => {
        ef.r += (ef.maxR - ef.r) * 0.22;
        ef.alpha *= 0.91;

        ctx.save();
        ctx.strokeStyle = ef.isJust ? `rgba(220, 38, 38, ${ef.alpha})` : `rgba(245, 158, 11, ${ef.alpha})`;
        ctx.lineWidth = ef.isJust ? 5 : 3;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2);
        ctx.stroke();

        if (ef.rose) {
          ctx.fillStyle = `rgba(225, 29, 72, ${ef.alpha})`;
          for (let i = 0; i < 6; i++) {
            const ang = (i * Math.PI) / 3 + ef.r * 0.05;
            ctx.beginPath();
            ctx.arc(ef.x + Math.cos(ang) * ef.r * 0.8, ef.y + Math.sin(ang) * ef.r * 0.8, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      });

      // プレイヤーの照準ターゲット描画
      if (battleState.turn === 'player') {
        ctx.save();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(battleState.aimX, battleState.aimY, 32, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(battleState.aimX - 10, battleState.aimY);
        ctx.lineTo(battleState.aimX + 10, battleState.aimY);
        ctx.moveTo(battleState.aimX, battleState.aimY - 10);
        ctx.lineTo(battleState.aimX, battleState.aimY + 10);
        ctx.stroke();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [screen, battleState.turn, battleState.aimX, battleState.aimY]);

  // Canvasタップで照準移動
  const handleCanvasPointer = (e) => {
    if (battleState.turn !== 'player') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.max(45, Math.min(canvas.width - 45, (e.clientX - rect.left) * scaleX));
    const y = Math.max(45, Math.min(canvas.height - 45, (e.clientY - rect.top) * scaleY));
    setBattleState((prev) => ({ ...prev, aimX: x, aimY: y }));
  };

  // 駄菓子屋くじガチャ（1回100コイン）
  const pullGacha = () => {
    if (coins < 100) return;
    playSe('castanet', muted);
    const rand = Math.random();
    let targetRarity = 'N';
    if (rand > 0.94) targetRarity = 'UR';
    else if (rand > 0.78) targetRarity = 'SR';
    else if (rand > 0.48) targetRarity = 'R';

    const pool = MENKO_LIST.filter((m) => m.rarity === targetRarity);
    const picked = pool[Math.floor(Math.random() * pool.length)] || MENKO_LIST[0];
    const isNew = !ownedIds.includes(picked.id);
    const nextOwned = isNew ? [...ownedIds, picked.id] : ownedIds;
    const nextCoins = coins - 100;

    setOwnedIds(nextOwned);
    setCoins(nextCoins);
    setGachaResult({ menko: picked, isNew });
    saveProgress(nextOwned, deckIds, nextCoins, wins);
    if (targetRarity === 'UR' || targetRarity === 'SR') {
      playSe('win', muted);
    }
  };

  // デッキ入れ替え
  const equipMenko = (menkoId) => {
    if (deckIds.includes(menkoId)) return;
    const nextDeck = [...deckIds];
    nextDeck[deckSlotIdx] = menkoId;
    setDeckIds(nextDeck);
    saveProgress(ownedIds, nextDeck, coins, wins);
    playSe('castanet', muted);
  };

  // LINEシェア
  const shareLine = () => {
    const text = `『情熱のフラ・メンコ』でキモカワ動物メンコを${ownedIds.length}/100種集めたで！オーレ！`;
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://jonetsu-flamenko.vercel.app';
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const currentRival = CPU_RIVALS.find((r) => r.id === selectedRivalId) || CPU_RIVALS[0];
  const carmenMenko = MENKO_LIST.find((m) => m.id === 10);

  return (
    <div style={{ maxWidth: '460px', margin: '0 auto', padding: '10px 8px 28px' }}>
      {/* 携帯ゲーム機風ベゼルフレーム */}
      <div
        style={{
          backgroundColor: '#e2e8f0',
          borderRadius: '22px',
          padding: '12px',
          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.14)',
          border: '3px solid #cbd5e1',
        }}
      >
        {/* 内側メインスクリーン（白背景×オレンジ縁取り） */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '4px solid #d97706',
            overflow: 'hidden',
          }}
        >
          {/* ヘッダーバー */}
          <div
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#fef08a' }}>SUNミニゲーム第4弾</div>
              <div style={{ fontSize: '17px', fontWeight: '900', letterSpacing: '0.5px' }}>情熱のフラ・メンコ</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span
                style={{
                  backgroundColor: '#fef08a',
                  color: '#991b1b',
                  fontSize: '11px',
                  fontWeight: '900',
                  padding: '3px 8px',
                  borderRadius: '999px',
                }}
              >
                図鑑 {ownedIds.length}/100
              </span>
              <button
                onClick={() => setMuted(!muted)}
                style={{
                  backgroundColor: '#991b1b',
                  color: '#fff',
                  fontSize: '11px',
                  padding: '4px 7px',
                  borderRadius: '6px',
                }}
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </div>
          </div>

          {/* ステータスバー */}
          <div
            style={{
              backgroundColor: '#fffbeb',
              borderBottom: '2px solid #fde68a',
              padding: '6px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              fontWeight: '800',
            }}
          >
            <span>🪙 {coins} コイン</span>
            <span>🏆 {wins} 勝</span>
            <button
              onClick={() => setShowHelp(true)}
              style={{
                backgroundColor: '#f59e0b',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '800',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              遊び方
            </button>
          </div>

          {/* 画面コンテンツ分岐 */}
          {screen === 'home' && (
            <div style={{ padding: '12px' }}>
              {/* プロローグ物語カード */}
              <div
                style={{
                  backgroundColor: '#fff7ed',
                  border: '2px solid #fdba74',
                  borderRadius: '12px',
                  padding: '10px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <MenkoSVG menko={carmenMenko} size={74} />
                </div>
                <div style={{ fontSize: '12px', color: '#431407' }}>
                  <div style={{ fontWeight: '900', color: '#c2410c', marginBottom: '3px' }}>
                    オーレ！キモカワ動物メンコ大戦！
                  </div>
                  丸メン＆角メン全100種のキモカワ動物を集め、情熱の風圧でライバルのメンコを全部ひっくり返せ！
                </div>
              </div>

              {/* 現在のマイデッキ3枚 */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>🎴 出撃マイデッキ（3枚）</span>
                  <button
                    onClick={() => setScreen('deck')}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 9px',
                      borderRadius: '6px',
                    }}
                  >
                    編成する ➔
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {deckIds.map((id, i) => {
                    const m = MENKO_LIST.find((x) => x.id === id) || MENKO_LIST[0];
                    return (
                      <div
                        key={i}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '2px solid #cbd5e1',
                          borderRadius: '10px',
                          padding: '6px 4px',
                          textAlign: 'center',
                        }}
                      >
                        <MenkoSVG menko={m} size={52} />
                        <div style={{ fontSize: '10px', fontWeight: '800', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: '9px', color: '#d97706', fontWeight: '900' }}>
                          [{m.rarity}] {m.shape === 'square' ? '角メン' : '丸メン'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CPU対戦相手選択 */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '900', marginBottom: '6px' }}>🔥 対戦相手を選ぶ（CPUタイマン）</div>
                <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {CPU_RIVALS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRivalId(r.id)}
                      style={{
                        flexShrink: 0,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '900',
                        backgroundColor: selectedRivalId === r.id ? '#dc2626' : '#f1f5f9',
                        color: selectedRivalId === r.id ? '#ffffff' : '#334155',
                        border: selectedRivalId === r.id ? '2px solid #991b1b' : '2px solid #cbd5e1',
                      }}
                    >
                      Lv.{r.id} {r.name.split('・')[0]}
                    </button>
                  ))}
                </div>

                {/* 選択中ライバル詳細 */}
                <div
                  style={{
                    marginTop: '6px',
                    backgroundColor: '#fef2f2',
                    border: '2px solid #fecaca',
                    borderRadius: '10px',
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '900', color: '#991b1b' }}>
                    <span>{currentRival.name}</span>
                    <span>賞金: 🪙{currentRival.reward}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '2px' }}>{currentRival.desc}</div>
                </div>
              </div>

              {/* メイン出撃ボタン */}
              <button
                onClick={() => startBattle(selectedRivalId)}
                style={{
                  width: '100%',
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '900',
                  padding: '13px',
                  borderRadius: '12px',
                  boxShadow: '0 4px 0 #9a3412',
                  marginBottom: '10px',
                }}
              >
                情熱のメンコ勝負を始める！ ➔
              </button>

              {/* サブメニュー（ガチャ・図鑑・LINEシェア） */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <button
                  onClick={() => {
                    setGachaResult(null);
                    setScreen('gacha');
                  }}
                  style={{
                    backgroundColor: '#eab308',
                    color: '#422006',
                    fontSize: '13px',
                    fontWeight: '900',
                    padding: '10px',
                    borderRadius: '10px',
                    boxShadow: '0 3px 0 #a16207',
                  }}
                >
                  🎁 駄菓子屋くじ
                </button>
                <button
                  onClick={() => setScreen('dex')}
                  style={{
                    backgroundColor: '#0d9488',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '900',
                    padding: '10px',
                    borderRadius: '10px',
                    boxShadow: '0 3px 0 #115e59',
                  }}
                >
                  📖 100種図鑑
                </button>
              </div>

              <button
                onClick={shareLine}
                style={{
                  width: '100%',
                  backgroundColor: '#06c755',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '900',
                  padding: '9px',
                  borderRadius: '10px',
                }}
              >
                LINEで戦績をシェアする
              </button>
            </div>
          )}

          {/* バトル画面 */}
          {screen === 'battle' && (
            <div style={{ padding: '10px' }}>
              <div
                style={{
                  backgroundColor: '#1e293b',
                  color: '#fef08a',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}
              >
                {battleState.message}
              </div>

              {/* メンコ土俵Canvas */}
              <div style={{ position: 'relative', textAlign: 'center', marginBottom: '8px' }}>
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={310}
                  onPointerDown={handleCanvasPointer}
                  style={{
                    width: '100%',
                    maxWidth: '340px',
                    height: 'auto',
                    borderRadius: '12px',
                    border: '3px solid #b45309',
                    touchAction: 'none',
                    cursor: 'crosshair',
                  }}
                />
              </div>

              {/* パワーゲージ＆アクションボタン */}
              {battleState.turn !== 'result' ? (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '900', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>情熱タイミングゲージ（中央の赤ゾーンで超風圧！）</span>
                    <span>{Math.round(battleState.gaugeVal)}%</span>
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      height: '20px',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      border: '2px solid #475569',
                      marginBottom: '10px',
                    }}
                  >
                    {/* 中央ジャストゾーン */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '42%',
                        width: '16%',
                        height: '100%',
                        backgroundColor: '#ef4444',
                      }}
                    />
                    {/* 動くバー */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `calc(${battleState.gaugeVal}% - 5px)`,
                        width: '10px',
                        height: '100%',
                        backgroundColor: '#1e293b',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setScreen('home')}
                      style={{
                        backgroundColor: '#64748b',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '800',
                        padding: '12px',
                        borderRadius: '10px',
                      }}
                    >
                      撤退
                    </button>
                    <button
                      disabled={battleState.turn !== 'player'}
                      onClick={handlePlayerSlam}
                      style={{
                        flex: 1,
                        backgroundColor: battleState.turn === 'player' ? '#dc2626' : '#94a3b8',
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: '900',
                        padding: '12px',
                        borderRadius: '10px',
                        boxShadow: battleState.turn === 'player' ? '0 4px 0 #7f1d1d' : 'none',
                      }}
                    >
                      {battleState.turn === 'player' ? 'バチーンと叩きつける！' : '相手の行動中…'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => startBattle(selectedRivalId)}
                    style={{
                      flex: 1,
                      backgroundColor: '#ea580c',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '900',
                      padding: '12px',
                      borderRadius: '10px',
                    }}
                  >
                    もう一戦！
                  </button>
                  <button
                    onClick={() => setScreen('home')}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: '900',
                      padding: '12px',
                      borderRadius: '10px',
                    }}
                  >
                    ホームへ戻る
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 駄菓子屋くじガチャ画面 */}
          {screen === 'gacha' && (
            <div style={{ padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#b45309', marginBottom: '4px' }}>
                🎁 駄菓子屋の情熱メンコくじ
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                1回 100コインで全100種のキモカワ動物メンコを引こう！
              </div>

              {gachaResult ? (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '3px solid #f59e0b',
                    borderRadius: '14px',
                    padding: '14px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#dc2626', marginBottom: '4px' }}>
                    {gachaResult.isNew ? '✨ NEW！初ゲット！ ✨' : 'ダブり（コレクション済み）'}
                  </div>
                  <MenkoSVG menko={gachaResult.menko} size={110} />
                  <div style={{ fontSize: '15px', fontWeight: '900', marginTop: '6px' }}>
                    No.{gachaResult.menko.no} {gachaResult.menko.name}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#d97706' }}>
                    レア度: {gachaResult.menko.rarity} / {gachaResult.menko.shape === 'square' ? '角メン' : '丸メン'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{gachaResult.menko.desc}</div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '14px',
                    padding: '32px 12px',
                    marginBottom: '12px',
                    fontSize: '13px',
                    fontWeight: '800',
                    color: '#64748b',
                  }}
                >
                  どのキモカワ動物が出るかはお楽しみ！
                </div>
              )}

              <button
                disabled={coins < 100}
                onClick={pullGacha}
                style={{
                  width: '100%',
                  backgroundColor: coins >= 100 ? '#dc2626' : '#94a3b8',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '900',
                  padding: '12px',
                  borderRadius: '10px',
                  marginBottom: '8px',
                }}
              >
                {coins >= 100 ? '1回引く（100コイン）' : 'コインが足りへん！対戦で稼ごう'}
              </button>

              <button
                onClick={() => setScreen('home')}
                style={{
                  width: '100%',
                  backgroundColor: '#475569',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '800',
                  padding: '10px',
                  borderRadius: '10px',
                }}
              >
                ホームへ戻る
              </button>
            </div>
          )}

          {/* デッキ編成画面 */}
          {screen === 'deck' && (
            <div style={{ padding: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '900', marginBottom: '6px' }}>🎴 出撃デッキ編成</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                入れ替えたいスロットをタップしてから、下の所持メンコを選んでな！
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                {deckIds.map((id, idx) => {
                  const m = MENKO_LIST.find((x) => x.id === id) || MENKO_LIST[0];
                  const active = deckSlotIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setDeckSlotIdx(idx)}
                      style={{
                        backgroundColor: active ? '#fef3c7' : '#f8fafc',
                        border: active ? '3px solid #d97706' : '2px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '6px',
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: '900', color: '#b45309' }}>枠 {idx + 1}</div>
                      <MenkoSVG menko={m} size={50} />
                      <div style={{ fontSize: '10px', fontWeight: '800' }}>{m.name}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                {ownedIds.map((id) => {
                  const m = MENKO_LIST.find((x) => x.id === id);
                  if (!m) return null;
                  const equipped = deckIds.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => equipMenko(id)}
                      style={{
                        backgroundColor: equipped ? '#e2e8f0' : '#ffffff',
                        border: '2px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '6px 4px',
                        opacity: equipped ? 0.6 : 1,
                      }}
                    >
                      <MenkoSVG menko={m} size={46} />
                      <div style={{ fontSize: '10px', fontWeight: '800' }}>{m.name}</div>
                      <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: '900' }}>
                        攻{m.power} / 重{m.weight}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setScreen('home')}
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '900',
                  padding: '10px',
                  borderRadius: '10px',
                }}
              >
                編成完了して戻る
              </button>
            </div>
          )}

          {/* 全100種図鑑画面 */}
          {screen === 'dex' && (
            <div style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: '900' }}>📖 キモカワ動物図鑑 ({ownedIds.length}/100)</span>
                <button
                  onClick={() => setScreen('home')}
                  style={{ backgroundColor: '#475569', color: '#fff', fontSize: '11px', padding: '5px 10px', borderRadius: '6px', fontWeight: '800' }}
                >
                  戻る
                </button>
              </div>

              {/* 系統フィルター */}
              <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
                <button
                  onClick={() => setDexFilter('all')}
                  style={{
                    flexShrink: 0,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '800',
                    backgroundColor: dexFilter === 'all' ? '#0d9488' : '#f1f5f9',
                    color: dexFilter === 'all' ? '#fff' : '#334155',
                  }}
                >
                  全100種
                </button>
                {TRIBES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDexFilter(t.id)}
                    style={{
                      flexShrink: 0,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '800',
                      backgroundColor: dexFilter === t.id ? '#0d9488' : '#f1f5f9',
                      color: dexFilter === t.id ? '#fff' : '#334155',
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              {/* 図鑑グリッド */}
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {MENKO_LIST.filter((m) => dexFilter === 'all' || m.tribeId === dexFilter).map((m) => {
                  const unlocked = ownedIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => unlocked && setSelectedDexMenko(m)}
                      style={{
                        backgroundColor: unlocked ? '#fffbeb' : '#f1f5f9',
                        border: unlocked ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '5px 2px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b' }}>No.{m.no}</div>
                      {unlocked ? (
                        <MenkoSVG menko={m} size={44} />
                      ) : (
                        <div style={{ height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#94a3b8' }}>
                          ？
                        </div>
                      )}
                      <div style={{ fontSize: '9px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {unlocked ? m.name : '未発見'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 選択したメンコ詳細 */}
              {selectedDexMenko && (
                <div
                  style={{
                    marginTop: '8px',
                    backgroundColor: '#fff7ed',
                    border: '2px solid #ea580c',
                    borderRadius: '10px',
                    padding: '8px',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                  }}
                >
                  <MenkoSVG menko={selectedDexMenko} size={64} />
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ fontWeight: '900', color: '#9a3412' }}>
                      No.{selectedDexMenko.no} {selectedDexMenko.name} [{selectedDexMenko.rarity}]
                    </div>
                    <div>形状: {selectedDexMenko.shape === 'square' ? '角メン' : '丸メン'} / 攻:{selectedDexMenko.power} 重:{selectedDexMenko.weight}</div>
                    <div style={{ color: '#475569', marginTop: '2px' }}>{selectedDexMenko.desc}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 管理者デバッグパネル（?key=sun777fla） */}
          {isDebug && (
            <div style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '8px 12px', fontSize: '11px' }}>
              <div style={{ fontWeight: '900', marginBottom: '4px' }}>🛠 管理者デバッグモード（sun777fla）</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const next = coins + 1000;
                    setCoins(next);
                    saveProgress(ownedIds, deckIds, next, wins);
                  }}
                  style={{ backgroundColor: '#0284c7', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}
                >
                  +1000コイン
                </button>
                <button
                  onClick={() => {
                    const all = MENKO_LIST.map((m) => m.id);
                    setOwnedIds(all);
                    saveProgress(all, deckIds, coins, wins);
                  }}
                  style={{ backgroundColor: '#059669', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}
                >
                  全100種解放
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    window.location.reload();
                  }}
                  style={{ backgroundColor: '#dc2626', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}
                >
                  データ初期化
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 遊び方モーダル */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              border: '3px solid #d97706',
              borderRadius: '16px',
              padding: '16px',
              maxWidth: '380px',
              width: '100%',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626', marginBottom: '8px' }}>
              🔥 情熱のフラ・メンコ 遊び方
            </div>
            <ul style={{ fontSize: '12px', paddingLeft: '18px', lineHeight: '1.7', marginBottom: '12px' }}>
              <li><b>① 狙いを定める</b>：土俵をタップして青い照準を相手メンコの近くに合わせよう。</li>
              <li><b>② ジャスト叩きつけ</b>：ゲージのバーが中央の赤いゾーンに来た瞬間に「バチーンと叩きつける！」を押すと超風圧が発生！</li>
              <li><b>③ 勝利条件</b>：相手のメンコを全部ひっくり返すか、土俵の外へ弾き出せば勝利や！</li>
              <li><b>④ 角メンと丸メン</b>：角メンは重くて飛ばされにくく、レア度が上がるとバラやカスタネットで特殊風圧が発動するで！</li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              style={{
                width: '100%',
                backgroundColor: '#d97706',
                color: '#fff',
                fontWeight: '900',
                padding: '10px',
                borderRadius: '10px',
              }}
            >
              わかった！オーレ！
            </button>
          </div>
        </div>
      )}

      {/* 下部共通パーツ：広告スペース枠 */}
      <div
        id="ad-banner-slot"
        style={{
          marginTop: '14px',
          backgroundColor: '#ffffff',
          border: '2px dashed #cbd5e1',
          borderRadius: '10px',
          padding: '14px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', letterSpacing: '1px' }}>
          SPONSORED LINK
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          広告スペース（SUNミニゲームシリーズ共通枠）
        </div>
      </div>

      {/* 下部共通パーツ：シリーズ相互リンク */}
      <div
        style={{
          marginTop: '12px',
          backgroundColor: '#ffffff',
          border: '2px solid #fde68a',
          borderRadius: '12px',
          padding: '10px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: '900', color: '#b45309', textAlign: 'center', marginBottom: '8px' }}>
          🎮 株式会社SUN ブラウザミニゲームシリーズ
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          <a
            href="https://okura-tataki.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '8px',
              padding: '6px 4px',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#166534',
              fontSize: '11px',
              fontWeight: '900',
            }}
          >
            第1弾
            <br />
            オクラたたき
          </a>
          <a
            href="https://bin-ball.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              backgroundColor: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: '8px',
              padding: '6px 4px',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#9a3412',
              fontSize: '11px',
              fontWeight: '900',
            }}
          >
            第2弾
            <br />
            びんぼ～る
          </a>
          <a
            href="https://hagering.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '6px 4px',
              textAlign: 'center',
              textDecoration: 'none',
              color: '#991b1b',
              fontSize: '11px',
              fontWeight: '900',
            }}
          >
            第3弾
            <br />
            ハゲリング
          </a>
        </div>
      </div>

      {/* フッター */}
      <footer style={{ textAlign: 'center', fontSize: '11px', color: '#78716c', marginTop: '12px' }}>
        © 2026 SUN Inc. All Rights Reserved.
      </footer>
    </div>
  );
}
