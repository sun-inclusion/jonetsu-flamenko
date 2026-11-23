'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MENKO_LIST, CPU_RIVALS, TRIBES } from './menkoData';
import { MenkoSVG, drawMenkoCanvas } from './graphics';

const STORAGE_KEY = 'jonetsu_flamenko_save_v2';

// 10段階の打撃ランク定義（Lv10が最強〜Lv1が最弱）
const SLAM_RANKS = [
  { lv: 1, text: 'スカッ…', color: '#94a3b8', stroke: '#334155', scale: 0.75, shake: 0, freq: 95, gain: 0.12 },
  { lv: 2, text: 'フワッ…', color: '#cbd5e1', stroke: '#334155', scale: 0.85, shake: 2, freq: 110, gain: 0.18 },
  { lv: 3, text: 'ペチッ…', color: '#fde047', stroke: '#713f12', scale: 0.95, shake: 3, freq: 130, gain: 0.24 },
  { lv: 4, text: 'パシッ！', color: '#facc15', stroke: '#713f12', scale: 1.05, shake: 5, freq: 150, gain: 0.30 },
  { lv: 5, text: 'バシッ！', color: '#fb923c', stroke: '#7c2d12', scale: 1.15, shake: 7, freq: 175, gain: 0.36 },
  { lv: 6, text: 'パチーン！', color: '#f97316', stroke: '#7c2d12', scale: 1.25, shake: 9, freq: 200, gain: 0.42 },
  { lv: 7, text: 'パッチーン！', color: '#ef4444', stroke: '#7f1d1d', scale: 1.38, shake: 12, freq: 230, gain: 0.48 },
  { lv: 8, text: 'バチーンッ！', color: '#dc2626', stroke: '#450a0a', scale: 1.52, shake: 15, freq: 265, gain: 0.55 },
  { lv: 9, text: 'バッチーン！！', color: '#fef08a', stroke: '#b91c1c', scale: 1.68, shake: 19, freq: 310, gain: 0.62 },
  { lv: 10, text: 'バチコーンッ！！', color: '#ffffff', stroke: '#dc2626', scale: 1.9, shake: 25, freq: 370, gain: 0.72 },
];

// 10段階対応 Web Audio API 効果音エンジン
function playSlamSe(rankObj, muted) {
  if (muted || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 低音インパクト
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = rankObj.lv >= 7 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(rankObj.freq, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.14 + rankObj.lv * 0.015);
    gain.gain.setValueAtTime(rankObj.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16 + rankObj.lv * 0.015);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18 + rankObj.lv * 0.015);

    // 高レベル時は乾いた破裂音（高域パチーン成分）を追加
    if (rankObj.lv >= 6) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(520 + rankObj.lv * 65, now);
      osc2.frequency.exponentialRampToValueAtTime(110, now + 0.09);
      gain2.gain.setValueAtTime(rankObj.gain * 0.55, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.11);
    }
  } catch (e) {
    // 無視
  }
}

function playSimpleSe(type, muted) {
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

    if (type === 'get') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.08);
      osc.frequency.setValueAtTime(784, now + 0.16);
      osc.frequency.setValueAtTime(1046, now + 0.24);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.46);
    } else if (type === 'castanet') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (e) {
    // 無視
  }
}

