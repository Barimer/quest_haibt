# 🎮 Quest Habit: Life RPG
> **"이봐 친구! 오늘도 성실하게 살 준비가 됐나?"**
> 1930년대 빈티지 카툰 감성으로 즐기는 나만의 습관 관리 RPG.

---

## 📽️ Project Overview
**Quest Habit**은 지루한 습관 관리를 흥미진진한 몬스터 전투로 바꾼 모바일 전용 웹 애플리케이션입니다. 컵헤드(Cuphead) 스타일의 강렬한 비주얼과 정확한 수치 계산을 통해 사용자에게 확실한 도파민과 성취감을 제공합니다.

### ✨ Key Aesthetics
* **Cuphead 테마:** 두꺼운 테두리, 레트로 폰트, 그리고 노이즈 필터 효과.
* **빈티지 연출:** 영사기 효과(Flicker Overlay)와 양피지 느낌의 컬러 팔레트 적용.
* **타격감:** 크리티컬 시 화면 흔들림과 대미지 팝업 애니메이션.

---

## ⚔️ Core Game Mechanics
사용자의 실제 노력이 게임 내 수치로 정밀하게 변환됩니다.

| 구분 | 연관 활동 | 게임 내 효과 | 성장 로직 |
| :--- | :--- | :--- | :--- |
| **공격력(ATK)** | 운동/퀘스트 | 대미지 및 난이도 결정 | 사용자 정의 퀘스트로 자유롭게 성장 |
| **정신력(MP)** | 수면 | 행동 자원 및 대미지 보정 | 7시간 이상 수면 시 100% 회복 |
| **지능(INT)** | 필사/독서/일기 | 크리티컬 확률 상승 | INT 1당 확률 2% 증가 (최대 50%) |
| **공격권(Ticket)** | 공부 | 몬스터 공격 자원 | **30분당 2개** 획득 |

### 📈 The "4h-6r" Golden Balance
* **목표:** 하루 4시간 공부 시 웹소설 6권 감상권 확보.
* **로직:** 4시간(16 Tickets) ÷ 몬스터 처치 비용(약 2.5 Tickets) ≈ **6.4마리 처치**.
* **처치 보상:** 웹소설 1회 이용권(100%) & **희귀 전리품 `moon moon` (5%)**.

---

## 📜 Features
* **나만의 퀘스트:** 사용자가 직접 제목과 보상 스탯을 설정하고 편집하는 커스텀 시스템.
* **연속 달성(Streak):** 3일/7일 연속 목표 달성 시 크리티컬 보너스와 확정 `moon moon` 지급.
* **데이터 백업:** `localStorage`를 기반으로 한 즉시 저장 및 JSON 파일을 통한 백업 기능.
* **모닝 루틴:** 매일 아침 수면 시간을 입력받아 그날의 MP를 결정하는 팝업 시스템.

---

## 🛠 Tech Stack
* **Frontend:** React 18, Vite
* **Styling:** CSS3 (Custom Variables, Keyframe Animations)
* **Storage:** LocalStorage API

---

## 🚀 How to Run

```bash
# 저장소 복제
git clone https://github.com/Barimer/quest_haibt.git

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

---

## 📂 Directory Structure
```text
src/
├── App.jsx            # 핵심 게임 로직 및 상태 관리
├── App.css            # UI 및 애니메이션 스타일
├── index.css          # 글로벌 테마 및 변수 정의
└── main.jsx           # 진입점
```

---

## 🌙 Special Thanks to
이 프로젝트는 **Nanmoya**님의 성실한 일상과 공부 기록을 응원하기 위해 설계되었습니다.  
**"오늘도 공격권을 챙겨서 몬스터를 혼내주러 가보자고!"**
