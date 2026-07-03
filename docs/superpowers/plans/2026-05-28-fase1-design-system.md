# Luno Fase 1 — Design System & Módulos Base

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o visual atual (fundo escuro, nav superior) pelo Design System Moderno Premium — sidebar lateral fixa, fundo claro, cards com bordas marrom/dourado — e reformar todos os módulos existentes + criar o módulo de Pacientes.

**Architecture:** Shell layout com Sidebar (220px) + área de conteúdo. Componentes UI reutilizáveis em `components/ui/`. Cada módulo reformado usa os mesmos tokens de cor e componentes. Pacientes é módulo novo com CRUD completo contra Supabase.

**Tech Stack:** Next.js 15 App Router · Supabase (SSR + client) · TypeScript · Tailwind v4 (tokens via `@theme` em `globals.css`) · Server Components para listagens · Client Components para formulários

---

## Mapa de Arquivos

```
components/
  ui/
    Button.tsx          ← novo — botão primário/secundário/ghost
    Badge.tsx           ← novo — badge de status colorido
    Card.tsx            ← novo — card com header/body e borda colorida
    KPICard.tsx         ← novo — card de métrica com valor grande
    PageHeader.tsx      ← novo — título + subtítulo + slot de ações
  layout/
    Sidebar.tsx         ← novo — sidebar com logo, nav, avatar
    Shell.tsx           ← novo — wrapper: sidebar + main

app/
  globals.css           ← modificar — novos tokens de design
  layout.tsx            ← modificar — fundo claro, sem navbar antiga
  dashboard/
    layout.tsx          ← modificar — usar Shell
    page.tsx            ← reescrever — dashboard completo
  pacientes/            ← novo módulo
    page.tsx
    nova/page.tsx
    [id]/page.tsx
  avaliacoes/
    page.tsx            ← reformar
    nova/page.tsx       ← reformar (usa NovaAvaliacaoForm)
    [id]/page.tsx       ← reformar (usa ComercialPanel)
  insumos/
    page.tsx            ← reformar (usa InsumoTable)
    [id]/page.tsx       ← reformar (usa InsumoForm)
  procedimentos/
    page.tsx            ← reformar
    [id]/page.tsx       ← reformar (usa ReceitaEditor)

components/
  layout/
    Navbar.tsx          ← DELETAR após migração
    AuthLayout.tsx      ← DELETAR após migração
  avaliacoes/
    NovaAvaliacaoForm.tsx   ← reformar
    ComercialPanel.tsx      ← reformar
  insumos/
    InsumoTable.tsx         ← reformar

lib/
  types.ts              ← adicionar tipo Paciente expandido
```

---

## Task 1: Tokens de Design no globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Substituir o conteúdo de `app/globals.css` por:**

```css
@import "tailwindcss";

@theme inline {
  /* Luno brand */
  --color-luno-marrom:       #5C3D2E;
  --color-luno-marrom-dark:  #3D2314;
  --color-luno-dourado:      #C4A882;
  --color-luno-bege:         #8B6347;

  /* Sistema UI — fundo claro */
  --color-ui-bg:        #F8F5F1;
  --color-ui-card:      #FFFFFF;
  --color-ui-border:    #E8D8C4;
  --color-ui-border-lt: #F0E4D0;
  --color-ui-text:      #2C1A0E;
  --color-ui-muted:     #8B6347;
  --color-ui-hover:     #FDFAF7;

  /* Status */
  --color-status-green-bg:  #EDF5E8;
  --color-status-green-tx:  #2D6A1A;
  --color-status-amber-bg:  #FFF3DC;
  --color-status-amber-tx:  #92600A;
  --color-status-blue-bg:   #EEF4FB;
  --color-status-blue-tx:   #1A4080;
  --color-status-red-bg:    #FEF0EE;
  --color-status-red-tx:    #8B1A1A;
  --color-status-gray-bg:   #F3F0ED;
  --color-status-gray-tx:   #6B5344;

  /* Tipografia */
  --font-display: var(--font-playfair), serif;
  --font-body:    var(--font-montserrat), sans-serif;
}

* { box-sizing: border-box; }

body {
  background: #F8F5F1;
  color: #2C1A0E;
  font-family: var(--font-body, system-ui, sans-serif);
}

/* Scrollbar discreta */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #DDD0C0; border-radius: 99px; }
```

- [ ] **Verificar que o servidor compila sem erros**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
Esperado: `307` (redireciona para login — servidor ok)

- [ ] **Commit**

```bash
git add app/globals.css
git commit -m "design: new token system — light bg, brown/gold accents"
```

---

