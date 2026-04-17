# Resumo Técnico — Aplicação Modelo Comercial

## Visão Geral da Arquitetura

Plataforma multi-frente para treinamento, certificação e gestão comercial de associações de proteção veicular.

**Frentes:**
- **App Mobile** — React Native (Expo SDK 54) para Android/iOS
- **Painel Admin Web** — Vite + Vanilla JS (SPA, sem framework)
- **Painel Público TV** — Página estática sem auth (`/ranking.html`) para exibição em monitor
- **Backend Serverless** — Firebase Cloud Functions (Node.js 20)
- **Banco / Auth / Storage** — Firebase (Firestore, Auth, Storage, Analytics)
- **IA** — OpenAI GPT-4o-mini (geração de provas, feedback por questão, chatbot multimodal)
- **Push Notifications** — Expo Push Notification API

```
App Mobile (React Native / Expo SDK 54)
        │
        ▼
FirebaseService.js  ←→  Firebase Auth / Firestore / Storage
        │
        ▼
Cloud Functions (Node.js 20, us-central1)
        ├──→ OpenAI GPT-4o-mini  (provas, feedback, assistente)
        ├──→ Expo Push API       (notificações)
        └──→ Firebase Storage    (upload seguro de vídeo via Resumable Upload)

Painel Admin Web (Vite 7 / Vanilla JS)
        │
        ▼
Firebase Web SDK v12  ←→  Firestore / Storage / Auth / Functions

Painel Público /ranking.html
        │
        ▼
Firestore onSnapshot (leitura pública, sem auth)
```

---

## App Mobile

### Stack
| Camada | Tecnologia |
|--------|-----------|
| Framework | React Native 0.81.5 + Expo SDK 54 |
| JS Engine | Hermes |
| Navegação | React Navigation 7 (Stack + Bottom Tabs) |
| Auth | Firebase Auth com AsyncStorage persistence |
| DB | Firestore (`experimentalForceLongPolling: true`) |
| Storage | Firebase Storage |
| Functions | Firebase Functions callable |
| Push | `expo-notifications` + Expo Push API |
| Vídeo | `expo-av` |
| Câmera | `expo-image-picker` |
| PDF | `expo-print` + `expo-sharing` |
| Icons | `@expo/vector-icons` (Ionicons) |

### Módulos do App
- **AuthScreen** — Login/Cadastro com email+senha
- **HomeScreen** — Boas-vindas, próximo treinamento, destaques, apoiadores, ESG banner
- **CoursesScreen** — Listagem de cursos e exames standalone ativos
- **CourseDetailScreen** — Detalhes do curso com progresso por módulo
- **LessonScreen** — Player de vídeo com controle de conclusão
- **CertificationTestScreen** — Prova gerada por IA com timer e feedback
- **CertificatesScreen** — Listagem de certificados conquistados
- **CertificateScreen** — Detalhe com QR Code, export PDF, compartilhamento
- **RankingScreen** — Aba Vendas (mês atual + meta + progresso) + Aba Engajamento
- **AssistantScreen** — Chat com IA multimodal (texto + imagem)
- **ProfileScreen** — Perfil, credencial digital, links sociais
- **ComplianceScreen** — Regras SUSEP: termos permitidos/proibidos
- **PermissionsScreen** — Solicitação de permissões de sistema
- **WelcomeScreen** — Onboarding inicial

### Firebase Config Fix (produção APK)
Firebase v12 detecta React Native como "embedded environment" via `window !== window.top`. Correção em `src/services/firebaseConfig.js`:
```js
if (typeof global !== 'undefined') {
    global.top = global;            // window.top === window → passa a verificação
    global.__FIREBASE_DEFAULTS__ = {};
}
```
Todos os `import` foram movidos para o topo do arquivo (Metro hoisting em produção executava o código APÓS `initializeApp`).

---

## Painel Admin Web

### Stack
| Camada | Tecnologia |
|--------|-----------|
| Build | Vite 7 |
| Linguagem | Vanilla JS (ES Modules) |
| Firebase | Web SDK v12 |
| Hosting | Firebase Hosting (`admin_web/dist`) |
| PDF parsing | PDF.js (worker) |

