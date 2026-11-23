'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MENKO_LIST, CPU_RIVALS, TRIBES, STORY_CHAPTERS } from './menkoData';
import { MenkoSVG, drawMenkoCanvas } from './graphics';

const STORAGE_KEY = 'jonetsu_flamenko_save_v3';

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
  } catch (e) {}
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
    } else if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.045);
    }
  } catch (e) {}
}

export default function FlamenkoGame() {
  // セーブ状態
  const [inventory, setInventory] = useState({ 1: 1, 11: 1, 21: 1 });
  const [coins, setCoins] = useState(200);
  const [wins, setWins] = useState(0);
  const [clearedStages, setClearedStages] = useState([]);
  const [muted, setMuted] = useState(false);

  // 画面ナビゲーション: 'home' | 'select_hand' | 'turn_decide' | 'battle' | 'gacha' | 'dex'
  const [screen, setScreen] = useState('home');
  const [homeTab, setHomeTab] = useState('story'); // 'story' | 'free'
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [activeStoryStage, setActiveStoryStage] = useState(null); // ストーリー挑戦中のステージオブジェクト

  // フリー対戦設定
  const [selectedRivalId, setSelectedRivalId] = useState(1);
  const [battleMode, setBattleMode] = useState('single'); // 'single' | 'cumulative'
  const [selectedHand, setSelectedHand] = useState([]);

  // 先攻後攻決定ステート
  const [turnDecideType, setTurnDecideType] = useState('rps'); // 'rps'(ジャンケン) | 'coin'(コイントス) | 'roulette'(自動ルーレット)
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteDisplay, setRouletteDisplay] = useState('？');
  const [turnResultBanner, setTurnResultBanner] = useState(null); // { first: 'player'|'cpu', detail: string }

  const [isDebug, setIsDebug] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dexFilter, setDexFilter] = useState('all');
  const [selectedDexMenko, setSelectedDexMenko] = useState(null);
  const [gachaResult, setGachaResult] = useState(null);
  const [getBanner, setGetBanner] = useState(null);

  // Canvas & バトル進行
  const canvasRef = useRef(null);
  const shakeRef = useRef(0);
  const onomatopoeiaRef = useRef(null);
  const piecesRef = useRef([]);
  const effectsRef = useRef([]);
  const intruderSpawnedRef = useRef(false);
  const wobblePhaseRef = useRef(0);
  const animFrameRef = useRef(null);

  const [battleState, setBattleState] = useState({
    turn: 'player', // 'player' | 'animating' | 'cpu' | 'result'
    message: '狙う場所をタップして叩きつけろ！',
    aimX: 170,
    aimY: 155,
    gaugeVal: 50,
    gaugeDir: 1,
    playerQueue: [],
    cpuQueue: [],
    capturedByPlayer: [],
    capturedByCpu: [],
    resultSummary: null,
  });

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
          if (Array.isArray(parsed.clearedStages)) setClearedStages(parsed.clearedStages);
        }
      } catch (e) {}
    }
  }, []);

  // セーブ保存（0枚全滅時1枚救済込み）
  const saveProgress = useCallback((nextInv, nextCoins, nextWins, nextCleared) => {
    const cleaned = {};
    let total = 0;
    Object.entries(nextInv).forEach(([k, v]) => {
      if (v > 0) {
        cleaned[k] = v;
        total += v;
      }
    });
    if (total === 0) {
      cleaned[1] = 1;
    }
    setInventory(cleaned);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          inventory: cleaned,
          coins: nextCoins,
          wins: nextWins,
          clearedStages: nextCleared,
        })
      );
    } catch (e) {}
    return cleaned;
  }, []);

  // ストーリーステージ選択開始
  const startStoryStageSetup = (stage) => {
    setActiveStoryStage(stage);
    setSelectedRivalId(stage.rivalId);
    // 累積ステージでもプレイヤー所持が1枚なら自動調整
    const effectiveMode = stage.mode === 'cumulative' && totalOwnedCount >= 2 ? 'cumulative' : 'single';
    setBattleMode(effectiveMode);
    setSelectedHand([]);
    setScreen('select_hand');
  };

  // フリー対戦手札選択開始
  const startFreeBattleSetup = () => {
    setActiveStoryStage(null);
    const mode = totalOwnedCount <= 1 ? 'single' : battleMode;
    setBattleMode(mode);
    setSelectedHand([]);
    setScreen('select_hand');
  };

  // 手札の選択上限
  const getHandLimit = () => {
    if (battleMode === 'single') return 1;
    if (activeStoryStage && activeStoryStage.handLimit) {
      return Math.min(activeStoryStage.handLimit, totalOwnedCount);
    }
    return Math.min(5, totalOwnedCount);
  };

  const addToSelectedHand = (menkoId) => {
    const maxCount = getHandLimit();
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

  // 先攻・後攻決定画面へ進む
  const proceedToTurnDecide = () => {
    const minReq = battleMode === 'single' ? 1 : 2;
    if (selectedHand.length < minReq) return;
    setTurnResultBanner(null);
    setRouletteSpinning(false);
    setRouletteDisplay('？');
    setScreen('turn_decide');
  };

  // ジャンケン実行（ルーレット回転演出付き）
  const playRpsChoice = (playerChoice) => {
    if (rouletteSpinning) return;
    setRouletteSpinning(true);
    const choices = ['✊ グー', '✌️ チョキ', '🖐 パー'];
    let tick = 0;
    const iv = setInterval(() => {
      playSimpleSe('tick', muted);
      setRouletteDisplay(choices[tick % 3]);
      tick++;
      if (tick > 14) {
        clearInterval(iv);
        const cpuIdx = Math.floor(Math.random() * 3);
        const cpuChoice = choices[cpuIdx];
        setRouletteDisplay(`相手: ${cpuChoice}`);
        setRouletteSpinning(false);

        if (playerChoice === cpuIdx) {
          setTurnResultBanner({ first: null, detail: `あいこや！（自分:${choices[playerChoice]} vs 相手:${cpuChoice}）もう一回！` });
        } else {
          const playerWinsRps =
            (playerChoice === 0 && cpuIdx === 1) ||
            (playerChoice === 1 && cpuIdx === 2) ||
            (playerChoice === 2 && cpuIdx === 0);
          playSimpleSe(playerWinsRps ? 'get' : 'castanet', muted);
          setTurnResultBanner({
            first: playerWinsRps ? 'player' : 'cpu',
            detail: playerWinsRps
              ? `ジャンケン勝利！（${choices[playerChoice]} vs ${cpuChoice}）お前の先攻や！`
              : `ジャンケン負け…（${choices[playerChoice]} vs ${cpuChoice}）相手の先攻から開始！`,
          });
        }
      }
    }, 65);
  };

  // メンコ裏表コイントス実行
  const playCoinChoice = (guessFront) => {
    if (rouletteSpinning) return;
    setRouletteSpinning(true);
    const faces = ['🌞 表（キモカワ顔）', '🔥 裏（情熱ロゴ）'];
    let tick = 0;
    const iv = setInterval(() => {
      playSimpleSe('tick', muted);
      setRouletteDisplay(faces[tick % 2]);
      tick++;
      if (tick > 15) {
        clearInterval(iv);
        const isFront = Math.random() < 0.5;
        setRouletteDisplay(isFront ? faces[0] : faces[1]);
        setRouletteSpinning(false);

        const hit = guessFront === isFront;
        playSimpleSe(hit ? 'get' : 'castanet', muted);
        setTurnResultBanner({
          first: hit ? 'player' : 'cpu',
          detail: hit
            ? `予想的中！${isFront ? '表' : '裏'}が出た！お前の先攻や！`
            : `ハズレ！${isFront ? '表' : '裏'}が出た…相手の先攻や！`,
        });
      }
    }, 65);
  };

  // 自動ルーレット方式実行
  const playAutoRoulette = () => {
    if (rouletteSpinning) return;
    setRouletteSpinning(true);
    const items = ['🔥 あなたの先攻！', '💀 相手の先攻！'];
    let tick = 0;
    const iv = setInterval(() => {
      playSimpleSe('tick', muted);
      setRouletteDisplay(items[tick % 2]);
      tick++;
      if (tick > 18) {
        clearInterval(iv);
        const isPlayerFirst = Math.random() < 0.52;
        setRouletteDisplay(isPlayerFirst ? items[0] : items[1]);
        setRouletteSpinning(false);
        playSimpleSe(isPlayerFirst ? 'get' : 'castanet', muted);
        setTurnResultBanner({
          first: isPlayerFirst ? 'player' : 'cpu',
          detail: isPlayerFirst ? 'ルーレット当選！お前の先攻で勝負開始！' : 'ルーレット結果…相手の先攻からスタート！',
        });
      }
    }, 60);
  };

  // 10段階の打撃ランク算出
  const calcSlamRank = (accuracyRatio, menko) => {
    const rawScore = accuracyRatio * 8 + (menko.power / 100) * 2;
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

      const isHighWind =
        activeStoryStage &&
        (activeStoryStage.gimmick === 'high_wind' || activeStoryStage.gimmick === 'high_wind_intruder');
      const windMult = isHighWind ? 1.45 : 1.0;

      const windRadius =
        (65 + menko.power * 0.5 + rankObj.lv * 5.5) * (1 + menko.skill.bonusWind) * windMult;

      effectsRef.current.push({
        x: targetX,
        y: targetY,
        r: 12,
        maxR: windRadius,
        alpha: 1,
        lv: rankObj.lv,
        rose: menko.rose,
      });

      const newlyFlippedMenkos = [];
      piecesRef.current.forEach((p) => {
        if (p.owner === attackerOwner || p.flipped) return;
        const dx = p.x - targetX;
        const dy = p.y - targetY;
        const dist = Math.hypot(dx, dy);

        if (dist < windRadius) {
          const proximity = 1 - dist / windRadius;
          const attackForce =
            (menko.power * 0.65 + rankObj.lv * 6.5) *
            (1 + menko.skill.bonusWind) *
            windMult *
            (0.45 + proximity);
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
    [muted, activeStoryStage]
  );

  // 試合終了＆リアル精算
  const concludeMatch = useCallback(
    (finalCapturedByPlayer, finalCapturedByCpu, isVictory) => {
      const rival = CPU_RIVALS.find((r) => r.id === selectedRivalId) || CPU_RIVALS[0];
      const nextInv = { ...inventory };

      finalCapturedByPlayer.forEach((mId) => {
        nextInv[mId] = (nextInv[mId] || 0) + 1;
      });
      finalCapturedByCpu.forEach((mId) => {
        nextInv[mId] = Math.max(0, (nextInv[mId] || 0) - 1);
      });

      let rewardCoins = 0;
      let storyBonusMenko = null;
      let nextCleared = [...clearedStages];

      if (isVictory) {
        if (activeStoryStage) {
          rewardCoins = activeStoryStage.rewardCoins;
          const isFirstClear = !clearedStages.includes(activeStoryStage.id);
          if (isFirstClear) {
            nextCleared.push(activeStoryStage.id);
            if (activeStoryStage.bonusMenkoId) {
              const bId = activeStoryStage.bonusMenkoId;
              nextInv[bId] = (nextInv[bId] || 0) + 1;
              storyBonusMenko = MENKO_LIST.find((m) => m.id === bId);
            }
          }
        } else {
          rewardCoins = rival.reward;
        }
      }

      const nextCoins = coins + rewardCoins;
      const nextWins = isVictory ? wins + 1 : wins;
      saveProgress(nextInv, nextCoins, nextWins, nextCleared);
      setClearedStages(nextCleared);

      if (finalCapturedByPlayer.length > 0 || isVictory) {
        playSimpleSe('get', muted);
      }

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
          storyBonusMenko,
          wasWipedOut,
        },
      }));
    },
    [selectedRivalId, inventory, coins, wins, clearedStages, activeStoryStage, saveProgress, muted, battleMode]
  );

  // CPUの1手実行ロジック（後攻スタート時・プレイヤー手番後の両方で呼び出す）
  const runCpuTurn = useCallback(
    (isCum, currentPlayerQueue, currentCpuQueue, currentCapPly, currentCapCpu) => {
      setBattleState((prev) => ({
        ...prev,
        turn: 'cpu',
        message: '相手のターン！情熱の構えに入った…',
      }));

      setTimeout(() => {
        const rival = CPU_RIVALS.find((r) => r.id === selectedRivalId) || CPU_RIVALS[0];
        let cpuAttackMenko = null;
        let nextCpuQueue = [...currentCpuQueue];

        if (!isCum) {
          const cpuPiece = piecesRef.current.find((p) => p.owner === 'cpu');
          cpuAttackMenko = cpuPiece ? cpuPiece.menko : MENKO_LIST[0];
          const plyMenko = MENKO_LIST.find((m) => m.id === currentPlayerQueue[0]) || MENKO_LIST[0];
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
        const nextCapturedByCpu = [...currentCapCpu, ...cpuFlippedIds];
        if (isCum && cpuFlippedIds.length > 0) {
          nextCpuQueue = [...nextCpuQueue, ...cpuFlippedIds];
        }

        setTimeout(() => {
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
          if (!isCum && cpuFlippedIds.length > 0) {
            concludeMatch(currentCapPly, nextCapturedByCpu, false);
            return;
          }
          if (isCum && currentPlayerQueue.length === 0) {
            const isWin = currentCapPly.length >= nextCapturedByCpu.length;
            concludeMatch(currentCapPly, nextCapturedByCpu, isWin);
            return;
          }

          // ストーリー「フラッと乱入」ギミック判定
          if (
            activeStoryStage &&
            !intruderSpawnedRef.current &&
            activeStoryStage.intruderId &&
            (activeStoryStage.gimmick === 'intruder' ||
              activeStoryStage.gimmick === 'wobble_intruder' ||
              activeStoryStage.gimmick === 'high_wind_intruder')
          ) {
            intruderSpawnedRef.current = true;
            const intrMenko = MENKO_LIST.find((m) => m.id === activeStoryStage.intruderId);
            if (intrMenko) {
              piecesRef.current.push({
                uid: `intruder_${Date.now()}`,
                menko: intrMenko,
                owner: 'cpu',
                x: 220,
                y: 120,
                vx: 0,
                vy: 0,
                radius: 28,
                angle: 0.25,
                flipped: false,
                flipProgress: 0,
              });
              playSimpleSe('get', muted);
              setBattleState((prev) => ({
                ...prev,
                turn: 'player',
                message: `⚡野良レア「${intrMenko.name}」がフラッと乱入！返して奪え！`,
              }));
              return;
            }
          }

          setBattleState((prev) => ({
            ...prev,
            turn: 'player',
            message: isCum
              ? `お前のターン！（残り手札 ${currentPlayerQueue.length}枚）`
              : 'お前のターンや！狙いをつけて叩きつけろ！',
          }));
        }, 1100);
      }, 850);
    },
    [selectedRivalId, executeSlam, concludeMatch, activeStoryStage, muted]
  );

  // 先攻後攻確定後にバトル実戦開始
  const launchBattleWithTurn = (firstTurn) => {
    const rival = CPU_RIVALS.find((r) => r.id === selectedRivalId) || CPU_RIVALS[0];
    const initialPieces = [];
    let cpuRemainingQueue = [];
    const enemyPool = activeStoryStage ? activeStoryStage.enemyDeck : rival.deck;

    if (battleMode === 'single') {
      const cpuMenkoId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
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
      const fullEnemyDeck = [...enemyPool, ...rival.deck].slice(0, selectedHand.length);
      const fieldCount = Math.min(3, fullEnemyDeck.length);
      const onField = fullEnemyDeck.slice(0, fieldCount);
      cpuRemainingQueue = fullEnemyDeck.slice(fieldCount);

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
    intruderSpawnedRef.current = false;
    wobblePhaseRef.current = 0;
    setGetBanner(null);

    const initPlayerQ = [...selectedHand];
    setBattleState({
      turn: firstTurn,
      message:
        firstTurn === 'player'
          ? 'お前の先攻！狙いを定めて叩きつけろ！'
          : '相手の先攻！まずは耐え抜け！',
      aimX: 170,
      aimY: 155,
      gaugeVal: 50,
      gaugeDir: 1,
      playerQueue: initPlayerQ,
      cpuQueue: cpuRemainingQueue,
      capturedByPlayer: [],
      capturedByCpu: [],
      resultSummary: null,
    });
    setScreen('battle');

    if (firstTurn === 'cpu') {
      runCpuTurn(battleMode === 'cumulative', initPlayerQ, cpuRemainingQueue, [], []);
    }
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

  // プレイヤーが「叩きつける！」を押した時
  const handlePlayerSlam = () => {
    if (battleState.turn !== 'player' || battleState.playerQueue.length === 0) return;

    const currentMenkoId = battleState.playerQueue[0];
    const menko = MENKO_LIST.find((m) => m.id === currentMenkoId) || MENKO_LIST[0];
    const isCum = battleMode === 'cumulative';

    const diffFromCenter = Math.abs(50 - battleState.gaugeVal);
    const accuracy = Math.max(0.1, 1 - diffFromCenter / 50);

    // フラフラ照準ギミック時は揺れ分を加算した位置へ着弾
    const isWobble =
      activeStoryStage &&
      (activeStoryStage.gimmick === 'wobble' || activeStoryStage.gimmick === 'wobble_intruder');
    const actualAimX = isWobble
      ? Math.max(45, Math.min(295, battleState.aimX + Math.sin(wobblePhaseRef.current) * 32))
      : battleState.aimX;

    const { rankObj, newlyFlippedMenkos } = executeSlam(
      'player',
      menko,
      actualAimX,
      battleState.aimY,
      accuracy,
      isCum
    );

    const flippedIds = newlyFlippedMenkos.map((m) => m.id);
    const remainingAfterUse = isCum ? battleState.playerQueue.slice(1) : [...battleState.playerQueue];
    const nextPlayerQueue = isCum ? [...remainingAfterUse, ...flippedIds] : remainingAfterUse;
    const nextCapturedByPlayer = [...battleState.capturedByPlayer, ...flippedIds];

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

    setTimeout(() => {
      const cpuOnFieldCount = piecesRef.current.filter((p) => p.owner === 'cpu' && !p.flipped).length;

      if (!isCum && cpuOnFieldCount === 0) {
        concludeMatch(nextCapturedByPlayer, battleState.capturedByCpu, true);
        return;
      }

      if (isCum && cpuOnFieldCount === 0) {
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
          const subCpuQ = battleState.cpuQueue.slice(1);
          setBattleState((prev) => ({ ...prev, cpuQueue: subCpuQ }));
          runCpuTurn(isCum, nextPlayerQueue, subCpuQ, nextCapturedByPlayer, battleState.capturedByCpu);
          return;
        } else {
          concludeMatch(nextCapturedByPlayer, battleState.capturedByCpu, true);
          return;
        }
      }

      if (isCum && nextPlayerQueue.length === 0 && battleState.cpuQueue.length === 0) {
        const isWin = nextCapturedByPlayer.length >= battleState.capturedByCpu.length;
        concludeMatch(nextCapturedByPlayer, battleState.capturedByCpu, isWin);
        return;
      }

      runCpuTurn(isCum, nextPlayerQueue, battleState.cpuQueue, nextCapturedByPlayer, battleState.capturedByCpu);
    }, 1250);
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
      wobblePhaseRef.current += 0.08;

      ctx.save();
      if (shakeRef.current > 0.3) {
        const sx = (Math.random() - 0.5) * shakeRef.current;
        const sy = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(sx, sy);
        shakeRef.current *= 0.84;
      } else {
        shakeRef.current = 0;
      }

      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-20, -20, W + 40, H + 40);

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

      piecesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.86;
        p.vy *= 0.86;

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

      if (battleState.turn === 'player') {
        const isWobble =
          activeStoryStage &&
          (activeStoryStage.gimmick === 'wobble' || activeStoryStage.gimmick === 'wobble_intruder');
        const drawX = isWobble
          ? Math.max(45, Math.min(W - 45, battleState.aimX + Math.sin(wobblePhaseRef.current) * 32))
          : battleState.aimX;

        ctx.save();
        ctx.strokeStyle = isWobble ? '#db2777' : '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(drawX, battleState.aimY, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(drawX - 10, battleState.aimY);
        ctx.lineTo(drawX + 10, battleState.aimY);
        ctx.moveTo(drawX, battleState.aimY - 10);
        ctx.lineTo(drawX, battleState.aimY + 10);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [screen, battleState.turn, battleState.aimX, battleState.aimY, activeStoryStage]);

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

  // 駄菓子屋くじガチャ
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

    saveProgress(nextInv, nextCoins, wins, clearedStages);
    setCoins(nextCoins);
    setGachaResult({ menko: picked, isNew: prevCount === 0, newCount: prevCount + 1 });
    if (targetRarity === 'UR' || targetRarity === 'SR') {
      playSimpleSe('get', muted);
    }
  };

  const shareLine = () => {
    const text = `『情熱のフラ・メンコ』でストーリー${clearedStages.length}/15制覇＆図鑑${uniqueOwnedCount}/100種達成！オーレ！`;
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://jonetsu-flamenko.vercel.app';
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  const currentChapterObj = STORY_CHAPTERS.find((c) => c.ch === selectedChapter) || STORY_CHAPTERS[0];
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
            <span>🪙 {coins}</span>
            <span>📖 制覇 {clearedStages.length}/15</span>
            <span>🏆 {wins}勝</span>
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
                  padding: '9px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  <MenkoSVG menko={carmenMenko} size={72} />
                </div>
                <div style={{ fontSize: '11.5px', color: '#431407' }}>
                  <div style={{ fontWeight: '900', color: '#c2410c', marginBottom: '2px' }}>
                    フラッと始まる情熱の奪い合い！
                  </div>
                  ジャンケン＆ルーレットで先攻を奪い、全5章の猛者からキモカワ動物メンコを「ゲットだぜ！」
                </div>
              </div>

              {/* モード切替タブ（ストーリー vs フリー対戦） */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <button
                  onClick={() => setHomeTab('story')}
                  style={{
                    padding: '9px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '900',
                    backgroundColor: homeTab === 'story' ? '#dc2626' : '#f1f5f9',
                    color: homeTab === 'story' ? '#fff' : '#475569',
                    border: homeTab === 'story' ? '2px solid #991b1b' : '2px solid #cbd5e1',
                  }}
                >
                  🗺 全5章ストーリー
                </button>
                <button
                  onClick={() => setHomeTab('free')}
                  style={{
                    padding: '9px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '900',
                    backgroundColor: homeTab === 'free' ? '#2563eb' : '#f1f5f9',
                    color: homeTab === 'free' ? '#fff' : '#475569',
                    border: homeTab === 'free' ? '2px solid #1e40af' : '2px solid #cbd5e1',
                  }}
                >
                  ⚔️ フリー真剣勝負
                </button>
              </div>

              {/* ストーリーモードUI */}
              {homeTab === 'story' ? (
                <div style={{ marginBottom: '10px' }}>
                  {/* 5章アイコンタブ */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    {STORY_CHAPTERS.map((c) => {
                      const chClearedCount = c.stages.filter((s) => clearedStages.includes(s.id)).length;
                      const active = selectedChapter === c.ch;
                      return (
                        <button
                          key={c.ch}
                          onClick={() => setSelectedChapter(c.ch)}
                          style={{
                            padding: '6px 2px',
                            borderRadius: '8px',
                            backgroundColor: active ? '#ea580c' : '#fff7ed',
                            color: active ? '#fff' : '#9a3412',
                            border: active ? '2px solid #9a3412' : '1px solid #fdba74',
                            fontSize: '11px',
                            fontWeight: '900',
                          }}
                        >
                          第{c.ch}章
                          <div style={{ fontSize: '9px', opacity: 0.9 }}>
                            {chClearedCount === 3 ? '👑済' : `${chClearedCount}/3`}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 選択中の章バナー */}
                  <div
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '2px solid #fecaca',
                      borderRadius: '10px',
                      padding: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '900', color: '#991b1b' }}>
                      {currentChapterObj.title}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626' }}>
                      {currentChapterObj.gimmickLabel}
                    </div>
                  </div>

                  {/* 章内3ステージ一覧 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentChapterObj.stages.map((st) => {
                      const isCleared = clearedStages.includes(st.id);
                      const bonusM = MENKO_LIST.find((m) => m.id === st.bonusMenkoId);
                      return (
                        <div
                          key={st.id}
                          style={{
                            backgroundColor: isCleared ? '#f0fdf4' : '#ffffff',
                            border: isCleared ? '2px solid #86efac' : '2px solid #cbd5e1',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: '900', color: '#1e293b' }}>
                              {isCleared ? '✅ ' : '🔥 '}
                              {st.name}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#475569', marginTop: '1px' }}>{st.desc}</div>
                            <div style={{ fontSize: '10px', fontWeight: '800', color: '#d97706', marginTop: '2px' }}>
                              ルール: {st.mode === 'single' ? '1枚タイマン' : `累積(${st.handLimit}枚)`} / 報酬: 🪙{st.rewardCoins}
                              {!isCleared && bonusM ? ` ＋ 初回「${bonusM.name}」` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => startStoryStageSetup(st)}
                            style={{
                              flexShrink: 0,
                              backgroundColor: '#ea580c',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: '900',
                              padding: '9px 12px',
                              borderRadius: '8px',
                              boxShadow: '0 3px 0 #9a3412',
                            }}
                          >
                            挑む！
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* フリー対戦UI */
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '900', marginBottom: '5px' }}>⚔️ ルール選択</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                    <button
                      onClick={() => setBattleMode('single')}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '10px',
                        backgroundColor: battleMode === 'single' ? '#dc2626' : '#f8fafc',
                        color: battleMode === 'single' ? '#fff' : '#334155',
                        border: battleMode === 'single' ? '2px solid #991b1b' : '2px solid #cbd5e1',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '900' }}>🔥 1枚タイマン</div>
                      <div style={{ fontSize: '10px' }}>相手1枚と一騎打ち</div>
                    </button>
                    <button
                      disabled={totalOwnedCount <= 1}
                      onClick={() => setBattleMode('cumulative')}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '10px',
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
                      <div style={{ fontSize: '10px' }}>
                        {totalOwnedCount <= 1 ? '所持2枚以上で解放' : '手札2〜5枚・現地調達'}
                      </div>
                    </button>
                  </div>

                  <div style={{ fontSize: '12px', fontWeight: '900', marginBottom: '5px' }}>👤 対戦相手</div>
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
                          backgroundColor: selectedRivalId === r.id ? '#2563eb' : '#f1f5f9',
                          color: selectedRivalId === r.id ? '#fff' : '#334155',
                          border: selectedRivalId === r.id ? '2px solid #1e40af' : '2px solid #cbd5e1',
                        }}
                      >
                        Lv.{r.id} {r.name.split('・')[0]}
                      </button>
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: '6px',
                      backgroundColor: '#eff6ff',
                      border: '2px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: '900', color: '#1e3a8a' }}>
                      <span>{currentRival.name}</span>
                      <span>賞金: 🪙{currentRival.reward}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#1e40af' }}>{currentRival.desc}</div>
                  </div>

                  <button
                    onClick={startFreeBattleSetup}
                    style={{
                      width: '100%',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: '900',
                      padding: '12px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 0 #1e3a8a',
                    }}
                  >
                    手札を選んでフリー勝負へ！ ➔
                  </button>
                </div>
              )}

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
              <div style={{ fontSize: '15px', fontWeight: '900', color: '#991b1b', marginBottom: '3px' }}>
                {battleMode === 'single'
                  ? '🔥 1枚タイマン：勝負に出す1枚を選べ！'
                  : `🎴 累積バトル：手札を2〜${getHandLimit()}枚選べ！`}
              </div>
              {activeStoryStage && (
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#d97706', marginBottom: '4px' }}>
                  ステージ: {activeStoryStage.name}
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                ※負けて裏返されると相手に奪われるで！よく選んでな！
              </div>

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
                  選択中の手札（{selectedHand.length} / {getHandLimit()}枚）※タップで外す
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
                  onClick={proceedToTurnDecide}
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
                  先攻・後攻を決める！ ➔
                </button>
              </div>
            </div>
          )}

          {/* ================= 先攻・後攻決定画面（選択方式＆ルーレット方式） ================= */}
          {screen === 'turn_decide' && (
            <div style={{ padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626', marginBottom: '4px' }}>
                🎲 先攻・後攻を決めろ！
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px' }}>
                決め方を「選択方式」か「自動ルーレット方式」から選んでな！
              </div>

              {/* 決め方タブ（3種） */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', marginBottom: '12px' }}>
                <button
                  disabled={rouletteSpinning}
                  onClick={() => {
                    setTurnDecideType('rps');
                    setTurnResultBanner(null);
                    setRouletteDisplay('？');
                  }}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '900',
                    backgroundColor: turnDecideType === 'rps' ? '#ea580c' : '#f1f5f9',
                    color: turnDecideType === 'rps' ? '#fff' : '#334155',
                  }}
                >
                  ✊ 選択:ジャンケン
                </button>
                <button
                  disabled={rouletteSpinning}
                  onClick={() => {
                    setTurnDecideType('coin');
                    setTurnResultBanner(null);
                    setRouletteDisplay('？');
                  }}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '900',
                    backgroundColor: turnDecideType === 'coin' ? '#ea580c' : '#f1f5f9',
                    color: turnDecideType === 'coin' ? '#fff' : '#334155',
                  }}
                >
                  🪙 選択:表裏予想
                </button>
                <button
                  disabled={rouletteSpinning}
                  onClick={() => {
                    setTurnDecideType('roulette');
                    setTurnResultBanner(null);
                    setRouletteDisplay('？');
                  }}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '900',
                    backgroundColor: turnDecideType === 'roulette' ? '#ea580c' : '#f1f5f9',
                    color: turnDecideType === 'roulette' ? '#fff' : '#334155',
                  }}
                >
                  🎰 おまかせルーレット
                </button>
              </div>

              {/* ルーレット演出モニター */}
              <div
                style={{
                  backgroundColor: '#1e293b',
                  color: '#fef08a',
                  border: '3px solid #f59e0b',
                  borderRadius: '14px',
                  padding: '20px 10px',
                  marginBottom: '12px',
                  fontSize: '20px',
                  fontWeight: '900',
                }}
              >
                {rouletteDisplay}
              </div>

              {/* 方式ごとの操作ボタン */}
              {(!turnResultBanner || turnResultBanner.first === null) && (
                <div style={{ marginBottom: '12px' }}>
                  {turnDecideType === 'rps' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      <button
                        disabled={rouletteSpinning}
                        onClick={() => playRpsChoice(0)}
                        style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '15px', fontWeight: '900', padding: '12px', borderRadius: '10px' }}
                      >
                        ✊ グー
                      </button>
                      <button
                        disabled={rouletteSpinning}
                        onClick={() => playRpsChoice(1)}
                        style={{ backgroundColor: '#eab308', color: '#422006', fontSize: '15px', fontWeight: '900', padding: '12px', borderRadius: '10px' }}
                      >
                        ✌️ チョキ
                      </button>
                      <button
                        disabled={rouletteSpinning}
                        onClick={() => playRpsChoice(2)}
                        style={{ backgroundColor: '#2563eb', color: '#fff', fontSize: '15px', fontWeight: '900', padding: '12px', borderRadius: '10px' }}
                      >
                        🖐 パー
                      </button>
                    </div>
                  )}

                  {turnDecideType === 'coin' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        disabled={rouletteSpinning}
                        onClick={() => playCoinChoice(true)}
                        style={{ backgroundColor: '#ea580c', color: '#fff', fontSize: '14px', fontWeight: '900', padding: '12px', borderRadius: '10px' }}
                      >
                        🌞 「表」に賭ける！
                      </button>
                      <button
                        disabled={rouletteSpinning}
                        onClick={() => playCoinChoice(false)}
                        style={{ backgroundColor: '#991b1b', color: '#fef08a', fontSize: '14px', fontWeight: '900', padding: '12px', borderRadius: '10px' }}
                      >
                        🔥 「裏」に賭ける！
                      </button>
                    </div>
                  )}

                  {turnDecideType === 'roulette' && (
                    <button
                      disabled={rouletteSpinning}
                      onClick={playAutoRoulette}
                      style={{
                        width: '100%',
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '900',
                        padding: '13px',
                        borderRadius: '10px',
                        boxShadow: '0 4px 0 #7f1d1d',
                      }}
                    >
                      🎰 情熱ルーレットを回す！
                    </button>
                  )}
                </div>
              )}

              {/* 結果バナー＆試合開始ボタン */}
              {turnResultBanner && (
                <div
                  style={{
                    backgroundColor: turnResultBanner.first === 'player' ? '#f0fdf4' : '#fef2f2',
                    border: `2px solid ${turnResultBanner.first === 'player' ? '#22c55e' : '#ef4444'}`,
                    borderRadius: '10px',
                    padding: '10px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>
                    {turnResultBanner.detail}
                  </div>
                  {turnResultBanner.first && (
                    <button
                      onClick={() => launchBattleWithTurn(turnResultBanner.first)}
                      style={{
                        width: '100%',
                        backgroundColor: '#ea580c',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '900',
                        padding: '12px',
                        borderRadius: '10px',
                        boxShadow: '0 4px 0 #9a3412',
                      }}
                    >
                      メンコ勝負スタート！ ➔
                    </button>
                  )}
                </div>
              )}
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

              {battleState.turn !== 'result' ? (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '900', marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>情熱タイミング（赤芯で「バチコーンッ！！」炸裂）</span>
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
                      {battleState.resultSummary.storyBonusMenko && (
                        <div style={{ fontWeight: '900', color: '#d97706', marginTop: '2px' }}>
                          👑 初回クリア特典「{battleState.resultSummary.storyBonusMenko.name}」ゲットだぜ！
                        </div>
                      )}
                      <div style={{ fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>
                        奪われたメンコ: {battleState.resultSummary.lost.length}枚
                        {battleState.resultSummary.lost.length > 0 &&
                          `（${battleState.resultSummary.lost.map((m) => m.name).join('、')}）`}
                      </div>
                      {battleState.resultSummary.wasWipedOut && (
                        <div style={{ color: '#2563eb', fontWeight: '900', marginTop: '3px' }}>
                          ※所持0枚救済でNo.001ぼんやりフラミンゴを1枚拾ったで！
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setScreen('select_hand')}
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
                      もう一度挑む！
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
                    saveProgress(inventory, next, wins, clearedStages);
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
                    saveProgress(all, coins, wins, clearedStages);
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
              <li><b>① 先攻・後攻決定</b>：ジャンケン・表裏予想の「選択方式」か「おまかせルーレット」で先攻を奪え！</li>
              <li><b>② 全5章ストーリー</b>：フラフラ揺れる照準や風圧1.5倍、野良レアの「フラッと乱入」を制して全15ステージ制覇を目指せ！</li>
              <li><b>③ 奪い合い＆現地調達</b>：1枚タイマンは勝てば即「ゲットだぜ！」。累積バトルは途中で奪ったメンコが即手札に入りその場で使えるで！</li>
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