## Task 2: Componentes UI Base

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/KPICard.tsx`
- Create: `components/ui/PageHeader.tsx`

- [ ] **Criar `components/ui/Button.tsx`:**

```tsx
import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base = 'inline-flex items-center gap-1.5 font-semibold rounded-lg transition-colors cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary:   'bg-[#3D2314] text-[#F5EFE6] hover:bg-[#5C3D2E]',
  secondary: 'bg-white text-[#3D2314] border border-[#C4A882] hover:bg-[#FDFAF7]',
  ghost:     'bg-transparent text-[#8B6347] border border-[#E8D8C4] hover:bg-[#FDFAF7]',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[11px]',
  md: 'px-4 py-2 text-[12px]',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
```

- [ ] **Criar `components/ui/Badge.tsx`:**

```tsx
type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'gray'

const styles: Record<BadgeVariant, string> = {
  green: 'bg-[#EDF5E8] text-[#2D6A1A]',
  amber: 'bg-[#FFF3DC] text-[#92600A]',
  blue:  'bg-[#EEF4FB] text-[#1A4080]',
  red:   'bg-[#FEF0EE] text-[#8B1A1A]',
  gray:  'bg-[#F3F0ED] text-[#6B5344]',
}

export function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[variant]}`}>
      {children}
    </span>
  )
}
```

- [ ] **Criar `components/ui/Card.tsx`:**

```tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  accentColor?: string   // ex: '#C4A882' para borda lateral dourada
}

export function Card({ children, className = '', accentColor }: CardProps) {
  return (
    <div
      className={`bg-white border border-[#E8D8C4] rounded-xl shadow-[0_2px_8px_rgba(61,35,20,0.05)] ${className}`}
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 4 } : undefined}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-[#F0E4D0] ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-bold text-[#2C1A0E]">{children}</h3>
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>
}
```

- [ ] **Criar `components/ui/KPICard.tsx`:**

```tsx
interface KPICardProps {
  label: string
  value: string
  sub?: string
  accentColor?: string
}

export function KPICard({ label, value, sub, accentColor = '#C4A882' }: KPICardProps) {
  return (
    <div
      className="bg-white border border-[#E8D8C4] rounded-xl p-4 shadow-[0_2px_8px_rgba(61,35,20,0.05)]"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 4 }}
    >
      <div className="text-[10px] font-semibold text-[#8B6347] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[22px] font-extrabold text-[#2C1A0E] leading-none mb-1">{value}</div>
      {sub && <div className="text-[10px] text-[#B09070]">{sub}</div>}
    </div>
  )
}
```

- [ ] **Criar `components/ui/PageHeader.tsx`:**

```tsx
interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode   // slot para botões de ação
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h1 className="text-[20px] font-bold text-[#2C1A0E] font-[family-name:var(--font-playfair)]">{title}</h1>
        {subtitle && <p className="text-[11px] text-[#8B6347] mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
```

- [ ] **Commit**

```bash
git add components/ui/
git commit -m "design: add base UI components (Button, Badge, Card, KPICard, PageHeader)"
```

---

## Task 3: Sidebar + Shell Layout

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/Shell.tsx`
- Modify: `app/dashboard/layout.tsx`
- Modify: `app/avaliacoes/layout.tsx`
- Modify: `app/insumos/layout.tsx`
- Modify: `app/procedimentos/layout.tsx`
- Delete later: `components/layout/Navbar.tsx`, `components/layout/AuthLayout.tsx`

- [ ] **Criar `components/layout/Sidebar.tsx`:**

```tsx
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

const sections = [
  {
    label: 'Visão Geral',
    items: [{ href: '/dashboard', icon: '⊞', label: 'Dashboard' }],
  },
  {
    label: 'Clínica',
    items: [
      { href: '/pacientes',   icon: '👤', label: 'Pacientes' },
      { href: '/agenda',      icon: '📋', label: 'Agenda',     soon: true },
      { href: '/prontuario',  icon: '📄', label: 'Prontuário', soon: true },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { href: '/avaliacoes',  icon: '💼', label: 'Avaliações' },
      { href: '/orcamentos',  icon: '📎', label: 'Orçamentos', soon: true },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/financeiro',  icon: '💰', label: 'Lançamentos', soon: true },
      { href: '/dre',         icon: '📊', label: 'DRE / Caixa', soon: true },
      { href: '/emprestimo',  icon: '🏦', label: 'Empréstimo',  soon: true },
    ],
  },
  {
    label: 'Operações',
    items: [
      { href: '/insumos',        icon: '📦', label: 'Estoque' },
      { href: '/procedimentos',  icon: '⚗️', label: 'Procedimentos' },
      { href: '/relatorios',     icon: '📈', label: 'Relatórios', soon: true },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-[220px] bg-white border-r border-[#E8D8C4] flex flex-col flex-shrink-0 h-screen sticky top-0 shadow-[2px_0_12px_rgba(61,35,20,0.06)]">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#F0E4D0]">
        <div className="text-[15px] font-extrabold tracking-[.25em] text-[#3D2314]">ÉVOR</div>
        <div className="text-[9px] text-[#C4A882] tracking-[.08em] mt-0.5">Harmonização Facial</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map(section => (
          <div key={section.label}>
            <div className="text-[9px] font-bold text-[#C4A882] uppercase tracking-[.12em] px-4 pt-3 pb-1">
              {section.label}
            </div>
            {section.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.soon ? '#' : item.href}
                  className={`flex items-center gap-2.5 px-4 py-2 text-[12px] font-medium transition-all border-l-[3px]
                    ${active
                      ? 'bg-gradient-to-r from-[#F9EFE4] to-[#FDFAF7] border-l-[#C4A882] text-[#3D2314] font-bold'
                      : 'border-l-transparent text-[#8B6347] hover:bg-[#FDFAF7] hover:text-[#3D2314]'}
                    ${item.soon ? 'opacity-40 cursor-not-allowed' : ''}`}
                  onClick={e => item.soon && e.preventDefault()}
                >
                  <span className="text-[15px] w-5 text-center">{item.icon}</span>
                  {item.label}
                  {item.soon && <span className="ml-auto text-[8px] bg-[#F0E4D0] text-[#8B6347] px-1.5 py-0.5 rounded">Em breve</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#F0E4D0] p-3 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3D2314] to-[#C4A882] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
          L
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-[#2C1A0E] truncate">Luciano</div>
          <div className="text-[9px] text-[#8B6347]">Administrador</div>
        </div>
        <button onClick={logout} className="text-[10px] text-[#8B6347] hover:text-[#3D2314] flex-shrink-0" title="Sair">
          ↩
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Criar `components/layout/Shell.tsx`:**

```tsx
import { Sidebar } from './Sidebar'

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F5F1]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Atualizar `app/dashboard/layout.tsx`:**

