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
| 배포 | Azure Static Web Apps / Azure App Service / Render |

## 로컬 실행

### 1. 백엔드

```bash
cd backend
cp .env.example .env
# .env 파일에 JWT_SECRET과 Azure SQL 접속 정보 설정
npm ci
npm start
```

### 2. 프론트엔드

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

`VITE_OFFLINE_MODE=true`는 로컬 개발에서만 타이머/설정 저장 실패를 localStorage로
대체합니다. production 빌드에서는 이 모드가 비활성화되며, API 저장 실패가 사용자에게
표시됩니다.

## 환경 변수

### Backend `.env`

```dotenv
PORT=3001
NODE_ENV=development
JWT_SECRET=replace_with_at_least_32_random_characters
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
TRUST_PROXY=false
OPENAI_API_KEY=your_openai_api_key
DB_SERVER=your_server.database.windows.net
DB_NAME=levelup_pomodoro
DB_USER=your_user
DB_PASSWORD=your_password
```

production에서는 `JWT_SECRET`, `CORS_ORIGINS`, `DB_SERVER`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`가 모두 필수입니다. `JWT_SECRET=secret` 또는 32자 미만의 production
secret이면 서버가 시작되지 않습니다.

### Frontend `.env`

```dotenv
VITE_API_URL=http://localhost:3001/api
VITE_OFFLINE_MODE=false
```

production 빌드에는 `VITE_API_URL`이 필수이며 URL은 `/api`까지 포함해야 합니다.

## Azure 최종 배포

### 1. Azure 리소스 생성

같은 리전의 리소스 그룹에 다음 리소스를 생성합니다.

1. **Azure SQL logical server + SQL Database**: SQL 인증 관리자 계정을 만들고
   데이터베이스 이름을 정합니다. 연결 문자열 전체가 아니라 서버 FQDN, DB 이름,
   사용자, 비밀번호를 각각 백엔드 설정에 사용합니다.
2. **App Service Plan + Web App**: Linux, Node.js **22 LTS** 런타임으로 생성합니다.
   Web App의 **Configuration > General settings**에서 시작 명령을 `npm start`로
   설정하고, **Monitoring > Health check** 경로를 `/health`로 설정합니다.
3. **Static Web App**: 배포 원본은 `Other`로 생성해 deployment token을 발급받습니다.
   Portal에서 GitHub 워크플로를 자동 생성하지 마세요. 저장소의
   `.github/workflows/azure-static-web-apps.yml`을 사용합니다.

### 2. SQL 네트워크 허용

App Service **Properties**의 `Outbound IP addresses`와
`Additional outbound IP addresses`를 확인합니다. Azure SQL logical server의
**Networking > Firewall rules**에 해당 IP들을 각각 추가합니다. Static Web Apps는
SQL에 직접 연결하지 않습니다. `Allow Azure services and resources to access this
server`는 범위가 넓으므로 outbound IP 규칙을 사용할 수 없는 경우에만 선택합니다.

서버 시작 시 필요한 테이블이 자동 생성되므로 DB 사용자에게 대상 데이터베이스의
테이블 생성/조회/삽입/수정 권한이 있어야 합니다.

### 3. App Service 환경 변수

Web App **Settings > Environment variables**에 다음 값을 등록합니다.

| 이름 | 값 |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | 32자 이상의 임의 secret (`openssl rand -base64 48` 등으로 생성) |
| `CORS_ORIGINS` | Static Web App origin, 예: `https://example.azurestaticapps.net` |
| `TRUST_PROXY` | `1` |
| `DB_SERVER` | `<sql-server>.database.windows.net` |
| `DB_NAME` | Azure SQL Database 이름 |
| `DB_USER` | SQL 인증 사용자 |
| `DB_PASSWORD` | SQL 인증 비밀번호 |
| `OPENAI_API_KEY` | AI 기능 사용 시 OpenAI API key |

여러 프론트엔드 origin을 허용해야 하면 `CORS_ORIGINS`에 쉼표로 구분해 입력합니다.
origin 뒤에는 `/`를 붙이지 않습니다. App Service의 `PORT`는 Azure가 주입하므로
직접 고정하지 않습니다.

### 4. GitHub Actions 값

저장소 **Settings > Secrets and variables > Actions**에 등록합니다.

| 종류 | 이름 | 값/획득 위치 |
|---|---|---|
| Secret | `AZUREAPPSERVICE_CLIENTID_B230551ED4DB41E8B5C3E53DBB6847BD` | `level-up-pomodoro2` Deployment Center가 만든 OIDC 앱의 client ID |
| Secret | `AZUREAPPSERVICE_TENANTID_FF18CC771C214DFE9C93A23E90C73616` | Azure tenant ID |
| Secret | `AZUREAPPSERVICE_SUBSCRIPTIONID_FC7A2BA01ED14DD59FC3916B75EE426F` | Azure subscription ID |
| Secret | `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web App **Manage deployment token** |
| Variable | `VITE_API_URL` | `https://level-up-pomodoro2.azurewebsites.net/api` |

App Service용 OIDC secret 3개는 Azure Portal의 App Service **Deployment Center**에서
GitHub Actions를 연결할 때 생성됩니다. federated credential의 subject는 이 저장소의
`main` branch와 일치해야 합니다. 등록한 secret은 코드나 `.env`에 넣지 않습니다.

### 5. 배포 순서와 확인

1. Azure SQL과 방화벽 규칙을 준비하고 App Service 환경 변수를 저장합니다.
2. GitHub Secrets/Variables를 등록합니다.
3. `main`에 backend 변경을 push하면 `Build and deploy Node.js app to Azure Web App -
   level-up-pomodoro`가
   `backend`에서 `npm ci --omit=dev` 후 공식 `azure/webapps-deploy` Action으로
   배포합니다.
4. `https://<app-name>.azurewebsites.net/health`가 `{"status":"ok"}`를 반환하는지
   확인합니다.
5. `main`에 frontend 변경을 push하면 `Deploy frontend to Azure Static Web Apps`가
   `frontend`에서 `npm ci`, `npm run build` 후 공식 Static Web Apps Action으로
   `dist`를 배포합니다.
6. Static Web App에서 `/login`, `/stats` 같은 history 경로를 직접 열거나
   새로고침해도 앱이 표시되는지 확인합니다.

워크플로는 해당 monorepo 경로가 변경될 때만 실행되며 수동 실행도 지원합니다.
기존 `render.yaml`은 Render 배포용으로 계속 유지됩니다.

## XP & 레벨 시스템

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
