# Checklist de Implementação — Aplicação Modelo Comercial

## App Mobile

### Autenticação e Onboarding
- [x] Login com email e senha
- [x] Cadastro de novo usuário
- [x] Persistência de sessão (AsyncStorage)
- [x] Tela de boas-vindas (WelcomeScreen)
- [x] Solicitação de permissões (localização e notificações)
- [x] Rastreamento de último login
- [x] Correção Firebase devtools crash em APK produção (`global.top = global`)
- [ ] Login com Google / Apple (OAuth social)
- [ ] Recuperação de senha por email
- [ ] Onboarding tutorial para novos usuários

### Perfil e Credencial
- [x] Visualização e edição de perfil
- [x] Credencial digital personalizável (avatar, badge, cor)
- [x] Links sociais (LinkedIn, Instagram, WhatsApp) com privacidade
- [x] Foto de perfil via câmera/galeria
- [ ] QR Code da credencial para networking presencial
- [ ] Edição de dados cadastrais (nome, telefone, endereço)
- [ ] Exclusão de conta

### Cursos e Aprendizagem
- [x] Listagem de cursos ativos
- [x] Barra de progresso por curso
- [x] Estrutura de módulos com desbloqueio sequencial
- [x] Player de vídeo (expo-av) com controle de conclusão
- [x] Marcar lição como concluída ao assistir completo
- [x] Marcar módulo como concluído
- [x] Exame ao final de cada módulo
- [x] Sincronização de progresso em tempo real (Firestore)
- [ ] Download de vídeo para modo offline
- [ ] Continuar de onde parou (seek position salvo)
- [ ] Legendas/transcrição das lições
- [ ] Busca/filtro de cursos por nome ou categoria

### Certificações e Provas
- [x] Listagem de certificações disponíveis
- [x] Geração de prova por IA (GPT-4o-mini) com contexto SUSEP
- [x] Modo treino com feedback educativo por questão
- [x] Modo avaliação com pontuação final
- [x] Validação de nota mínima para certificado
- [x] Registro de tentativas no Firestore
- [x] Regras de compliance por certificação (CanSay / CantSay)
- [ ] Limite de tentativas por certificação
- [ ] Prazo de validade de certificação (revalidação periódica)
- [ ] Revisão das questões após a prova (gabarito comentado)

### Certificados
- [x] Listagem de certificados conquistados
- [x] Detalhe do certificado com dados completos
- [x] QR Code de validação no certificado
- [x] Export do certificado em PDF
- [x] Compartilhamento do certificado
- [x] Data de emissão e validade exibidas
- [ ] Página pública de validação de certificado via QR Code (web)
- [ ] Notificação de expiração próxima do certificado

### Ranking — Vendas
- [x] Aba "Vendas" no ranking com dados do mês corrente
- [x] Card resumo com total de vendas e valor do mês
- [x] Medalhas para top 3 (ouro, prata, bronze)
- [x] Card de meta: título, valor-alvo e/ou quantidade-alvo por vendedor
- [x] Contador regressivo ao vivo até o prazo da meta
- [x] Barra de progresso animada por vendedor (Animated.View)
- [x] Cor adaptativa da barra: verde/âmbar/vermelho/dourado conforme % atingido
- [x] Percentual da meta exibido por vendedor
- [ ] Histórico de meses anteriores
- [ ] Notificação quando meta é atingida

### Ranking — Engajamento
- [x] Aba "Engajamento" com ranking em tempo real
- [x] Filtros: total, semanal e mensal
- [x] Destaque da posição do usuário logado
- [x] Sistema de pontos por ações (lições, provas)
- [x] Badges (cursos, certificados, streaks)
- [ ] Notificação quando usuário sobe de posição

### Assistente IA
- [x] Interface de chat com histórico
- [x] Envio de imagens para análise (multimodal)
- [x] Base de conhecimento via PDFs do admin
- [x] Persona e orientações configuráveis pelo admin
- [ ] Sugestões de perguntas frequentes
- [ ] Limite de mensagens por dia
- [ ] Avaliação de resposta (útil / não útil)

### Notificações Push
- [x] Registro do token de push no login
- [x] Recebimento de notificações (foreground e background)
- [ ] APK release assinado (necessário para push em produção)
- [ ] Central de notificações dentro do app
- [ ] Preferências de notificação por categoria

### Keyboard Avoidance (Android)
- [x] `KeyboardAvoidingView` com `behavior="height"` no `ScreenWrapper`
- [x] AssistantScreen com `behavior="height"` para Android

---

## Painel Admin Web

### Autenticação Admin
- [x] Login de administrador
- [x] Cadastro de novo admin com registro em `admins`
- [x] Auth secundário para criar usuários sem deslogar o admin
- [ ] Controle de roles de admin (super admin vs admin comum)
- [ ] Recuperação de senha