export default function FlamenkoGame() {
  // 所持インベントリ: { [menkoId]: count }
  const [inventory, setInventory] = useState({ 1: 1, 11: 1, 21: 1 });
  const [coins, setCoins] = useState(200);
  const [wins, setWins] = useState(0);
  const [muted, setMuted] = useState(false);

  // 画面モード: 'home' | 'select_hand' | 'battle' | 'gacha' | 'dex'
  const [screen, setScreen] = useState('home');
  const [selectedRivalId, setSelectedRivalId] = useState(1);
  // ルールモード: 'single' (1枚タイマン) | 'cumulative' (累積2〜5枚)
  const [battleMode, setBattleMode] = useState('single');
  // 出撃手札リスト（menkoIdの配列：同じID複数選択可）
  const [selectedHand, setSelectedHand] = useState([1]);

  const [isDebug, setIsDebug] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dexFilter, setDexFilter] = useState('all');
  const [selectedDexMenko, setSelectedDexMenko] = useState(null);
  const [gachaResult, setGachaResult] = useState(null);
  const [getBanner, setGetBanner] = useState(null); // 「ゲットだぜ！」表示用

  // Canvas & バトル進行状態
  const canvasRef = useRef(null);
  const shakeRef = useRef(0);
  const onomatopoeiaRef = useRef(null); // { text, color, stroke, scale, x, y, alpha }
  const piecesRef = useRef([]);
  const effectsRef = useRef([]);
  const animFrameRef = useRef(null);

  const [battleState, setBattleState] = useState({
    turn: 'player', // 'player' | 'animating' | 'cpu' | 'result'
    message: '狙う場所をタップして叩きつけろ！',
    aimX: 170,
    aimY: 155,
    gaugeVal: 50,
    gaugeDir: 1,
    playerQueue: [], // プレイヤーの残り手札menkoId配列（奪ったメンコも即ここに入る）
    cpuQueue: [], // CPUの残り手札menkoId配列
    capturedByPlayer: [], // この試合でプレイヤーが裏返して確保したmenkoId配列
    capturedByCpu: [], // この試合でCPUに奪われたmenkoId配列
    resultSummary: null,
  });

  // 総所持枚数カウント
  const totalOwnedCount = Object.values(inventory).reduce((sum, c) => sum + (c > 0 ? c : 0), 0);
  const uniqueOwnedCount = Object.values(inventory).filter((c) => c > 0).length;

  // 初期ロード
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
          if (parsed.inventory && typeof parsed.inventory === 'object') {
            const total = Object.values(parsed.inventory).reduce((s, c) => s + (c > 0 ? c : 0), 0);
            setInventory(total > 0 ? parsed.inventory : { 1: 1 });
          }
          if (typeof parsed.coins === 'number') setCoins(parsed.coins);
          if (typeof parsed.wins === 'number') setWins(parsed.wins);
        }
      } catch (e) {
        // 初期値のまま
      }
    }
  }, []);

  // セーブ保存（0枚全滅時の1枚救済チェック込み）
  const saveProgress = useCallback((nextInv, nextCoins, nextWins) => {
    const cleaned = {};
    let total = 0;
    Object.entries(nextInv).forEach(([k, v]) => {
      if (v > 0) {
        cleaned[k] = v;
        total += v;
      }
    });
    if (total === 0) {
      cleaned[1] = 1; // 救済措置：ぼんやりフラミンゴ1枚支給
    }
    setInventory(cleaned);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          inventory: cleaned,
          coins: nextCoins,
          wins: nextWins,
        })
      );
    } catch (e) {
      // 無視
    }
    return cleaned;
  }, []);

  // 総所持数1枚なら強制的に1枚タイマンへ戻す
  useEffect(() => {
    if (totalOwnedCount <= 1 && battleMode === 'cumulative') {
      setBattleMode('single');
    }
  }, [totalOwnedCount, battleMode]);

  // 出撃手札選択画面を開く
  const openHandSelect = () => {
    const mode = totalOwnedCount <= 1 ? 'single' : battleMode;
    setBattleMode(mode);
    setSelectedHand([]);
    setScreen('select_hand');
  };

  // 手札の選択トグル（所持数の範囲内で選択可能）
  const addToSelectedHand = (menkoId) => {
    const maxCount = battleMode === 'single' ? 1 : Math.min(5, totalOwnedCount);
    if (selectedHand.length >= maxCount) return;
    const alreadyPicked = selectedHand.filter((id) => id === menkoId).length;
    const owned = inventory[menkoId] || 0;
    if (alreadyPicked >= owned) return;
    playSimpleSe('castanet', muted);
    setSelectedHand([...selectedHand, menkoId]);
  };

  const removeFromSelectedHand = (index) => {
    playSimpleSe('castanet', muted);
    setSelectedHand(selectedHand.filter((_, i) => i !== index));
  };

  // バトル開始初期化
  const startBattle = () => {
    const minReq = battleMode === 'single' ? 1 : 2;
    if (selectedHand.length < minReq) return;

    const rival = CPU_RIVALS.find((r) => r.id === selectedRivalId) || CPU_RIVALS[0];
    const initialPieces = [];
    let cpuRemainingQueue = [];

    if (battleMode === 'single') {
      // 1枚タイマン：場には相手のメンコ1枚だけ！
      const cpuMenkoId = rival.deck[Math.floor(Math.random() * rival.deck.length)];
      const cpuMenko = MENKO_LIST.find((m) => m.id === cpuMenkoId) || MENKO_LIST[0];
      initialPieces.push({
        uid: `cpu_single_${Date.now()}`,
        menko: cpuMenko,
        owner: 'cpu',
        x: 170,
        y: 155,
        vx: 0,
        vy: 0,
        radius: 30,
        angle: 0,
        flipped: false,
        flipProgress: 0,
      });
    } else {
      // 累積バトル：相手の手札枚数に合わせて場と控えをセット（場の初期配置は相手の先発2〜3枚）
      const cpuPool = [...rival.deck, ...rival.deck].slice(0, selectedHand.length);
      const fieldCount = Math.min(3, cpuPool.length);
      const onField = cpuPool.slice(0, fieldCount);
      cpuRemainingQueue = cpuPool.slice(fieldCount);

      onField.forEach((mId, idx) => {
        const menko = MENKO_LIST.find((m) => m.id === mId) || MENKO_LIST[0];
        const offsetX = fieldCount === 1 ? 170 : fieldCount === 2 ? 130 + idx * 80 : 105 + idx * 65;
        initialPieces.push({
          uid: `cpu_cum_${idx}_${Date.now()}`,
          menko,
          owner: 'cpu',
          x: offsetX,
          y: 145 + (idx % 2) * 24,
          vx: 0,
          vy: 0,
          radius: 27,
          angle: (idx - 1) * 0.12,
          flipped: false,
          flipProgress: 0,
        });
      });
    }

    piecesRef.current = initialPieces;
    effectsRef.current = [];
    onomatopoeiaRef.current = null;
    setGetBanner(null);

    setBattleState({
      turn: 'player',
      message:
        battleMode === 'single'
          ? `【1枚タイマン】相手のメンコを1発でひっくり返せ！`
          : `【累積バトル】手札${selectedHand.length}枚！奪ったメンコはその場で使えるで！`,
      aimX: 170,
      aimY: 155,
      gaugeVal: 50,
      gaugeDir: 1,
      playerQueue: [...selectedHand],
      cpuQueue: cpuRemainingQueue,
      capturedByPlayer: [],
      capturedByCpu: [],
      resultSummary: null,
    });
    setScreen('battle');
  };

  // パワーゲージ往復タイマー
  useEffect(() => {
    if (screen !== 'battle' || battleState.turn !== 'player') return;
    const timer = setInterval(() => {
      setBattleState((prev) => {
        let nextVal = prev.gaugeVal + prev.gaugeDir * 4.8;
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
    }, 28);
    return () => clearInterval(timer);
  }, [screen, battleState.turn]);

  // 10段階の打撃ランク算出
  const calcSlamRank = (accuracyRatio, menko) => {
    const rawScore = accuracyRatio * 8 + (menko.power / 100) * 2; // 1.0 〜 10.0
    const idx = Math.max(0, Math.min(9, Math.round(rawScore) - 1));
    return SLAM_RANKS[idx];
  };

  // メンコ叩きつけ実行処理（プレイヤー・CPU共通）
  const executeSlam = useCallback(
    (attackerOwner, menko, targetX, targetY, accuracyRatio, isCumulative) => {
      const rankObj = calcSlamRank(accuracyRatio, menko);
      playSlamSe(rankObj, muted);
      if (menko.castanet && rankObj.lv >= 6) {
        setTimeout(() => playSimpleSe('castanet', muted), 80);
      }

      // 画面シェイク＆ドデカ擬音ポップアップ設定
      shakeRef.current = rankObj.shake;
      onomatopoeiaRef.current = {
        text: rankObj.text,
        color: rankObj.color,
        stroke: rankObj.stroke,
        scale: rankObj.scale,
        x: targetX,
        y: Math.max(65, targetY - 25),
        alpha: 1.0,
      };

      // 風圧エフェクト発生
      const windRadius = (65 + menko.power * 0.5 + rankObj.lv * 5.5) * (1 + menko.skill.bonusWind);
      effectsRef.current.push({
        x: targetX,
        y: targetY,
        r: 12,
        maxR: windRadius,
        alpha: 1,
        lv: rankObj.lv,
        rose: menko.rose,
      });

      // 周囲の敵メンコに風圧＆裏返し判定
      const newlyFlippedMenkos = [];
      piecesRef.current.forEach((p) => {
        if (p.owner === attackerOwner || p.flipped) return;
        const dx = p.x - targetX;
        const dy = p.y - targetY;
        const dist = Math.hypot(dx, dy);

        if (dist < windRadius) {
          const proximity = 1 - dist / windRadius;
          const attackForce =
            (menko.power * 0.65 + rankObj.lv * 6.5) * (1 + menko.skill.bonusWind) * (0.45 + proximity);
          const defense = p.menko.weight * (1 + p.menko.skill.bonusWeight);

          const pushAngle = Math.atan2(dy || 1, dx || 1);
          const pushSpeed = Math.max(2, (attackForce / Math.max(25, defense)) * 5.2);
          p.vx += Math.cos(pushAngle) * pushSpeed;
          p.vy += Math.sin(pushAngle) * pushSpeed;

          if (attackForce > defense * 0.66 || (rankObj.lv >= 9 && proximity > 0.4)) {
            p.flipped = true;
            p.flipProgress = 0.05;
            newlyFlippedMenkos.push(p.menko);
          }
        }
      });

      // 累積バトルの場合、打ち込んだ自分のメンコが場に残る（1枚タイマンでは手元に戻るため場には残さない）
      if (isCumulative) {
        piecesRef.current.push({
          uid: `${attackerOwner}_cum_${Date.now()}_${Math.random()}`,
          menko,
          owner: attackerOwner,
          x: targetX,
          y: targetY,
          vx: 0,
          vy: 0,
          radius: 27,
          angle: (Math.random() - 0.5) * 0.35,
          flipped: false,
          flipProgress: 0,
        });
      }

      return { rankObj, newlyFlippedMenkos };
    },
    [muted]
  );

  // 試合終了＆リアル精算（図鑑・所持数リアルタイム反映）
  const concludeMatch = useCallback(
    (finalCapturedByPlayer, finalCapturedByCpu, isVictory) => {
      const rival = CPU_RIVALS.find((r) => r.id === selectedRivalId) || CPU_RIVALS[0];
      const nextInv = { ...inventory };

      // 奪い取ったメンコを＋1
      finalCapturedByPlayer.forEach((mId) => {
        nextInv[mId] = (nextInv[mId] || 0) + 1;
      });
      // 奪われたメンコを−1
      finalCapturedByCpu.forEach((mId) => {
        nextInv[mId] = Math.max(0, (nextInv[mId] || 0) - 1);
      });

      const rewardCoins = isVictory ? rival.reward : 0;
      const nextCoins = coins + rewardCoins;
      const nextWins = isVictory ? wins + 1 : wins;
      const savedInv = saveProgress(nextInv, nextCoins, nextWins);

      if (finalCapturedByPlayer.length > 0 || isVictory) {
        playSimpleSe('get', muted);
      }

      // 1枚タイマン勝利時の「ゲットだぜ！」バナー
      if (battleMode === 'single' && isVictory && finalCapturedByPlayer.length > 0) {
        const gotMenko = MENKO_LIST.find((m) => m.id === finalCapturedByPlayer[0]);
        setGetBanner(gotMenko);
      }

      const wasWipedOut = Object.values(nextInv).reduce((s, c) => s + c, 0) === 0;

      setBattleState((prev) => ({
        ...prev,
        turn: 'result',
        message: isVictory
          ? `勝負あり！${finalCapturedByPlayer.length}枚ゲット＆賞金🪙${rewardCoins}！`
          : `試合終了！獲得 ${finalCapturedByPlayer.length}枚 / 奪われ ${finalCapturedByCpu.length}枚`,
        resultSummary: {
          isVictory,
          captured: finalCapturedByPlayer.map((id) => MENKO_LIST.find((m) => m.id === id)).filter(Boolean),
          lost: finalCapturedByCpu.map((id) => MENKO_LIST.find((m) => m.id === id)).filter(Boolean),
          rewardCoins,
          wasWipedOut,
          savedInv,
        },
      }));
    },
    [selectedRivalId, inventory, coins, wins, saveProgress, muted, battleMode]
  );

  // プレイヤーが「叩きつける！」を押した時
  const handlePlayerSlam = () => {
    if (battleState.turn !== 'player' || battleState.playerQueue.length === 0) return;

    const currentMenkoId = battleState.playerQueue[0];
    const menko = MENKO_LIST.find((m) => m.id === currentMenkoId) || MENKO_LIST[0];
    const isCum = battleMode === 'cumulative';

    // ゲージ中央(50)に近いほど精度が高い
    const diffFromCenter = Math.abs(50 - battleState.gaugeVal);
    const accuracy = Math.max(0.1, 1 - diffFromCenter / 50);

    const { rankObj, newlyFlippedMenkos } = executeSlam(
      'player',
      menko,
      battleState.aimX,
      battleState.aimY,
      accuracy,
      isCum
    );

    // 場から裏返った相手メンコを回収し、手札キューへ即追加（現地調達！）
    const flippedIds = newlyFlippedMenkos.map((m) => m.id);
    const remainingAfterUse = isCum ? battleState.playerQueue.slice(1) : [...battleState.playerQueue];
    // 累積バトルでは奪い取ったメンコを即座に自分の手札の末尾へ追加して使える！
    const nextPlayerQueue = isCum ? [...remainingAfterUse, ...flippedIds] : remainingAfterUse;
    const nextCapturedByPlayer = [...battleState.capturedByPlayer, ...flippedIds];

    // 裏返ったメンコを場から取り除く（0.7秒後に回収演出）
    setTimeout(() => {
      piecesRef.current = piecesRef.current.filter((p) => !p.flipped);
    }, 650);

    setBattleState((prev) => ({
      ...prev,
      turn: 'animating',
      playerQueue: nextPlayerQueue,
      capturedByPlayer: nextCapturedByPlayer,
      message:
        flippedIds.length > 0
          ? `${rankObj.text} ${flippedIds.length}枚ひっくり返してゲットだぜ！`
          : `${rankObj.text} 惜しい！まだ返らへん！`,
    }));

    // 1.25秒後の次フェーズ判定
    setTimeout(() => {
      const cpuOnFieldCount = piecesRef.current.filter((p) => p.owner === 'cpu' && !p.flipped).length;

      // ① 1枚タイマンで相手を返したら即勝利！
      if (!isCum && cpuOnFieldCount === 0) {
        concludeMatch(nextCapturedByPlayer, battleState.capturedByCpu, true);
        return;
      }

      // ② 累積バトルで場の相手メンコを取り切った場合
      if (isCum && cpuOnFieldCount === 0) {
        // 相手にまだ控え手札があれば補充、なければ完全勝利
        if (battleState.cpuQueue.length > 0) {
          const nextCpuId = battleState.cpuQueue[0];
          const nextCpuMenko = MENKO_LIST.find((m) => m.id === nextCpuId) || MENKO_LIST[0];
          piecesRef.current.push({
            uid: `cpu_sub_${Date.now()}`,
            menko: nextCpuMenko,
            owner: 'cpu',
            x: 170,
            y: 150,
            vx: 0,
            vy: 0,
            radius: 27,
            angle: 0,
            flipped: false,
            flipProgress: 0,
          });
          setBattleState((prev) => ({ ...prev, cpuQueue: prev.cpuQueue.slice(1) }));
        } else {
          concludeMatch(nextCapturedByPlayer, battleState.capturedByCpu, true);
          return;
        }
      }

      // 累積バトルでお互いの手札が尽きていたら試合終了（持ち帰り精算）
      if (isCum && nextPlayerQueue.length === 0 && battleState.cpuQueue.length === 0) {
        const isWin = nextCapturedByPlayer.length >= battleState.capturedByCpu.length;
        concludeMatch(nextCapturedByPlayer, battleState.capturedByCpu, isWin);
        return;
      }

      // ③ CPUのターンへ移行
      setBattleState((prev) => ({
        ...prev,
        turn: 'cpu',
        message: '相手のターン！情熱の構えに入った…',
      }));

      setTimeout(() => {
        const rival = CPU_RIVALS.find((r) => r.id === selectedRivalId) || CPU_RIVALS[0];
        let cpuAttackMenko = null;
        let nextCpuQueue = [...battleState.cpuQueue];

        if (!isCum) {
          // 1枚タイマン：場にある相手のメンコそのもので打ち返してくる！
          const cpuPiece = piecesRef.current.find((p) => p.owner === 'cpu');
          cpuAttackMenko = cpuPiece ? cpuPiece.menko : MENKO_LIST[0];
          // 1枚タイマン時はプレイヤーのメンコ1枚を場に出してCPUが狙う形にする
          const plyMenko = MENKO_LIST.find((m) => m.id === nextPlayerQueue[0]) || MENKO_LIST[0];
          piecesRef.current.push({
            uid: `ply_target_${Date.now()}`,
            menko: plyMenko,
            owner: 'player',
            x: 170,
            y: 175,
            vx: 0,
            vy: 0,
            radius: 30,
            angle: 0,
            flipped: false,
            flipProgress: 0,
          });
        } else {
          // 累積バトル：CPUが手札から打つ（手札なければ場のメンコで打つ）
          if (nextCpuQueue.length > 0) {
            const cId = nextCpuQueue[0];
            nextCpuQueue = nextCpuQueue.slice(1);
            cpuAttackMenko = MENKO_LIST.find((m) => m.id === cId) || MENKO_LIST[0];
          } else {
            const fallbackId = rival.deck[0];
            cpuAttackMenko = MENKO_LIST.find((m) => m.id === fallbackId) || MENKO_LIST[0];
          }
        }

        const playerTargets = piecesRef.current.filter((p) => p.owner === 'player' && !p.flipped);
        const target =
          playerTargets.length > 0
            ? playerTargets[Math.floor(Math.random() * playerTargets.length)]
            : { x: 170, y: 170 };

        const jitterX = (Math.random() - 0.5) * 32;
        const jitterY = (Math.random() - 0.5) * 32;
        const cpuSlam = executeSlam(
          'cpu',
          cpuAttackMenko,
          target.x + jitterX,
          target.y + jitterY,
          rival.aiAccuracy,
          isCum
        );

        const cpuFlippedIds = cpuSlam.newlyFlippedMenkos.map((m) => m.id);
        const nextCapturedByCpu = [...battleState.capturedByCpu, ...cpuFlippedIds];
        if (isCum && cpuFlippedIds.length > 0) {
          nextCpuQueue = [...nextCpuQueue, ...cpuFlippedIds];
        }

        setTimeout(() => {
          // 1枚タイマン時はCPU攻撃後にプレイヤーの標的メンコを片付ける
          if (!isCum) {
            piecesRef.current = piecesRef.current.filter((p) => p.owner === 'cpu');
          } else {
            piecesRef.current = piecesRef.current.filter((p) => !p.flipped);
          }
        }, 650);

        setBattleState((prev) => ({
          ...prev,
          cpuQueue: nextCpuQueue,
          capturedByCpu: nextCapturedByCpu,
          message:
            cpuFlippedIds.length > 0
              ? `相手の${cpuSlam.rankObj.text} ${cpuFlippedIds.length}枚奪われた！`
              : `相手の${cpuSlam.rankObj.text} 耐えきった！`,
        }));

        setTimeout(() => {
          // 1枚タイマンで自分が返されていたら敗北確定
          if (!isCum && cpuFlippedIds.length > 0) {
            concludeMatch(nextCapturedByPlayer, nextCapturedByCpu, false);
            return;
          }

          // 累積バトルでプレイヤーの手札が尽きたら試合終了（持ち帰り精算）
          if (isCum && nextPlayerQueue.length === 0) {
            const isWin = nextCapturedByPlayer.length >= nextCapturedByCpu.length;
            concludeMatch(nextCapturedByPlayer, nextCapturedByCpu, isWin);
            return;
          }

          setBattleState((prev) => ({
            ...prev,
            turn: 'player',
            message: isCum
              ? `お前のターン！（残り手札 ${nextPlayerQueue.length}枚）`
              : 'お前のターンや！狙いをつけて叩きつけろ！',
          }));
        }, 1100);
      }, 900);
    }, 1250);
  };

  // Canvasアニメーションループ（10段階擬音＆画面シェイク描画込み）
  useEffect(() => {
    if (screen !== 'battle') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const W = canvas.width;
      const H = canvas.height;

      ctx.save();
      // 画面シェイク
      if (shakeRef.current > 0.3) {
        const sx = (Math.random() - 0.5) * shakeRef.current;
        const sy = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(sx, sy);
        shakeRef.current *= 0.84;
      } else {
        shakeRef.current = 0;
      }

      // 背景（昭和の土俵）
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // 土俵サークル
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 128, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 72, 0, Math.PI * 2);
      ctx.stroke();

      // メンコ物理移動＆高精細描画
      piecesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.86;
        p.vy *= 0.86;

        // 場外判定（土俵外で裏返り）
        const distFromCenter = Math.hypot(p.x - W / 2, p.y - H / 2);
        if (distFromCenter > 134 && !p.flipped) {
          p.flipped = true;
          p.flipProgress = 0.05;
        }
        if (p.x < 34) { p.x = 34; p.vx *= -0.5; }
        if (p.x > W - 34) { p.x = W - 34; p.vx *= -0.5; }
        if (p.y < 34) { p.y = 34; p.vy *= -0.5; }
        if (p.y > H - 34) { p.y = H - 34; p.vy *= -0.5; }

        if (p.flipped && p.flipProgress < 1) {
          p.flipProgress = Math.min(1, p.flipProgress + 0.08);
        }

        drawMenkoCanvas(ctx, p);
      });

      // 風圧・衝撃波エフェクト描画
      effectsRef.current = effectsRef.current.filter((ef) => ef.alpha > 0.03);
      effectsRef.current.forEach((ef) => {
        ef.r += (ef.maxR - ef.r) * 0.24;
        ef.alpha *= 0.9;

        ctx.save();
        ctx.strokeStyle =
          ef.lv >= 8 ? `rgba(220, 38, 38, ${ef.alpha})` : `rgba(245, 158, 11, ${ef.alpha})`;
        ctx.lineWidth = ef.lv >= 8 ? 6 : 3.5;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.r, 0, Math.PI * 2);
        ctx.stroke();

        if (ef.rose) {
          ctx.fillStyle = `rgba(225, 29, 72, ${ef.alpha})`;
          for (let i = 0; i < 6; i++) {
            const ang = (i * Math.PI) / 3 + ef.r * 0.05;
            ctx.beginPath();
            ctx.arc(ef.x + Math.cos(ang) * ef.r * 0.82, ef.y + Math.sin(ang) * ef.r * 0.82, 5.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      });

      // 10段階・ドデカ擬音ポップアップ（「バチコーンッ！！」等）
      if (onomatopoeiaRef.current && onomatopoeiaRef.current.alpha > 0.04) {
        const ono = onomatopoeiaRef.current;
        ctx.save();
        ctx.globalAlpha = ono.alpha;
        ctx.translate(W / 2, ono.y);
        ctx.rotate(-0.08);
        const fontSize = Math.round(22 * ono.scale);
        ctx.font = `900 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 6;
        ctx.strokeStyle = ono.stroke;
        ctx.strokeText(ono.text, 0, 0);
        ctx.fillStyle = ono.color;
        ctx.fillText(ono.text, 0, 0);
        ctx.restore();

        ono.y -= 0.45;
        ono.alpha *= 0.955;
      }

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

      ctx.restore();
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
    playSimpleSe('castanet', muted);
    const rand = Math.random();
    let targetRarity = 'N';
    if (rand > 0.94) targetRarity = 'UR';
    else if (rand > 0.78) targetRarity = 'SR';
    else if (rand > 0.48) targetRarity = 'R';

    const pool = MENKO_LIST.filter((m) => m.rarity === targetRarity);
    const picked = pool[Math.floor(Math.random() * pool.length)] || MENKO_LIST[0];
    const prevCount = inventory[picked.id] || 0;
    const nextInv = { ...inventory, [picked.id]: prevCount + 1 };
    const nextCoins = coins - 100;

    saveProgress(nextInv, nextCoins, wins);
    setCoins(nextCoins);
    setGachaResult({ menko: picked, isNew: prevCount === 0, newCount: prevCount + 1 });
    if (targetRarity === 'UR' || targetRarity === 'SR') {
      playSimpleSe('get', muted);
    }
  };

  // LINEシェア
  const shareLine = () => {
    const text = `『情熱のフラ・メンコ』でキモカワ動物メンコを${uniqueOwnedCount}/100種（計${totalOwnedCount}枚）集めたで！オーレ！`;
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://jonetsu-flamenko.vercel.app';
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  const currentRival = CPU_RIVALS.find((r) => r.id === selectedRivalId) || CPU_RIVALS[0];
  const carmenMenko = MENKO_LIST.find((m) => m.id === 10);
  const currentHandMenko =
    battleState.playerQueue.length > 0
      ? MENKO_LIST.find((m) => m.id === battleState.playerQueue[0])
      : null;

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
        {/* 内側メインスクリーン */}
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
                図鑑 {uniqueOwnedCount}/100 ({totalOwnedCount}枚)
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

          {/* ================= ホーム画面 ================= */}
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
                  <MenkoSVG menko={carmenMenko} size={76} />
                </div>
                <div style={{ fontSize: '12px', color: '#431407' }}>
                  <div style={{ fontWeight: '900', color: '#c2410c', marginBottom: '3px' }}>
                    本物の奪い合い！情熱メンコ勝負！
                  </div>
                  勝てば相手のメンコを「ゲットだぜ！」、負ければ奪われる真剣勝負！バチコーンッ！！と叩きつけろ！
                </div>
              </div>

              {/* ルール選択（1枚タイマン vs 累積バトル） */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '900', marginBottom: '5px' }}>⚔️ 対戦ルールを選ぶ</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    onClick={() => setBattleMode('single')}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      textAlign: 'center',
                      backgroundColor: battleMode === 'single' ? '#dc2626' : '#f8fafc',
                      color: battleMode === 'single' ? '#fff' : '#334155',
                      border: battleMode === 'single' ? '2px solid #991b1b' : '2px solid #cbd5e1',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '900' }}>🔥 1枚タイマン</div>
                    <div style={{ fontSize: '10px', opacity: 0.9 }}>相手1枚と一騎打ち！</div>
                  </button>

                  <button
                    disabled={totalOwnedCount <= 1}
                    onClick={() => setBattleMode('cumulative')}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      textAlign: 'center',
                      backgroundColor:
                        totalOwnedCount <= 1
                          ? '#e2e8f0'
                          : battleMode === 'cumulative'
                          ? '#2563eb'
                          : '#f8fafc',
                      color:
                        totalOwnedCount <= 1
                          ? '#94a3b8'
                          : battleMode === 'cumulative'
                          ? '#fff'
                          : '#334155',
                      border: battleMode === 'cumulative' ? '2px solid #1e40af' : '2px solid #cbd5e1',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '900' }}>🎴 累積バトル</div>
                    <div style={{ fontSize: '10px', opacity: 0.9 }}>
                      {totalOwnedCount <= 1 ? '所持2枚以上で解放' : '手札2〜5枚・現地調達！'}
                    </div>
                  </button>
                </div>
              </div>

              {/* CPU対戦相手選択 */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: '900', marginBottom: '5px' }}>👤 対戦相手を選ぶ</div>
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

              {/* 手札選択へ進むボタン */}
              <button
                onClick={openHandSelect}
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
                手札を選んで勝負へ！ ➔
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

          {/* ================= 出撃手札選択画面 ================= */}
          {screen === 'select_hand' && (
            <div style={{ padding: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#991b1b', marginBottom: '4px' }}>
                {battleMode === 'single'
                  ? '🔥 1枚タイマン：勝負に出す1枚を選べ！'
                  : `🎴 累積バトル：手札を2〜${Math.min(5, totalOwnedCount)}枚選べ！`}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                ※負けて裏返されると相手に奪われるで！強いメンコでいくか、温存するかはあんた次第や！
              </div>

              {/* 選択済みスロット */}
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '2px solid #f59e0b',
                  borderRadius: '10px',
                  padding: '8px',
                  marginBottom: '10px',
                  minHeight: '78px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '900', color: '#b45309', marginBottom: '4px' }}>
                  選択中の手札（{selectedHand.length} / {battleMode === 'single' ? 1 : Math.min(5, totalOwnedCount)}枚）※タップで外す
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedHand.length === 0 ? (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>下の所持メンコをタップして選んでな</span>
                  ) : (
                    selectedHand.map((id, idx) => {
                      const m = MENKO_LIST.find((x) => x.id === id) || MENKO_LIST[0];
                      return (
                        <button
                          key={idx}
                          onClick={() => removeFromSelectedHand(idx)}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '2px solid #dc2626',
                            borderRadius: '8px',
                            padding: '4px',
                            textAlign: 'center',
                          }}
                        >
                          <MenkoSVG menko={m} size={44} />
                          <div style={{ fontSize: '9px', fontWeight: '900' }}>{idx + 1}番手</div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 所持メンコ一覧 */}
              <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                {Object.entries(inventory)
                  .filter(([, count]) => count > 0)
                  .map(([idStr, count]) => {
                    const id = Number(idStr);
                    const m = MENKO_LIST.find((x) => x.id === id);
                    if (!m) return null;
                    const pickedCount = selectedHand.filter((x) => x === id).length;
                    const remain = count - pickedCount;
                    return (
                      <button
                        key={id}
                        disabled={remain <= 0}
                        onClick={() => addToSelectedHand(id)}
                        style={{
                          backgroundColor: remain > 0 ? '#ffffff' : '#e2e8f0',
                          border: '2px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '6px 4px',
                          opacity: remain > 0 ? 1 : 0.5,
                        }}
                      >
                        <div style={{ fontSize: '9px', fontWeight: '900', color: '#2563eb' }}>残り ×{remain}</div>
                        <MenkoSVG menko={m} size={48} />
                        <div style={{ fontSize: '10px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.name}
                        </div>
                        <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: '900' }}>
                          攻{m.power} / 重{m.weight}
                        </div>
                      </button>
                    );
                  })}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setScreen('home')}
                  style={{
                    backgroundColor: '#64748b',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '800',
                    padding: '12px',
                    borderRadius: '10px',
                  }}
                >
                  戻る
                </button>
                <button
                  disabled={selectedHand.length < (battleMode === 'single' ? 1 : 2)}
                  onClick={startBattle}
                  style={{
                    flex: 1,
                    backgroundColor:
                      selectedHand.length >= (battleMode === 'single' ? 1 : 2) ? '#dc2626' : '#94a3b8',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: '900',
                    padding: '12px',
                    borderRadius: '10px',
                  }}
                >
                  これで勝負開始！ ➔
                </button>
              </div>
            </div>
          )}

          {/* ================= バトル画面 ================= */}
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
                  marginBottom: '6px',
                }}
              >
                {battleState.message}
              </div>

              {/* 現在の使用メンコ＆戦況ステータス */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#fff7ed',
                  border: '1px solid #fdba74',
                  borderRadius: '8px',
                  padding: '5px 8px',
                  marginBottom: '6px',
                  fontSize: '11px',
                  fontWeight: '800',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentHandMenko && <MenkoSVG menko={currentHandMenko} size={32} />}
                  <span>
                    打つ札: {currentHandMenko ? currentHandMenko.name : 'なし'} (残{battleState.playerQueue.length}枚)
                  </span>
                </div>
                <span style={{ color: '#16a34a' }}>確保: {battleState.capturedByPlayer.length}枚</span>
              </div>

              {/* メンコ土俵Canvas */}
              <div style={{ position: 'relative', textAlign: 'center', marginBottom: '8px' }}>
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={300}
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

                {/* 1枚タイマン勝利時「ゲットだぜ！」オーバーレイ */}
                {getBanner && battleState.turn === 'result' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: '14px',
                      backgroundColor: 'rgba(255, 251, 235, 0.96)',
                      border: '4px solid #dc2626',
                      borderRadius: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px',
                    }}
                  >
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#dc2626', marginBottom: '4px' }}>
                      🎉 ゲットだぜ！ 🎉
                    </div>
                    <MenkoSVG menko={getBanner} size={96} />
                    <div style={{ fontSize: '14px', fontWeight: '900', marginTop: '4px' }}>
                      No.{getBanner.no} {getBanner.name}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#d97706' }}>
                      [{getBanner.rarity}] {getBanner.shape === 'square' ? '角メン' : '丸メン'} を手に入れた！
                    </div>
                  </div>
                )}
              </div>

              {/* パワーゲージ＆アクションボタン */}
              {battleState.turn !== 'result' ? (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '900', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>情熱タイミング（中央の赤芯で「バチコーンッ！！」炸裂）</span>
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
                    <div
                      style={{
                        position: 'absolute',
                        left: '44%',
                        width: '12%',
                        height: '100%',
                        backgroundColor: '#dc2626',
                      }}
                    />
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
                      {battleState.turn === 'player' ? '叩きつける！' : '相手の行動中…'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* 累積バトル・リザルト精算ボックス */}
                  {battleState.resultSummary && (
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '2px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '8px',
                        marginBottom: '8px',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ fontWeight: '900', color: '#16a34a' }}>
                        獲得したメンコ: {battleState.resultSummary.captured.length}枚
                        {battleState.resultSummary.captured.length > 0 &&
                          `（${battleState.resultSummary.captured.map((m) => m.name).join('、')}）`}
                      </div>
                      <div style={{ fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>
                        奪われたメンコ: {battleState.resultSummary.lost.length}枚
                        {battleState.resultSummary.lost.length > 0 &&
                          `（${battleState.resultSummary.lost.map((m) => m.name).join('、')}）`}
                      </div>
                      {battleState.resultSummary.wasWipedOut && (
                        <div style={{ color: '#2563eb', fontWeight: '900', marginTop: '3px' }}>
                          ※所持が0枚になったため、救済でNo.001ぼんやりフラミンゴを1枚拾ったで！
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={openHandSelect}
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
                      手札を選んで再戦！
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
                </div>
              )}
            </div>
          )}

          {/* ================= 駄菓子屋くじガチャ画面 ================= */}
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
                    {gachaResult.isNew
                      ? '✨ NEW！図鑑に初登録！ ✨'
                      : `ゲットだぜ！（現在 ×${gachaResult.newCount}枚所持）`}
                  </div>
                  <MenkoSVG menko={gachaResult.menko} size={115} />
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

          {/* ================= 全100種図鑑画面 ================= */}
          {screen === 'dex' && (
            <div style={{ padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: '900' }}>
                  📖 キモカワ動物図鑑 ({uniqueOwnedCount}/100種)
                </span>
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

              {/* 図鑑グリッド（複数所持数バッジ付き） */}
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {MENKO_LIST.filter((m) => dexFilter === 'all' || m.tribeId === dexFilter).map((m) => {
                  const count = inventory[m.id] || 0;
                  const unlocked = count > 0;
                  return (
                    <button
                      key={m.id}
                      onClick={() => unlocked && setSelectedDexMenko(m)}
                      style={{
                        position: 'relative',
                        backgroundColor: unlocked ? '#fffbeb' : '#f1f5f9',
                        border: unlocked ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '5px 2px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 3px', fontSize: '9px', fontWeight: '900' }}>
                        <span style={{ color: '#64748b' }}>No.{m.no}</span>
                        {unlocked && <span style={{ color: '#dc2626' }}>×{count}</span>}
                      </div>
                      {unlocked ? (
                        <MenkoSVG menko={m} size={48} />
                      ) : (
                        <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#94a3b8' }}>
                          ？
                        </div>
                      )}
                      <div style={{ fontSize: '9px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {unlocked ? m.name : '未所持'}
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
                  <MenkoSVG menko={selectedDexMenko} size={72} />
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ fontWeight: '900', color: '#9a3412' }}>
                      No.{selectedDexMenko.no} {selectedDexMenko.name} [{selectedDexMenko.rarity}]（所持 ×{inventory[selectedDexMenko.id] || 0}）
                    </div>
                    <div>
                      形状: {selectedDexMenko.shape === 'square' ? '角メン' : '丸メン'} / 攻:{selectedDexMenko.power} 重:{selectedDexMenko.weight}
                    </div>
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
                    saveProgress(inventory, next, wins);
                  }}
                  style={{ backgroundColor: '#0284c7', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}
                >
                  +1000コイン
                </button>
                <button
                  onClick={() => {
                    const all = {};
                    MENKO_LIST.forEach((m) => {
                      all[m.id] = 2;
                    });
                    saveProgress(all, coins, wins);
                  }}
                  style={{ backgroundColor: '#059669', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}
                >
                  全100種×2枚解放
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
              <li><b>① 1枚タイマン</b>：相手メンコ1枚との真剣勝負！ひっくり返せば「ゲットだぜ！」で獲得、返されると奪われるで！</li>
              <li><b>② 累積バトル</b>：手札2〜5枚を選んで出撃！途中で裏返した相手メンコは<b>即座に自分の手札に入ってその場で使える</b>！試合終了時に確保分＋残り札をすべて持ち帰り。</li>
              <li><b>③ 10段階の衝撃擬音</b>：ゲージの赤い芯で叩きつけると「バチコーンッ！！」の超衝撃波で重い角メンも一撃で裏返せるで！</li>
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