```tsx
import Shell from '@/components/layout/Shell'
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>
}
```

- [ ] **Atualizar `app/avaliacoes/layout.tsx`:**

```tsx
import Shell from '@/components/layout/Shell'
export default function AvaliacoesLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>
}
```

- [ ] **Atualizar `app/insumos/layout.tsx`:**

```tsx
import Shell from '@/components/layout/Shell'
export default function InsumosLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>
}
```

- [ ] **Atualizar `app/procedimentos/layout.tsx`:**

```tsx
import Shell from '@/components/layout/Shell'
export default function ProcedimentosLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>
}
```

- [ ] **Atualizar `app/layout.tsx` — remover bg escuro:**

```tsx
import type { Metadata } from 'next'
import { Playfair_Display, Montserrat } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' })

export const metadata: Metadata = {
  title: 'Luno — Sistema',
  description: 'Sistema de gestão Luno Harmonização Facial',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${playfair.variable} ${montserrat.variable}`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Testar: abrir http://localhost:3000/dashboard e verificar sidebar aparece**

A página deve mostrar sidebar escura à esquerda, conteúdo à direita. O link "Dashboard" deve estar ativo (borda dourada).

- [ ] **Commit**

```bash
git add components/layout/Sidebar.tsx components/layout/Shell.tsx \
  app/layout.tsx app/dashboard/layout.tsx app/avaliacoes/layout.tsx \
  app/insumos/layout.tsx app/procedimentos/layout.tsx
git commit -m "design: sidebar + shell layout replacing top navbar"
```

---

## Task 4: Dashboard Reformado

**Files:**
- Rewrite: `app/dashboard/page.tsx`

- [ ] **Reescrever `app/dashboard/page.tsx`:**