### Gestão de Cursos
- [x] Criar e editar cursos
- [x] Adicionar módulos ao curso
- [x] Adicionar lições com upload de vídeo
- [x] Upload de vídeo via Cloud Function (contorna ERR_HTTP2_PROTOCOL_ERROR)
- [x] Adicionar exame por módulo com contexto IA
- [ ] Reordenar módulos e lições (drag and drop)
- [ ] Duplicar curso existente
- [ ] Preview do curso antes de publicar
- [ ] Relatório de progresso por curso

### Gestão de Usuários
- [x] Listagem de usuários cadastrados
- [x] Criar novo usuário pelo painel
- [ ] Editar dados de usuário
- [ ] Desativar / bloquear usuário
- [ ] Exportar lista de usuários (CSV)
- [ ] Ver progresso individual de cada usuário

### Ranking de Vendas (novo)
- [x] Registrar vendas mensais por vendedor (qtd + valor)
- [x] Selector de competência para navegar entre meses
- [x] Tabela com medalhas, avatar e dados por vendedor
- [x] Coluna "Progresso da Meta" com barra visual
- [x] Formatação de dinheiro ao vivo (máscara centavos pt-BR)
- [x] Definir meta mensal: título, valor-alvo, qtd-alvo, prazo
- [x] Card de meta com countdown ao vivo na seção admin
- [x] Botão "Painel TV" — abre `/ranking.html` em nova aba
- [ ] Histórico comparativo (mês atual vs mês anterior)
- [ ] Exportar relatório de vendas (CSV/PDF)
- [ ] Metas individuais por vendedor

### Painel Público TV
- [x] Página `/ranking.html` sem autenticação
- [x] Dois painéis: Ranking de Vendas + Top Engajamento
- [x] Atualização em tempo real (Firestore onSnapshot)
- [x] Banner de meta com countdown ao vivo
- [x] Barras de progresso animadas por vendedor
- [x] Botão tela cheia (requestFullscreen)
- [x] Relógio digital no cabeçalho
- [ ] Modo animação/carrossel automático entre rankings
- [ ] Logo da empresa configurável

### Notificações
- [x] Envio imediato para todos os usuários
- [x] Agendamento de notificação para data/hora futura
- [x] Cron de processamento de notificações pendentes
- [ ] Segmentação de envio (por grupo, curso, certificação)
- [ ] Cancelar notificação agendada

### Compliance e Certificações
- [x] Configurar regras SUSEP (canSay, cannotSay, mutualismo, promessas)
- [x] Upload de material interno em PDF com extração de texto
- [x] Configurar certificações (nota mínima, orientações, IA)
- [x] Modelos visuais de certificado (cor, fonte, fundo)
- [x] Relatório de tentativas e aprovações por usuário
- [ ] Exportar relatório de aprovados por certificação
- [ ] Versionar material interno

### Assistente IA
- [x] Configurar persona e nome do assistente
- [x] Definir orientações de comportamento
- [x] Upload de PDFs como base de conhecimento
- [ ] Visualizar histórico de conversas dos usuários
- [ ] Testar o assistente diretamente pelo painel

---

## Backend / Cloud Functions

- [x] `sendNotification` — push imediato via Firestore trigger
- [x] `processScheduledNotifications` — cron de notificações agendadas
- [x] `processInternalDocument` — extração de texto de PDFs
- [x] `generateCertificationTest` — geração de prova por GPT-4o-mini
- [x] `getTrainingFeedback` — feedback por questão errada
- [x] `askAssistant` — chatbot com histórico e visão multimodal
- [x] `getSignedUploadUrl` — URL de upload seguro para Storage (Resumable Upload)
- [x] `finalizeVideoUpload` — metadata + token de download público
- [ ] Envio de email transacional (boas-vindas, certificado emitido)
- [ ] Webhook de integração com CRM externo
- [ ] Backup automático do Firestore

## Firestore / Segurança

- [x] Firestore Security Rules básicas
- [x] Storage Security Rules básicas
- [ ] Leitura pública explícita de `sales_monthly` e `ranking_scores` (necessário para `/ranking.html`)
- [ ] Revisar e restringir regras por role
- [ ] Rate limiting nas Cloud Functions
- [ ] Validação de input nas funções callable

---

## Build e Deploy

- [x] Build APK debug local (Gradle + Android Studio JBR)
- [x] JS Bundle embutido no APK (`expo export:embed`)
- [x] `local.properties` com `sdk.dir` configurado
- [x] Deploy admin web no Firebase Hosting
- [x] Deploy completo: `firebase deploy` (hosting + functions + rules)
- [ ] APK Release assinado com keystore de produção
- [ ] AAB (Android App Bundle) para Play Store
- [ ] Build iOS (requer Mac ou EAS)
- [ ] CI/CD automatizado (EAS Build ou GitHub Actions)
- [ ] Variáveis de ambiente seguras para chaves de API
