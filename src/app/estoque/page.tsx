'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    Package,
    PackagePlus,
    Search,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Boxes,
    Loader2,
    ArrowUpRight,
    Filter
} from 'lucide-react'

interface ProductStock {
    id: string
    name: string
    cost_price: number
    sale_price: number
    stock_quantity: number
    min_stock_quantity?: number
    barcode: string | null
}

export default function EstoqueGeralPage() {
    const supabase = createClient()

    const [products, setProducts] = useState<ProductStock[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'todos' | 'baixo' | 'esgotado'>('todos')

    const fetchStockData = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('products')
                .select('id, name, cost_price, sale_price, stock_quantity, barcode')
                .order('name', { ascending: true })

            if (error) throw error
            setProducts(data || [])
        } catch (err) {
            console.error('Erro ao carregar estoque:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStockData()
    }, [])

    // Métricas
    const totalItems = products.reduce((acc, item) => acc + (item.stock_quantity || 0), 0)
    const totalCostValue = products.reduce((acc, item) => acc + (item.stock_quantity * (item.cost_price || 0)), 0)
    const totalSaleValue = products.reduce((acc, item) => acc + (item.stock_quantity * (item.sale_price || 0)), 0)
    const lowStockCount = products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5).length
    const outOfStockCount = products.filter(p => (p.stock_quantity || 0) <= 0).length

    // Filtragem
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.barcode && p.barcode.includes(searchQuery))

        if (!matchesSearch) return false

        if (statusFilter === 'baixo') return (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= 5
        if (statusFilter === 'esgotado') return (p.stock_quantity || 0) <= 0
        return true
    })

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50/60 p-6 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-900 animate-spin" />
                <p className="text-sm text-stone-500">Carregando estoque...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Cabeçalho */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                            Visão Geral do Estoque
                        </h1>
                        <p className="text-sm text-stone-500 mt-0.5">
                            Acompanhe saldos, patrimônio estocado e alertas de reposição.
                        </p>
                    </div>

                    <Link
                        href="/estoque/entrada"
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-900 hover:bg-amber-950 text-white font-semibold text-sm rounded-xl transition-all shadow-sm shrink-0"
                    >
                        <PackagePlus className="w-4 h-4" />
                        <span>Dar Entrada no Estoque</span>
                    </Link>
                </div>

                {/* Cards de Métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-stone-400">
                            <span className="text-xs font-bold uppercase tracking-wider">Total de Unidades</span>
                            <Boxes className="w-5 h-5 text-amber-900" />
                        </div>
                        <p className="text-2xl font-black text-stone-900 font-mono">{totalItems}</p>
                        <p className="text-[11px] text-stone-400">{products.length} produtos cadastrados</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-stone-400">
                            <span className="text-xs font-bold uppercase tracking-wider">Valor em Custo</span>
                            <TrendingUp className="w-5 h-5 text-stone-600" />
                        </div>
                        <p className="text-2xl font-black text-stone-900 font-mono">
                            R$ {totalCostValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] text-stone-400">Investimento em inventário</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-stone-400">
                            <span className="text-xs font-bold uppercase tracking-wider">Projeção de Venda</span>
                            <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-black text-emerald-800 font-mono">
                            R$ {totalSaleValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-medium">
                            Lucro bruto est. R$ {(totalSaleValue - totalCostValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm space-y-2">
                        <div className="flex items-center justify-between text-stone-400">
                            <span className="text-xs font-bold uppercase tracking-wider">Alertas de Reposição</span>
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex items-center gap-3 font-mono font-bold">
                            <span className="text-amber-700 text-lg">{lowStockCount} baixos</span>
                            <span className="text-red-600 text-lg">{outOfStockCount} zerados</span>
                        </div>
                        <p className="text-[11px] text-stone-400">Necessitam atenção</p>
                    </div>
                </div>

                {/* Filtros e Busca */}
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Buscar produto ou código..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <Filter className="w-4 h-4 text-stone-400 shrink-0" />
                        <button
                            onClick={() => setStatusFilter('todos')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                statusFilter === 'todos'
                                    ? 'bg-stone-900 text-white'
                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                        >
                            Todos ({products.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('baixo')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                statusFilter === 'baixo'
                                    ? 'bg-amber-800 text-white'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                            }`}
                        >
                            Estoque Baixo ({lowStockCount})
                        </button>
                        <button
                            onClick={() => setStatusFilter('esgotado')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                statusFilter === 'esgotado'
                                    ? 'bg-red-800 text-white'
                                    : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                            }`}
                        >
                            Esgotados ({outOfStockCount})
                        </button>
                    </div>
                </div>

                {/* Tabela de Produtos */}
                <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-stone-600">
                            <thead className="bg-stone-50 border-b border-stone-200/80 text-stone-400 uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="p-4">Produto</th>
                                <th className="p-4">Custo Un.</th>
                                <th className="p-4">Venda Un.</th>
                                <th className="p-4">Qtd. Atual</th>
                                <th className="p-4">Valor Total (Venda)</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 font-medium">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-stone-400">
                                        Nenhum item encontrado no estoque.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((p) => {
                                    const qty = p.stock_quantity || 0
                                    const isOut = qty <= 0
                                    const isLow = qty > 0 && qty <= 5

                                    return (
                                        <tr key={p.id} className="hover:bg-stone-50/50 transition-all">
                                            <td className="p-4">
                                                <div className="font-semibold text-stone-900 text-sm">{p.name}</div>
                                                {p.barcode && (
                                                    <div className="font-mono text-[10px] text-stone-400">{p.barcode}</div>
                                                )}
                                            </td>
                                            <td className="p-4 font-mono">
                                                R$ {Number(p.cost_price || 0).toFixed(2)}
                                            </td>
                                            <td className="p-4 font-mono font-semibold text-stone-800">
                                                R$ {Number(p.sale_price || 0).toFixed(2)}
                                            </td>
                                            <td className="p-4 font-mono text-sm font-bold">
                                                {qty} un
                                            </td>
                                            <td className="p-4 font-mono font-bold text-emerald-800">
                                                R$ {(qty * (p.sale_price || 0)).toFixed(2)}
                                            </td>
                                            <td className="p-4 text-center">
                                                {isOut ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                            <XCircle className="w-3 h-3" /> Esgotado
                                                        </span>
                                                ) : isLow ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <AlertTriangle className="w-3 h-3" /> Baixo
                                                        </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3" /> Normal
                                                        </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}