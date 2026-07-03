import Link from 'next/link'

export const metadata = {
  title: 'Luno — Sistema de Gestão para Negócios',
  description: 'Plataforma completa de gestão com inteligência artificial integrada. CRM, atendimento WhatsApp, agenda, financeiro e muito mais.',
}

export default function SitePage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans">

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#080808]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#4f46e5] flex items-center justify-center">
              <span className="text-white font-bold text-[13px]">L</span>
            </div>
            <span className="font-semibold text-[15px] tracking-tight">Luno</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-[#94a3b8]">
            <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#luna-ia" className="hover:text-white transition-colors">Luna IA</a>
            <a href="#infraestrutura" className="hover:text-white transition-colors">Infraestrutura</a>
            <a href="#para-quem" className="hover:text-white transition-colors">Para quem</a>
          </nav>
          <Link
            href="/login"
            className="text-[13px] px-4 py-2 rounded-lg bg-white text-[#080808] font-semibold hover:bg-white/90 transition-colors"
          >
            Acessar sistema
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-28 px-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#4f46e5]/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#6366f1]/15 blur-[80px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#4f46e5]/40 bg-[#4f46e5]/10 text-[#a5b4fc] text-[12px] font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#818cf8] animate-pulse" />
            Plataforma SaaS · Multi-empresa · IA integrada
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            O sistema que seu{' '}
            <span className="bg-gradient-to-r from-[#818cf8] via-[#a5b4fc] to-[#c7d2fe] bg-clip-text text-transparent">
              negócio merece
            </span>
          </h1>

          <p className="text-[#64748b] text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            Gestão completa de clientes, atendimento via WhatsApp com inteligência artificial,
            agenda, financeiro e CRM — tudo integrado em uma única plataforma.
            Infraestrutura de grande empresa, preço de pequeno negócio.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-[#4f46e5] text-white font-semibold text-[14px] hover:bg-[#4338ca] transition-colors"
            >
              Entrar no sistema
            </Link>
            <a
              href="#funcionalidades"
              className="px-6 py-3 rounded-xl border border-white/10 text-[#94a3b8] font-medium text-[14px] hover:border-white/20 hover:text-white transition-colors"
            >
              Ver funcionalidades
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { valor: '100%', label: 'Multi-empresa' },
            { valor: 'WhatsApp', label: 'Atendimento IA 24/7' },
            { valor: 'Real-time', label: 'Atualização em tempo real' },
            { valor: 'Cloud', label: 'Sempre disponível' },
          ].map(({ valor, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-white mb-1">{valor}</div>
              <div className="text-[12px] text-[#475569]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#4f46e5] text-[12px] font-semibold uppercase tracking-widest mb-3">Funcionalidades</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Tudo que você precisa em um lugar</h2>
            <p className="text-[#475569] text-[15px] max-w-xl mx-auto">
              Cada módulo foi pensado para eliminar ferramentas avulsas e centralizar a operação do negócio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: '💬',
                titulo: 'Atendimento WhatsApp',
                desc: 'Kanban de conversas com status personalizado, etiquetas, histórico completo e controle manual ou automático por agente.',
              },
              {
                icon: '🤖',
                titulo: 'Luna IA',
                desc: 'Agente de inteligência artificial que atende, qualifica e agenda clientes pelo WhatsApp 24 horas por dia, sem intervenção humana.',
              },
              {
                icon: '📋',
                titulo: 'CRM Integrado',
                desc: 'Pipeline de oportunidades, acompanhamento de leads, histórico de interações e status de negociação em tempo real.',
              },
              {
                icon: '📅',
                titulo: 'Agenda e Agendamentos',
                desc: 'Gestão de horários, confirmação automática via WhatsApp, lembretes e controle de disponibilidade por profissional.',
              },
              {
                icon: '💰',
                titulo: 'Financeiro',
                desc: 'Lançamentos de receita e despesa, DRE mensal, controle de custos fixos e variáveis, e relatórios de fluxo de caixa.',
              },
              {
                icon: '📊',
                titulo: 'Dashboard e Relatórios',
                desc: 'Visão geral do negócio em tempo real: conversas ativas, oportunidades, metas mensais e atividade recente.',
              },
              {
                icon: '🗂️',
                titulo: 'Gestão de Clientes',
                desc: 'Cadastro completo de clientes com histórico de atendimentos, orçamentos, agendamentos e documentos.',
              },
              {
                icon: '📦',
                titulo: 'Insumos e Estoque',
                desc: 'Controle de produtos e insumos, alertas de estoque baixo, rastreamento de lotes e histórico de movimentação.',
              },
              {
                icon: '⚙️',
                titulo: 'Configurações Avançadas',
                desc: 'Base de conhecimento, prompts personalizados para IA, horários de atendimento, múltiplos agentes e permissões por usuário.',
              },
            ].map(({ icon, titulo, desc }) => (
              <div
                key={titulo}
                className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group"
              >
                <div className="text-2xl mb-4">{icon}</div>
                <h3 className="font-semibold text-[15px] text-white mb-2 group-hover:text-[#a5b4fc] transition-colors">{titulo}</h3>
                <p className="text-[#475569] text-[13px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Luna IA spotlight */}
      <section id="luna-ia" className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#4f46e5]/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[#818cf8] text-[12px] font-semibold uppercase tracking-widest mb-4">Luna IA</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Sua equipe de atendimento<br />que nunca dorme
            </h2>
            <p className="text-[#475569] text-[15px] leading-relaxed mb-8">
              A Luna é o agente de inteligência artificial integrado ao WhatsApp da empresa.
              Ela recebe mensagens, entende o contexto, responde com naturalidade,
              qualifica o lead e agenda — tudo sozinha, seguindo as regras do seu negócio.
            </p>
            <ul className="space-y-3">
              {[
                'Responde mensagens 24h, 7 dias por semana',
                'Qualifica clientes com perguntas inteligentes',
                'Agenda consultas direto na agenda do sistema',
                'Envia follow-ups automáticos nos horários certos',
                'Ativa modo humano quando necessário',
                'Prompt totalmente personalizável por empresa',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-[13px] text-[#94a3b8]">
                  <span className="w-5 h-5 rounded-full bg-[#4f46e5]/20 border border-[#4f46e5]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[#818cf8] text-[10px]">✓</span>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-white/[0.08] bg-[#0f0f0f] p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
                <div className="w-8 h-8 rounded-full bg-[#4f46e5] flex items-center justify-center text-white text-[12px] font-bold">L</div>
                <div>
                  <div className="text-[13px] font-semibold">Luna IA</div>
                  <div className="text-[10px] text-[#22d3ee] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]" />
                    online agora
                  </div>
                </div>
              </div>

              {[
                { de: 'cliente', msg: 'Olá! Vi o anúncio de vocês. Queria saber mais sobre os serviços.' },
                { de: 'luna', msg: 'Olá! Que bom que entrou em contato 😊 Sou a Luna, assistente virtual aqui. Me conta um pouco mais sobre o que você está procurando?' },
                { de: 'cliente', msg: 'Quero agendar uma avaliação.' },
                { de: 'luna', msg: 'Perfeito! Temos horários disponíveis essa semana. Qual período você prefere — manhã ou tarde?' },
              ].map((msg, i) => (
                <div key={i} className={`flex ${msg.de === 'luna' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed ${
                    msg.de === 'luna'
                      ? 'bg-[#1e1e2e] text-[#c7d2fe] rounded-tl-sm'
                      : 'bg-[#4f46e5]/30 text-[#e0e7ff] rounded-tr-sm'
                  }`}>
                    {msg.msg}
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                <div className="flex-1 bg-[#1a1a1a] rounded-xl px-4 py-2 text-[12px] text-[#475569]">
                  Mensagem...
                </div>
                <div className="w-8 h-8 rounded-xl bg-[#4f46e5] flex items-center justify-center">
                  <span className="text-white text-[11px]">↑</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Infraestrutura */}
      <section id="infraestrutura" className="py-28 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#4f46e5] text-[12px] font-semibold uppercase tracking-widest mb-3">Infraestrutura</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Tecnologia de ponta.<br />Sem custo de grande empresa.
            </h2>
            <p className="text-[#475569] text-[15px] max-w-xl mx-auto">
              Construído sobre as mesmas ferramentas usadas por startups de bilhões de dólares —
              disponível para o seu negócio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                nome: 'Next.js 16',
                desc: 'Framework React de última geração com renderização híbrida, roteamento avançado e performance otimizada.',
                detalhe: 'Frontend & Backend',
              },
              {
                nome: 'Supabase',
                desc: 'Banco de dados PostgreSQL gerenciado com autenticação, real-time e storage. Dados isolados por empresa.',
                detalhe: 'Banco de dados & Auth',
              },
              {
                nome: 'Railway',
                desc: 'Infraestrutura cloud com deploy automático a cada atualização, SSL incluso e alta disponibilidade.',
                detalhe: 'Hospedagem & Deploy',
              },
              {
                nome: 'Anthropic Claude',
                desc: 'Modelo de linguagem avançado por trás da Luna IA. API própria por empresa — sem compartilhamento de custos.',
                detalhe: 'Inteligência Artificial',
              },
              {
                nome: 'Evolution API',
                desc: 'Integração nativa com WhatsApp via API oficial. Cada empresa tem sua instância dedicada e isolada.',
                detalhe: 'WhatsApp',
              },
              {
                nome: 'Multi-tenant',
                desc: 'Arquitetura que garante total isolamento entre empresas. Cada cliente vê apenas seus próprios dados.',
                detalhe: 'Segurança & Isolamento',
              },
            ].map(({ nome, desc, detalhe }) => (
              <div key={nome} className="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02]">
                <div className="text-[10px] text-[#4f46e5] font-semibold uppercase tracking-widest mb-2">{detalhe}</div>
                <h3 className="text-[16px] font-bold text-white mb-3">{nome}</h3>
                <p className="text-[#475569] text-[13px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Garantias */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icone: '🔒', texto: 'Dados isolados por empresa' },
              { icone: '🔄', texto: 'Updates automáticos' },
              { icone: '📱', texto: 'Acesso de qualquer dispositivo' },
              { icone: '🌐', texto: 'SSL e HTTPS inclusos' },
            ].map(({ icone, texto }) => (
              <div key={texto} className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.01]">
                <span className="text-xl">{icone}</span>
                <span className="text-[12px] text-[#64748b]">{texto}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quem */}
      <section id="para-quem" className="py-28 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#4f46e5] text-[12px] font-semibold uppercase tracking-widest mb-3">Para quem é</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Negócios que precisam crescer<br />sem crescer a equipe
            </h2>
            <p className="text-[#475569] text-[15px] max-w-xl mx-auto">
              O Luno foi construído para negócios que recebem clientes, atendem pelo WhatsApp
              e precisam de organização sem burocracia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { segmento: 'Clínicas e Saúde', exemplo: 'Harmonização, estética, odontologia, psicologia', icone: '🏥' },
              { segmento: 'Salões e Beauty', exemplo: 'Cabelereiros, manicures, barbearias, spas', icone: '✂️' },
              { segmento: 'Consultórios', exemplo: 'Nutrição, fisioterapia, personal, coaching', icone: '📋' },
              { segmento: 'Comércio Local', exemplo: 'Lojas, ateliês, pet shops, serviços em geral', icone: '🏪' },
              { segmento: 'Serviços', exemplo: 'Advocacia, contabilidade, arquitetura, TI', icone: '💼' },
              { segmento: 'Educação', exemplo: 'Escolas, cursos, treinamentos, mentorias', icone: '🎓' },
            ].map(({ segmento, exemplo, icone }) => (
              <div key={segmento} className="flex items-start gap-4 p-5 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <span className="text-2xl">{icone}</span>
                <div>
                  <div className="font-semibold text-[14px] text-white mb-1">{segmento}</div>
                  <div className="text-[12px] text-[#475569]">{exemplo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O que está por vir */}
      <section className="py-28 px-6 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#4f46e5] text-[12px] font-semibold uppercase tracking-widest mb-3">Roadmap</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Em desenvolvimento</h2>
          <p className="text-[#475569] text-[15px] mb-12 max-w-xl mx-auto">
            O Luno está em constante evolução. Estas são as funcionalidades planejadas para as próximas versões.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {[
              { titulo: 'App mobile', desc: 'Aplicativo nativo iOS e Android para gestão em movimento', status: 'planejado' },
              { titulo: 'Relatórios avançados', desc: 'Exportação em PDF, gráficos e análises por período', status: 'em breve' },
              { titulo: 'Integração Google Calendar', desc: 'Sincronização bidirecional com agenda do Google', status: 'em breve' },
              { titulo: 'Pagamentos integrados', desc: 'Cobranças via PIX e cartão direto pelo WhatsApp', status: 'planejado' },
              { titulo: 'Multi-atendente', desc: 'Vários usuários atendendo pelo mesmo número WhatsApp', status: 'planejado' },
              { titulo: 'Análise de sentimento', desc: 'IA que identifica satisfação e urgência nas conversas', status: 'pesquisa' },
            ].map(({ titulo, desc, status }) => (
              <div key={titulo} className="flex items-start gap-4 p-5 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mt-0.5 flex-shrink-0 ${
                  status === 'em breve' ? 'bg-[#4f46e5]/20 text-[#818cf8]' :
                  status === 'planejado' ? 'bg-white/5 text-[#475569]' :
                  'bg-amber-500/10 text-amber-400'
                }`}>
                  {status}
                </div>
                <div>
                  <div className="font-semibold text-[14px] text-white mb-1">{titulo}</div>
                  <div className="text-[12px] text-[#475569]">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6 border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#4f46e5]/8 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Seu negócio organizado.<br />
            <span className="bg-gradient-to-r from-[#818cf8] to-[#c7d2fe] bg-clip-text text-transparent">
              Da primeira mensagem ao pagamento.
            </span>
          </h2>
          <p className="text-[#475569] text-[15px] mb-10">
            Um sistema completo, com IA integrada, pronto para o dia a dia do seu negócio.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 rounded-xl bg-[#4f46e5] text-white font-semibold text-[15px] hover:bg-[#4338ca] transition-colors"
          >
            Acessar o Luno
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#4f46e5] flex items-center justify-center">
              <span className="text-white font-bold text-[11px]">L</span>
            </div>
            <span className="text-[13px] text-[#475569]">Luno · Sistema de Gestão</span>
          </div>
          <p className="text-[12px] text-[#334155]">
            Construído com Next.js, Supabase e Claude AI · {new Date().getFullYear()}
          </p>
          <Link href="/login" className="text-[12px] text-[#475569] hover:text-white transition-colors">
            Acessar sistema →
          </Link>
        </div>
      </footer>

    </div>
  )
}
