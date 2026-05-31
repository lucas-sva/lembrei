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

### Estrutura da Solução

```plaintext
lembrei/
├── src/                        # Frontend React + TypeScript
│   ├── components/             # Componentes de UI reutilizáveis
│   │   ├── Alternativa.tsx     # Bloco interativo com ação "tesoura"
│   │   ├── Assertiva.tsx       # Item de julgamento (numeração romana)
│   │   ├── BarraProgresso.tsx  # Progresso da sessão de revisão
│   │   ├── BotoesSrs.tsx       # Botões de avaliação SRS (Esqueci/Bom/Fácil)
│   │   ├── CartaoRevisao.tsx   # Orquestrador da experiência de revisão
│   │   └── MetaTags.tsx        # Chips visuais de categorização
│   ├── lib/
│   │   └── tauri.ts            # Wrapper tipado para invoke do Tauri
│   ├── pages/                  # Telas da aplicação
│   │   ├── DecksPage.tsx
│   │   ├── EditorPage.tsx
│   │   └── ReviewPage.tsx
│   ├── stores/                 # Estado global via Zustand
│   │   ├── decksStore.ts
│   │   └── revisaoStore.ts
│   ├── types/
│   │   └── index.ts            # Contratos de dados TypeScript
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                  # Backend Rust
│   ├── src/
│   │   ├── commands/           # Handlers IPC expostos ao frontend
│   │   │   ├── cartoes.rs
│   │   │   ├── decks.rs
│   │   │   └── revisoes.rs
│   │   ├── database/
│   │   │   ├── mod.rs          # Camada de acesso a dados (SQLite)
│   │   │   └── schema.sql      # DDL do banco de dados
│   │   ├── models/
│   │   │   └── mod.rs          # Structs do domínio (Deck, Cartao, etc.)
│   │   ├── srs/
│   │   │   └── mod.rs          # Implementação do algoritmo FSRS-4.5
│   │   ├── lib.rs              # Ponto de entrada da lib Tauri
│   │   └── main.rs
│   ├── capabilities/
│   │   └── default.json        # Permissões Tauri v2
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/
│   ├── architecture.md         # Decisões técnicas e justificativas
│   └── data-model.md           # Modelagem de dados e relacionamentos
├── assets/
│   └── logo.png
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
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
