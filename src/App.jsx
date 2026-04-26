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
  const [int, setInt] = useLocalStorage('qh_int', 10); // 초기 지능 10 세팅
  
  // Current status
  const [hp, setHp] = useLocalStorage('qh_hp', 100);
  const [mp, setMp] = useLocalStorage('qh_mp', 100);
  const [tickets, setTickets] = useLocalStorage('qh_tickets', 0);
  
  // Game state
  const [monsterHp, setMonsterHp] = useLocalStorage('qh_monsterHp', 25);
  const [webnovelTickets, setWebnovelTickets] = useLocalStorage('qh_webnovelTickets', 0);
  const [moonMoonCount, setMoonMoonCount] = useLocalStorage('qh_moonMoonCount', 0); // Moon Moon 보상 추가
  
  // Daily Reset & Streak
  const [lastLoginDate, setLastLoginDate] = useLocalStorage('qh_lastLoginDate', '');
  const [streak, setStreak] = useLocalStorage('qh_streak', 0);
  const [dailyStudyMinutes, setDailyStudyMinutes] = useLocalStorage('qh_dailyStudyMinutes', 0);
  const [showSleepPopup, setShowSleepPopup] = useState(false);
  const [damagePopups, setDamagePopups] = useState([]);
  const [hasLoggedSleep, setHasLoggedSleep] = useLocalStorage('qh_hasLoggedSleep', false);
  
  // Custom Quests States
  const [customQuests, setCustomQuests] = useLocalStorage('qh_customQuests', [
    { id: 1, title: '오늘의 독서', type: 'int', amount: 1 },
    { id: 2, title: '식단 기록', type: 'hp', amount: 10 }
  ]);
  const [completedQuests, setCompletedQuests] = useLocalStorage('qh_completedQuests', []);
  const [isQuestEditMode, setIsQuestEditMode] = useState(false);
  const [newQuestTitle, setNewQuestTitle] = useState('');
  const [newQuestType, setNewQuestType] = useState('atk');
  const [newQuestAmount, setNewQuestAmount] = useState(1);
  
  const [sleepHours, setSleepHours] = useState(7);
  const [studyMinutes, setStudyMinutes] = useState(30);

  // 날짜 변경 체크 및 스트릭 로직
  useEffect(() => {
    const today = new Date().toDateString();
    if (lastLoginDate !== today) {
      if (lastLoginDate) {
        const lastDate = new Date(lastLoginDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // 연속성 체크: 어제 1시간 이상 공부했는지 확인
        if (lastDate.toDateString() === yesterday.toDateString() && dailyStudyMinutes >= 60) {
          const newStreak = streak + 1;
          setStreak(newStreak);
          if (newStreak === 3) showToast('🔥 3일 연속 달성! 크리티컬 확률 보너스!', 'success');
          if (newStreak === 7) {
            showToast('🌕 7일 연속 달성! 보너스 moon moon 획득!', 'success');
            setMoonMoonCount(prev => prev + 1);
          }
        } else if (lastDate.toDateString() !== yesterday.toDateString() || dailyStudyMinutes < 60) {
          setStreak(0);
        }
      }
      setLastLoginDate(today);
      setDailyStudyMinutes(0);
      setCompletedQuests([]);
      setHasLoggedSleep(false);
      setShowSleepPopup(true);
    }
  }, [lastLoginDate, dailyStudyMinutes, streak]);

  const triggerDamagePopup = (damage, isCrit) => {
    const id = Date.now();
    const x = Math.floor(Math.random() * 60) - 30;
    const y = Math.floor(Math.random() * 40) - 20;
    setDamagePopups(prev => [...prev, { id, damage, isCrit, x, y }]);
    setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== id)), 1000);
  };

  const handleAttack = () => {
    if (isAttacking || tickets <= 0 || mp < 10) {
      if (tickets <= 0) showToast('공격권이 부족합니다! 공부를 기록하세요.', 'warning');
      else if (mp < 10) showToast('정신력이 부족합니다! 휴식이 필요해요.', 'warning');
      return;
    }

    setIsAttacking(true);
    setTickets(t => t - 1);
    setMp(m => Math.max(0, m - 10));
    
    const mpPercent = (mp / maxMp) * 100;
    let mpModifier = mpPercent > 80 ? 1 : mpPercent > 40 ? 0.7 : 0.3;
    
    const critChance = Math.min((int * 0.02) + (streak >= 3 ? 0.1 : 0), 0.5);
    const isCrit = Math.random() < critChance;
    const damage = Math.max(1, Math.floor(atk * mpModifier * (isCrit ? 1.5 : 1)));
    
    const newMonsterHp = Math.max(0, monsterHp - damage);
    setMonsterHp(newMonsterHp);
    setIsHit(true);
    triggerDamagePopup(damage, isCrit);
    
    setTimeout(() => {
      setIsHit(false);
      setIsAttacking(false);
      if (newMonsterHp <= 0) {
        setWebnovelTickets(prev => prev + 1);
        let msg = '몬스터 처치! 웹소설 이용권 획득!';
        if (Math.random() < 0.05) { // 5% 확률 moon moon
          setMoonMoonCount(prev => prev + 1);
          msg += ' ✨ 희귀 보상 [moon moon] 발견!';
        }
        showToast(msg, 'success');
        setMonsterHp(Math.max(1, Math.floor(atk * 2.5)));
      }
    }, 400);
  };

  const handleStudyLog = () => {
    if (studyMinutes % 30 !== 0 || studyMinutes <= 0) {
      showToast('공부 시간은 30분 단위로 입력해주세요.', 'warning');
      return;
    }
    const earnedTickets = Math.floor(studyMinutes / 30) * 2; // 30분당 2개
    setTickets(t => t + earnedTickets);
    setDailyStudyMinutes(prev => prev + studyMinutes);
    showToast(`공부 ${studyMinutes}분 기록! 공격권 ${earnedTickets}개 획득.`, 'success');
    setStudyMinutes(30);
  };

  const handleSleepLog = () => {
    let recoveredMp = sleepHours >= 7 ? maxMp : sleepHours >= 5 ? maxMp * 0.6 : maxMp * 0.3;
    setMp(Math.floor(recoveredMp));
    setHasLoggedSleep(true);
    setShowSleepPopup(false);
    showToast(`${sleepHours}시간 수면 완료! 에너지가 충전되었습니다.`, 'success');
  };

  const handleAddCustomQuest = () => {
    if (!newQuestTitle.trim()) return;
    const newQuest = { id: Date.now(), title: newQuestTitle, type: newQuestType, amount: newQuestAmount };
    setCustomQuests(prev => [...prev, newQuest]);
    setNewQuestTitle('');
    showToast('퀘스트가 추가되었습니다.');
  };

  const handleCompleteQuest = (quest) => {
    if (completedQuests.includes(quest.id)) return;
    if (quest.type === 'atk') setAtk(a => a + quest.amount);
    if (quest.type === 'int') setInt(i => i + quest.amount);
    if (quest.type === 'hp') setMaxHp(h => h + quest.amount);
    if (quest.type === 'mp') setMaxMp(m => m + quest.amount);
    setCompletedQuests(prev => [...prev, quest.id]);
    showToast(`${quest.title} 달성! 보상 획득.`, 'success');
  };

  return (
    <div className="mobile-container">
      <div className="flicker-overlay"></div>
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
      </div>

      <header className="header-bar">
        <h1 className="header-title">QUEST HABIT</h1>
        <div className="stats-container">
          <div className="stat-row">
            <span className="stat-label">HP</span>
            <div className="bar-bg"><div className="bar-fill bar-hp" style={{ width: `${(hp/maxHp)*100}%` }}></div></div>
          </div>
          <div className="stat-row">
            <span className="stat-label">MP</span>
            <div className="bar-bg"><div className="bar-fill bar-mp" style={{ width: `${(mp/maxMp)*100}%` }}></div></div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'battle' && (
          <div className="battle-area">
            <div className="battle-bg-wrapper"><img src="/battle_bg.png" alt="bg" className="battle-bg-img" /></div>
            <div className="monster-container">
              <div className="monster-hp-bar">
                <div className="monster-hp-fill" style={{ width: `${(monsterHp / Math.max(1, atk * 2.5)) * 100}%` }}></div>
                <div className="monster-hp-text">{monsterHp} / {Math.floor(atk * 2.5)}</div>
              </div>
              <img src="/monster_new.png" className={`monster-img ${isHit ? 'hit-motion' : ''}`} alt="monster" />
              {damagePopups.map(p => <div key={p.id} className={`damage-popup ${p.isCrit ? 'crit' : ''}`} style={{ '--x': p.x, '--y': p.y }}>-{p.damage}</div>)}
            </div>
            <button className="action-btn" onClick={handleAttack} disabled={isAttacking}>공격하기 <div className="tickets-badge">{tickets}</div></button>
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="quest-list">
            <h2>오늘의 습관</h2>
            <div className="quest-card">
              <h3>공부 기록</h3>
              <div className="input-group">
                <input type="number" value={studyMinutes} step="30" onChange={e => setStudyMinutes(Number(e.target.value))} className="quest-input" />
                <span>분 (30분당 +2 🎫)</span>
              </div>
              <button className="use-btn" onClick={handleStudyLog}>기록</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <h2>나만의 퀘스트</h2>
              <button className="use-btn" onClick={() => setIsQuestEditMode(!isQuestEditMode)}>{isQuestEditMode ? '저장' : '편집'}</button>
            </div>

            {customQuests.map(q => (
              <div key={q.id} className="quest-card" style={{ opacity: completedQuests.includes(q.id) ? 0.5 : 1 }}>
                <h3>{q.title} (+{q.amount} {q.type.toUpperCase()})</h3>
                {isQuestEditMode ? (
                  <button className="use-btn" style={{ background: 'var(--crimson-red)' }} onClick={() => setCustomQuests(prev => prev.filter(x => x.id !== q.id))}>삭제</button>
                ) : (
                  <button className={`use-btn ${completedQuests.includes(q.id) ? 'disabled' : ''}`} onClick={() => handleCompleteQuest(q)} disabled={completedQuests.includes(q.id)}>달성</button>
                )}
              </div>
            ))}

            {isQuestEditMode && (
              <div className="quest-card" style={{ borderStyle: 'dashed' }}>
                <input type="text" placeholder="퀘스트명" value={newQuestTitle} onChange={e => setNewQuestTitle(e.target.value)} className="quest-input" style={{ width: '100%', marginBottom: '10px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select value={newQuestType} onChange={e => setNewQuestType(e.target.value)} className="quest-input" style={{ flex: 1 }}>
                    <option value="atk">ATK</option><option value="int">INT</option><option value="hp">HP</option><option value="mp">MP</option>
                  </select>
                  <input type="number" value={newQuestAmount} onChange={e => setNewQuestAmount(Number(e.target.value))} className="quest-input" style={{ width: '60px' }} />
                </div>
                <button className="use-btn" style={{ width: '100%', marginTop: '10px' }} onClick={handleAddCustomQuest}>추가</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-list">
            <h2>캐릭터 정보</h2>
            <div className="stat-grid">
              <div className="stat-box"><span>ATK</span><strong>{atk}</strong></div>
              <div className="stat-box"><span>INT</span><strong>{int}</strong></div>
              <div className="stat-box"><span>STRK</span><strong>{streak}일</strong></div>
              <div className="stat-box"><span>🎫</span><strong>{tickets}</strong></div>
            </div>
            <button className="use-btn" style={{ marginTop: '20px', width: '100%' }} onClick={exportData}>데이터 백업 (JSON)</button>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="rewards-list">
            <h2>보상 보관함</h2>
            <div className="quest-card">
              <h3>웹소설 이용권</h3>
              <p>보유: {webnovelTickets}개</p>
              <button className="use-btn" onClick={() => webnovelTickets > 0 && setWebnovelTickets(t => t - 1)}>사용</button>
            </div>
            <div className="quest-card" style={{ background: 'var(--golden-yellow)' }}>
              <h3>🌙 moon moon</h3>
              <p>보유: {moonMoonCount}개</p>
              <p style={{ fontSize: '12px' }}>희귀한 전리품입니다!</p>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        {['battle', 'quests', 'stats', 'rewards'].map(t => (
          <div key={t} className={`nav-item ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            <span className="nav-icon">{t === 'battle' ? '⚔️' : t === 'quests' ? '📜' : t === 'stats' ? '👤' : '🎁'}</span>
            <span className="nav-label">{t.toUpperCase()}</span>
          </div>
        ))}
      </nav>

      {showSleepPopup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>안녕히 주무셨나요? ☀️</h2>
            <p>어제 수면 시간을 입력해 MP를 회복하세요.</p>
            <input type="number" value={sleepHours} onChange={e => setSleepHours(Number(e.target.value))} className="quest-input" style={{ textAlign: 'center', width: '80px' }} /> 시간
            <button className="use-btn" style={{ marginTop: '20px', display: 'block', width: '100%' }} onClick={handleSleepLog}>기상 완료</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
