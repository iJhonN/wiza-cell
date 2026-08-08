'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeftRight,
    ArrowUpCircle,
    ArrowDownCircle,
    Search,
    Loader2,
    Filter
} from 'lucide-react'

interface Movement {
    id: string
    type: 'entrada' | 'saida'
    quantity: number
    unit_price: number | null
    notes: string | null
    created_at: string
    products: {
        name: string
        qr_code: string | null
    } | null
    customers: {
        name: string
    } | null
    payment_methods: {
        name: string
    } | null
}

export default function MovimentacoesPage() {
    const supabase = createClient()

    const [movements, setMovements] = useState<Movement[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<'todos' | 'entrada' | 'saida'>('todos')

    const fetchMovements = async () => {
        try {
            setLoading(true)

            const { data, error } = await supabase
                .from('stock_movements')
                .select(`
                    id,
                    type,
                    quantity,
                    unit_price,
                    notes,
                    created_at,
                    products(name, qr_code),
                    customers(name),
                    payment_methods(name)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setMovements((data as unknown as Movement[]) || [])
        } catch (err) {
            console.error('Erro ao buscar movimentações:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMovements()
    }, [])

    const filteredMovements = movements.filter((m) => {
        const productName = m.products?.name || ''
        const qrCode = m.products?.qr_code || ''
        const customerName = m.customers?.name || ''
        const matchesSearch =
            productName.toLowerCase().includes(search.toLowerCase()) ||
            qrCode.toLowerCase().includes(search.toLowerCase()) ||
            customerName.toLowerCase().includes(search.toLowerCase())

        if (!matchesSearch) return false

        if (typeFilter === 'entrada') return m.type === 'entrada'
        if (typeFilter === 'saida') return m.type === 'saida'
        return true
    })

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Cabeçalho */}
                <div className="border-b border-stone-200/80 pb-6">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                        Histórico de Movimentações
                    </h1>
                    <p className="text-sm text-stone-500 mt-1">
                        Acompanhe todas as entradas de compras e saídas por vendas em tempo real.
                    </p>
                </div>

                {/* Filtros e Pesquisa */}
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Buscar por produto, SKU ou cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-stone-400 shrink-0" />
                        <button
                            onClick={() => setTypeFilter('todos')}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                typeFilter === 'todos'
                                    ? 'bg-stone-900 text-white'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setTypeFilter('entrada')}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                typeFilter === 'entrada'
                                    ? 'bg-emerald-800 text-white'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                        >
                            Entradas
                        </button>
                        <button
                            onClick={() => setTypeFilter('saida')}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                typeFilter === 'saida'
                                    ? 'bg-amber-900 text-white'
                                    : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                            }`}
                        >
                            Saídas (Vendas)
                        </button>
                    </div>
                </div>

                {/* Tabela de Movimentações */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
                        <Loader2 className="w-6 h-6 text-amber-900 animate-spin" />
                        <p className="text-xs text-stone-500">Carregando movimentações...</p>
                    </div>
                ) : filteredMovements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-stone-200/80 shadow-sm text-center p-6 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                            <ArrowLeftRight className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-stone-800">Nenhuma movimentação registrada</h3>
                            <p className="text-xs text-stone-500 mt-1">
                                Realize vendas no PDV ou dê entrada no estoque para visualizar os registros aqui.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                <tr className="bg-stone-50/80 border-b border-stone-200/80 text-stone-500 font-semibold uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Tipo</th>
                                    <th className="py-3.5 px-4">Produto</th>
                                    <th className="py-3.5 px-4 text-center">Quantidade</th>
                                    <th className="py-3.5 px-4 text-right">Preço Un.</th>
                                    <th className="py-3.5 px-4 text-right">Total</th>
                                    <th className="py-3.5 px-4">Pagamento / Obs</th>
                                    <th className="py-3.5 px-4 text-right">Data e Hora</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 text-stone-700">
                                {filteredMovements.map((m) => {
                                    const isEntry = m.type === 'entrada'
                                    const totalValue = (m.quantity || 0) * (m.unit_price || 0)

                                    return (
                                        <tr key={m.id} className="hover:bg-stone-50/50 transition-colors">
                                            <td className="py-3.5 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                                        isEntry
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-amber-50 text-amber-900 border border-amber-200'
                                                    }`}>
                                                        {isEntry ? (
                                                            <>
                                                                <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                                Entrada
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ArrowDownCircle className="w-3.5 h-3.5 text-amber-700" />
                                                                Saída
                                                            </>
                                                        )}
                                                    </span>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <p className="font-semibold text-stone-900 text-sm">
                                                    {m.products?.name || 'Produto não encontrado'}
                                                </p>
                                                {m.products?.qr_code && (
                                                    <p className="text-[11px] text-stone-400 font-mono">
                                                        SKU: {m.products.qr_code}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-800">
                                                {m.quantity} un
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono text-stone-600">
                                                R$ {Number(m.unit_price || 0).toFixed(2)}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">
                                                R$ {totalValue.toFixed(2)}
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <p className="font-medium text-stone-800">
                                                    {m.payment_methods?.name || m.notes || '-'}
                                                </p>
                                                {m.customers && (
                                                    <p className="text-[11px] text-stone-400">
                                                        Cliente: {m.customers.name}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-4 text-right font-mono text-stone-500 text-[11px]">
                                                {new Date(m.created_at).toLocaleString('pt-BR')}
                                            </td>
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}