import { useState, useEffect, useMemo } from 'react';
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
  const [isAttacking, setIsAttacking] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  const showToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

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

  const [atk, setAtk] = useLocalStorage('qh_atk', 10);
  const [maxHp, setMaxHp] = useLocalStorage('qh_maxHp', 100);
  const [maxMp, setMaxMp] = useLocalStorage('qh_maxMp', 100);
  const [int, setInt] = useLocalStorage('qh_int', 0);
  const [hp, setHp] = useLocalStorage('qh_hp', 100);
  const [mp, setMp] = useLocalStorage('qh_mp', 100);
  const [tickets, setTickets] = useLocalStorage('qh_tickets', 0);
  
  const [monsterHp, setMonsterHp] = useLocalStorage('qh_monsterHp', 25);
  const [webnovelTickets, setWebnovelTickets] = useLocalStorage('qh_webnovelTickets', 0);
  const [damagePopups, setDamagePopups] = useState([]);
  const [isDefeated, setIsDefeated] = useState(false);
  const [mysterySafes, setMysterySafes] = useLocalStorage('qh_mysterySafes', 0);
  const [isOpeningSafe, setIsOpeningSafe] = useState(false);
  const [moonMoonCount, setMoonMoonCount] = useLocalStorage('qh_moonMoonCount', 0);
  
  // 날짜 연동 관련 상태
  const START_DATE_STR = '2026-04-27';
  const [lastLoginDate, setLastLoginDate] = useLocalStorage('qh_lastLoginDate', '');
  const [streak, setStreak] = useLocalStorage('qh_streak', 0);
  const [dailyCompletedTasks, setDailyCompletedTasks] = useLocalStorage('qh_dailyCompletedTasks', []);
  const [isDailyGoalMet, setIsDailyGoalMet] = useLocalStorage('qh_isDailyGoalMet', false);
  const [showSleepPopup, setShowSleepPopup] = useState(false);
  const [hasLoggedSleep, setHasLoggedSleep] = useLocalStorage('qh_hasLoggedSleep', false);
  const [sleepHours, setSleepHours] = useState(7);
  
  // --- 추가된 상태: 캘린더 히스토리 ---
  const [history, setHistory] = useLocalStorage('qh_history', {}); // { "2026-04-27": 100, ... }
  const [showCalendar, setShowCalendar] = useState(false);

  // --- 부가 퀘스트 상태 ---
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
    if (diffDays < 1) return 1;
    return Math.min(diffDays, 56);
  }, []);

  const todaysQuests = useMemo(() => {
    const data = studyData.find(d => d.day === currentDay);
    return data ? data.tasks : [];
  }, [currentDay]);

  const dailyProgress = useMemo(() => {
    if (todaysQuests.length === 0) return 100;
    return Math.floor((dailyCompletedTasks.length / todaysQuests.length) * 100);
  }, [dailyCompletedTasks, todaysQuests]);

  useEffect(() => {
    const todayStr = new Date().toDateString();
    if (lastLoginDate !== todayStr) {
      if (lastLoginDate) {
        if (isDailyGoalMet || todaysQuests.length === 0) {
          const newStreak = streak + 1;
          setStreak(newStreak);
          if (newStreak === 3) showToast('🔥 3일 연속 All Clear! 크리티컬 보너스!', 'success');
          if (newStreak === 7) {
            showToast('🔥 7일 연속 All Clear! 스탯 보너스 획득!', 'success');
            setAtk(a => a + 2); setMaxHp(h => h + 2); setMaxMp(m => m + 2); setInt(i => i + 2);
          }
        } else {
          if (streak > 0) showToast('어제 퀘스트를 모두 깨지 못해 Streak 초기화 😢', 'warning');
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
  }, [lastLoginDate, isDailyGoalMet, streak, todaysQuests.length]);

  const handleCompleteTask = (task) => {
    if (dailyCompletedTasks.includes(task.id)) return;
    setTickets(t => Number(t) + task.tickets);
    const newCompletedTasks = [...dailyCompletedTasks, task.id];
    setDailyCompletedTasks(newCompletedTasks);
    
    // 히스토리 업데이트
    const todayKey = new Date().toDateString();
    const progress = Math.floor((newCompletedTasks.length / todaysQuests.length) * 100);
    setHistory(prev => ({ ...prev, [todayKey]: progress }));

    showToast(`${task.title} 완료! 🎫 +${task.tickets}`, 'success');

    if (newCompletedTasks.length === todaysQuests.length) {
      setIsDailyGoalMet(true);
      setTimeout(() => {
        showToast('🎉 오늘의 퀘스트 ALL CLEAR! (지능 +1)', 'success');
        setInt(i => i + 1);
      }, 1000);
    }
  };

  const handleAddCustomQuest = () => {
    if (!newQuestTitle.trim()) {
      showToast('퀘스트 이름을 입력해주세요.', 'warning');
      return;
    }
    const newQuest = { id: Date.now(), title: newQuestTitle.trim(), type: newQuestType, amount: newQuestAmount };
    setCustomQuests(prev => [...prev, newQuest]);
    setNewQuestTitle('');
    setNewQuestAmount(1);
    showToast('새 부가 퀘스트가 추가되었습니다.');
  };

  const handleCompleteCustomQuest = (quest) => {
    if (completedCustomQuests.includes(quest.id)) return;
    if (quest.type === 'atk') setAtk(a => a + quest.amount);
    if (quest.type === 'int') setInt(i => i + quest.amount);
    if (quest.type === 'hp') {
      setMaxHp(h => h + quest.amount);
      setHp(h => Math.min(h + quest.amount, maxHp + quest.amount));
    }
    if (quest.type === 'mp') {
      setMaxMp(m => m + quest.amount);
      setMp(m => Math.min(m + quest.amount, maxMp + quest.amount));
    }
    setCompletedCustomQuests(prev => [...prev, quest.id]);
    showToast(`${quest.title} 달성! 보상을 획득했습니다.`, 'success');
  };

  const handleSleepLog = () => {
    if (hasLoggedSleep) return;
    let recoveredMp = sleepHours >= 7 ? maxMp : sleepHours >= 5 ? Math.floor(maxMp * 0.6) : Math.floor(maxMp * 0.3);
    setMp(recoveredMp);
    setHasLoggedSleep(true);
    showToast(`${sleepHours}시간 수면! MP 회복 완료.`, 'success');
    setShowSleepPopup(false);
  };

  const triggerDamagePopup = (damage, isCrit) => {
    const id = Date.now();
    const x = Math.floor(Math.random() * 60) - 30;
    const y = Math.floor(Math.random() * 40) - 20;
    setDamagePopups(prev => [...prev, { id, damage, isCrit, x, y }]);
    setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== id)), 1000);
  };

  const handleAttack = () => {
    if (isAttacking || isDefeated || tickets <= 0 || mp < 10) {
      if (isDefeated) showToast('몬스터가 재생성되는 중입니다.', 'info');
      if (tickets <= 0) showToast('공격권이 부족합니다! 퀘스트를 완료하세요.', 'warning');
      if (mp < 10) showToast('정신력이 부족합니다! 휴식이 필요해요.', 'warning');
      return;
    }
    setIsAttacking(true);
    setTickets(t => Number(t) - 1);
    setMp(m => Math.max(0, Number(m) - 10));
    const mpPercent = (mp / maxMp) * 100;
    let mpModifier = mpPercent > 80 ? 1 : mpPercent > 40 ? 0.7 : 0.3;
    const baseCrit = Math.min(int * 0.02, 0.5);
    const totalCritChance = baseCrit + (streak >= 3 ? 0.1 : 0);
    const isCrit = Math.random() < totalCritChance;
    const damage = Math.max(1, Math.floor(atk * mpModifier * (isCrit ? 1.5 : 1)));
    const newMonsterHp = Math.max(0, monsterHp - damage);
    setMonsterHp(newMonsterHp);
    setIsHit(true);
    triggerDamagePopup(damage, isCrit);
    setTimeout(() => {
      setIsHit(false);
      setIsAttacking(false);
      if (newMonsterHp <= 0) {
        setIsDefeated(true);
        setMysterySafes(prev => prev + 1);
        showToast('몬스터 처치! 🧰 [의문의 금고] 드롭!', 'success');
        setTimeout(() => {
          setMonsterHp(Math.max(1, Math.floor(atk * 2.5)));
          setIsDefeated(false);
        }, 1500);
      }
    }, 400);
  };

  const handleOpenSafe = () => {
    if (mysterySafes <= 0 || isOpeningSafe) return;
    setIsOpeningSafe(true);
    setTimeout(() => {
      setMysterySafes(prev => prev - 1);
      const rand = Math.random() * 100;
      if (rand < 1) { 
        showToast('⚡ 잭팟!! [황금 사과] 획득!', 'success');
        setWebnovelTickets(prev => prev + 3);
        setAtk(a => a + 1); setMaxHp(h => h + 1); setMaxMp(m => m + 1); setInt(i => i + 1);
      } else if (rand < 10) { 
        showToast('✨ 영웅 보상! 🌙 [moon moon] 획득!', 'success');
        setMoonMoonCount(prev => prev + 1);
      } else if (rand < 50) { 
        showToast('💎 희귀 보상! 웹소설 이용권 1장 획득!', 'success');
        setWebnovelTickets(prev => prev + 1);
      } else if (rand < 85) { 
        showToast('🪙 일반 보상! 공격권 3장 반환!', 'info');
        setTickets(prev => prev + 3);
      } else { 
        showToast('💨 꽝... 녹슨 톱니바퀴 (MP 5 회복)', 'warning');
        setMp(m => Math.min(m + 5, maxMp));
      }
      setIsOpeningSafe(false);
    }, 2000);
  };

  return (
    <div className="mobile-container">
      {/* 캘린더 관련 추가 스타일 */}
      <style>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-top: 16px;
        }
        .calendar-day {
          aspect-ratio: 1;
          border: 2px solid var(--ink-black);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Do Hyeon', sans-serif;
          font-size: 10px;
          background: var(--ivory-white);
          position: relative;
        }
        .calendar-day.past { background: #e0e0e0; }
        .calendar-day.today { border-color: var(--crimson-red); border-width: 3px; }
        .calendar-day.future { opacity: 0.4; }
        .day-label { font-size: 8px; color: var(--warm-brown); margin-bottom: 2px; }
        .day-status { font-size: 14px; }
        .day-percent { font-size: 9px; font-weight: bold; }
        
        .progress-section {
          cursor: pointer;
          transition: transform 0.1s;
        }
        .progress-section:active { transform: scale(0.98); }
      `}</style>

      <div className="flicker-overlay"></div>
      <div className="toast-container">
        {toasts.map(toast => <div key={toast.id} className={`toast toast-${toast.type}`}>{toast.msg}</div>)}
      </div>

      <header className="header-bar">
        <h1 className="header-title">QUEST<br/>HABIT</h1>
        <div className="stats-container">
          <div className="stat-row">
            <span className="stat-label">HP</span>
            <div className="bar-bg">
              <div className="bar-fill bar-hp" style={{ width: `${(hp / maxHp) * 100}%` }}></div>
            </div>
            <span className="stat-text">{hp}/{maxHp}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">MP</span>
            <div className="bar-bg">
              <div className="bar-fill bar-mp" style={{ width: `${(mp / maxMp) * 100}%` }}></div>
            </div>
            <span className="stat-text">{mp}/{maxMp}</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'battle' && (
          <div className="battle-area">
            <div className="battle-bg-wrapper"><img src="/battle_bg.png" alt="Battle" className="battle-bg-img" /></div>
            <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
              <div style={{ background: 'var(--ink-black)', color: 'var(--golden-yellow)', padding: '6px 12px', borderRadius: '8px', border: '2px solid var(--ivory-white)', fontFamily: "'Do Hyeon', sans-serif" }}>Day {currentDay}</div>
              <div style={{ background: 'var(--ink-black)', color: 'var(--ivory-white)', padding: '6px 12px', borderRadius: '8px', border: '2px solid var(--ivory-white)', fontFamily: "'Do Hyeon', sans-serif" }}>공격권: {tickets}개</div>
            </div>
            <div className="monster-container">
              <div className="monster-hp-bar">
                <div className="monster-hp-fill" style={{ width: `${(monsterHp / Math.max(1, Math.floor(atk * 2.5))) * 100}%` }}></div>
                <div className="monster-hp-text">{monsterHp} / {Math.max(1, Math.floor(atk * 2.5))}</div>
              </div>
              <img src={isDefeated ? "/monster_dead.png" : "/monster_new.png"} className={`monster-img ${isHit ? 'hit-motion' : ''} ${isDefeated ? 'defeated-ghost' : ''}`} alt="Monster" />
              {damagePopups.map(popup => <div key={popup.id} className={`damage-popup ${popup.isCrit ? 'crit' : ''}`} style={{ '--x': popup.x, '--y': popup.y }}>-{popup.damage}</div>)}
            </div>
            <button className="action-btn" onClick={handleAttack} disabled={isAttacking || isDefeated}>공격하기! <div className="tickets-badge">{tickets}</div></button>
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="quest-list">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '24px', color: 'var(--ink-black)' }}>⚔️ 일일 퀘스트 (D+{currentDay})</h2>
            </div>
            
            {/* 달성률 바 - 클릭 시 캘린더 팝업 */}
            <div className="progress-section" onClick={() => setShowCalendar(true)} style={{ background: 'var(--ink-black)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', marginBottom: '8px', fontFamily: "'Do Hyeon', sans-serif" }}>
                <span>학습 달성률 (클릭하여 캘린더 보기)</span>
                <span>{dailyProgress}%</span>
              </div>
              <div className="bar-bg" style={{ borderColor: 'var(--ivory-white)' }}>
                <div className="bar-fill" style={{ background: 'var(--mint-green)', width: `${dailyProgress}%` }}></div>
              </div>
              {isDailyGoalMet && <p style={{ color: 'var(--golden-yellow)', margin: '8px 0 0 0', textAlign: 'center', fontSize: '14px', fontFamily: "'Do Hyeon', sans-serif" }}>🎉 오늘 학습 완료! 지능(INT) 상승!</p>}
            </div>

            {todaysQuests.length > 0 ? (
              todaysQuests.map(task => {
                const isDone = dailyCompletedTasks.includes(task.id);
                return (
                  <div key={task.id} className="quest-card" style={{ background: task.type === 'new' ? 'var(--ivory-white)' : 'var(--card-bg)', opacity: isDone ? 0.6 : 1, marginBottom: '12px', display: 'flex' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ textDecoration: isDone ? 'line-through' : 'none', fontSize: '15px' }}>{task.title}</h3>
                      <p style={{ color: 'var(--crimson-red)', fontWeight: 'bold', fontSize: '12px' }}>보상: 🎫 +{task.tickets}</p>
                    </div>
                    <button className={`use-btn ${isDone ? 'disabled' : ''}`} onClick={() => handleCompleteTask(task)} disabled={isDone} style={{ minWidth: '60px' }}>{isDone ? '완료' : '학습'}</button>
                  </div>
                );
              })
            ) : (
              <div className="quest-card" style={{ textAlign: 'center', padding: '20px' }}><p>오늘은 계획된 학습 일정이 없습니다.</p></div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '30px' }}>
              <h2 style={{ fontSize: '24px', color: 'var(--ink-black)', margin: 0 }}>📜 부가 퀘스트</h2>
              <button className="use-btn" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setIsQuestEditMode(!isQuestEditMode)}>
                {isQuestEditMode ? '✅ 완료' : '✏️ 편집'}
              </button>
            </div>

            {customQuests.map(q => {
              const isDone = completedCustomQuests.includes(q.id);
              return (
                <div key={q.id} className="quest-card" style={{ opacity: isDone ? 0.6 : 1, marginBottom: '10px', display: 'flex' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ textDecoration: isDone ? 'line-through' : 'none', fontSize: '15px' }}>{q.title}</h3>
                    <p style={{ color: 'var(--indigo-blue)', fontWeight: 'bold', fontSize: '12px' }}>보상: {q.type.toUpperCase()} +{q.amount}</p>
                  </div>
                  {isQuestEditMode ? (
                    <button className="use-btn" style={{ backgroundColor: 'var(--crimson-red)', color: 'white', minWidth: '60px' }} onClick={() => setCustomQuests(prev => prev.filter(x => x.id !== q.id))}>삭제</button>
                  ) : (
                    <button className={`use-btn ${isDone ? 'disabled' : ''}`} onClick={() => handleCompleteCustomQuest(q)} disabled={isDone} style={{ minWidth: '60px' }}>{isDone ? '완료' : '달성'}</button>
                  )}
                </div>
              );
            })}

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
                <p>스케줄 진행도: <strong>Day {currentDay} / 56</strong></p>
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
              <div style={{ flex: 1 }}>
                <h3 style={{ color: 'var(--golden-yellow)', margin: '0 0 4px 0', fontSize: '20px' }}>🧰 의문의 금고</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>보유 수량:</span>
                  <span style={{ background: 'var(--golden-yellow)', color: 'var(--ink-black)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{mysterySafes}개</span>
                </div>
              </div>
              <button className={`use-btn ${mysterySafes > 0 && !isOpeningSafe ? '' : 'disabled'}`} style={{ background: 'var(--golden-yellow)', color: 'var(--ink-black)', minWidth: '90px', height: '50px' }} onClick={handleOpenSafe} disabled={mysterySafes <= 0 || isOpeningSafe}>
                {isOpeningSafe ? '해제중' : '열기'}
              </button>
            </div>
            <h2 style={{ marginTop: '32px', marginBottom: '16px' }}>보관함</h2>
            <div className="quest-card" style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0' }}>웹소설 이용권</h3>
                <p style={{ margin: 0 }}>보유: {webnovelTickets}개</p>
              </div>
              <button className={`use-btn ${webnovelTickets > 0 ? '' : 'disabled'}`} onClick={() => { if(webnovelTickets > 0) setWebnovelTickets(prev => prev - 1); }} style={{ minWidth: '80px' }}>사용</button>
            </div>
            <div className="quest-card" style={{ background: 'var(--golden-yellow)', border: '2px solid var(--ink-black)', display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1 }}><h3 style={{ color: 'var(--ink-black)', margin: 0 }}>🌙 moon moon</h3><p style={{ color: 'rgba(0,0,0,0.6)', margin: '4px 0 0 0', fontSize: '14px' }}>희귀한 전리품</p></div>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--ink-black)', background: 'rgba(255,255,255,0.3)', padding: '4px 12px', borderRadius: '8px' }}>{moonMoonCount}</span>
            </div>
          </div>
        )}
      </main>

      {/* 캘린더 모달 */}
      {showCalendar && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>📅 학습 캘린더</h2>
              <button className="use-btn" style={{ padding: '4px 12px' }} onClick={() => setShowCalendar(false)}>닫기</button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--warm-brown)', marginBottom: '12px' }}>56일간의 합격 여정 현황입니다.</p>
            
            <div className="calendar-grid">
              {Array.from({ length: 56 }).map((_, i) => {
                const dayNum = i + 1;
                const date = new Date(new Date(START_DATE_STR).getTime() + i * 24 * 60 * 60 * 1000);
                const dateKey = date.toDateString();
                const achievement = history[dateKey];
                const isToday = dateKey === new Date().toDateString();
                const isPast = date < new Date(new Date().setHours(0,0,0,0));
                const isFuture = date > new Date();

                let statusColor = 'inherit';
                if (achievement === 100) statusColor = 'var(--mint-green)';
                else if (achievement > 0) statusColor = 'var(--golden-yellow)';
                else if (isPast) statusColor = 'var(--crimson-red)';

                return (
                  <div key={dayNum} className={`calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}>
                    <span className="day-label">Day {dayNum}</span>
                    <div className="day-status" style={{ color: statusColor }}>
                      {achievement === 100 ? '🌟' : (achievement > 0 ? `${achievement}%` : (isPast ? '⚠️' : ''))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {[
          { id: 'battle', label: '전투', icon: '⚔️' },
          { id: 'quests', label: '퀘스트', icon: '📜' },
          { id: 'stats', label: '스탯', icon: '👤' },
          { id: 'rewards', label: '보상', icon: '🎁' }
        ].map(t => (
          <div key={t.id} className={`nav-item ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </div>
        ))}
      </nav>

      {showSleepPopup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>새로운 하루가 밝았습니다! ☀️</h2>
            <p>어제 밤 수면 시간을 기록하여 정신력(MP)을 회복하세요.</p>
            <div className="input-group center">
              <input type="number" value={sleepHours} onChange={(e) => setSleepHours(Number(e.target.value))} className="quest-input" />
              <span>시간</span>
            </div>
            <button className="use-btn mt-2" onClick={handleSleepLog}>기상하기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
