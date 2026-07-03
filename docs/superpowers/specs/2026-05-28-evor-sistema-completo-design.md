# Luno — Sistema Completo de Gestão de Clínica

**Data:** 2026-05-28  
**Status:** Aprovado pelo usuário  
**Projeto:** `/Users/lucianonogueira/Projetos/Luno/sistema`  
**Stack:** Next.js + Supabase + TypeScript + Tailwind

---

## 1. Visão Geral

Sistema de gestão completo para a Luno Harmonização Facial — clínica em Teresina/PI dirigida por Luciano Nogueira (comercial/gestão) e Dra. Sarah (clínica/técnica).

O sistema centraliza toda a operação: do primeiro contato com a paciente até o fechamento financeiro, passando pela consulta clínica, prontuário, agenda e estoque.

**Usuários (apenas dois):**
- **Luciano** — Administrador. Acesso total. Responsável por comercial, financeiro, gestão e marketing.
- **Dra. Sarah** — Médica. Acesso aos módulos clínicos (agenda, prontuário, avaliações, mapa de face).

Não há recepcionista separada — Luciano faz o cadastro e o envio da anamnese.

---

## 2. Identidade Visual

**Estilo:** Moderno Premium  
**Base:** Fundo claro (#F8F5F1), cards brancos com bordas coloridas em marrom/dourado  
**Navegação:** Sidebar lateral fixa (220px) com logo, seções agrupadas e avatar do usuário

**Paleta (mantém identidade da marca):**
- Marrom escuro: `#3D2314`
- Marrom médio: `#5C3D2E`
- Dourado: `#C4A882`
- Bege: `#8B6347`
- Fundo: `#F8F5F1`
- Card: `#FFFFFF`
- Borda: `#E8D8C4`

**Componentes-chave:**
- Cards com `border-left: 4px solid [cor]` como marcador visual
- Badges coloridos por status (verde=fechado, âmbar=pendente, azul=negociação, vermelho=perdido)
- Botões: primário escuro, secundário com borda dourada, ghost transparente
- Tabelas com header em `#FDFAF7`, hover suave, sem zebra agressiva

---

## 3. Estrutura de Navegação (Sidebar)

```
ÉVOR
Harmonização Facial

── Visão Geral
   ⊞ Dashboard

── Clínica
   👤 Pacientes
   📋 Agenda
   📄 Prontuário

── Comercial
   💼 Avaliações        [badge: pendentes]
   📎 Orçamentos PDF

── Financeiro
   💰 Lançamentos
   📊 DRE / Caixa
   🏦 Empréstimo

── Operações
   📦 Estoque / Insumos
   ⚗️ Procedimentos
   📈 Relatórios

── Admin
   ⚙️ Configurações

[avatar] Luciano · Administrador
```

---

## 4. Jornada da Paciente (Fluxo Principal)

```
[Recepção] Cadastra paciente no sistema
     ↓
[Sistema] Gera link de anamnese → dispara WhatsApp automaticamente
     ↓
[Paciente] Preenche anamnese no celular (dados, alergias, histórico, autorização de imagem)
     ↓
[Sistema] Recebe anamnese → notifica Dra. Sarah
     ↓
[Dra. Sarah] Abre ficha com anamnese preenchida, histórico, fotos anteriores
     ↓
[Dra. Sarah] Realiza consulta: notas clínicas, fotos padronizadas, avaliação facial
     ↓
[Dra. Sarah] Monta protocolo: seleciona procedimentos (até 3 opções)
     ↓
[Sistema] Calcula custo de insumos automaticamente → notifica Luciano
     ↓
[Luciano] Abre avaliação, define preço negociado, gera PDF/link para paciente
     ↓
[Luciano] Fecha negócio → sistema lança receita, baixa estoque, agenda retorno
     ↓
[Sistema] Envia cuidados pós-tratamento por WhatsApp após o procedimento
```

---

## 5. Módulos — 4 Fases

### Fase 1 — Design & Base (Prioridade máxima)

| Módulo | Status | Descrição |
|---|---|---|
| Design System | Novo | Sidebar, componentes, tipografia, cores, layout global |
| Dashboard | Reformar | KPIs do mês, agenda do dia, avaliações recentes, resumo financeiro, ações rápidas |
| Pacientes (CRM) | Novo | Ficha completa, histórico de consultas, canal de aquisição, indicações, aniversário |
| Avaliações | Reformar | Fluxo completo com novo design — nova avaliação, opções, negociação, fechamento |
| Estoque / Insumos | Reformar | Catálogo, custo, tiers, estoque mínimo, alerta de validade |
| Procedimentos | Reformar | Catálogo com receita de insumos, custo automático, margem, tabela de preços |

### Fase 2 — Clínica (Módulos da Dra. Sarah)

| Módulo | Status | Descrição |
|---|---|---|
| Agenda / Calendário | Novo | Agendamento, visualização dia/semana, status de confirmação |
| Anamnese Digital | Novo | Formulário via link/WhatsApp. Paciente preenche no celular. Sistema importa automaticamente |
| Termo de Consentimento | Novo | Assinatura digital antes do procedimento. Inclui: (1) consentimento clínico, (2) autorização de uso de imagem para marketing |
| Prontuário Eletrônico | Novo | Evolução por consulta, alergias, contraindicações, histórico completo |
| Mapa de Face | Novo | Diagrama interativo do rosto — Dra. marca pontos de aplicação, doses, produtos por sessão |
| Fotos Clínicas | Novo | Galeria antes/depois por paciente. Ângulos padronizados. Flag de autorização de marketing |

### Fase 3 — Financeiro & Comercial

| Módulo | Status | Descrição |
|---|---|---|
| Financeiro Completo | Integrar | Portar o `luno-sistema (2).html` para o Next.js: lançamentos, DRE, fluxo de caixa, empréstimo, relatório contador |
| Pós-Tratamento | Novo | Cuidados pós-procedimento, agendamento de retorno automático, acompanhamento de evolução |
| Orçamento PDF / Link | Novo | Gerar proposta visual com opções de tratamento para enviar por WhatsApp |
| Tabela de Preços & Pacotes | Novo | Pacotes com preços especiais, promoções sazonais, combos |
| Programa de Indicações | Novo | Rastrear quem indicou quem, bônus para pacientes indicadores |

### Fase 4 — Inteligência & Admin

| Módulo | Status | Descrição |
|---|---|---|
| Relatórios | Novo | Procedimentos mais realizados, receita por período, ranking de pacientes |
| Controle de Lotes | Novo | Número de lote e validade por produto (ANVISA). Rastrear qual lote foi usado em qual paciente |
| Usuários & Perfis | Expandir | Controle de acesso: Luciano vê tudo, Dra. Sarah vê módulos clínicos apenas |

**Total: 19 módulos** (5 a reformar, 13 novos, 1 a integrar do HTML)

---

## 6. Banco de Dados — Tabelas Novas Necessárias

Além das tabelas existentes (`profiles`, `insumos`, `procedimentos`, `procedimento_insumos`, `pacientes`, `avaliacoes`, `avaliacao_opcoes`, `opcao_procedimentos`, `opcao_brindes`, `movimentacoes_estoque`):

```sql
-- Agenda
agenda (id, paciente_id, medica_id, data_hora, duracao_minutos, tipo, status, obs)

-- Anamnese
anamneses (id, paciente_id, token_publico, respondida_em, dados jsonb)

-- Termos de consentimento
termos_consentimento (id, paciente_id, avaliacao_id, assinado_em, 
  consentimento_clinico boolean, autorizacao_marketing boolean, dados jsonb)

-- Prontuário
prontuario_consultas (id, paciente_id, medica_id, agenda_id, 
  data, notas_clinicas text, created_at)

-- Mapa de face (por consulta)
mapa_face (id, consulta_id, dados jsonb)  -- pontos SVG + anotações

-- Fotos clínicas
fotos_clinicas (id, paciente_id, consulta_id, angulo, storage_path, 
  autoriza_marketing boolean, created_at)

-- Lançamentos financeiros
lancamentos (id, tipo [entrada/saida], categoria, desconto, valor, 
  data, referencia_id, referencia_tipo, obs)

-- Pós-tratamento
pos_tratamento (id, avaliacao_id, paciente_id, instrucoes text, 
  data_retorno, retorno_agendado boolean, enviado_whatsapp_em)

-- Pacotes de preço
pacotes (id, nome, procedimento_ids uuid[], preco_especial, ativo)

-- Indicações
indicacoes (id, paciente_indicador_id, paciente_indicado_id, bonus, created_at)

-- Lotes de insumos
lotes_insumos (id, insumo_id, numero_lote, validade, quantidade, created_at)
lote_uso (id, lote_id, consulta_id, quantidade_usada)
```

---

## 7. Integrações Externas

| Integração | Uso | Abordagem |
|---|---|---|
| WhatsApp | Envio de anamnese, pós-tratamento | Botão no sistema abre WhatsApp Web/app com mensagem e link pré-preenchidos (1 clique). Paciente preenche → sistema recebe automaticamente. API completa pode vir depois. |
| PDF | Geração de orçamentos | `@react-pdf/renderer` ou `puppeteer` |
| Storage de Fotos | Fotos clínicas | Supabase Storage (bucket protegido) |
| Assinatura Digital | Termos de consentimento | Canvas com hash + timestamp (fase 2) |

---

## 8. Regras de Negócio Críticas

1. **Anamnese antes de qualquer procedimento** — sistema bloqueia o prontuário se não houver anamnese respondida
2. **Termo de consentimento obrigatório** — cada procedimento exige assinatura; sistema avisa se estiver vencido (>6 meses)
3. **Autorização de marketing** — fotos só aparecem como "disponíveis para marketing" se o campo `autorizacao_marketing = true` no termo
4. **Custo de insumos calculado automaticamente** — ao montar protocolo, o sistema soma custo por receita dos procedimentos
5. **Baixa de estoque automática** — ao fechar avaliação, sistema registra movimentação de saída para cada insumo do protocolo escolhido
6. **Lançamento financeiro automático** — fechamento gera lançamento de entrada no financeiro
7. **Separação de acesso** — Dra. Sarah não vê financeiro nem negociação; Luciano não edita prontuário nem mapa de face

---

## 9. Decisões de Arquitetura

- **App Router do Next.js** (já em uso) — manter
- **Supabase Auth + RLS** — manter e expandir políticas por role
- **Server Components** para páginas de listagem (performance)
- **Client Components** para formulários interativos, mapa de face, calendário
- **Supabase Storage** para fotos clínicas (bucket `fotos-clinicas` com RLS)
- **CSS via Tailwind** (já configurado) — criar tokens de design custom para o Design System

---

## 10. O Que Não Está no Escopo

- App mobile nativo (o sistema web é responsivo suficiente para tablet na consulta)
- Integração direta com WhatsApp API (fase 1 usa link manual; API pode vir depois)
- Teleconsulta / videochamada
- Prontuário compartilhado com outros profissionais externos
- NF-e / emissão de notas fiscais (o módulo financeiro registra receitas; NF-e é responsabilidade do contador)
