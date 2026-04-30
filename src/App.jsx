import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { studyData } from './studyData.js';
import './App.css';

// 로컬 스토리지 자동 저장 훅
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function App() {
  const [activeTab, setActiveTab] = useLocalStorage('qh_activeTab', 'battle');
  const [isHit, setIsHit] = useState(false);
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [isDefeated, setIsDefeated] = useState(false);
  
  const showToast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const exportData = () => {
    const data = {};
    Object.keys(localStorage).filter(k => k.startsWith('qh_')).forEach(k => {
      try { data[k] = JSON.parse(localStorage.getItem(k)); } 
      catch { data[k] = localStorage.getItem(k); }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quest_habit_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('데이터 백업 완료');
  };

  // --- Stats ---
  const [atk, setAtk] = useLocalStorage('qh_atk', 10);
  const [maxHp, setMaxHp] = useLocalStorage('qh_maxHp', 100);
  const [maxMp, setMaxMp] = useLocalStorage('qh_maxMp', 100);
  const [int, setInt] = useLocalStorage('qh_int', 10);
  const [hp, setHp] = useLocalStorage('qh_hp', 100);
  const [mp, setMp] = useLocalStorage('qh_mp', 100);
  const [tickets, setTickets] = useLocalStorage('qh_tickets', 0);
  
  // --- Game State ---
  const [monsterMaxHp, setMonsterMaxHp] = useLocalStorage('qh_monsterMaxHp', 25);
  const [monsterHp, setMonsterHp] = useLocalStorage('qh_monsterHp', 25);
  const [webnovelTickets, setWebnovelTickets] = useLocalStorage('qh_webnovelTickets', 0);
  const [damagePopups, setDamagePopups] = useState([]);
  const [playerDamagePopup, setPlayerDamagePopup] = useState(null);
  const [mysterySafes, setMysterySafes] = useLocalStorage('qh_mysterySafes', 0);
  const [statBoxes, setStatBoxes] = useLocalStorage('qh_statBoxes', 0);
  const [isOpeningSafe, setIsOpeningSafe] = useState(false);
  const [isOpeningStatBox, setIsOpeningStatBox] = useState(false);
  const [moonMoonCount, setMoonMoonCount] = useLocalStorage('qh_moonMoonCount', 0);
  const [debtQuests, setDebtQuests] = useLocalStorage('qh_debtQuests', []);
  
  // --- 날짜 연동 관련 ---
  const START_DATE_STR = '2026-04-27';
  const START_DATE = useMemo(() => new Date(`${START_DATE_STR}T00:00:00`), []);
  
  const getLocalDateKey = useCallback((date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [todayKey, setTodayKey] = useState(getLocalDateKey());

  useEffect(() => {
    const timer = setInterval(() => {
      const newKey = getLocalDateKey();
      setTodayKey(prev => prev === newKey ? prev : newKey);
    }, 60000);
    return () => clearInterval(timer);
  }, [getLocalDateKey]);

  const [lastLoginDate, setLastLoginDate] = useLocalStorage('qh_lastLoginDate', '');
  const [processedDate, setProcessedDate] = useLocalStorage('qh_processedDate', '');
  const [streak, setStreak] = useLocalStorage('qh_streak', 0);
  const [dailyCompletedTasks, setDailyCompletedTasks] = useLocalStorage('qh_dailyCompletedTasks', []);
  const [isDailyGoalMet, setIsDailyGoalMet] = useLocalStorage('qh_isDailyGoalMet', false);
  const [showSleepPopup, setShowSleepPopup] = useState(false);
  const [hasLoggedSleep, setHasLoggedSleep] = useLocalStorage('qh_hasLoggedSleep', false);
  const [showStatHelp, setShowStatHelp] = useState(false);
  const [showProbHelp, setShowProbHelp] = useState(false);
  const [showStatProbHelp, setShowStatProbHelp] = useState(false);
  const [sleepHours, setSleepHours] = useState(7);
  const [history, setHistory] = useLocalStorage('qh_history', {});
  const [showCalendar, setShowCalendar] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  const [customQuests, setCustomQuests] = useLocalStorage('qh_customQuests', [
    { id: 1, title: '오늘의 운동', type: 'atk', amount: 1 },
    { id: 2, title: '독서 30분', type: 'int', amount: 1 }
  ]);
  const [completedCustomQuests, setCompletedCustomQuests] = useLocalStorage('qh_completedCustomQuests', []);
  const [isQuestEditMode, setIsQuestEditMode] = useState(false);
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestType, setNewQuestType] = useState('atk');
  const [newQuestAmount, setNewQuestAmount] = useState(1);

  const currentDay = useMemo(() => {
    const today = new Date(`${todayKey}T00:00:00`);
    const startDate = new Date(`${START_DATE_STR}T00:00:00`);
    const diffTime = today - startDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(diffDays, 56));
  }, [todayKey]);

  const todaysQuests = useMemo(() => {
    const data = studyData.find(d => d.day === currentDay);
    return data ? data.tasks : [];
  }, [currentDay]);

  const dailyProgress = useMemo(() => {
    if (todaysQuests.length === 0) return 100;
    return Math.floor((dailyCompletedTasks.length / todaysQuests.length) * 100);
  }, [dailyCompletedTasks, todaysQuests]);

  const isDead = hp <= 0;
  const wasDead = useRef(isDead);
  const popupTimeouts = useRef([]);
  const isOpeningSafeRef = useRef(false);

  useEffect(() => {
    return () => popupTimeouts.current.forEach(clearTimeout);
  }, []);

  // 사망 핸들러 (무한 루프 방지 처리)
  useEffect(() => {
    if (isDead && !wasDead.current && lastLoginDate !== '') { // 로그인 후 사망 진입 시 발동
      showToast('💀 체력이 0이 되었습니다! 스탯 하락 페널티 발생.', 'warning');
      setAtk(a => Math.max(1, a - 2));
      setInt(i => Math.max(0, i - 2));
      setMaxHp(h => Math.max(10, h - 2));
      setMaxMp(m => Math.max(10, m - 2));
      setTickets(0);
      setMp(0);
      if (activeTab === 'battle' || activeTab === 'rewards') setActiveTab('quests');
    }
    wasDead.current = isDead;
  }, [isDead, lastLoginDate, showToast, activeTab, setActiveTab, setAtk, setInt, setMaxHp, setMaxMp, setTickets, setMp]);

  // 일일 리셋 및 페널티
  useEffect(() => {
    if (lastLoginDate === todayKey) return;
    
    // lastLoginDate가 없으면 1일차부터 계산
    const lastLoginDay = lastLoginDate 
      ? Math.round(Math.abs(new Date(lastLoginDate.includes('-') ? `${lastLoginDate}T00:00:00` : lastLoginDate) - START_DATE) / (1000 * 60 * 60 * 24)) + 1
      : 1;

    let totalMissedTasks = [];
    for (let d = lastLoginDay; d < currentDay; d++) {
      const dayData = studyData.find(data => data.day === d);
      const dayQuests = dayData ? dayData.tasks : [];
      if (d === lastLoginDay && lastLoginDate) {
        const missed = dayQuests.filter(task => !dailyCompletedTasks.includes(task.id));
        totalMissedTasks = [...totalMissedTasks, ...missed];
      } else {
        totalMissedTasks = [...totalMissedTasks, ...dayQuests];
      }
    }
    
    if (totalMissedTasks.length > 0) {
      if (lastLoginDate) {
        const hpDamage = Math.min(50, totalMissedTasks.length * 20);
        setHp(prev => Math.max(0, prev - hpDamage));
        setStreak(0);
        showToast(`⚠️ 미완료 퀘스트 ${totalMissedTasks.length}개 이월! HP -${hpDamage}`, 'error');
      } else {
        showToast(`밀린 퀘스트 ${totalMissedTasks.length}개가 이월 퀘스트로 추가되었습니다.`, 'info');
      }
      
      setDebtQuests(prev => {
        const existingIds = prev.map(q => q.id);
        const newDebts = totalMissedTasks.filter(q => !existingIds.includes(q.id));
        return [...prev, ...newDebts];
      });
    } else if (lastLoginDate && currentDay - lastLoginDay === 1) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak === 3) showToast('🔥 3일 연속 All Clear! 크리티컬 상승!', 'success');
      if (newStreak === 7) {
        showToast('🔥 7일 연속 All Clear! 올 스탯 +2!', 'success');
        setAtk(a => a + 2); setMaxHp(h => h + 2); setMaxMp(m => m + 2); setInt(i => i + 2);
      }
    } else {
      setStreak(0);
    }
    
    // --- 일일 스탯 감쇠 (HP -10, ATK -1, INT -1) ---
    if (lastLoginDate !== '') {
      setHp(prev => Math.max(0, prev - 10));
      setAtk(prev => Math.max(1, prev - 1));
      setInt(prev => Math.max(0, prev - 1));
      showToast('🌅 새로운 하루! 기본 스탯이 소량 하락했습니다. (HP -10, ATK -1, INT -1)', 'warning');
    }

    setLastLoginDate(todayKey);
    setDailyCompletedTasks([]);
    setCompletedCustomQuests([]);
    setIsDailyGoalMet(false);
    setHasLoggedSleep(false);
  }, [lastLoginDate, todayKey, currentDay, START_DATE]); // 의존성 배열 최적화

  const handleCompleteTask = (task) => {
    if (isDead) { showToast('사망 상태입니다. 부활이 먼저입니다!', 'error'); return; }
    if (dailyCompletedTasks.includes(task.id)) return;
    setTickets(t => Number(t) + task.tickets);
    const newCompletedTasks = [...dailyCompletedTasks, task.id];
    setDailyCompletedTasks(newCompletedTasks);
    setHistory(prev => ({ ...prev, [todayKey]: Math.floor((newCompletedTasks.length / todaysQuests.length) * 100) }));
    showToast(`${task.title} 완료! 🎫 +${task.tickets}`, 'success');
    if (newCompletedTasks.length === todaysQuests.length) {
      setIsDailyGoalMet(true);
      setTimeout(() => { showToast('🎉 오늘의 학습 완수! (지능 +1)', 'success'); setInt(i => i + 1); }, 1000);
    }
  };

  const handleCompleteCustomQuest = (quest) => {
    if (isDead && quest.type !== 'hp') { showToast('사망 상태입니다. 부활이 먼저입니다!', 'error'); return; }
    if (completedCustomQuests.includes(quest.id)) return;
    if (quest.type === 'atk') setAtk(a => a + quest.amount);
    if (quest.type === 'int') setInt(i => i + quest.amount);
    if (quest.type === 'hp' || quest.type === 'maxHp') { setMaxHp(h => h + quest.amount); setHp(h => h + quest.amount); }
    if (quest.type === 'mp' || quest.type === 'maxMp') { setMaxMp(m => m + quest.amount); setMp(m => m + quest.amount); }
    setCompletedCustomQuests(prev => [...prev, quest.id]);
    showToast(`${quest.title} 달성! (최대 스탯 증가)`, 'success');
  };

  const handleAttack = () => {
    if (isDead) { showToast('체력이 바닥났습니다. 부활하세요!', 'error'); return; }
    if (isAttacking || isDefeated || tickets <= 0 || mp < 4) {
      if (mp < 4) showToast('정신력이 부족합니다! 휴식이 필요해요.', 'warning');
      else if (tickets <= 0) showToast('공격권이 부족합니다! 퀘스트를 완료하세요.', 'warning');
      return;
    }
    setIsAttacking(true);
    setTickets(t => Number(t) - 1);
    const nextMp = Math.max(0, Number(mp) - 4);
    setMp(nextMp);
    
    const mpPercent = (nextMp / maxMp) * 100;
    const mpModifier = mpPercent >= 30 ? 1 : 0.7;
    
    const baseCrit = Math.min(int * 0.02, 0.5);
    const totalCritChance = baseCrit + (streak >= 3 ? 0.1 : 0);
    const isCrit = Math.random() < totalCritChance;
    
    const damage = Math.max(1, Math.floor(atk * mpModifier * (isCrit ? 1.5 : 1)));
    const newMonsterHp = Math.max(0, monsterHp - damage);
    
    setMonsterHp(newMonsterHp);
    setIsHit(true);
    
    const popupId = crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random();
    setDamagePopups(prev => [...prev, { id: popupId, damage, isCrit, x: Math.random()*40-20, y: Math.random()*40-20 }]);
    const tId1 = setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popupId)), 1000);
    popupTimeouts.current.push(tId1);
    
    if (newMonsterHp > 0 && Math.random() < 0.15) {
      const tId2 = setTimeout(() => {
        setIsPlayerHit(true);
        setHp(prev => Math.max(0, prev - 10));
        setPlayerDamagePopup('반격 -10');
        const tId3 = setTimeout(() => { setIsPlayerHit(false); setPlayerDamagePopup(null); }, 400);
        popupTimeouts.current.push(tId3);
      }, 200);
      popupTimeouts.current.push(tId2);
    }
    const tId4 = setTimeout(() => {
      setIsHit(false); setIsAttacking(false);
      if (newMonsterHp <= 0) {
        setIsDefeated(true);
        const dropRoll = Math.random() * 100;
        if (dropRoll < 80) {
          setMysterySafes(s => s + 1);
          showToast('몬스터 처치! 랜덤 박스 드롭!', 'success');
        } else {
          setStatBoxes(b => b + 1);
          showToast('몬스터 처치! 📦 스탯 상자 획득!', 'success');
        }
        const tId5 = setTimeout(() => { 
          const nextMaxHp = Math.max(1, Math.floor(atk * 2.5));
          setMonsterMaxHp(nextMaxHp);
          setMonsterHp(nextMaxHp); 
          setIsDefeated(false); 
        }, 1500);
        popupTimeouts.current.push(tId5);
      }
    }, 400);
    popupTimeouts.current.push(tId4);
  };

  const handleSleepLog = () => {
    if (hasLoggedSleep) return;
    let recoveredRatio = sleepHours >= 7 ? 1 : sleepHours >= 5 ? 0.6 : 0.3;
    let recoveredMp = maxMp * recoveredRatio;
    let recoveredHp = maxHp * recoveredRatio;
    
    setMp(m => Math.min(maxMp, Number(m) + Math.floor(recoveredMp)));
    setHp(h => Math.min(maxHp, Number(h) + Math.floor(recoveredHp)));
    setHasLoggedSleep(true);
    setShowSleepPopup(false);
    showToast(`${sleepHours}시간 수면! HP/MP 회복 완료`, 'success');
  };

  const handleNap = () => {
    setMp(m => Math.min(maxMp, Number(m) + 30));
    setShowSleepPopup(false);
    showToast('💤 낮잠으로 MP 30 회복!', 'success');
  };

  const handleOpenSafe = () => {
    if (isDead) { showToast('사망 상태에서는 상점을 이용할 수 없습니다.', 'error'); return; }
    if (mysterySafes <= 0 || isOpeningSafe) return;
    setIsOpeningSafe(true);
    const tId = setTimeout(() => {
      setMysterySafes(s => s - 1);
      const r = Math.random() * 100;
      if (r < 5) { 
        showToast('⚡ 잭팟! 황금 사과!', 'success'); 
        const nextMaxHp = maxHp + 1;
        setWebnovelTickets(t => t + 3); setAtk(a => a + 1); setMaxMp(m => m + 1); setInt(i => i + 1); 
        setMaxHp(nextMaxHp); setHp(nextMaxHp);
      }
      else if (r < 20) { showToast('✨ 영웅 보상! moon moon!', 'success'); setMoonMoonCount(c => c + 1); }
      else if (r < 70) { showToast('💎 희귀 보상! 이용권 1장', 'success'); setWebnovelTickets(t => t + 1); }
      else if (r < 90) { showToast('🪙 일반 보상! 공격권 3장', 'info'); setTickets(t => t + 3); }
      else { showToast('💨 꽝! MP 5 회복', 'warning'); setMp(m => Math.min(m + 5, maxMp)); }
      setIsOpeningSafe(false);
    }, 2000);
    popupTimeouts.current.push(tId);
  };

  const handleOpenStatBox = () => {
    if (isDead) { showToast('사망 상태에서는 상점을 이용할 수 없습니다.', 'error'); return; }
    if (statBoxes <= 0 || isOpeningStatBox) return;
    setIsOpeningStatBox(true);
    const tId = setTimeout(() => {
      setStatBoxes(b => b - 1);
      const r = Math.random() * 100;
      if (r < 25) { showToast('❤️ 최대 HP +5 증가!', 'success'); setMaxHp(h => h + 5); setHp(h => h + 5); }
      else if (r < 50) { showToast('💙 최대 MP +5 증가!', 'success'); setMaxMp(m => m + 5); setMp(m => m + 5); }
      else if (r < 75) { showToast('🧠 지능(INT) +2 증가!', 'success'); setInt(i => i + 2); }
      else { showToast('⚔️ 공격력(ATK) +3 증가!', 'success'); setAtk(a => a + 3); }
      setIsOpeningStatBox(false);
    }, 2000);
    popupTimeouts.current.push(tId);
  };

  const handleAddCustomQuest = () => {
    if (!newQuestTitle.trim()) { showToast('퀘스트명을 입력해주세요.', 'warning'); return; }
    const newQuest = { id: Date.now(), title: newQuestTitle.trim(), type: newQuestType, amount: newQuestAmount };
    setCustomQuests(prev => [...prev, newQuest]);
    setNewQuestTitle(''); setNewQuestAmount(1); showToast('새 부가 퀘스트 추가 완료');
  };

  return (
    <div className={`mobile-container ${isPlayerHit ? 'violent-shake' : ''} ${isDead ? 'ghost-mode' : ''}`}>
      {isPlayerHit && <div className="player-hit-overlay"></div>}
      {playerDamagePopup && <div className="player-damage-popup">{playerDamagePopup}</div>}
      <div className="flicker-overlay"></div>
      <div className="toast-container">{toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}</div>
      
      <header className="header-bar">
        <h1 className="header-title">QUEST<br/>HABIT</h1>
        <div className="stats-container">
          <div className="stat-row"><span className="stat-label">HP</span><div className="bar-bg"><div className="bar-fill bar-hp" style={{ width: `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%` }}></div></div><span className="stat-text">{hp}/{maxHp}</span></div>
          <div className="stat-row"><span className="stat-label">MP</span><div className="bar-bg"><div className="bar-fill bar-mp" style={{ width: `${Math.max(0, Math.min(100, (mp / maxMp) * 100))}%` }}></div></div><span className="stat-text">{mp}/{maxMp}</span></div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'battle' && (
          <div className="battle-area">
            <div className="battle-bg-wrapper"><img src="/battle_bg.png" alt="bg" className="battle-bg-img" /></div>
            
            <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowFullSchedule(true)} className="use-btn" style={{ padding: '6px 12px', fontSize: '14px' }}>📜 전체 일정</button>
                <button onClick={() => setShowSleepPopup(true)} className="use-btn" style={{ padding: '6px 12px', fontSize: '14px', background: 'var(--indigo-blue)', color: 'white' }}>🛌 휴식</button>
              </div>
              <div style={{ background: 'var(--ink-black)', color: 'var(--ivory-white)', padding: '6px 12px', borderRadius: '8px', border: '2px solid var(--ivory-white)', fontFamily: "'Do Hyeon', sans-serif" }}>🎫 {tickets}개</div>
            </div>
            <div className="monster-container">
              <div className="monster-hp-bar"><div className="monster-hp-fill" style={{ width: `${Math.max(0, Math.min(100, (monsterHp / monsterMaxHp) * 100))}%` }}></div><div className="monster-hp-text">{monsterHp} / {monsterMaxHp}</div></div>
              <img src={isDefeated ? "/monster_dead.png" : "/monster_new.png"} className={`monster-img ${isHit ? 'hit-motion' : ''} ${isDefeated ? 'defeated-ghost' : ''}`} alt="Monster" />
              {damagePopups.map(p => <div key={p.id} className={`damage-popup ${p.isCrit ? 'crit' : ''}`} style={{ '--x': p.x, '--y': p.y }}>-{p.damage}</div>)}
            </div>
            <button className="action-btn" onClick={handleAttack} disabled={isAttacking || isDefeated || isDead}>{isDead ? '사망 상태' : '공격하기!'} <div className="tickets-badge">{tickets}</div></button>
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="quest-list">
            <h2 style={{ fontSize: '24px', color: 'var(--ink-black)' }}>⚔️ 일일 퀘스트 (D+{currentDay})</h2>
            <div className="progress-section" onClick={() => setShowCalendar(true)} style={{ background: 'var(--ink-black)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', marginBottom: '8px', fontFamily: "'Do Hyeon', sans-serif" }}><span>학습 달성률 (캘린더 보기)</span><span>{dailyProgress}%</span></div>
              <div className="bar-bg" style={{ borderColor: 'var(--ivory-white)' }}><div className="bar-fill" style={{ background: 'var(--mint-green)', width: `${dailyProgress}%` }}></div></div>
            </div>
            {todaysQuests.map(t => (
              <div key={t.id} className="quest-card" style={{ background: t.type === 'new' ? 'var(--ivory-white)' : 'var(--card-bg)', opacity: dailyCompletedTasks.includes(t.id) ? 0.6 : 1, marginBottom: '12px', display: 'flex' }}>
                <div style={{ flex: 1 }}><h3 style={{ textDecoration: dailyCompletedTasks.includes(t.id) ? 'line-through' : 'none', fontSize: '17px' }}>{t.title}</h3><p style={{ color: 'var(--crimson-red)', fontWeight: 'bold', fontSize: '12px' }}>보상: 🎫 +{t.tickets}</p></div>
                <button className={`use-btn ${dailyCompletedTasks.includes(t.id) ? 'disabled' : ''}`} onClick={() => handleCompleteTask(t)} disabled={dailyCompletedTasks.includes(t.id) || isDead} style={{ minWidth: '60px' }}>학습</button>
              </div>
            ))}
            {debtQuests.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', color: 'var(--crimson-red)', margin: '0 0 12px 0' }}>💸 밀린 부채 퀘스트</h2>
                {debtQuests.map(q => (
                  <div key={`debt-${q.id}`} className="quest-card" style={{ border: '3px dashed var(--crimson-red)', marginBottom: '10px', display: 'flex' }}>
                    <div style={{ flex: 1 }}><h3 style={{ fontSize: '17px', color: 'var(--crimson-red)', margin: '0 0 4px 0' }}>{q.title}</h3><p style={{ color: 'var(--ink-black)', fontSize: '12px', margin: 0, fontWeight: 'bold' }}>보상: 🎫 +{q.tickets} / HP +10</p></div>
                    <button className="use-btn" style={{ backgroundColor: 'var(--crimson-red)', color: 'white', borderColor: 'var(--crimson-red)' }} onClick={() => {
                      setTickets(t => Number(t) + q.tickets);
                      setHp(h => Math.min(maxHp, h + 10));
                      setDebtQuests(prev => prev.filter(x => x.id !== q.id));
                      showToast(`💸 부채 청산! 🎫 +${q.tickets}, HP +10 회복`, 'success');
                    }}>청산</button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '30px' }}>
              <h2 style={{ fontSize: '24px', color: 'var(--ink-black)', margin: 0 }}>📜 부가 퀘스트</h2>
              <button className="use-btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setIsQuestEditMode(!isQuestEditMode)}>{isQuestEditMode ? '✅ 완료' : '✏️ 편집'}</button>
            </div>
            {isDead && <div className="quest-card" style={{ border: '2px solid red', color: 'red', textAlign: 'center' }}><strong>사망 상태입니다! HP 회복 퀘스트로 부활하세요.</strong></div>}
            {customQuests.map(q => (
              <div key={q.id} className="quest-card" style={{ opacity: completedCustomQuests.includes(q.id) ? 0.6 : 1, marginBottom: '10px', display: 'flex' }}>
                <div style={{ flex: 1 }}><h3 style={{ textDecoration: completedCustomQuests.includes(q.id) ? 'line-through' : 'none', fontSize: '17px' }}>{q.title}</h3><p style={{ color: 'var(--indigo-blue)', fontWeight: 'bold', fontSize: '12px' }}>보상: {q.type.toUpperCase()} +{q.amount}</p></div>
                {isQuestEditMode ? <button className="use-btn" style={{ backgroundColor: 'var(--crimson-red)', color: 'white' }} onClick={() => { setCustomQuests(prev => prev.filter(x => x.id !== q.id)); setCompletedCustomQuests(prev => prev.filter(id => id !== q.id)); }}>삭제</button> : <button className={`use-btn ${completedCustomQuests.includes(q.id) ? 'disabled' : ''}`} onClick={() => handleCompleteCustomQuest(q)} disabled={completedCustomQuests.includes(q.id)}>달성</button>}
              </div>
            ))}
            {isQuestEditMode && (
              <div className="quest-card" style={{ borderStyle: 'dashed', background: 'rgba(255,255,255,0.5)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>+ 새 퀘스트 추가</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="text" placeholder="퀘스트명" value={newQuestTitle} onChange={e => setNewQuestTitle(e.target.value)} className="quest-input" style={{ width: '100%' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select value={newQuestType} onChange={e => setNewQuestType(e.target.value)} className="quest-input" style={{ flex: 1 }}>
                      <option value="atk">ATK</option><option value="int">INT</option><option value="hp">HP 회복</option><option value="mp">MP 회복</option><option value="maxHp">최대 HP</option><option value="maxMp">최대 MP</option>
                    </select>
                    <input type="number" value={newQuestAmount} onChange={e => setNewQuestAmount(Number(e.target.value))} className="quest-input" style={{ width: '50px' }} />
                  </div>
                  <button className="use-btn" style={{ width: '100%' }} onClick={handleAddCustomQuest}>추가하기</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-list">
            <h2>내 스탯</h2>
            <div className="stat-card">
              <div className="stat-grid">
                <div className="stat-box"><span className="stat-title">공격력(ATK)</span><span className="stat-value">{atk}</span></div>
                <div className="stat-box"><span className="stat-title">지능(INT)</span><span className="stat-value">{int}</span></div>
                <div className="stat-box"><span className="stat-title">최대 체력</span><span className="stat-value">{maxHp}</span></div>
                <div className="stat-box"><span className="stat-title">최대 정신력</span><span className="stat-value">{maxMp}</span></div>
              </div>
              <div className="stat-footer">
                <p>연속 All Clear: <strong style={{ color: 'var(--crimson-red)' }}>{streak}일 🔥</strong></p>
                <p>합격 스케줄 진행률: <strong>Day {currentDay} / 56</strong></p>
              </div>
            </div>
            {showStatHelp && (
              <div className="stat-help-box">
                <div className="stat-help-item"><strong>ATK (공격력):</strong> 대미지 계산의 기본 계수입니다.</div>
                <div className="stat-help-item"><strong>INT (지능):</strong> 1당 크리티컬 확률이 2% 상승합니다 (최대 50%).</div>
                <div className="stat-help-item"><strong>HP (체력):</strong> 0이 되면 사망하며 전 스탯 하락 페널티를 받습니다.</div>
                <div className="stat-help-item"><strong>MP (정신력):</strong> 공격 시 4 소모됩니다. 30% 미만 시 대미지가 30% 감소합니다.</div>
              </div>
            )}
            <div className="backup-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="use-btn" onClick={() => setShowStatHelp(!showStatHelp)} style={{ width: '100%', background: 'var(--indigo-blue)', color: 'white' }}>{showStatHelp ? '닫기' : '💡 스탯 설명'}</button>
              <button className="use-btn" onClick={exportData} style={{ width: '100%' }}>📥 데이터 백업 (JSON)</button>
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="rewards-list">
            <h2 style={{ marginBottom: '16px' }}>전리품 상점</h2>
            
            {/* 랜덤 박스 카드 */}
            <div className={`quest-card ${isOpeningSafe ? 'safe-shake' : ''}`} style={{ background: 'var(--ink-black)', border: '3px solid var(--golden-yellow)', display: 'flex', alignItems: 'center', padding: '20px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}><h3 style={{ color: 'var(--golden-yellow)', margin: '0 0 4px 0', fontSize: '20px' }}>🎁 랜덤 박스</h3><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>보유:</span><span style={{ background: 'var(--golden-yellow)', color: 'var(--ink-black)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{mysterySafes}개</span></div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="use-btn" style={{ background: 'var(--golden-yellow)', color: 'var(--ink-black)', minWidth: '90px', height: '40px' }} onClick={handleOpenSafe} disabled={mysterySafes <= 0 || isOpeningSafe || isDead}>열기</button>
                <button className="use-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--golden-yellow)', borderColor: 'var(--golden-yellow)', fontSize: '11px', padding: '2px', height: '26px' }} onClick={() => setShowProbHelp(!showProbHelp)}>{showProbHelp ? '확률 닫기' : '🎲 확률 정보'}</button>
              </div>
            </div>
            {showProbHelp && (
              <div className="prob-help-box" style={{ marginBottom: '12px', marginTop: 0 }}>
                <div style={{ borderBottom: '1px solid var(--golden-yellow)', paddingBottom: '4px', marginBottom: '8px', textAlign: 'center', fontWeight: 'bold', color: 'var(--golden-yellow)', fontSize: '13px' }}>🎁 랜덤 박스 상세 확률</div>
                <div className="prob-help-item"><span>⚡ 잭팟 (황금 사과)</span><span>5%</span></div>
                <div className="prob-help-item"><span>✨ 영웅 (moon moon)</span><span>15%</span></div>
                <div className="prob-help-item"><span>💎 희귀 (이용권 1장)</span><span>50%</span></div>
                <div className="prob-help-item"><span>🪙 일반 (공격권 3장)</span><span>20%</span></div>
                <div className="prob-help-item"><span>💨 꽝 (MP 5 회복)</span><span>10%</span></div>
              </div>
            )}

            {/* 스탯 상자 카드 */}
            <div className={`quest-card ${isOpeningStatBox ? 'safe-shake' : ''}`} style={{ background: 'var(--deep-brown)', border: '3px solid var(--mint-green)', display: 'flex', alignItems: 'center', padding: '20px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}><h3 style={{ color: 'var(--mint-green)', margin: '0 0 4px 0', fontSize: '20px' }}>📦 스탯 상자</h3><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>보유:</span><span style={{ background: 'var(--mint-green)', color: 'var(--deep-brown)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{statBoxes}개</span></div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="use-btn" style={{ background: 'var(--mint-green)', color: 'var(--deep-brown)', minWidth: '90px', height: '40px', borderColor: 'var(--mint-green)' }} onClick={handleOpenStatBox} disabled={statBoxes <= 0 || isOpeningStatBox || isDead}>사용</button>
                <button className="use-btn" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--mint-green)', borderColor: 'var(--mint-green)', fontSize: '11px', padding: '2px', height: '26px' }} onClick={() => setShowStatProbHelp(!showStatProbHelp)}>{showStatProbHelp ? '확률 닫기' : '🎲 확률 정보'}</button>
              </div>
            </div>
            {showStatProbHelp && (
              <div className="prob-help-box" style={{ border: '3px solid var(--mint-green)', marginBottom: '12px', marginTop: 0 }}>
                <div style={{ borderBottom: '1px solid var(--mint-green)', paddingBottom: '4px', marginBottom: '8px', textAlign: 'center', fontWeight: 'bold', color: 'var(--mint-green)', fontSize: '13px' }}>📦 스탯 상자 상세 (균등 확률)</div>
                <div className="prob-help-item" style={{ color: 'var(--ivory-white)' }}><span>❤️ 최대 HP +5</span><span>25%</span></div>
                <div className="prob-help-item" style={{ color: 'var(--ivory-white)' }}><span>💙 최대 MP +5</span><span>25%</span></div>
                <div className="prob-help-item" style={{ color: 'var(--ivory-white)' }}><span>🧠 지능(INT) +2</span><span>25%</span></div>
                <div className="prob-help-item" style={{ color: 'var(--ivory-white)' }}><span>⚔️ 공격력(ATK) +3</span><span>25%</span></div>
              </div>
            )}
            
            <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>보관함</h2>
            
            {/* moon moon 카드 (디자인 통일) */}
            <div className="quest-card" style={{ background: 'var(--golden-yellow)', border: '3px solid var(--ink-black)', display: 'flex', alignItems: 'center', padding: '20px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: 'var(--ink-black)', margin: '0 0 4px 0', fontSize: '20px' }}>🌙 moon moon</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'rgba(0,0,0,0.6)', fontSize: '14px' }}>보유:</span>
                  <span style={{ background: 'var(--ink-black)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{moonMoonCount}개</span>
                </div>
              </div>
              <button 
                className={`use-btn ${moonMoonCount <= 0 ? 'disabled' : ''}`} 
                onClick={() => { if(moonMoonCount > 0) { setMoonMoonCount(prev => prev - 1); showToast('🌙 moon moon을 사용했습니다.', 'info'); } }} 
                style={{ minWidth: '90px', height: '50px', background: 'var(--ink-black)', color: 'var(--golden-yellow)', borderColor: 'var(--ink-black)' }}
                disabled={moonMoonCount <= 0 || isDead}
              >
                사용
              </button>
            </div>
            
            <div className="quest-card" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}><div style={{ flex: 1 }}><h3 style={{ margin: '0 0 4px 0' }}>웹소설 이용권</h3><p style={{ margin: 0 }}>보유: {webnovelTickets}개</p></div><button className="use-btn" onClick={() => { if(webnovelTickets > 0) setWebnovelTickets(prev => prev - 1); }} style={{ minWidth: '80px' }}>사용</button></div>
          </div>
        )}
      </main>

      {showCalendar && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '95%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'sticky', top: 0, background: 'var(--parchment)', zIndex: 10, padding: '5px 0' }}>
              <h2 style={{ margin: 0 }}>📅 학습 캘린더</h2>
              <button className="use-btn" onClick={() => setShowCalendar(false)}>닫기</button>
            </div>
            <div className="calendar-grid">
              {['월', '화', '수', '목', '금', '토', '일'].map(d => (
                <div key={d} className="calendar-header-day">{d}</div>
              ))}
              {Array.from({ length: 56 }).map((_, i) => {
                const dateObj = new Date(new Date(START_DATE_STR).getTime() + i * 24 * 60 * 60 * 1000);
                const y = dateObj.getFullYear();
                const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                const d = String(dateObj.getDate()).padStart(2, '0');
                const dateKey = `${y}-${m}-${d}`;
                const achievement = history[dateKey];
                return (
                  <div key={i} className={`calendar-day ${dateKey === todayKey ? 'today' : ''} ${dateObj < new Date(new Date(`${todayKey}T00:00:00`)) ? 'past' : ''} ${dateObj > new Date(`${todayKey}T00:00:00`) ? 'future' : ''}`}>
                    <span className="calendar-date-num">{dateObj.getDate()}</span>
                    <span className="calendar-day-label">D{i+1}</span>
                    <div className="calendar-day-status">{achievement === 100 ? '🌟' : achievement > 0 ? `${achievement}%` : (dateObj < new Date(new Date().setHours(0,0,0,0)) ? '⚠️' : '')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showFullSchedule && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '95%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'sticky', top: 0, background: 'var(--parchment)', zIndex: 10, padding: '10px 0' }}>
              <h2 style={{ margin: 0 }}>📜 8주 완성 합격 로드맵</h2>
              <button className="use-btn" onClick={() => setShowFullSchedule(false)}>닫기</button>
            </div>
            {Array.from({ length: 8 }).map((_, weekIdx) => (
              <div key={weekIdx} className="schedule-week-group">
                <h3 className="schedule-week-title">{weekIdx + 1}주차 여정</h3>
                {studyData.slice(weekIdx * 7, (weekIdx + 1) * 7).map(day => (
                  <div key={day.day} className={`schedule-day-item ${day.day === currentDay ? 'today' : ''}`}>
                    <div className="schedule-day-header"><span>Day {day.day} ({day.date})</span><span style={{ color: 'var(--crimson-red)' }}>총 🎫 {day.tasks.reduce((sum, t) => sum + t.tickets, 0)}</span></div>
                    {day.tasks.map(task => (
                      <div key={task.id} className={`schedule-task-line ${task.type}`}><span>{task.title}</span><span>+{task.tickets}</span></div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {[ { id: 'battle', label: '전투', icon: '⚔️' }, { id: 'quests', label: '퀘스트', icon: '📜' }, { id: 'stats', label: '스탯', icon: '👤' }, { id: 'rewards', label: '보상', icon: '🎁' } ].map(t => (
          <div key={t.id} className={`nav-item ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}><span className="nav-icon">{t.icon}</span><span className="nav-label">{t.label}</span></div>
        ))}
      </nav>

      {showSleepPopup && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '24px' }}>
            <h2 style={{ marginBottom: '20px' }}>🛌 휴식 및 MP 회복</h2>
            
            <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>💤 낮잠</h3>
              <p style={{ fontSize: '14px', margin: '0 0 10px 0', color: 'var(--warm-brown)' }}>잠깐의 휴식으로 정신을 가다듬습니다.<br/>(MP +30 회복)</p>
              <button className="use-btn" onClick={handleNap} style={{ width: '100%', background: 'var(--golden-yellow)', color: 'var(--ink-black)' }}>낮잠 자기</button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.05)', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>🌙 수면 (일일 1회)</h3>
              <p style={{ fontSize: '14px', margin: '0 0 10px 0', color: 'var(--warm-brown)' }}>어제 수면 시간을 기록하고 기운을 차립니다.<br/>(7시간 이상 시 MP 100% 회복)</p>
              <div className="input-group center" style={{ marginBottom: '10px' }}>
                <input type="number" value={sleepHours} onChange={(e) => setSleepHours(Number(e.target.value))} className="quest-input" />
                <span>시간</span>
              </div>
              <button className={`use-btn ${hasLoggedSleep ? 'disabled' : ''}`} onClick={handleSleepLog} disabled={hasLoggedSleep} style={{ width: '100%' }}>{hasLoggedSleep ? '이미 기록됨' : '수면 완료'}</button>
            </div>

            <button className="use-btn mt-2" onClick={() => setShowSleepPopup(false)} style={{ width: '100%', background: 'var(--dark-parchment)' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
