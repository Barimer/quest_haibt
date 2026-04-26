import { useState, useEffect } from 'react';
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
    Object.keys(localStorage)
      .filter(k => k.startsWith('qh_'))
      .forEach(k => data[k] = localStorage.getItem(k));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quest_habit_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('데이터 백업이 완료되었습니다.');
  };

  // Stats
  const [atk, setAtk] = useLocalStorage('qh_atk', 10);
  const [maxHp, setMaxHp] = useLocalStorage('qh_maxHp', 100);
  const [maxMp, setMaxMp] = useLocalStorage('qh_maxMp', 100);
  const [int, setInt] = useLocalStorage('qh_int', 0);
  
  // Current status
  const [hp, setHp] = useLocalStorage('qh_hp', 100);
  const [mp, setMp] = useLocalStorage('qh_mp', 100);
  const [tickets, setTickets] = useLocalStorage('qh_tickets', 3);
  
  // Game state
  const [monsterHp, setMonsterHp] = useLocalStorage('qh_monsterHp', 25);
  const [webnovelTickets, setWebnovelTickets] = useLocalStorage('qh_webnovelTickets', 0);
  
  // Daily Reset & Streak
  const [lastLoginDate, setLastLoginDate] = useLocalStorage('qh_lastLoginDate', '');
  const [streak, setStreak] = useLocalStorage('qh_streak', 0);
  const [dailyStudyMinutes, setDailyStudyMinutes] = useLocalStorage('qh_dailyStudyMinutes', 0);
  const [showSleepPopup, setShowSleepPopup] = useState(false);
  const [damagePopups, setDamagePopups] = useState([]);
  
  // Custom Quests States
  const [customQuests, setCustomQuests] = useLocalStorage('qh_customQuests', [
    { id: 1, title: '오늘의 운동 (30분)', type: 'atk', amount: 1 },
    { id: 2, title: '독서 30분', type: 'int', amount: 1 },
    { id: 3, title: '휴식 (체력 회복)', type: 'hp', amount: 20 }
  ]);
  const [completedQuests, setCompletedQuests] = useLocalStorage('qh_completedQuests', []);
  const [isQuestEditMode, setIsQuestEditMode] = useState(false);
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestType, setNewQuestType] = useState('atk');
  const [newQuestAmount, setNewQuestAmount] = useState(1);
  const [hasLoggedSleep, setHasLoggedSleep] = useLocalStorage('qh_hasLoggedSleep', false);
  
  // Input states for Quests
  const [sleepHours, setSleepHours] = useState(7);
  const [studyMinutes, setStudyMinutes] = useState(30);

  // Check Daily Reset on Mount
  useEffect(() => {
    const today = new Date().toDateString();
    if (lastLoginDate !== today) {
      if (lastLoginDate) {
        const lastDate = new Date(lastLoginDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate.toDateString() === yesterday.toDateString()) {
          if (dailyStudyMinutes >= 60) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak === 3) showToast('🔥 3일 연속 1시간 이상 공부 달성! 크리티컬 확률이 10% 증가합니다.', 'success');
            if (newStreak === 7) {
              showToast('🔥 7일 연속 1시간 이상 공부 달성! 올 스탯 +2 보너스를 받았습니다.', 'success');
              setAtk(a => a + 2);
              setMaxHp(h => h + 2);
              setMaxMp(m => m + 2);
              setInt(i => i + 2);
            }
          } else {
            if (streak > 0) showToast('어제 목표 공부 시간(1시간)을 채우지 못해 연속 달성(Streak)이 초기화되었습니다 😢', 'warning');
            setStreak(0);
          }
        } else {
          setStreak(0);
        }
      } else {
        setStreak(0);
      }
      setLastLoginDate(today);
      setDailyStudyMinutes(0); // 일일 공부시간 초기화
      setCompletedQuests([]); // 일일 퀘스트 완수 기록 초기화
      setHasLoggedSleep(false); // 일일 수면 기록 초기화
      setShowSleepPopup(true);
    } else if (!hasLoggedSleep) {
      setShowSleepPopup(true);
    }
  }, []);

  const triggerDamagePopup = (damage, isCrit) => {
    const id = Date.now();
    // Random position around monster
    const x = Math.floor(Math.random() * 60) - 30;
    const y = Math.floor(Math.random() * 40) - 20;
    setDamagePopups(prev => [...prev, { id, damage, isCrit, x, y }]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };

  const handleAttack = () => {
    if (isAttacking) return;
    if (tickets <= 0) {
      showToast('보유한 공격권이 없습니다! 공부 기록을 통해 공격권을 획득하세요.', 'warning');
      return;
    }
    if (mp < 10) {
      showToast('정신력(MP)이 10 미만이라 공격할 수 없습니다! 수면 기록을 통해 회복하세요.', 'warning');
      return;
    }

    setIsAttacking(true);
    setTickets(t => Number(t) - 1);
    setMp(m => Math.max(0, Number(m) - 10));
    
    // Calculate Damage
    const mpPercent = (mp / maxMp) * 100;
    let mpModifier = 1;
    if (mpPercent <= 25) mpModifier = 0.4;
    else if (mpPercent <= 60) mpModifier = 0.7;
    
    // Crit chance based on INT (each INT is +2% crit, max 50%) + Streak Bonus
    const baseCrit = Math.min(int * 0.02, 0.5);
    const streakBonus = streak >= 3 ? 0.1 : 0;
    const totalCritChance = baseCrit + streakBonus;
    
    const isCrit = Math.random() < totalCritChance;
    const damage = Math.max(1, Math.floor(atk * mpModifier * (isCrit ? 1.5 : 1)));
    
    const newMonsterHp = Math.max(0, monsterHp - damage);
    setMonsterHp(newMonsterHp);
    setIsHit(true);
    triggerDamagePopup(damage, isCrit);
    setTimeout(() => {
      setIsHit(false);
      setIsAttacking(false);
    }, 400);
    
    if (newMonsterHp <= 0) {
      setTimeout(() => {
        showToast(`몬스터를 물리쳤습니다!${isCrit ? ' (크리티컬!)' : ''} 웹소설 1회 이용권을 획득했어요!`, 'success');
        
        // 5% chance for Moon Moon
        if (Math.random() < 0.05) {
          showToast('보스 전리품: 빛나는 달조각(Moon Moon)을 획득했습니다!', 'success');
        }
        
        setWebnovelTickets(prev => prev + 1);
        setMonsterHp(Math.floor(atk * 2.5)); // New monster HP
      }, 500);
    }
  };

  const handleStudyLog = () => {
    if (studyMinutes % 30 !== 0 || studyMinutes <= 0) {
      showToast('공부 시간은 30분 단위로 입력해주세요.', 'warning');
      return;
    }
    if (studyMinutes > 1440) {
      showToast('하루 최대 24시간(1440분)까지만 한 번에 기록할 수 있습니다.', 'warning');
      return;
    }
    const earnedTickets = Math.floor(studyMinutes / 30) * 2; // 4h-6r loop
    setTickets(t => Number(t) + earnedTickets);
    setDailyStudyMinutes(prev => Number(prev) + studyMinutes);
    showToast(`공부 ${studyMinutes}분 완료! 공격권을 ${earnedTickets}개 획득했습니다.`, 'success');
    setStudyMinutes(30); // reset input to 30
  };

  const handleSleepLog = () => {
    if (hasLoggedSleep) {
      showToast('오늘의 수면 기록은 이미 완료했습니다.');
      setShowSleepPopup(false);
      return;
    }
    if (sleepHours < 0) return;
    let recoveredMp = 0;
    if (sleepHours >= 7) recoveredMp = maxMp;
    else if (sleepHours >= 5) recoveredMp = Math.floor(maxMp * 0.6);
    else recoveredMp = Math.floor(maxMp * 0.3);
    
    setMp(recoveredMp);
    setHasLoggedSleep(true);
    showToast(`${sleepHours}시간 수면 기록 완료! MP가 회복되었습니다.`, 'success');
    setShowSleepPopup(false);
  };

  const handleAddCustomQuest = () => {
    if (!newQuestTitle.trim()) {
      showToast('퀘스트 이름을 입력해주세요.', 'warning');
      return;
    }
    const newQuest = {
      id: Date.now(),
      title: newQuestTitle.trim(),
      type: newQuestType,
      amount: newQuestAmount
    };
    setCustomQuests(prev => [...prev, newQuest]);
    setNewQuestTitle('');
    setNewQuestAmount(1);
    showToast('새 퀘스트가 추가되었습니다.');
  };

  const handleDeleteCustomQuest = (id) => {
    setCustomQuests(prev => prev.filter(q => q.id !== id));
    showToast('퀘스트가 삭제되었습니다.');
  };

  const handleCompleteQuest = (quest) => {
    if (completedQuests.includes(quest.id)) return;
    
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
    
    setCompletedQuests(prev => [...prev, quest.id]);
    showToast(`${quest.title} 달성! 보상을 획득했습니다.`, 'success');
  };

  return (
    <div className="mobile-container">
      <div className="flicker-overlay"></div>
      
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.msg}
          </div>
        ))}
      </div>

      {/* Header Bar */}
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

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'battle' && (
          <div className="battle-area">
            {/* Background image for battle */}
            <div className="battle-bg-wrapper">
              <img src="/battle_bg.png" alt="Battle Background" className="battle-bg-img" />
            </div>

            <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
              <div style={{ background: 'var(--ink-black)', color: 'var(--golden-yellow)', padding: '6px 12px', borderRadius: '8px', border: '2px solid var(--ivory-white)', fontFamily: "'Do Hyeon', sans-serif", fontSize: '18px', boxShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}>
                오늘 공부: {dailyStudyMinutes}분
              </div>
              <div style={{ background: 'var(--ink-black)', color: 'var(--ivory-white)', padding: '6px 12px', borderRadius: '8px', border: '2px solid var(--ivory-white)', fontFamily: "'Do Hyeon', sans-serif", fontSize: '18px', boxShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}>
                보유 공격권: {tickets}개
              </div>
            </div>

            <div className="monster-container">
              <div className="monster-hp-bar">
                <div className="monster-hp-fill" style={{ width: `${(monsterHp / Math.max(1, Math.floor(atk * 2.5))) * 100}%` }}></div>
                <div className="monster-hp-text">{monsterHp} / {Math.max(1, Math.floor(atk * 2.5))}</div>
              </div>
              <img src="/monster_new.png" alt="Monster" className={`monster-img ${isHit ? 'hit-motion' : ''}`} />
              
              {damagePopups.map(popup => (
                <div 
                  key={popup.id} 
                  className={`damage-popup ${popup.isCrit ? 'crit' : ''}`}
                  style={{ '--x': popup.x, '--y': popup.y }}
                >
                  -{popup.damage}
                </div>
              ))}
            </div>
            
            <button className="action-btn" onClick={handleAttack} disabled={isAttacking}>
              공격하기!
              <div className="tickets-badge">{tickets}</div>
            </button>
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="quest-list">
            <h2>고정 퀘스트</h2>
            <div className="quest-card">
              <div className="quest-info">
                <h3>공부 기록 (무한 반복)</h3>
                <div className="input-group">
                  <input 
                    type="number" 
                    value={studyMinutes} 
                    step="30"
                    onChange={(e) => setStudyMinutes(Number(e.target.value))} 
                    className="quest-input"
                  />
                  <span>분 (30분당 +2 공격권)</span>
                </div>
              </div>
              <button className="use-btn" onClick={handleStudyLog}>기록</button>
            </div>

            <div className="quest-card" style={{ marginBottom: '24px', opacity: hasLoggedSleep ? 0.6 : 1 }}>
              <div className="quest-info">
                <h3 style={{ textDecoration: hasLoggedSleep ? 'line-through' : 'none' }}>수면 기록</h3>
                <div className="input-group">
                  <input 
                    type="number" 
                    value={sleepHours} 
                    step="1"
                    onChange={(e) => setSleepHours(Number(e.target.value))} 
                    className="quest-input"
                    disabled={hasLoggedSleep}
                  />
                  <span>시간 (MP 회복)</span>
                </div>
              </div>
              <button 
                className={`use-btn ${hasLoggedSleep ? 'disabled' : ''}`} 
                onClick={handleSleepLog}
                disabled={hasLoggedSleep}
              >
                {hasLoggedSleep ? '완료됨' : '기록'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '24px' }}>
              <h2 style={{ margin: 0 }}>나만의 퀘스트</h2>
              <button 
                className="use-btn" 
                style={{ padding: '6px 12px', fontSize: '14px', backgroundColor: isQuestEditMode ? 'var(--parchment)' : 'var(--mint-green)' }} 
                onClick={() => setIsQuestEditMode(!isQuestEditMode)}
              >
                {isQuestEditMode ? '✅ 수정 완료' : '✏️ 목록 수정'}
              </button>
            </div>

            {customQuests.map(quest => {
              const isDone = completedQuests.includes(quest.id);
              return (
                <div key={quest.id} className="quest-card" style={{ opacity: (!isQuestEditMode && isDone) ? 0.6 : 1, position: 'relative', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    
                    {!isQuestEditMode ? (
                      /* VIEW MODE */
                      <>
                        <div className="quest-info" style={{ flex: 1 }}>
                          <h3 style={{ textDecoration: isDone ? 'line-through' : 'none' }}>{quest.title}</h3>
                          <p style={{ color: 'var(--crimson-red)', fontWeight: 'bold' }}>
                            보상: {quest.type.toUpperCase()} +{quest.amount}
                          </p>
                        </div>
                        <button 
                          className={`use-btn ${isDone ? 'disabled' : ''}`} 
                          onClick={() => handleCompleteQuest(quest)}
                          disabled={isDone}
                          style={{ marginLeft: '12px', minWidth: '70px' }}
                        >
                          {isDone ? '완료됨' : '달성!'}
                        </button>
                      </>
                    ) : (
                      /* EDIT MODE */
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginRight: '12px' }}>
                          <input 
                            type="text" 
                            value={quest.title} 
                            onChange={(e) => setCustomQuests(prev => prev.map(q => q.id === quest.id ? {...q, title: e.target.value} : q))}
                            style={{ padding: '6px', fontFamily: "'Do Hyeon', sans-serif", border: '2px solid var(--ink-black)', borderRadius: '4px', fontSize: '16px' }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select 
                              value={quest.type} 
                              onChange={(e) => setCustomQuests(prev => prev.map(q => q.id === quest.id ? {...q, type: e.target.value} : q))}
                              style={{ padding: '4px', fontFamily: "'Do Hyeon', sans-serif", border: '2px solid var(--ink-black)', borderRadius: '4px', flex: 1 }}
                            >
                              <option value="atk">ATK</option>
                              <option value="int">INT</option>
                              <option value="hp">HP</option>
                              <option value="mp">MP</option>
                            </select>
                            <input 
                              type="number" 
                              value={quest.amount} 
                              min="1"
                              onChange={(e) => setCustomQuests(prev => prev.map(q => q.id === quest.id ? {...q, amount: Number(e.target.value)} : q))}
                              style={{ width: '50px', padding: '4px', fontFamily: "'Do Hyeon', sans-serif", border: '2px solid var(--ink-black)', borderRadius: '4px', textAlign: 'center' }}
                            />
                          </div>
                        </div>
                        <button 
                          className="use-btn" 
                          style={{ backgroundColor: 'var(--crimson-red)', color: 'white', padding: '8px', fontSize: '14px' }}
                          onClick={() => handleDeleteCustomQuest(quest.id)}
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {isQuestEditMode && (
              <div className="quest-card" style={{ backgroundColor: 'var(--ivory-white)', borderStyle: 'dashed' }}>
                <div className="quest-info" style={{ width: '100%' }}>
                  <h4 style={{ fontFamily: "'Jua', sans-serif", color: 'var(--warm-brown)', marginBottom: '8px' }}>+ 새 퀘스트 추가</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="퀘스트 이름 (예: 명상 10분)" 
                      value={newQuestTitle}
                      onChange={(e) => setNewQuestTitle(e.target.value)}
                      style={{ padding: '8px', fontFamily: "'Do Hyeon', sans-serif", border: '2px solid var(--ink-black)', borderRadius: '4px', fontSize: '16px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select 
                        value={newQuestType} 
                        onChange={(e) => setNewQuestType(e.target.value)}
                        style={{ padding: '8px', fontFamily: "'Do Hyeon', sans-serif", border: '2px solid var(--ink-black)', borderRadius: '4px', flex: 1, fontSize: '14px' }}
                      >
                        <option value="atk">공격력 (ATK)</option>
                        <option value="int">지능 (INT)</option>
                        <option value="hp">최대 체력 (HP)</option>
                        <option value="mp">최대 정신력 (MP)</option>
                      </select>
                      <input 
                        type="number" 
                        value={newQuestAmount}
                        min="1"
                        onChange={(e) => setNewQuestAmount(Number(e.target.value))}
                        style={{ width: '60px', padding: '8px', fontFamily: "'Do Hyeon', sans-serif", border: '2px solid var(--ink-black)', borderRadius: '4px', fontSize: '16px', textAlign: 'center' }}
                      />
                    </div>
                    <button className="use-btn" onClick={handleAddCustomQuest} style={{ width: '100%', marginTop: '4px' }}>새 퀘스트 만들기</button>
                  </div>
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
                <div className="stat-box">
                  <span className="stat-title">공격력 (ATK)</span>
                  <span className="stat-value">{atk}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-title">최대 체력 (HP)</span>
                  <span className="stat-value">{maxHp}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-title">최대 정신력 (MP)</span>
                  <span className="stat-value">{maxMp}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-title">지능 (INT)</span>
                  <span className="stat-value">{int}</span>
                </div>
              </div>
              <div className="stat-footer">
                <p>연속 1시간 공부 달성: <strong>{streak}일 🔥</strong></p>
                <p>오늘 누적 공부 시간: <strong>{dailyStudyMinutes}분</strong></p>
                <p>현재 보유 공격권: <strong>{tickets}개</strong></p>
                <p>몬스터 최대 체력: <strong>{Math.floor(atk * 2.5)}</strong></p>
              </div>
            </div>

            <div className="backup-section">
              <p style={{ fontFamily: "'Jua', sans-serif", color: 'var(--warm-brown)' }}>데이터 관리</p>
              <button className="use-btn" onClick={exportData} style={{ backgroundColor: 'var(--royal-purple)', color: 'white' }}>
                📥 데이터 백업하기 (JSON)
              </button>
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="rewards-list">
            <h2>보상 보관함</h2>
            <div className="quest-card">
              <div className="quest-info">
                <h3>웹소설 1회 이용권</h3>
                <p>보유 개수: {webnovelTickets}개</p>
              </div>
              <button 
                className={`use-btn ${webnovelTickets > 0 ? '' : 'disabled'}`}
                onClick={() => {
                  if (webnovelTickets > 0) {
                    setWebnovelTickets(prev => prev - 1);
                    showToast('웹소설 이용권을 1장 사용했습니다!', 'success');
                  } else {
                    showToast('보유한 이용권이 없습니다.', 'warning');
                  }
                }}
              >
                사용
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div 
          className={`nav-item ${activeTab === 'battle' ? 'active' : ''}`}
          onClick={() => setActiveTab('battle')}
        >
          <span className="nav-icon">⚔️</span>
          <span className="nav-label">전투</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'quests' ? 'active' : ''}`}
          onClick={() => setActiveTab('quests')}
        >
          <span className="nav-icon">📜</span>
          <span className="nav-label">퀘스트</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">스탯</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewards')}
        >
          <span className="nav-icon">🎁</span>
          <span className="nav-label">보상</span>
        </div>
      </nav>

      {/* Sleep Popup Modal */}
      {showSleepPopup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>새로운 하루가 밝았습니다! ☀️</h2>
            <p>어제 밤 수면 시간을 기록하여 오늘 사용할 정신력(MP)을 회복하세요.</p>
            <div className="input-group center">
              <input 
                type="number" 
                value={sleepHours} 
                step="1"
                onChange={(e) => setSleepHours(Number(e.target.value))} 
                className="quest-input"
              />
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
