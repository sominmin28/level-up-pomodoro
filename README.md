# Level Up Pomodoro 🍅

게임화 요소가 있는 포모도로 타이머 앱 — 집중하고, XP를 획득하고, 레벨업하세요!

## ✨ 기능

- **포모도로 타이머** — 25분 집중 + 5분 휴식 (4회 후 15분 긴 휴식)
- **사용자 정의 시간 설정** — 집중 15~60분, 휴식 1~15분, localStorage 저장
- **XP & 레벨 시스템** — 포모도로 1개 = 25 XP, 100 XP = 레벨업
- **AI 격려 메시지** — 레벨업 시 OpenAI GPT로 한국어 명언/격려 메시지 생성
- **학습 통계** — 오늘/이번 주/전체 통계, 시간대별 분석, AI 인사이트
- **백색소음** — 빗소리/파도소리/카페음/숲소리, 집중 시간에만 재생
- **친구 기능** — 친구 추가/요청/수락, 통계 비교
- **JWT 인증** — 회원가입/로그인
- **Azure SQL Database** 연동

## 🛠 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | Vue.js 3, Vite, Pinia, Vue Router |
| 백엔드 | Node.js, Express |
| AI | OpenAI GPT-4o-mini (Copilot SDK 호환) |
| DB | Azure SQL Database (mssql) |
| 인증 | JWT (jsonwebtoken + bcryptjs) |
| 배포 | Azure App Service / Render |

## 🚀 실행 방법

### 1. 백엔드

```bash
cd backend
cp .env.example .env
# .env 파일에 환경 변수 설정
npm install
npm start
```

### 2. 프론트엔드

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

> **오프라인 모드**: DB 설정 없이도 localStorage로 동작합니다.

## ⚙️ 환경 변수

### Backend `.env`
```
PORT=3001
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_api_key
DB_SERVER=your_server.database.windows.net
DB_NAME=levelup_pomodoro
DB_USER=your_user
DB_PASSWORD=your_password
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:3001/api
```

## 🎮 XP & 레벨 시스템

- 포모도로 1개 완료 = **+25 XP**
- **100 XP = 레벨 1 상승** (포모도로 4개 = 레벨업)
- 레벨업 시 AI가 한국어 격려 메시지 생성

## 🔑 평가 기준 대응

| 기준 | 구현 내용 |
|------|-----------|
| Copilot SDK (AI) | OpenAI GPT-4o-mini로 레벨업 메시지 + 통계 분석 |
| 기능 완성도 | 타이머, XP/레벨, 통계, 백색소음, 친구 모두 구현 |
| Azure 배포 | render.yaml + Azure SQL DB 지원 |
| 코드 품질 | Vue 3 Composition API, Pinia store, REST API |
| 혁신성 | Web Audio API 백색소음, 실시간 XP 바, 레벨업 모달 |
