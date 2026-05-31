# Arquitetura do Lembrei

## 1. Decisão de Stack: Por que Tauri v2 + Rust + React?

### Alternativas consideradas

| Stack | Tamanho binário | RAM idle | Inicialização | Decisão |
|-------|----------------|----------|---------------|---------|
| **Tauri v2 + Rust** | ~8–15 MB | ~20–35 MB | ~300ms | ✅ **Escolhida** |
| Electron + React | ~150–250 MB | ~120–200 MB | ~1.5–3s | ❌ Pesado demais |
| Flutter Desktop | ~25–40 MB | ~40–80 MB | ~500ms | ❌ Dart — ecossistema menor |
| Qt (C++) | ~10–20 MB | ~15–25 MB | ~200ms | ❌ Curva de aprendizado, UI datada |
| Wails (Go) | ~15–25 MB | ~25–45 MB | ~400ms | ❌ Ecossistema menor que Rust |

**Tauri v2** entrega performance próxima ao nativo usando a WebView do sistema operacional (WebView2 no Windows, WKWebView no macOS, WebKitGTK no Linux) e um backend Rust para lógica pesada. O resultado: binário leve, baixo consumo de memória e inicialização rápida — requisitos centrais para um app desktop que precisa ser acessado rapidamente durante estudos.

O **frontend React + TypeScript + Tailwind** foi escolhido pela produtividade, ecossistema maduro e tipagem forte que garante consistência na interface IPC entre Rust e JavaScript.

---

## 2. Arquitetura de Camadas

```
┌─────────────────────────────────────────────────┐
│              Frontend (React/TypeScript)        │
│  ┌────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │   Pages    │  │  Components │  │  Stores  │  │
│  │  (Rotas)   │  │  (UI/UX)    │  │ (Zustand)│  │
│  └────────────┘  └─────────────┘  └──────────┘  │
│              ↕  @tauri-apps/api invoke          │
├─────────────────────────────────────────────────┤
│            Backend Rust (Tauri Commands)        │
│  ┌────────────────┐  ┌──────────────────────┐   │
│  │   commands/    │  │        srs/          │   │
│  │ (IPC handlers) │  │  (Motor FSRS-4.5)    │   │
│  └────────────────┘  └──────────────────────┘   │
│              ↕  rusqlite                        │
├─────────────────────────────────────────────────┤
│  Persistência: SQLite (WAL mode)                │
│  decks → cartoes → alternativas/assertivas/tags │
│  estado_srs ← historico_revisoes                │
└─────────────────────────────────────────────────┘
```

---

## 3. Algoritmo SRS: FSRS-4.5

### Por que FSRS e não SM-2?

O SM-2 (SuperMemo 2, criado em 1987) usa uma fórmula linear simples baseada em EF (ease factor). O FSRS-4.5 é fundamentado em modelos cognitivos modernos de memória de longo prazo (Teoria da Memória Bifatorial) e foi validado empiricamente com milhões de revisões reais do Anki.

Vantagens do FSRS-4.5:
- Intervalos mais precisos (menos revisões desnecessárias, menos esquecimentos)
- Modela `estabilidade` e `dificuldade` de forma independente
- Parâmetros treináveis por usuário (futuro)
- Open-source, bem documentado

### Conceitos Fundamentais

| Variável | Símbolo | Significado |
|----------|---------|-------------|
| Estabilidade | S | Número de dias até 90% de chance de esquecer |
| Dificuldade | D | Escala 1–10 (1=fácil, 10=difícil) |
| Retenção | R | Probabilidade atual de recordar (0–1) |

### Curva de Esquecimento

```
R(t, S) = (1 + FACTOR × t/S)^DECAY

onde:
  DECAY  = -0.5
  FACTOR = 19/81 ≈ 0.2346   (= 0.9^(1/DECAY) - 1)
  t      = dias desde a última revisão
```

Para `t = S` (passou exatamente S dias): `R = 0.9` (90% de retenção) — por definição.

### Próximo Intervalo

```
I(S, r_alvo=0.9) ≈ S  (quando r_alvo = 90%)
```

A estabilidade **é** o intervalo em dias para 90% de retenção. Elegante e intuitivo.

### Atualização de Estabilidade após Recordar

```
S'_r(D, S, R, G) = S × (e^w8 × (11-D) × S^(-w9) × (e^(w10×(1-R)) - 1) + 1)
                  × penalidade_dificil(G) × bonus_facil(G)
```

### Atualização de Estabilidade após Esquecer

```
S'_f(D, S, R) = w11 × D^(-w12) × ((S+1)^w13 - 1) × e^(w14×(1-R))
```

### Atualização de Dificuldade

```
D'(D, G) = reversão_à_media(D_0(4), D - w6×(G-3))
         = w7 × D_0(4) + (1 - w7) × (D - w6×(G-3))
```

### Parâmetros Padrão FSRS-4.5

```
w = [0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589,
     1.5330, 0.1544, 1.0071, 1.9395,  0.1100, 0.2900, 2.2700, 0.2900, 2.9898]
```

Os 4 primeiros são as estabilidades iniciais para Esqueci/Difícil/Bom/Fácil.

### Estados do Cartão

```
Novo ──(primeira revisão)──→ Aprendendo / Revisão
Revisão ──(Esqueci)──→ Reaprendendo ──(Bom/Fácil)──→ Revisão
Reaprendendo ──(Esqueci novamente)──→ Reaprendendo (lapso++)
```

---

## 4. Comunicação IPC Frontend ↔ Backend

O Tauri expõe funções Rust como "comandos" invocáveis pelo JavaScript:

```typescript
// Frontend
import { invoke } from '@tauri-apps/api/core'
const decks = await invoke<Deck[]>('listar_decks')
```

```rust
// Backend
#[tauri::command]
fn listar_decks(state: tauri::State<'_, AppState>) -> Result<Vec<Deck>, String> {
    state.db.lock().unwrap().listar_decks().map_err(|e| e.to_string())
}
```

Toda a serialização é automática via `serde_json`. Os tipos TypeScript em `src/types/index.ts` devem espelhar exatamente as structs Rust (snake_case → camelCase é tratado pelo serde com `#[serde(rename_all = "camelCase")]`).

---

## 5. Decisões de Design Notáveis

### SQLite com WAL
`PRAGMA journal_mode=WAL` permite leituras e escritas concorrentes sem bloqueio de página completa. Fundamental para responsividade durante sessões de revisão longas.

### rusqlite com feature `bundled`
Compila o SQLite diretamente no binário. Zero dependência de instalação do SQLite no sistema do usuário — crítico para distribuição desktop.

### std::sync::Mutex (não tokio)
rusqlite é síncrono. Usar `std::sync::Mutex<Database>` no estado Tauri é mais simples e correto do que `tokio::sync::Mutex` com `spawn_blocking`. Comandos Tauri são executados em thread pool, então não há bloqueio da thread principal.

### Zustand (não Redux/Context)
Para o tamanho deste app, Zustand entrega gerenciamento de estado global sem boilerplate excessivo do Redux e sem os problemas de re-render do React Context.
