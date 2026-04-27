import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [monsterHp, setMonsterHp] = useLocalStorage('qh_monsterHp', 25);
  const [webnovelTickets, setWebnovelTickets] = useLocalStorage('qh_webnovelTickets', 0);
  const [damagePopups, setDamagePopups] = useState([]);
  const [playerDamagePopup, setPlayerDamagePopup] = useState(null);
  const [mysterySafes, setMysterySafes] = useLocalStorage('qh_mysterySafes', 0);
  const [isOpeningSafe, setIsOpeningSafe] = useState(false);
  const [moonMoonCount, setMoonMoonCount] = useLocalStorage('qh_moonMoonCount', 0);
  
  // --- 날짜 연동 관련 ---
  const START_DATE_STR = '2026-04-27';
  const [lastLoginDate, setLastLoginDate] = useLocalStorage('qh_lastLoginDate', '');
  const [streak, setStreak] = useLocalStorage('qh_streak', 0);
  const [dailyCompletedTasks, setDailyCompletedTasks] = useLocalStorage('qh_dailyCompletedTasks', []);
  const [isDailyGoalMet, setIsDailyGoalMet] = useLocalStorage('qh_isDailyGoalMet', false);
  const [showSleepPopup, setShowSleepPopup] = useState(false);
  const [hasLoggedSleep, setHasLoggedSleep] = useLocalStorage('qh_hasLoggedSleep', false);
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
    const today = new Date();
    const startDate = new Date(`${START_DATE_STR}T00:00:00`);
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(diffDays, 56));
  }, []);

  const todaysQuests = useMemo(() => {
    const data = studyData.find(d => d.day === currentDay);
    return data ? data.tasks : [];
  }, [currentDay]);

  const dailyProgress = useMemo(() => {
    if (todaysQuests.length === 0) return 100;
    return Math.floor((dailyCompletedTasks.length / todaysQuests.length) * 100);
  }, [dailyCompletedTasks, todaysQuests]);

  const isDead = hp <= 0;

  // 사망 핸들러 (무한 루프 방지 처리)
  useEffect(() => {
    if (isDead && lastLoginDate !== '') { // 로그인 후 사망 시 발동
      showToast('💀 체력이 0이 되었습니다! 스탯 하락 페널티 발생.', 'warning');
      setAtk(a => Math.max(1, a - 2));
      setInt(i => Math.max(0, i - 2));
      setMaxHp(h => Math.max(10, h - 2));
      setMaxMp(m => Math.max(10, m - 2));
      setTickets(0);
      setMp(0);
      if (activeTab === 'battle' || activeTab === 'rewards') setActiveTab('quests');
    }
  }, [isDead, showToast]);

  // 일일 리셋 및 페널티
  useEffect(() => {
    const todayStr = new Date().toDateString();
    if (lastLoginDate !== todayStr) {
      if (lastLoginDate) {
        if (isDailyGoalMet || todaysQuests.length === 0) {
          const newStreak = streak + 1;
          setStreak(newStreak);
          if (newStreak === 3) showToast('🔥 3일 연속 달성! 크리티컬 보너스!', 'success');
          if (newStreak === 7) {
            showToast('🔥 7일 연속 달성! 올스탯 보너스!', 'success');
            setAtk(a => a + 2); setMaxHp(h => h + 2); setMaxMp(m => m + 2); setInt(i => i + 2);
          }
        } else {
          // 어제 날짜 기준 페널티
          const lastDateObj = new Date(lastLoginDate);
          const startDateObj = new Date(`${START_DATE_STR}T00:00:00`);
          lastDateObj.setHours(0,0,0,0);
          startDateObj.setHours(0,0,0,0);
          const lastDayNum = Math.floor((lastDateObj - startDateObj) / (1000*60*60*24)) + 1;
          const lastDayTasks = studyData.find(d => d.day === lastDayNum)?.tasks.length || 1;
          const lastProgress = dailyCompletedTasks.length / lastDayTasks;
          let hpLoss = lastProgress === 0 ? 40 : lastProgress < 0.5 ? 20 : 10;
          setHp(h => Math.max(0, h - hpLoss));
          showToast(`📉 어제 미달성 페널티: HP -${hpLoss}`, 'warning');
          setStreak(0);
        }
      }
      setLastLoginDate(todayStr);
      setDailyCompletedTasks([]);
      setCompletedCustomQuests([]);
      setIsDailyGoalMet(todaysQuests.length === 0);
      setHasLoggedSleep(false);
      setShowSleepPopup(true);
    } else if (!hasLoggedSleep) {
      setShowSleepPopup(true);
    }
  }, [lastLoginDate, isDailyGoalMet, streak, todaysQuests.length, currentDay, dailyCompletedTasks.length, showToast]);

  const handleCompleteTask = (task) => {
    if (isDead) { showToast('사망 상태입니다. 부활이 먼저입니다!', 'error'); return; }
    if (dailyCompletedTasks.includes(task.id)) return;
    setTickets(t => Number(t) + task.tickets);
    const newCompletedTasks = [...dailyCompletedTasks, task.id];
    setDailyCompletedTasks(newCompletedTasks);
    const todayKey = new Date().toDateString();
    setHistory(prev => ({ ...prev, [todayKey]: Math.floor((newCompletedTasks.length / todaysQuests.length) * 100) }));
    showToast(`${task.title} 완료! 🎫 +${task.tickets}`, 'success');
    if (newCompletedTasks.length === todaysQuests.length) {
      setIsDailyGoalMet(true);
      setTimeout(() => { showToast('🎉 오늘의 학습 완수! (지능 +1)', 'success'); setInt(i => i + 1); }, 1000);
    }
  };

  const handleCompleteCustomQuest = (quest) => {
    if (completedCustomQuests.includes(quest.id)) return;
    if (quest.type === 'atk') setAtk(a => a + quest.amount);
    if (quest.type === 'int') setInt(i => i + quest.amount);
    if (quest.type === 'hp') { setMaxHp(h => h + quest.amount); setHp(h => Math.min(h + quest.amount, maxHp + quest.amount)); }
    if (quest.type === 'mp') { setMaxMp(m => m + quest.amount); setMp(m => Math.min(m + quest.amount, maxMp + quest.amount)); }
    setCompletedCustomQuests(prev => [...prev, quest.id]);
    showToast(`${quest.title} 달성!`, 'success');
  };

  const handleAttack = () => {
    if (isDead) { showToast('체력이 바닥났습니다. 부활하세요!', 'error'); return; }
    if (isAttacking || isDefeated || tickets <= 0 || mp < 5) {
      if (mp < 5) showToast('정신력이 부족합니다!', 'warning');
      else if (tickets <= 0) showToast('공격권이 부족합니다!', 'warning');
      return;
    }
    setIsAttacking(true);
    setTickets(t => t - 1);
    setMp(m => Math.max(0, m - 5));
    const mpModifier = (mp / maxMp) * 100 >= 30 ? 1 : 0.7;
    const isCrit = Math.random() < Math.min((int * 0.02) + (streak >= 3 ? 0.1 : 0), 0.5);
    const damage = Math.max(1, Math.floor(atk * mpModifier * (isCrit ? 1.5 : 1)));
    setMonsterHp(h => Math.max(0, h - damage));
    setIsHit(true);
    setDamagePopups(prev => [...prev, { id: Date.now(), damage, isCrit, x: Math.random()*40-20, y: Math.random()*40-20 }]);
    
    if (Math.random() < 0.15) {
      setTimeout(() => {
        setIsPlayerHit(true);
        setHp(prev => Math.max(0, prev - 10));
        setPlayerDamagePopup('반격 -10');
        setTimeout(() => { setIsPlayerHit(false); setPlayerDamagePopup(null); }, 400);
      }, 200);
    }
    setTimeout(() => {
      setIsHit(false); setIsAttacking(false);
      if (monsterHp - damage <= 0) {
        setIsDefeated(true); setMysterySafes(s => s + 1); showToast('몬스터 처치! 금고 드롭!', 'success');
        setTimeout(() => { setMonsterHp(Math.max(1, Math.floor(atk * 2.5))); setIsDefeated(false); }, 1500);
      }
    }, 400);
  };

  const handleSleepLog = () => {
    if (hasLoggedSleep) return;
    let recoveredMp = sleepHours >= 7 ? maxMp : sleepHours >= 5 ? maxMp * 0.6 : maxMp * 0.3;
    setMp(Math.floor(recoveredMp)); setHasLoggedSleep(true); setShowSleepPopup(false);
    showToast(`${sleepHours}시간 수면! MP 회복 완료`, 'success');
  };

  const handleOpenSafe = () => {
    if (isDead) { showToast('사망 상태에서는 상점을 이용할 수 없습니다.', 'error'); return; }
    if (mysterySafes <= 0 || isOpeningSafe) return;
    setIsOpeningSafe(true);
    setTimeout(() => {
      setMysterySafes(s => s - 1);
      const r = Math.random() * 100;
      if (r < 1) { showToast('⚡ 잭팟! 황금 사과!', 'success'); setWebnovelTickets(t => t + 3); setAtk(a => a + 1); setMaxHp(h => h + 1); setMaxMp(m => m + 1); setInt(i => i + 1); }
      else if (r < 10) { showToast('✨ 영웅 보상! moon moon!', 'success'); setMoonMoonCount(c => c + 1); }
      else if (r < 50) { showToast('💎 희귀 보상! 이용권 1장', 'success'); setWebnovelTickets(t => t + 1); }
      else if (r < 85) { showToast('🪙 일반 보상! 티켓 3장', 'info'); setTickets(t => t + 3); }
      else { showToast('💨 꽝! MP 5 회복', 'warning'); setMp(m => Math.min(m + 5, maxMp)); }
      setIsOpeningSafe(false);
    }, 2000);
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
          <div className="stat-row"><span className="stat-label">HP</span><div className="bar-bg"><div className="bar-fill bar-hp" style={{ width: `${(hp / maxHp) * 100}%` }}></div></div><span className="stat-text">{hp}/{maxHp}</span></div>
          <div className="stat-row"><span className="stat-label">MP</span><div className="bar-bg"><div className="bar-fill bar-mp" style={{ width: `${(mp / maxMp) * 100}%` }}></div></div><span className="stat-text">{mp}/{maxMp}</span></div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'battle' && (
          <div className="battle-area">
            <div className="battle-bg-wrapper"><img src="/battle_bg.png" alt="bg" className="battle-bg-img" /></div>
            <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
              <button onClick={() => setShowFullSchedule(true)} className="use-btn" style={{ padding: '6px 12px', fontSize: '14px' }}>📜 전체 일정 (D-{currentDay})</button>
              <div style={{ background: 'var(--ink-black)', color: 'var(--ivory-white)', padding: '6px 12px', borderRadius: '8px', border: '2px solid var(--ivory-white)', fontFamily: "'Do Hyeon', sans-serif" }}>🎫 {tickets}개</div>
            </div>
            <div className="monster-container">
              <div className="monster-hp-bar"><div className="monster-hp-fill" style={{ width: `${(monsterHp / Math.max(1, atk * 2.5)) * 100}%` }}></div><div className="monster-hp-text">{monsterHp} / {Math.floor(atk * 2.5)}</div></div>
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
                <div style={{ flex: 1 }}><h3 style={{ textDecoration: dailyCompletedTasks.includes(t.id) ? 'line-through' : 'none', fontSize: '15px' }}>{t.title}</h3><p style={{ color: 'var(--crimson-red)', fontWeight: 'bold', fontSize: '12px' }}>보상: 🎫 +{t.tickets}</p></div>
                <button className={`use-btn ${dailyCompletedTasks.includes(t.id) ? 'disabled' : ''}`} onClick={() => handleCompleteTask(t)} disabled={dailyCompletedTasks.includes(t.id) || isDead} style={{ minWidth: '60px' }}>학습</button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '30px' }}>
              <h2 style={{ fontSize: '24px', color: 'var(--ink-black)', margin: 0 }}>📜 부가 퀘스트</h2>
              <button className="use-btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setIsQuestEditMode(!isQuestEditMode)}>{isQuestEditMode ? '✅ 완료' : '✏️ 편집'}</button>
            </div>
            {isDead && <div className="quest-card" style={{ border: '2px solid red', color: 'red', textAlign: 'center' }}><strong>사망 상태입니다! HP 회복 퀘스트로 부활하세요.</strong></div>}
            {customQuests.map(q => (
              <div key={q.id} className="quest-card" style={{ opacity: completedCustomQuests.includes(q.id) ? 0.6 : 1, marginBottom: '10px', display: 'flex' }}>
                <div style={{ flex: 1 }}><h3 style={{ textDecoration: completedCustomQuests.includes(q.id) ? 'line-through' : 'none', fontSize: '15px' }}>{q.title}</h3><p style={{ color: 'var(--indigo-blue)', fontWeight: 'bold', fontSize: '12px' }}>보상: {q.type.toUpperCase()} +{q.amount}</p></div>
                {isQuestEditMode ? <button className="use-btn" style={{ backgroundColor: 'var(--crimson-red)', color: 'white' }} onClick={() => setCustomQuests(prev => prev.filter(x => x.id !== q.id))}>삭제</button> : <button className={`use-btn ${completedCustomQuests.includes(q.id) ? 'disabled' : ''}`} onClick={() => handleCompleteCustomQuest(q)} disabled={completedCustomQuests.includes(q.id)}>달성</button>}
              </div>
            ))}
            {isQuestEditMode && (
              <div className="quest-card" style={{ borderStyle: 'dashed', background: 'rgba(255,255,255,0.5)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>+ 새 퀘스트 추가</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="text" placeholder="퀘스트명" value={newQuestTitle} onChange={e => setNewQuestTitle(e.target.value)} className="quest-input" style={{ width: '100%' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select value={newQuestType} onChange={e => setNewQuestType(e.target.value)} className="quest-input" style={{ flex: 1 }}>
                      <option value="atk">ATK</option><option value="int">INT</option><option value="hp">HP</option><option value="mp">MP</option>
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
            <div className="backup-section">
              <button className="use-btn" onClick={exportData} style={{ width: '100%' }}>📥 데이터 백업 (JSON)</button>
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="rewards-list">
            <h2 style={{ marginBottom: '16px' }}>전리품 상점</h2>
            <div className={`quest-card ${isOpeningSafe ? 'safe-shake' : ''}`} style={{ background: 'var(--ink-black)', border: '3px solid var(--golden-yellow)', display: 'flex', alignItems: 'center', padding: '20px' }}>
              <div style={{ flex: 1 }}><h3 style={{ color: 'var(--golden-yellow)', margin: '0 0 4px 0', fontSize: '20px' }}>🧰 의문의 금고</h3><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>보유:</span><span style={{ background: 'var(--golden-yellow)', color: 'var(--ink-black)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{mysterySafes}개</span></div></div>
              <button className="use-btn" style={{ background: 'var(--golden-yellow)', color: 'var(--ink-black)', minWidth: '90px', height: '50px' }} onClick={handleOpenSafe} disabled={mysterySafes <= 0 || isOpeningSafe || isDead}>열기</button>
            </div>
            <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>보관함</h2>
            <div className="quest-card" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}><div style={{ flex: 1 }}><h3 style={{ margin: '0 0 4px 0' }}>웹소설 이용권</h3><p style={{ margin: 0 }}>보유: {webnovelTickets}개</p></div><button className="use-btn" onClick={() => { if(webnovelTickets > 0) setWebnovelTickets(prev => prev - 1); }} style={{ minWidth: '80px' }}>사용</button></div>
            <div className="quest-card" style={{ background: 'var(--golden-yellow)', border: '2px solid var(--ink-black)', display: 'flex', alignItems: 'center' }}><div style={{ flex: 1 }}><h3 style={{ color: 'var(--ink-black)', margin: 0 }}>🌙 moon moon</h3><p style={{ color: 'rgba(0,0,0,0.6)', margin: '4px 0 0 0', fontSize: '14px' }}>희귀한 전리품</p></div><span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--ink-black)', background: 'rgba(255,255,255,0.3)', padding: '4px 12px', borderRadius: '8px' }}>{moonMoonCount}</span></div>
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
            <div className="calendar-header-row">{['월', '화', '수', '목', '금', '토', '일'].map(d => <div key={d} className="calendar-header-day">{d}</div>)}</div>
            <div className="calendar-grid">
              {Array.from({ length: 56 }).map((_, i) => {
                const dateObj = new Date(new Date(START_DATE_STR).getTime() + i * 24 * 60 * 60 * 1000);
                const dateKey = dateObj.toDateString();
                const achievement = history[dateKey];
                return (
                  <div key={i} className={`calendar-day ${dateKey === new Date().toDateString() ? 'today' : ''} ${dateObj < new Date(new Date().setHours(0,0,0,0)) ? 'past' : ''} ${dateObj > new Date() ? 'future' : ''}`}>
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
          <div className="modal-content">
            <h2>새로운 하루가 밝았습니다! ☀️</h2>
            <div className="input-group center"><input type="number" value={sleepHours} onChange={(e) => setSleepHours(Number(e.target.value))} className="quest-input" /><span>시간</span></div>
            <button className="use-btn mt-2" onClick={handleSleepLog}>기상하기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