```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { KPICard } from '@/components/ui/KPICard'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import type { AvaliacaoStatus } from '@/lib/types'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const STATUS_LABEL: Record<AvaliacaoStatus, string> = {
  rascunho: 'Rascunho', pendente: 'Pendente',
  em_negociacao: 'Em Negociação', fechado: 'Fechado', perdido: 'Perdido',
}

const STATUS_BADGE: Record<AvaliacaoStatus, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  rascunho: 'gray', pendente: 'amber', em_negociacao: 'blue', fechado: 'green', perdido: 'red',
}

export default async function Dashboard() {
  const supabase = await createClient()

  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select('*, pacientes(nome), avaliacao_opcoes(preco_negociado)')
    .order('created_at', { ascending: false })

  const all = avaliacoes ?? []
  const counts = { rascunho: 0, pendente: 0, em_negociacao: 0, fechado: 0, perdido: 0 } as Record<AvaliacaoStatus, number>
  let receitaFechada = 0

  all.forEach(av => {
    const s = av.status as AvaliacaoStatus
    counts[s] = (counts[s] ?? 0) + 1
    if (s === 'fechado') {
      const precos = (av.avaliacao_opcoes ?? []).map((o: { preco_negociado: number | null }) => o.preco_negociado ?? 0)
      receitaFechada += Math.max(...precos, 0)
    }
  })

  const recentes = all.slice(0, 6)

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} · Clínica Luno`}>
        <Link href="/avaliacoes/nova">
          <Button>+ Nova Avaliação</Button>
        </Link>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KPICard label="Pendente Comercial" value={String(counts.pendente)} sub="aguardando fechamento" accentColor="#F59E0B" />
        <KPICard label="Em Negociação" value={String(counts.em_negociacao)} sub="em andamento" accentColor="#1A4080" />
        <KPICard label="Fechados" value={String(counts.fechado)} sub="convertidos" accentColor="#2D6A1A" />
        <KPICard label="Receita Confirmada" value={fmt(receitaFechada)} sub="avaliações fechadas" accentColor="#C4A882" />
      </div>

      {/* Duas colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Avaliações recentes — ocupa 2/3 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Avaliações Recentes</CardTitle>
              <Link href="/avaliacoes" className="text-[11px] text-[#8B6347] hover:text-[#3D2314] font-semibold">
                Ver todas →
              </Link>
            </CardHeader>
            <div className="divide-y divide-[#F5EDE3]">
              {recentes.length === 0 && (
                <div className="py-10 text-center text-[13px] text-[#8B6347]">
                  Nenhuma avaliação ainda.{' '}
                  <Link href="/avaliacoes/nova" className="text-[#3D2314] font-semibold hover:underline">Criar a primeira →</Link>
                </div>
              )}
              {recentes.map(av => (
                <Link key={av.id} href={`/avaliacoes/${av.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#FDFAF7] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C4A882] to-[#8B6347] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                    {((av.pacientes as any)?.nome?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#2C1A0E] truncate">
                      {(av.pacientes as any)?.nome ?? '—'}
                    </div>
                    <div className="text-[10px] text-[#8B6347]">
                      {new Date(av.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  <Badge variant={STATUS_BADGE[av.status as AvaliacaoStatus]}>
                    {STATUS_LABEL[av.status as AvaliacaoStatus]}
                  </Badge>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Ações rápidas — ocupa 1/3 */}
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader><CardTitle>Ações Rápidas</CardTitle></CardHeader>
            <CardBody className="grid grid-cols-1 gap-2">
              <Link href="/avaliacoes/nova">
                <Button className="w-full justify-center">+ Nova Avaliação</Button>
              </Link>
              <Link href="/pacientes/nova">
                <Button variant="secondary" className="w-full justify-center">+ Nova Paciente</Button>
              </Link>
              <Link href="/insumos">
                <Button variant="ghost" className="w-full justify-center">Ver Estoque</Button>
              </Link>
              <Link href="/procedimentos">
                <Button variant="ghost" className="w-full justify-center">Procedimentos</Button>
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Resumo do Pipeline</CardTitle></CardHeader>
            <CardBody className="space-y-2">
              {([
                ['Rascunhos', counts.rascunho, '#8B6347'],
                ['Pendentes', counts.pendente, '#92600A'],
                ['Negociando', counts.em_negociacao, '#1A4080'],
                ['Fechados', counts.fechado, '#2D6A1A'],
                ['Perdidos', counts.perdido, '#8B1A1A'],
              ] as [string, number, string][]).map(([label, count, color]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8B6347]">{label}</span>
                  <span className="text-[12px] font-bold" style={{ color }}>{count}</span>
                </div>
              ))}
              <div className="pt-1 border-t border-[#F0E4D0] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#2C1A0E]">Total</span>
                <span className="text-[13px] font-bold text-[#2C1A0E]">{all.length}</span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Verificar http://localhost:3000/dashboard — deve mostrar KPIs, tabela de avaliações recentes e coluna de ações**

- [ ] **Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "design: reform dashboard with KPIs, pipeline summary, quick actions"
```

---

## Task 5: Módulo Pacientes (Novo)

**Files:**
- Create: `app/pacientes/layout.tsx`
- Create: `app/pacientes/page.tsx`
- Create: `app/pacientes/nova/page.tsx`
- Create: `app/pacientes/[id]/page.tsx`
- Modify: `lib/types.ts`
- Supabase: adicionar colunas `data_nascimento`, `canal_aquisicao` na tabela `pacientes`

- [ ] **Rodar no Supabase SQL Editor — adicionar colunas a pacientes:**

```sql
alter table pacientes
  add column if not exists data_nascimento date,
  add column if not exists canal_aquisicao text check (canal_aquisicao in ('instagram','indicacao','google','outros')) default 'outros';
```

- [ ] **Atualizar o tipo `Paciente` em `lib/types.ts` — adicionar após a definição existente:**

```ts
export interface Paciente {
  id: string
  nome: string
  telefone: string
  email: string | null
  obs: string | null
  data_nascimento: string | null      // ISO date
  canal_aquisicao: 'instagram' | 'indicacao' | 'google' | 'outros' | null
  created_at: string
}
```

- [ ] **Criar `app/pacientes/layout.tsx`:**

```tsx
import Shell from '@/components/layout/Shell'
export default function PacientesLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>
}
```

- [ ] **Criar `app/pacientes/page.tsx`:**

```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'

const CANAL_LABEL: Record<string, string> = {
  instagram: 'Instagram', indicacao: 'Indicação', google: 'Google', outros: 'Outros',
}
const CANAL_BADGE: Record<string, 'blue' | 'green' | 'amber' | 'gray'> = {
  instagram: 'blue', indicacao: 'green', google: 'amber', outros: 'gray',
}

