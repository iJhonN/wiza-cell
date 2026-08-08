'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Receipt,
    Lock,
    Unlock,
    DollarSign,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ArrowUpCircle,
    History
} from 'lucide-react'

interface CashRegister {
    id: string
    opening_amount: number
    closing_amount: number | null
    opened_at: string
    closed_at: string | null
    notes: string | null
}

interface PaymentSummary {
    methodName: string
    total: number
}

export default function CaixaPage() {
    const supabase = createClient()

    const [activeRegister, setActiveRegister] = useState<CashRegister | null>(null)
    const [recentRegisters, setRecentRegisters] = useState<CashRegister[]>([])
    const [paymentSummaries, setPaymentSummaries] = useState<PaymentSummary[]>([])

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Estados dos formulários
    const [openingAmountInput, setOpeningAmountInput] = useState('0.00')
    const [closingAmountInput, setClosingAmountInput] = useState('')
    const [closingNotes, setClosingNotes] = useState('')

    const fetchCaixaData = async () => {
        try {
            setLoading(true)
            setError(null)

            // 1. Buscar caixa atual (aberto)
            const { data: openData, error: openErr } = await supabase
                .from('cash_registers')
                .select('*')
                .is('closed_at', null)
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (openErr) throw openErr
            setActiveRegister(openData)

            // 2. Se houver caixa aberto, calcular entradas de saídas (vendas no PDV) no período
            if (openData) {
                const { data: movements, error: movErr } = await supabase
                    .from('stock_movements')
                    .select('quantity, unit_price, payment_methods(name)')
                    .eq('type', 'saida')
                    .gte('created_at', openData.opened_at)

                if (movErr) throw movErr

                // Agrupar totais por forma de pagamento
                const summaryMap: Record<string, number> = {}
                movements?.forEach((m: any) => {
                    const method = m.payment_methods?.name || 'A Prazo (Fiado)'
                    const totalVal = Number(m.quantity || 0) * Number(m.unit_price || 0)
                    summaryMap[method] = (summaryMap[method] || 0) + totalVal
                })

                const summariesList: PaymentSummary[] = Object.keys(summaryMap).map((methodName) => ({
                    methodName,
                    total: summaryMap[methodName]
                }))

                setPaymentSummaries(summariesList)
            }

            // 3. Buscar histórico de caixas anteriores (fechados)
            const { data: historyData, error: historyErr } = await supabase
                .from('cash_registers')
                .select('*')
                .not('closed_at', 'is', null)
                .order('closed_at', { ascending: false })
                .limit(10)

            if (historyErr) throw historyErr
            setRecentRegisters(historyData || [])

        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados do caixa.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCaixaData()
    }, [])

    // Abertura de Caixa
    const handleOpenRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setSubmitting(true)
            setError(null)

            const amount = parseFloat(openingAmountInput) || 0

            const { error: err } = await supabase
                .from('cash_registers')
                .insert([{ opening_amount: amount }])

            if (err) throw err

            setSuccessMsg('Caixa aberto com sucesso!')
            setTimeout(() => setSuccessMsg(null), 3000)
            fetchCaixaData()
        } catch (err: any) {
            setError(err.message || 'Erro ao abrir o caixa.')
        } finally {
            setSubmitting(false)
        }
    }

    // Fechamento de Caixa
    const handleCloseRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeRegister) return

        try {
            setSubmitting(true)
            setError(null)

            const closingAmount = closingAmountInput !== '' ? parseFloat(closingAmountInput) : null

            const { error: err } = await supabase
                .from('cash_registers')
                .update({
                    closing_amount: closingAmount,
                    closed_at: new Date().toISOString(),
                    notes: closingNotes.trim() || null
                })
                .eq('id', activeRegister.id)

            if (err) throw err

            setSuccessMsg('Caixa fechado com sucesso!')
            setClosingAmountInput('')
            setClosingNotes('')
            setTimeout(() => setSuccessMsg(null), 3000)
            fetchCaixaData()
        } catch (err: any) {
            setError(err.message || 'Erro ao fechar o caixa.')
        } finally {
            setSubmitting(false)
        }
    }

    // Soma das vendas no caixa atual
    const totalSalesCurrentSession = paymentSummaries.reduce((acc, curr) => acc + curr.total, 0)

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50/60 p-6 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-900 animate-spin" />
                <p className="text-sm text-stone-500">Carregando informações do caixa...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Cabeçalho */}
                <div className="border-b border-stone-200/80 pb-6">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                        Caixa & Fechamento
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Gerencie a abertura, conferência de entradas e fechamento do caixa diário.
                    </p>
                </div>

                {/* Notificações */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{error}</span>
                        </div>
                        <button onClick={() => setError(null)} className="text-xs underline font-semibold">
                            Fechar
                        </button>
                    </div>
                )}

                {successMsg && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Layout Principal */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Coluna da Esquerda: Status Atual / Abertura / Fechamento */}
                    <div className="lg:col-span-7 space-y-6">

                        {!activeRegister ? (
                            /* Formulário de Abertura */
                            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                                <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100/70 border border-amber-200 text-amber-900 flex items-center justify-center">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-stone-900">Nenhum Caixa Aberto</h2>
                                        <p className="text-xs text-stone-500">Informe o fundo troco para abrir o caixa.</p>
                                    </div>
                                </div>

                                <form onSubmit={handleOpenRegister} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-stone-700">Fundo Troco Inicial (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={openingAmountInput}
                                            onChange={(e) => setOpeningAmountInput(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-amber-900 hover:bg-amber-950 text-white font-bold text-sm rounded-xl transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                                        <span>Abrir Caixa Agora</span>
                                    </button>
                                </form>
                            </div>
                        ) : (
                            /* Painel de Caixa Aberto */
                            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-6">
                                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                                        <div>
                                            <h2 className="text-base font-bold text-stone-900">Caixa Aberto</h2>
                                            <p className="text-xs text-stone-500 font-mono">
                                                Aberto em {new Date(activeRegister.opened_at).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                                        Fundo: R$ {Number(activeRegister.opening_amount).toFixed(2)}
                                    </span>
                                </div>

                                {/* Resumo de Vendas por Forma de Pagamento */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                                        Entradas do Turno Atual
                                    </h3>

                                    {paymentSummaries.length === 0 ? (
                                        <p className="text-xs text-stone-400 py-4 text-center">
                                            Nenhuma venda realizada neste caixa até o momento.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {paymentSummaries.map((summary) => (
                                                <div
                                                    key={summary.methodName}
                                                    className="flex items-center justify-between p-3 bg-stone-50/60 rounded-xl border border-stone-200/60 text-xs"
                                                >
                                                    <span className="font-semibold text-stone-800">{summary.methodName}</span>
                                                    <span className="font-mono font-bold text-stone-900">
                                                        R$ {summary.total.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}

                                            <div className="flex items-center justify-between p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs font-bold pt-3 mt-2">
                                                <span className="text-amber-900">Total Faturado no Turno</span>
                                                <span className="font-mono text-sm text-amber-900">
                                                    R$ {totalSalesCurrentSession.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Formulário de Fechamento */}
                                <form onSubmit={handleCloseRegister} className="space-y-4 pt-4 border-t border-stone-100">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                                        Encerrar Expediente
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-stone-700">Valor Final Contado (R$)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="Ex: 250.00"
                                                value={closingAmountInput}
                                                onChange={(e) => setClosingAmountInput(e.target.value)}
                                                className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-amber-800"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-stone-700">Observações de Fechamento</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Sobra de troco R$ 2,00"
                                                value={closingNotes}
                                                onChange={(e) => setClosingNotes(e.target.value)}
                                                className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-amber-800"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex items-center justify-center gap-2 w-full py-3 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                        <span>Fechar Caixa</span>
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Coluna da Direita: Histórico de Caixas Anteriores */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                                <History className="w-5 h-5 text-amber-900" />
                                <h2 className="font-bold text-stone-900 text-sm">Histórico de Fechamentos</h2>
                            </div>

                            {recentRegisters.length === 0 ? (
                                <p className="text-center py-10 text-xs text-stone-400">
                                    Nenhum fechamento de caixa registrado no histórico.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {recentRegisters.map((reg) => (
                                        <div
                                            key={reg.id}
                                            className="p-3.5 bg-stone-50/60 rounded-xl border border-stone-200/60 text-xs space-y-1.5"
                                        >
                                            <div className="flex items-center justify-between font-mono font-bold text-stone-900">
                                                <span>Abertura: R$ {Number(reg.opening_amount).toFixed(2)}</span>
                                                <span className="text-stone-600">
                                                    Fechamento: R$ {reg.closing_amount !== null ? Number(reg.closing_amount).toFixed(2) : '-'}
                                                </span>
                                            </div>

                                            {reg.notes && (
                                                <p className="text-[11px] text-stone-500 italic">
                                                    Obs: {reg.notes}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between text-stone-400 text-[10px] font-mono pt-1 border-t border-stone-100">
                                                <span>Aberto: {new Date(reg.opened_at).toLocaleString('pt-BR')}</span>
                                                <span>Fechado: {reg.closed_at ? new Date(reg.closed_at).toLocaleString('pt-BR') : '-'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}