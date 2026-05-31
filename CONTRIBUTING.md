# Guia de Contribuição — Lembrei

Obrigado por considerar contribuir com o Lembrei! Este documento descreve como configurar o ambiente, rodar o projeto e enviar suas contribuições.

---

## Índice

- [Pré-requisitos](#pré-requisitos)
- [Configurando o ambiente](#configurando-o-ambiente)
- [Rodando em desenvolvimento](#rodando-em-desenvolvimento)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Fluxo de contribuição](#fluxo-de-contribuição)
- [Padrões de código](#padrões-de-código)
- [Commits](#commits)
- [Enviando um Pull Request](#enviando-um-pull-request)

---

## Pré-requisitos

Antes de começar, instale as dependências de sistema:

### Rust
```sh
# Instala rustup (gerenciador de toolchains Rust)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Confirme a instalação
rustc --version   # >= 1.77
cargo --version
```

### Node.js
- Versão **>= 20 LTS**
- Recomendamos o uso do [nvm](https://github.com/nvm-sh/nvm) ou [fnm](https://github.com/Schniz/fnm)

```sh
node --version    # >= 20.x
npm --version     # >= 10.x
```

### Dependências de sistema (Tauri)

Siga o guia oficial para o seu sistema operacional:
- [Windows](https://tauri.app/start/prerequisites/#windows)
- [macOS](https://tauri.app/start/prerequisites/#macos)
- [Linux](https://tauri.app/start/prerequisites/#linux)

---

## Configurando o ambiente

```sh
# 1. Fork o repositório e clone o fork
git clone https://github.com/SEU_USUARIO/Lembrei.git
cd Lembrei

# 2. Instale as dependências JavaScript
npm install

# 3. (Opcional) Verifique se o ambiente Tauri está funcional
npm run tauri info
```

---

## Rodando em desenvolvimento

```sh
# Inicia o servidor Vite (frontend) e compila o Rust simultaneamente
npm run tauri dev
```

A primeira compilação do Rust pode levar alguns minutos. As subsequentes são incrementais e rápidas.

Para rodar apenas o frontend (sem janela Tauri):
```sh
npm run dev
# Acesse http://localhost:1420
```

---

## Estrutura do projeto

```
lembrei/
├── src/              # Frontend React/TypeScript
├── src-tauri/        # Backend Rust (Tauri)
│   └── src/
│       ├── commands/ # IPC: handlers chamados pelo frontend
│       ├── database/ # Camada de persistência SQLite
│       ├── models/   # Structs de domínio
│       └── srs/      # Algoritmo FSRS-4.5
└── docs/             # Documentação técnica
```

Leia [`docs/architecture.md`](docs/architecture.md) para entender as decisões técnicas.

---

## Fluxo de contribuição

1. Crie uma branch a partir de `main`:
   ```sh
   git checkout -b feat/minha-funcionalidade
   # ou
   git checkout -b fix/nome-do-bug
   ```

2. Implemente suas mudanças seguindo os [padrões de código](#padrões-de-código).

3. Rode a verificação de tipos:
   ```sh
   npm run lint          # TypeScript
   cargo check           # Rust (dentro de src-tauri/)
   ```

4. Commit e push:
   ```sh
   git commit -m "feat: adiciona exportação de decks em CSV"
   git push origin feat/minha-funcionalidade
   ```

5. Abra um Pull Request no GitHub.

---

## Padrões de código

### Rust
- Formate com `cargo fmt` antes de commitar
- Sem warnings de `cargo clippy`
- Nomes de funções e variáveis em `snake_case`, structs em `PascalCase`

### TypeScript / React
- Componentes funcionais com hooks
- Props tipadas com interfaces TypeScript
- Nenhum `any` explícito
- Tailwind para estilos (sem CSS-in-JS)

---

## Commits

Seguimos o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

| Prefixo    | Uso                                          |
|------------|----------------------------------------------|
| `feat:`    | Nova funcionalidade                          |
| `fix:`     | Correção de bug                              |
| `refactor:`| Refatoração sem mudança de comportamento     |
| `docs:`    | Apenas documentação                          |
| `test:`    | Testes                                       |
| `chore:`   | Tarefas de build, CI, dependências           |
| `perf:`    | Melhoria de performance                      |

Exemplo:
```
feat(srs): implementa atualização de dificuldade adaptativa no FSRS-4.5
```

---

## Enviando um Pull Request

- Descreva claramente **o problema que o PR resolve** ou **a funcionalidade que adiciona**
- Referencie issues relacionadas com `Closes #123`
- PRs que quebram a API IPC (Rust ↔ TypeScript) devem atualizar os tipos em `src/types/index.ts`
- Mantenha PRs focados — um PR, uma responsabilidade

Dúvidas? Abra uma [Discussion](https://github.com/lucas-sva/Lembrei/discussions) no GitHub.
