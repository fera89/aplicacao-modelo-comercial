# Resumo de Produto — Aplicação Modelo Comercial

## O que é o produto

Plataforma completa de **treinamento, certificação e gestão comercial** para associações de proteção veicular. Reúne em um único sistema digital:

- Formação técnica dos consultores (cursos em vídeo + provas geradas por IA)
- Certificação regulatória (compliance SUSEP)
- Acompanhamento de desempenho individual e coletivo
- Gestão de metas e ranking de vendas em tempo real
- Comunicação via assistente IA e notificações push
- Painel administrativo completo para gestores
- Tela pública de ranking para a sala comercial (sem login)

**Três frentes:**
1. **App Mobile** (Android/iOS) — para consultores e colaboradores
2. **Painel Admin Web** — para gestores e administradores
3. **Painel Público TV** — tela de ranking para o monitor da equipe comercial

---

## Público-alvo

| Perfil | Onde usa | Para quê |
|--------|----------|----------|
| Consultores / Vendedores | App Mobile | Treinamentos, certificações, ranking de vendas, assistente IA |
| Colaboradores | App Mobile | Cursos, compliance, engajamento |
| Gestores / Admins | Painel Web | Criar conteúdo, gerenciar usuários, registrar vendas, definir metas |
| Equipe comercial (TV) | Painel Público | Acompanhar ranking e progresso da meta em tempo real |

---

## Funcionalidades por Frente

### App Mobile

#### Aprendizagem
- Cursos estruturados em módulos com vídeo aulas
- Barra de progresso por módulo e curso
- Desbloqueio sequencial de módulos
- Exame ao final de cada módulo gerado por IA

#### Certificação e Compliance
- Trilhas de certificação (ex: Compliance SUSEP, Vendas, Sinistros)
- Provas geradas por IA (GPT-4o-mini) com base em material interno da empresa
- Modo treino com feedback educativo por questão
- Modo avaliação com nota mínima configurável
- Certificado digital com QR Code de validação e export em PDF

#### Ranking de Desempenho
- **Aba Vendas** — ranking mensal dos melhores vendedores por valor faturado
  - Card com meta do mês: valor-alvo e/ou quantidade de vendas por vendedor
  - Contador regressivo ao vivo até o prazo da meta
  - Barra de progresso animada por vendedor (cor adapta: verde ≥75%, âmbar ≥40%, vermelho <40%, dourado 100%+)
- **Aba Engajamento** — pontuação por cursos, provas e certificados (total/semanal/mensal)
  - Medalhas para top 3
  - Destaque da posição do usuário logado

#### Assistente IA
- Chat com GPT-4o-mini especializado no negócio
- Análise de imagens (dúvidas sobre documentos, objeções de clientes)
- Base de conhecimento configurada pelo admin (PDFs, políticas, scripts de venda)
- Histórico de conversa preservado na sessão

#### Comunicação e Perfil
- Notificações push (imediatas e agendadas pelo admin)
- Perfil com credencial digital personalizável (avatar, badge, cor)
- Links sociais (LinkedIn, Instagram, WhatsApp)

---

### Painel Admin Web

#### Gestão de Conteúdo
- CRUD completo de cursos, módulos e lições com vídeo
- Upload de vídeo robusto (via Cloud Function + XHR direto, sem timeout HTTP/2)
- Configuração de provas: quantidade de questões, nota mínima, timer, randomização, contexto IA
- Upload de material interno em PDF como base de conhecimento da IA

#### Gestão de Usuários
- Listagem e cadastro de usuários sem deslogar o admin (auth secundário)
- Envio de notificações push: imediato ou agendado por data/hora

#### Ranking de Vendas
- Registrar vendas mensais por vendedor: quantidade e valor total
- Máscara de entrada de dinheiro em tempo real (formato pt-BR: `2.000.000,00`)
- Definir **meta mensal**: valor-alvo e/ou quantidade por vendedor + prazo com data/hora
- Card da meta com countdown ao vivo
- Tabela com barras de progresso individuais em tempo real
- Seletor de competência para navegar entre meses
- Botão "Painel TV" abre o painel público em nova aba

#### Compliance e Certificações
- Configurar regras SUSEP por certificação (termos permitidos, proibidos, mutualismo, promessas)
- Gerenciar trilhas de certificação com contexto individual de IA
- Modelos visuais de certificado (cor, fonte, imagem de fundo)
- Relatório de tentativas e aprovações por usuário

#### Assistente IA
- Configurar nome, persona, tom de voz e orientações do assistente
- Upload de documentos de conhecimento (PDFs, políticas, scripts de venda)

---

### Painel Público `/ranking.html`

Tela projetada para **monitor na sala da equipe comercial**:

- Exibe lado a lado: **Ranking de Vendas** e **Top Engajamento**
- Atualização automática em tempo real (Firestore live)
- Banner dourado com dados da meta: título, valor-alvo, quantidade-alvo, prazo
- Contador regressivo ao vivo (dias, horas, minutos, segundos)
- Barra de progresso por vendedor com cor adaptativa
- Botão de tela cheia nativa (`requestFullscreen`)
- Relógio digital no cabeçalho
- **Sem login necessário** — URL pública

---

## Infraestrutura

| Serviço | Uso |
|---------|-----|
| Firebase Auth | Login email/senha, sessão persistente |
| Firestore | Banco de dados NoSQL em tempo real |
| Firebase Storage | Vídeos das aulas, PDFs, imagens |
| Firebase Hosting | Admin web + painel público |
| Cloud Functions | Lógica de backend (IA, notificações, upload seguro) |
| OpenAI GPT-4o-mini | Geração de provas, feedback, chatbot |
| Expo Push API | Notificações push para o app |

---

## Identidade Visual

- Cor primária: `#10b981` (verde esmeralda)
- Cor secundária: `#2e7d32`
- Tema configurável via `src/theme/Theme.js`
- Painel TV: dark theme com destaque dourado para metas e top 3