export default async function PacientesPage() {
  const supabase = await createClient()
  const { data: pacientes } = await supabase
    .from('pacientes')
    .select('*, avaliacoes(id)')
    .order('nome')

  return (
    <div>
      <PageHeader title="Pacientes" subtitle={`${pacientes?.length ?? 0} pacientes cadastrados`}>
        <Link href="/pacientes/nova"><Button>+ Nova Paciente</Button></Link>
      </PageHeader>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FDFAF7] border-b-2 border-[#E8D8C4]">
                {['Paciente', 'Telefone', 'E-mail', 'Canal', 'Consultas', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-[#8B6347] px-4 py-2.5 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(pacientes ?? []).map(p => (
                <tr key={p.id} className="border-b border-[#F5EDE3] hover:bg-[#FDFAF7] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C4A882] to-[#8B6347] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {p.nome[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-[#2C1A0E]">{p.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#5C3D2E] text-[12px]">{p.telefone}</td>
                  <td className="px-4 py-3 text-[#8B6347] text-[12px]">{p.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.canal_aquisicao
                      ? <Badge variant={CANAL_BADGE[p.canal_aquisicao] ?? 'gray'}>{CANAL_LABEL[p.canal_aquisicao] ?? p.canal_aquisicao}</Badge>
                      : <span className="text-[#B09070] text-[11px]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#8B6347]">
                    {(p as any).avaliacoes?.length ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/pacientes/${p.id}`} className="text-[11px] text-[#5C3D2E] hover:underline font-semibold">
                      Ver ficha →
                    </Link>
                  </td>
                </tr>
              ))}
              {!pacientes?.length && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#8B6347] text-[13px]">
                    Nenhuma paciente cadastrada ainda.{' '}
                    <Link href="/pacientes/nova" className="text-[#3D2314] font-semibold hover:underline">Cadastrar →</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Criar `app/pacientes/nova/page.tsx`:**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'

export default function NovaPacientePage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', data_nascimento: '', canal_aquisicao: 'outros', obs: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function salvar() {
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    if (!form.telefone.trim()) { setError('Telefone é obrigatório'); return }
    setSaving(true)
    setError('')
    const { data, error: e } = await supabase.from('pacientes').insert({
      nome: form.nome.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim() || null,
      data_nascimento: form.data_nascimento || null,
      canal_aquisicao: form.canal_aquisicao,
      obs: form.obs.trim() || null,
    }).select('id').single()
    setSaving(false)
    if (e || !data) { setError('Erro ao cadastrar paciente'); return }
    router.push(`/pacientes/${data.id}`)
  }

  const input = 'w-full border border-[#CCC0A8] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#C4A882] bg-white'
  const label = 'block text-[10px] font-semibold text-[#8B6347] uppercase tracking-wider mb-1'

  return (
    <div className="max-w-xl">
      <PageHeader title="Nova Paciente">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>← Voltar</Button>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle>Dados da Paciente</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={label}>Nome completo *</label>
              <input className={input} placeholder="Ana Costa" value={form.nome} onChange={e => set('nome', e.target.value)} />
            </div>
            <div>
              <label className={label}>Telefone / WhatsApp *</label>
              <input className={input} placeholder="(86) 99999-9999" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
            </div>
            <div>
              <label className={label}>Data de nascimento</label>
              <input type="date" className={input} value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label}>E-mail</label>
              <input type="email" className={input} placeholder="ana@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label}>Como nos encontrou?</label>
              <select className={input} value={form.canal_aquisicao} onChange={e => set('canal_aquisicao', e.target.value)}>
                <option value="instagram">Instagram</option>
                <option value="indicacao">Indicação</option>
                <option value="google">Google</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className={label}>Observações</label>
              <textarea className={input} rows={3} placeholder="Notas gerais sobre a paciente..." value={form.obs} onChange={e => set('obs', e.target.value)} />
            </div>
          </div>

          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar Paciente'}</Button>
            <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
```

- [ ] **Criar `app/pacientes/[id]/page.tsx`:**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import type { AvaliacaoStatus } from '@/lib/types'

const STATUS_BADGE: Record<AvaliacaoStatus, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  rascunho: 'gray', pendente: 'amber', em_negociacao: 'blue', fechado: 'green', perdido: 'red',
}
const STATUS_LABEL: Record<AvaliacaoStatus, string> = {
  rascunho: 'Rascunho', pendente: 'Pendente', em_negociacao: 'Em Negociação', fechado: 'Fechado', perdido: 'Perdido',
}
const CANAL_LABEL: Record<string, string> = {
  instagram: 'Instagram', indicacao: 'Indicação', google: 'Google', outros: 'Outros',
}

export default async function PacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: p } = await supabase
    .from('pacientes')
    .select('*, avaliacoes(id, status, created_at, avaliacao_opcoes(preco_negociado))')
    .eq('id', id)
    .single()

  if (!p) notFound()

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const gastoTotal = (p.avaliacoes ?? [])
    .filter((av: any) => av.status === 'fechado')
    .reduce((sum: number, av: any) => {
      const precos = (av.avaliacao_opcoes ?? []).map((o: any) => o.preco_negociado ?? 0)
      return sum + Math.max(...precos, 0)
    }, 0)

  const whatsappLink = `https://wa.me/55${p.telefone.replace(/\D/g, '')}`

  return (
    <div>
      <PageHeader title={p.nome} subtitle={`Paciente desde ${new Date(p.created_at).toLocaleDateString('pt-BR')}`}>
        <Link href={whatsappLink} target="_blank">
          <Button variant="ghost" size="sm">💬 WhatsApp</Button>
        </Link>
        <Link href={`/avaliacoes/nova?paciente=${p.id}`}>
          <Button size="sm">+ Nova Avaliação</Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dados */}
        <Card accentColor="#C4A882">
          <CardHeader><CardTitle>Dados da Paciente</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-[12px]">
            <div className="flex justify-between">
              <span className="text-[#8B6347]">Telefone</span>
              <span className="font-medium">{p.telefone}</span>
            </div>
            {p.email && (
              <div className="flex justify-between">
                <span className="text-[#8B6347]">E-mail</span>
                <span className="font-medium">{p.email}</span>
              </div>
            )}
            {p.data_nascimento && (
              <div className="flex justify-between">
                <span className="text-[#8B6347]">Nascimento</span>
                <span className="font-medium">{new Date(p.data_nascimento).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#8B6347]">Origem</span>
              <span className="font-medium">{CANAL_LABEL[p.canal_aquisicao ?? 'outros'] ?? '—'}</span>
            </div>
            <div className="pt-2 border-t border-[#F0E4D0] flex justify-between">
              <span className="text-[#8B6347]">Total gasto</span>
              <span className="font-bold text-[#2D6A1A]">{fmt(gastoTotal)}</span>
            </div>
            {p.obs && (
              <div className="pt-2 border-t border-[#F0E4D0]">
                <p className="text-[#8B6347] text-[10px] uppercase font-semibold mb-1">Observações</p>
                <p className="text-[#2C1A0E]">{p.obs}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Histórico de avaliações */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Avaliações</CardTitle>
              <Link href={`/avaliacoes/nova?paciente=${p.id}`}>
                <Button size="sm" variant="secondary">+ Nova</Button>
              </Link>
            </CardHeader>
            <div className="divide-y divide-[#F5EDE3]">
              {(p.avaliacoes ?? []).length === 0 && (
                <div className="py-8 text-center text-[13px] text-[#8B6347]">Nenhuma avaliação ainda.</div>
              )}
              {(p.avaliacoes ?? []).map((av: any) => (
                <Link key={av.id} href={`/avaliacoes/${av.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#FDFAF7] transition-colors">
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-[#2C1A0E]">
                      {new Date(av.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-[10px] text-[#8B6347]">{av.avaliacao_opcoes?.length ?? 0} opção(ões)</div>
                  </div>
                  <Badge variant={STATUS_BADGE[av.status as AvaliacaoStatus]}>
                    {STATUS_LABEL[av.status as AvaliacaoStatus]}
                  </Badge>
                  <span className="text-[11px] text-[#8B6347]">→</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Testar: abrir http://localhost:3000/pacientes — lista deve aparecer com novo design**

- [ ] **Commit**

```bash
git add app/pacientes/ lib/types.ts
git commit -m "feat: Pacientes module — list, new, detail with CRM fields"
```

---

## Task 6: Reformar Avaliações

**Files:**
- Rewrite: `app/avaliacoes/page.tsx`
- Rewrite: `components/avaliacoes/NovaAvaliacaoForm.tsx`
- Rewrite: `components/avaliacoes/ComercialPanel.tsx`

- [ ] **Reescrever `app/avaliacoes/page.tsx`:**

```tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import type { AvaliacaoStatus } from '@/lib/types'

const STATUS_LABEL: Record<AvaliacaoStatus, string> = {
  rascunho: 'Rascunho', pendente: 'Pendente Comercial',
  em_negociacao: 'Em Negociação', fechado: 'Fechado', perdido: 'Perdido',
}
const STATUS_BADGE: Record<AvaliacaoStatus, 'gray' | 'amber' | 'blue' | 'green' | 'red'> = {
  rascunho: 'gray', pendente: 'amber', em_negociacao: 'blue', fechado: 'green', perdido: 'red',
}

export default async function AvaliacoesPage() {
  const supabase = await createClient()
  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select('*, pacientes(nome, telefone), avaliacao_opcoes(id, preco_negociado)')
    .order('created_at', { ascending: false })

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <div>
      <PageHeader title="Avaliações" subtitle={`${avaliacoes?.length ?? 0} avaliações`}>
        <Link href="/avaliacoes/nova"><Button>+ Nova Avaliação</Button></Link>
      </PageHeader>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#FDFAF7] border-b-2 border-[#E8D8C4]">
                {['Paciente', 'Data', 'Opções', 'Valor', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-[#8B6347] px-4 py-2.5 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(avaliacoes ?? []).map(av => {
                const precos = (av.avaliacao_opcoes ?? []).map((o: any) => o.preco_negociado ?? 0).filter((v: number) => v > 0)
                const valor = precos.length > 0 ? Math.max(...precos) : null
                return (
                  <tr key={av.id} className="border-b border-[#F5EDE3] hover:bg-[#FDFAF7] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[13px] text-[#2C1A0E]">{(av.pacientes as any)?.nome ?? '—'}</div>
                      <div className="text-[10px] text-[#8B6347]">{(av.pacientes as any)?.telefone}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#8B6347] whitespace-nowrap">
                      {new Date(av.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#8B6347]">{av.avaliacao_opcoes?.length ?? 0}</td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-[#2C1A0E]">
                      {valor ? fmt(valor) : <span className="text-[#B09070]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[av.status as AvaliacaoStatus]}>
                        {STATUS_LABEL[av.status as AvaliacaoStatus]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/avaliacoes/${av.id}`} className="text-[11px] text-[#5C3D2E] hover:underline font-semibold whitespace-nowrap">
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {!avaliacoes?.length && (
                <tr><td colSpan={6} className="py-12 text-center text-[13px] text-[#8B6347]">Nenhuma avaliação ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Atualizar o header do `components/avaliacoes/NovaAvaliacaoForm.tsx` — substituir apenas o bloco de botão Voltar e título pelo novo PageHeader:**

Substituir:
```tsx
      <button onClick={() => router.back()} className="text-luno-marrom text-sm hover:underline mb-3 block">
        ← Voltar
      </button>
      <h1 className="font-[family-name:var(--font-playfair)] text-2xl text-luno-marrom-dark mb-4">Nova Avaliação</h1>
```

Por:
```tsx
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-bold text-[#2C1A0E] font-[family-name:var(--font-playfair)]">Nova Avaliação</h1>
        </div>
        <button onClick={() => router.back()} className="text-[11px] text-[#8B6347] border border-[#E8D8C4] px-3 py-1.5 rounded-lg hover:bg-[#FDFAF7]">← Voltar</button>
      </div>
```

- [ ] **Atualizar classes dos cards em `NovaAvaliacaoForm.tsx` — substituir as classes dos wrapping divs `bg-white rounded-xl border border-[#DDD0C0] p-4` por `bg-white rounded-xl border border-[#E8D8C4] shadow-[0_2px_8px_rgba(61,35,20,0.05)] p-4`**

- [ ] **Atualizar botões no final de `NovaAvaliacaoForm.tsx`:**

Substituir:
```tsx
        <button onClick={() => salvar('rascunho')} disabled={saving}
          className="px-4 py-2 rounded-md text-sm font-semibold border border-luno-marrom text-luno-marrom hover:bg-[#FAF5EF] disabled:opacity-50">
          Salvar Rascunho
        </button>
        <button onClick={() => salvar('pendente')} disabled={saving}
          className="px-4 py-2 rounded-md text-sm font-semibold bg-luno-marrom-dark text-luno-bege hover:bg-luno-marrom disabled:opacity-50">
          {saving ? 'Salvando...' : 'Enviar para Comercial'}
        </button>
```

Por:
```tsx
        <button onClick={() => salvar('rascunho')} disabled={saving}
          className="inline-flex items-center px-4 py-2 rounded-lg text-[12px] font-semibold border border-[#C4A882] text-[#3D2314] hover:bg-[#FDFAF7] disabled:opacity-50 transition-colors">
          Salvar Rascunho
        </button>
        <button onClick={() => salvar('pendente')} disabled={saving}
          className="inline-flex items-center px-4 py-2 rounded-lg text-[12px] font-semibold bg-[#3D2314] text-[#F5EFE6] hover:bg-[#5C3D2E] disabled:opacity-50 transition-colors">
          {saving ? 'Salvando...' : 'Enviar para Comercial'}
        </button>
```

- [ ] **Verificar http://localhost:3000/avaliacoes — lista e nova avaliação com novo design**

- [ ] **Commit**

```bash
git add app/avaliacoes/page.tsx components/avaliacoes/NovaAvaliacaoForm.tsx
git commit -m "design: reform avaliacoes pages with new design system"
```

---

## Task 7: Reformar Insumos e Procedimentos

**Files:**
- Modify: `components/insumos/InsumoTable.tsx`
- Modify: `app/procedimentos/page.tsx`

- [ ] **Atualizar `components/insumos/InsumoTable.tsx` — substituir as classes da tabela principal:**

Localizar:
```tsx
      <div className="bg-white rounded-xl border border-[#DDD0C0] overflow-hidden">
```
Substituir por:
```tsx
      <div className="bg-white rounded-xl border border-[#E8D8C4] overflow-hidden shadow-[0_2px_8px_rgba(61,35,20,0.05)]">
```

Localizar o título da seção (se existir `<h1>`) e adicionar `PageHeader`. Localizar os inputs de busca e atualizar classes para consistência com o design system:

```tsx
// busca input — substituir className
className="border border-[#E8D8C4] rounded-lg px-3 py-2 text-[12px] flex-1 min-w-48 focus:outline-none focus:border-[#C4A882]"

// select categoria — substituir className  
className="border border-[#E8D8C4] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-[#C4A882]"
```

- [ ] **Atualizar `app/insumos/page.tsx` — adicionar PageHeader com botão de novo insumo:**

Substituir:
```tsx
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl text-luno-marrom-dark">Insumos</h1>
      </div>
```
Por:
```tsx
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-bold text-[#2C1A0E] font-[family-name:var(--font-playfair)]">Estoque & Insumos</h1>
          <p className="text-[11px] text-[#8B6347] mt-0.5">{insumos.length} insumos cadastrados</p>
        </div>
      </div>
```

- [ ] **Atualizar `app/procedimentos/page.tsx` — adicionar PageHeader:**

Substituir:
```tsx
      <h1 className="font-[family-name:var(--font-playfair)] text-2xl text-luno-marrom-dark mb-4">Procedimentos</h1>
```
Por:
```tsx
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-bold text-[#2C1A0E] font-[family-name:var(--font-playfair)]">Procedimentos</h1>
          <p className="text-[11px] text-[#8B6347] mt-0.5">Catálogo com custo automático de insumos</p>
        </div>
      </div>
```

Substituir o wrapper da tabela:
```tsx
      <div className="bg-white rounded-xl border border-[#DDD0C0] overflow-hidden">
```
Por:
```tsx
      <div className="bg-white rounded-xl border border-[#E8D8C4] overflow-hidden shadow-[0_2px_8px_rgba(61,35,20,0.05)]">
```

- [ ] **Verificar http://localhost:3000/insumos e http://localhost:3000/procedimentos — visual consistente com o resto**

- [ ] **Commit**

```bash
git add components/insumos/InsumoTable.tsx app/insumos/page.tsx app/procedimentos/page.tsx
git commit -m "design: reform insumos and procedimentos with new design tokens"
```

---

## Task 8: Limpeza Final

**Files:**
- Delete: `components/layout/Navbar.tsx`
- Delete: `components/layout/AuthLayout.tsx`

- [ ] **Verificar que nenhum arquivo importa Navbar ou AuthLayout:**

```bash
grep -r "Navbar\|AuthLayout" /Users/lucianonogueira/Projetos/Luno/sistema/app \
  /Users/lucianonogueira/Projetos/Luno/sistema/components --include="*.tsx" -l
```
Esperado: nenhum resultado (arquivos de layout foram todos substituídos)

- [ ] **Deletar arquivos obsoletos:**

```bash
rm /Users/lucianonogueira/Projetos/Luno/sistema/components/layout/Navbar.tsx
rm /Users/lucianonogueira/Projetos/Luno/sistema/components/layout/AuthLayout.tsx
```

- [ ] **Build de verificação — confirmar sem erros TypeScript:**

```bash
cd /Users/lucianonogueira/Projetos/Luno/sistema && npx tsc --noEmit 2>&1 | head -30
```
Esperado: sem output (zero erros)

- [ ] **Adicionar `.superpowers/` ao .gitignore:**

```bash
echo ".superpowers/" >> /Users/lucianonogueira/Projetos/Luno/sistema/.gitignore
```

- [ ] **Commit final da Fase 1:**

```bash
git add -A
git commit -m "feat: Phase 1 complete — Design System Moderno Premium + Pacientes module

- Sidebar lateral com logo, seções e avatar
- Tokens de design: fundo claro, marrom/dourado
- Componentes UI: Button, Badge, Card, KPICard, PageHeader
- Dashboard reformado com KPIs e pipeline
- Módulo Pacientes: lista, nova, detalhe com CRM
- Avaliações, Insumos e Procedimentos reformados"
```

---

## Checklist de Validação Final

Antes de declarar a Fase 1 completa, verificar manualmente:

- [ ] Sidebar aparece em todas as páginas (/dashboard, /pacientes, /avaliacoes, /insumos, /procedimentos)
- [ ] Link ativo na sidebar tem borda dourada e background
- [ ] Dashboard mostra KPIs com dados reais
- [ ] `/pacientes` lista com avatar, canal de aquisição e badge
- [ ] `/pacientes/nova` salva e redireciona para o detalhe
- [ ] `/pacientes/:id` mostra ficha e histórico de avaliações
- [ ] `/avaliacoes/nova` ainda funciona (criação + redirecionamento)
- [ ] `/insumos` e `/procedimentos` com visual consistente
- [ ] Logout funciona (botão ↩ no footer da sidebar)
- [ ] Nenhum erro no console do navegador
