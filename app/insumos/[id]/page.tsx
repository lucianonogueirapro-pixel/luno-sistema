'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Save, Loader2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'

const UNIDADES = ['un', 'ml', 'g', 'kg', 'l', 'cx', 'fr', 'mg']

export default function ProdutoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const [form, setForm] = useState({
    nome: '',
    categoria: '',
    unidade: 'un',
    quantidade: 0,
    quantidade_min: 0,
    preco_custo: 0,
    fornecedor: '',
    ativo: true,
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('produtos').select('*').eq('id', id).single()
      if (data) {
        setForm({
          nome: data.nome ?? '',
          categoria: data.categoria ?? '',
          unidade: data.unidade ?? 'un',
          quantidade: data.quantidade ?? 0,
          quantidade_min: data.quantidade_min ?? 0,
          preco_custo: data.preco_custo ?? 0,
          fornecedor: data.fornecedor ?? '',
          ativo: data.ativo ?? true,
        })
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function salvar() {
    if (!form.nome.trim()) { setMsg({ tipo: 'erro', texto: 'Nome é obrigatório.' }); return }
    setSalvando(true)
    setMsg(null)
    const { error } = await supabase
      .from('produtos')
      .update({
        nome: form.nome.trim(),
        categoria: form.categoria.trim() || null,
        unidade: form.unidade,
        quantidade: form.quantidade,
        quantidade_min: form.quantidade_min,
        preco_custo: form.preco_custo,
        fornecedor: form.fornecedor.trim() || null,
        ativo: form.ativo,
      })
      .eq('id', id)
    setSalvando(false)
    if (error) {
      setMsg({ tipo: 'erro', texto: error.message })
    } else {
      setMsg({ tipo: 'ok', texto: 'Dados salvos.' })
      setTimeout(() => setMsg(null), 2500)
    }
  }

  async function excluir() {
    setExcluindo(true)
    await supabase.from('produtos').delete().eq('id', id)
    router.push('/insumos')
  }

  const inp = 'w-full border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-[12px] text-[#0f172a] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#94a3b8]'

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={20} className="animate-spin text-[#94a3b8]" />
    </div>
  )

  const baixo = form.quantidade_min > 0 && form.quantidade <= form.quantidade_min

  return (
    <div className="max-w-lg space-y-5">
      <BackButton href="/insumos" label="Voltar a Produtos" />
      <PageHeader
        title={form.nome || 'Editar Produto'}
        subtitle={baixo ? 'Estoque abaixo do mínimo' : 'Dados do produto'}
        action={
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#4f46e5] text-white text-[12px] rounded-lg hover:bg-[#374151] disabled:opacity-50 transition-colors"
          >
            {salvando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Salvar
          </button>
        }
      />

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] border ${
          msg.tipo === 'ok' ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#166534]' : 'bg-[#FEE2E2] border-[#FCA5A5] text-[#8B1A1A]'
        }`}>
          {msg.tipo === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.texto}
        </div>
      )}

      {baixo && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-[12px] text-red-700 font-semibold">
          Estoque atual ({form.quantidade} {form.unidade}) abaixo do mínimo ({form.quantidade_min} {form.unidade})
        </div>
      )}

      <section className="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-[11px] text-[#475569] mb-1.5">Nome *</label>
          <input type="text" value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            className={inp}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-[#475569] mb-1.5">Categoria</label>
            <input type="text" value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              placeholder="Ex: Cabelo, Unha..."
              className={inp}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#475569] mb-1.5">Unidade</label>
            <select value={form.unidade}
              onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
              className={inp + ' bg-white'}>
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-[#475569] mb-1.5">Qtd. em estoque</label>
            <input type="number" min={0} step={0.001} value={form.quantidade}
              onChange={e => setForm(f => ({ ...f, quantidade: parseFloat(e.target.value) || 0 }))}
              className={inp}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#475569] mb-1.5">Qtd. mínima</label>
            <input type="number" min={0} step={0.001} value={form.quantidade_min}
              onChange={e => setForm(f => ({ ...f, quantidade_min: parseFloat(e.target.value) || 0 }))}
              className={inp}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#475569] mb-1.5">Custo (R$)</label>
            <input type="number" min={0} step={0.01} value={form.preco_custo}
              onChange={e => setForm(f => ({ ...f, preco_custo: parseFloat(e.target.value) || 0 }))}
              className={inp}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-[#475569] mb-1.5">Fornecedor</label>
          <input type="text" value={form.fornecedor}
            onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))}
            placeholder="Nome do fornecedor..."
            className={inp}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#475569]">Produto ativo</span>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.ativo ? 'bg-[#4f46e5]' : 'bg-[#e2e8f0]'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.ativo ? 'translate-x-4' : 'translate-x-1'}`} />
          </button>
        </div>
      </section>

      <div className="flex justify-end">
        {confirmExcluir ? (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-red-600">Confirmar exclusão?</span>
            <button onClick={excluir} disabled={excluindo}
              className="text-[11px] font-bold text-red-600 hover:underline disabled:opacity-50">
              {excluindo ? 'Excluindo...' : 'Sim, excluir'}
            </button>
            <button onClick={() => setConfirmExcluir(false)} className="text-[11px] text-[#64748b] hover:underline">
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmExcluir(true)}
            className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] hover:text-red-500 transition-colors">
            <Trash2 size={12} />
            Excluir produto
          </button>
        )}
      </div>
    </div>
  )
}
