<a id="readme-top"></a>

<br />
<div align="center">
  <a href="https://github.com/lucas-sva/Lembrei">
    <img src="assets/logo.png" alt="Logo" width="180" height="180">
  </a>

<h3 align="center">Lembrei</h3>

  <p align="center">
    Plataforma de Aprendizado Ativo e Resolução Otimizada de Questões
    <br />
    <a href="docs/architecture.md"><strong>Explore a documentação »</strong></a>
    <br />
    <br />
  </p>
</div>

## Sobre o projeto

Lembrei é um motor de repetição espaçada (SRS) desenhado para ir além dos flashcards tradicionais. Focado em alta performance e minimalismo, ele oferece um ambiente interativo para resolução de questões complexas, introduzindo recursos visuais táticos como a "eliminação por tesoura" e categorização dinâmica.

A diferença central está no foco em **questões de múltipla escolha com assertivas**, o formato dominante em concursos públicos, exames da OAB, Revalida e certificações técnicas. O sistema agenda revisões com base no desempenho real do usuário usando o algoritmo **FSRS-4.5**, considerado o estado da arte em memorização otimizada.

<br />

## Arquitetura e Design Técnico

A arquitetura do sistema foi projetada para garantir uma experiência Desktop fluida e de baixo consumo:

<spam></spam>

* **Core Engine:** Backend em **Rust via Tauri v2**, expondo comandos IPC ao frontend React. O motor SRS implementa o algoritmo **FSRS-4.5** (Free Spaced Repetition Scheduler), que calcula dinamicamente a estabilidade de memória (`S`), dificuldade (`D`) e retenção prevista (`R`) de cada cartão. Intervalos de revisão são otimizados para 90% de retenção alvo.

<spam></spam>

* **Persistência de Dados:** **SQLite** com `rusqlite` (feature `bundled` — sem dependência externa do sistema). O banco é armazenado localmente no diretório de dados do app (`AppData` no Windows). WAL mode habilitado para escritas não bloqueantes e `foreign_keys=ON` para integridade referencial garantida.

### Modelo de dados

```
preparacoes          ← contexto de um concurso/prova
  └── decks          ← agrupamento temático dentro da preparação
        └── cartoes  ← questões de múltipla escolha ou assertivas
              ├── alternativas
              ├── assertivas
              ├── tags
              ├── estado_srs       ← estado FSRS por cartão
              └── historico_revisoes
```

**Migração automática:** o banco é migrado automaticamente ao iniciar. Instalações anteriores (sem `preparacoes`) recebem automaticamente uma preparação "Geral" com todos os decks existentes atribuídos a ela.

### Rotas

| Rota | Tela |
|------|------|
| `/` | PreparacoesPage — lista de preparações |
| `/preparacao/:prepId` | DecksPage — decks da preparação |
| `/painel/:deckId` | PainelPage — cartões do deck com filtros SRS |
| `/editor/:deckId` | EditorPage — criar cartão |
| `/editor/:deckId/:cartaoId` | EditorPage — editar cartão existente |
| `/revisar/:deckId` | ReviewPage — sessão de revisão espaçada |
| `/importar/:deckId` | ImportarPage — gerador de prompt + importação JSON |
| `/estatisticas` | EstatisticasPage — gráficos e métricas |

### Comandos Tauri (IPC)

| Comando | Descrição |
|---------|-----------|
| `listar_preparacoes` / `criar_preparacao` / `atualizar_preparacao` / `deletar_preparacao` / `buscar_preparacao` | CRUD de preparações |
| `listar_decks` / `listar_decks_da_preparacao` / `buscar_deck` / `criar_deck` / `atualizar_deck` / `deletar_deck` / `estatisticas_deck` | CRUD e stats de decks |
| `listar_cartoes_completos_do_deck` / `buscar_cartao_completo` / `criar_cartao` / `atualizar_cartao` / `deletar_cartao` / `buscar_cartoes_para_revisao` / `importar_cartoes_lote` | CRUD de cartões |
| `registrar_revisao` / `historico_revisoes` / `estatisticas_detalhadas_deck` | Revisões e métricas FSRS |

### Estrutura da Solução