### Módulos Admin
| Arquivo | Responsabilidade |
|---------|-----------------|
| `main.js` | SPA router, auth guard, lazy-load de módulos |
| `src/firebase.js` | Inicialização Firebase + auth secundário para criar usuários |
| `src/usuarios.js` | CRUD de usuários (secondaryAuth para não deslogar o admin) |
| `src/cursos.js` | CRUD cursos/módulos/lições + upload de vídeo via Cloud Function |
| `src/compliance.js` | Gestão de certificações, modelos de certificado, relatório de tentativas |
| `src/notificacoes.js` | Envio imediato e agendamento de push notifications |
| `src/assistant.js` | Configuração de persona e base de conhecimento do assistente IA |
| `src/vendas.js` | Registro de vendas mensais, metas com countdown ao vivo, barras de progresso |

### Upload de Vídeo
Problema: Firebase SDK usa `upload_protocol=resumable` via HTTP/2 que reinicia a conexão.
Solução implementada:
1. Admin solicita URL via Cloud Function `getSignedUploadUrl` (usa `createResumableUpload` com OAuth — sem `iam.serviceAccounts.signBlob`)
2. Browser faz `XHR PUT` diretamente para a URL com progress tracking
3. Após upload, `finalizeVideoUpload` seta metadata e gera token de download público

---

## Painel Público `/ranking.html`

- Página estática sem autenticação
- Dois painéis: **Ranking de Vendas do Mês** e **Top Engajamento**
- Atualização em tempo real via Firestore `onSnapshot`
- Banner de meta com countdown ao vivo (atualiza só o elemento DOM do timer, sem re-render da lista)
- Barra de progresso animada por vendedor com cor adaptativa
- Botão de tela cheia (`requestFullscreen`) para uso em TV/monitor
- URL: `https://prot-veicul-base.web.app/ranking.html`

---

## Cloud Functions

| Função | Tipo | Descrição |
|--------|------|-----------|
| `sendNotification` | Firestore trigger | Push imediato ao criar doc em `notifications` |
| `processScheduledNotifications` | Cron (1/min) | Processa notificações com `scheduledFor <= now` |
| `processInternalDocument` | Callable | Extrai texto de PDF enviado pelo admin |
| `generateCertificationTest` | Callable | Gera N questões via GPT-4o-mini com contexto SUSEP |
| `getTrainingFeedback` | Callable | Feedback educativo por questão errada |
| `askAssistant` | Callable | Chat com GPT-4o-mini (histórico + visão multimodal) |
| `getSignedUploadUrl` | Callable | Cria Resumable Upload URL para vídeo no Storage |
| `finalizeVideoUpload` | Callable | Seta metadata e retorna URL pública de download |

---

## Estrutura Firestore

| Coleção | Descrição |
|---------|-----------|
| `users` | Perfis de usuários do app |
| `admins` | Administradores do painel web |
| `courses` | Cursos com subcoleções `modules` → `lessons` |
| `user_progress/{uid}/courses/{courseId}` | Progresso por curso |
| `certifications` | Trilhas de certificação configuradas |
| `exams` | Provas associadas a certificações |
| `exam_attempts` | Tentativas de prova por usuário |
| `certificates` | Certificados emitidos |
| `certificate_templates` | Modelos visuais de certificado |
| `ranking_scores` | Pontuação de engajamento (total/semanal/mensal) |
| `points_log` | Auditoria de pontos ganhos |
| `sales_monthly` | Vendas por vendedor/mês (`{userId}_{YYYY-MM}`) |
| `sales_goals` | Meta mensal de vendas (`{YYYY-MM}`) |
| `notifications` | Notificações push agendadas/enviadas |
| `assistant_config` | Configuração global do assistente IA |
| `esg_responses` | Check-ins ESG dos participantes |
| `events` | Eventos com programação multi-dia |
| `highlights` | Destaques da Home |
| `sponsors` | Apoiadores/patrocinadores |

---

## Build e Deploy

### APK Android
```bash
# Bundle JS (sem Metro server)
npx expo export:embed \
  --platform android --dev false \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

# Compilar APK (requer Android Studio JBR + SDK)
cd android
JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" \
  ./gradlew assembleDebug
```
O `android/local.properties` deve conter: `sdk.dir=C:\Users\{user}\AppData\Local\Android\Sdk`

### Admin Web
```bash
cd admin_web
npm run build
firebase deploy --only hosting --project prot-veicul-base
```

### Deploy Completo
```bash
firebase deploy --project prot-veicul-base
# Deploy: hosting + functions + firestore.rules + storage.rules
```
