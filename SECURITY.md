# Política de Segurança — Lembrei

## Versões Suportadas

| Versão | Suportada          |
|--------|--------------------|
| 0.x    | ✅ Ativa           |

---

## Reportando uma Vulnerabilidade

**Não abra uma issue pública para vulnerabilidades de segurança.**

Se você descobriu uma vulnerabilidade no Lembrei, por favor reporte de forma responsável:

1. **E-mail:** Envie os detalhes para **lucas.sva@outlook.com** com o assunto `[SECURITY] Lembrei - <descrição breve>`
2. **Conteúdo do relatório:** Inclua:
   - Descrição detalhada da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial (confidencialidade, integridade, disponibilidade)
   - Sugestão de mitigação, se houver

3. **Prazo de resposta:** Você receberá uma confirmação em até **72 horas** e uma avaliação completa em até **7 dias corridos**.

---

## Escopo de Segurança

Por ser uma aplicação **desktop local** (sem servidor, sem rede), a superfície de ataque é reduzida. Ainda assim, consideramos relevantes:

- **Injeção SQL** no banco SQLite local
- **Path traversal** ao salvar/carregar arquivos do usuário
- **Permissões excessivas** no `tauri.conf.json` (capabilities)
- **Deserialização insegura** de dados importados (futura funcionalidade de importação)
- **Dependências com CVEs conhecidos** (Rust crates e pacotes npm)

---

## Práticas de Segurança Adotadas

- Tauri v2 com `CSP` configurado e permissões mínimas via `capabilities/`
- SQLite com `PRAGMA foreign_keys=ON` e queries parametrizadas (sem string interpolation)
- Nenhum dado sensível do usuário é transmitido para servidores externos
- Banco de dados armazenado no diretório seguro de dados do sistema (`AppData`)

---

## Divulgação Responsável

Após a correção de uma vulnerabilidade, publicaremos um aviso de segurança no GitHub com crédito ao pesquisador (salvo solicitação de anonimato). Seguimos o prazo de **90 dias** para divulgação pública coordenada.