```plaintext
lembrei/
├── src/                            # Frontend React + TypeScript
│   ├── components/                 # Componentes de UI reutilizáveis
│   │   ├── Alternativa.tsx
│   │   ├── Assertiva.tsx
│   │   ├── BarraProgresso.tsx
│   │   ├── BotoesSrs.tsx
│   │   ├── CartaoRevisao.tsx
│   │   └── charts/                 # BarChart, DonutChart, LineChart, StudyCalendar
│   ├── lib/
│   │   └── tauri.ts                # Wrapper tipado para invoke do Tauri
│   ├── pages/
│   │   ├── PreparacoesPage.tsx     # Home — lista de preparações/concursos
│   │   ├── DecksPage.tsx           # Decks dentro de uma preparação
│   │   ├── PainelPage.tsx          # Gestão de cartões com filtros SRS
│   │   ├── EditorPage.tsx          # Criar / editar cartão
│   │   ├── ReviewPage.tsx          # Sessão de revisão espaçada
│   │   ├── ImportarPage.tsx        # Gerador de prompt IA + importação JSON
│   │   └── EstatisticasPage.tsx    # Métricas e gráficos por deck
│   ├── stores/
│   │   ├── preparacoesStore.ts     # Estado global de preparações
│   │   ├── decksStore.ts           # Estado global de decks (por preparação)
│   │   └── revisaoStore.ts         # Estado da sessão de revisão ativa
│   ├── types/
│   │   └── index.ts                # Contratos de dados TypeScript
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                      # Backend Rust
│   ├── src/
│   │   ├── commands/
│   │   │   ├── preparacoes.rs      # CRUD de preparações
│   │   │   ├── decks.rs
│   │   │   ├── cartoes.rs
│   │   │   └── revisoes.rs
│   │   ├── database/
│   │   │   ├── mod.rs              # Camada de acesso a dados (SQLite)
│   │   │   └── schema.sql          # DDL — CREATE TABLE IF NOT EXISTS
│   │   ├── models/
│   │   │   └── mod.rs              # Structs do domínio
│   │   ├── srs/
│   │   │   └── mod.rs              # Algoritmo FSRS-4.5
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
└── assets/
    └── logo.png
```

### Built With

[![Tauri][tauri-shield]][tauri-url]
[![Rust][rust-shield]][rust-url]
[![React][react-shield]][react-url]
[![TypeScript][ts-shield]][ts-url]
[![Tailwind][tailwind-shield]][tailwind-url]
[![SQLite][sqlite-shield]][sqlite-url]

[tauri-shield]: https://img.shields.io/badge/Tauri_v2-24C8D8?style=for-the-badge&logo=tauri&logoColor=white
[tauri-url]: https://tauri.app
[rust-shield]: https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white
[rust-url]: https://www.rust-lang.org
[react-shield]: https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[react-url]: https://react.dev
[ts-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[ts-url]: https://www.typescriptlang.org
[tailwind-shield]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[tailwind-url]: https://tailwindcss.com
[sqlite-shield]: https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white
[sqlite-url]: https://www.sqlite.org

<br />

## Como começar

Siga os passos abaixo para configurar o ambiente de desenvolvimento local.

### Pré-requisitos

* **Rust** (toolchain estável) — [instalar via rustup](https://rustup.rs/)
* **Node.js** >= 20 — [nodejs.org](https://nodejs.org/)
* **npm** >= 10
* Dependências do sistema para o Tauri — [guia oficial](https://tauri.app/start/prerequisites/)

### Instalação

1. Clone o repositório:
```sh
git clone https://github.com/lucas-sva/Lembrei.git
cd Lembrei
```

2. Instale as dependências Node.js:
```sh
npm install
```

3. Execute em modo de desenvolvimento (compila Rust + inicia Vite):
```sh
npm run tauri dev
```

4. Para gerar o instalador de produção:
```sh
npm run tauri build
```

O binário gerado estará em `src-tauri/target/release/bundle/`.

<br />

## Contato

Lucas Silva - [LinkedIn](https://www.linkedin.com/in/-lucassva/) - lucas.sva@outlook.com

<p align="right">(<a href="#readme-top">voltar ao topo</a>)</p>
