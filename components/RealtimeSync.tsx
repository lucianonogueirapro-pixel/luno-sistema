'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TABELAS = [
  'lancamentos', 'pacientes', 'agenda', 'crm_oportunidades', 'crm_tarefas',
  'wa_conversas', 'wa_mensagens', 'insumos', 'custos_config', 'orcamentos',
  'orcamento_itens', 'procedimentos', 'profissionais', 'avaliacoes',
  'notificacoes', 'prontuario_consultas', 'termos_consentimento',
  'protocolos', 'anamneses', 'clinica_config', 'config_financeiro',
  'mensagens_auto', 'wa_kanban_colunas', 'protocolo_templates',
]

export function RealtimeSync() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channels = TABELAS.map(tabela =>
      supabase
        .channel(`sync_${tabela}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => {
          router.refresh()
        })
        .subscribe()
    )
    return () => { channels.forEach(ch => supabase.removeChannel(ch)) }
  }, [router])

  return null
}
