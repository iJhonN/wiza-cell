'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeft,
    PackagePlus,
    Search,
    Loader2,
    AlertCircle,
    CheckCircle2,
    History,
    Package
} from 'lucide-react'

interface Product {
    id: string
    name: string
    cost_price: number
    sale_price: number
    stock_quantity: number
    barcode: string | null
    qr_code: string | null
    photo_url: string | null
}

interface StockEntryHistory {
    id: string
    quantity: number
    unit_price: number
    created_at: string
    products: {
        name: string
    } | null
}

export default function EntradaEstoquePage() {
    const supabase = createClient()

    const [products, setProducts] = useState<Product[]>([])
    const [recentEntries, setRecentEntries] = useState<StockEntryHistory[]>([])

    const [loadingData, setLoadingData] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Form States
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [quantity, setQuantity] = useState('1')
    const [costPrice, setCostPrice] = useState('')
    const [salePrice, setSalePrice] = useState('')
    const [notes, setNotes] = useState('')

    const fetchData = async () => {
        try {
            setLoadingData(true)
            setError(null)

            const [productsRes, historyRes] = await Promise.all([
                supabase
                    .from('products')
                    .select('id, name, cost_price, sale_price, stock_quantity, barcode, qr_code, photo_url')
                    .order('name', { ascending: true }),
                supabase
                    .from('stock_movements')
                    .select(`
                        id,
                        quantity,
                        unit_price,
                        created_at,
                        products(name)
                    `)
                    .eq('type', 'entrada')
                    .order('created_at', { ascending: false })
                    .limit(10)
            ])

            if (productsRes.error) throw productsRes.error
            if (historyRes.error) throw historyRes.error

            setProducts(productsRes.data || [])
            setRecentEntries((historyRes.data as unknown as StockEntryHistory[]) || [])
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados de produtos.')
            console.error(err)
        } finally {
            setLoadingData(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product)
        setCostPrice(product.cost_price ? String(product.cost_price) : '0')
        setSalePrice(product.sale_price ? String(product.sale_price) : '0')
    }

    const handleSubmitEntry = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedProduct) {
            setError('Selecione um produto para dar entrada.')
            return
        }

        const qtyToAdd = parseInt(quantity, 10)
        if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
            setError('A quantidade deve ser maior que zero.')
            return
        }

        const newCost = parseFloat(costPrice) || 0
        const newSale = parseFloat(salePrice) || 0

        try {
            setSubmitting(true)
            setError(null)

            // 1. Inserir movimentação de entrada em stock_movements
            const { error: movErr } = await supabase.from('stock_movements').insert([
                {
                    product_id: selectedProduct.id,
                    type: 'entrada',
                    quantity: qtyToAdd,
                    unit_price: newCost,
                    notes: notes.trim() || 'Entrada manual de estoque'
                }
            ])

            if (movErr) throw movErr

            // 2. Atualizar quantidade total e valores no cadastro do produto
            const updatedStock = Number(selectedProduct.stock_quantity || 0) + qtyToAdd

            const { error: prodErr } = await supabase
                .from('products')
                .update({
                    stock_quantity: updatedStock,
                    cost_price: newCost,
                    sale_price: newSale
                })
                .eq('id', selectedProduct.id)

            if (prodErr) throw prodErr

            setSuccessMsg(`Entrada de ${qtyToAdd} unidade(s) registrada com sucesso!`)
            setTimeout(() => setSuccessMsg(null), 3500)

            // Resetar formulário
            setSelectedProduct(null)
            setQuantity('1')
            setCostPrice('')
            setSalePrice('')
            setNotes('')
            setSearchQuery('')

            // Atualizar lista de produtos e histórico
            fetchData()
        } catch (err: any) {
            setError(err.message || 'Erro ao registrar entrada no estoque.')
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    const filteredProducts = products.filter((p) => {
        const q = searchQuery.toLowerCase()
        return (
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.includes(q)) ||
            (p.qr_code && p.qr_code.toLowerCase().includes(q))
        )
    })

    if (loadingData) {
        return (
            <div className="min-h-screen bg-stone-50/60 p-6 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-900 animate-spin" />
                <p className="text-sm text-stone-500">Carregando catálogo...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Cabeçalho */}
                <div className="flex items-center gap-4 border-b border-stone-200/80 pb-6">
                    <Link
                        href="/produtos"
                        className="p-2.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 rounded-xl transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                            Entrada de Estoque & Compras
                        </h1>
                        <p className="text-sm text-stone-500 mt-0.5">
                            Registre reposições de mercadorias e atualize os custos e preços de venda.
                        </p>
                    </div>
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

                {/* Layout em Duas Colunas */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Coluna Esquerda: Seleção de Produto e Formulário de Entrada */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Busca de Produto */}
                        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-2">
                                1. Selecione o Produto
                            </h2>

                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome, SKU ou Código de Barras..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all placeholder:text-stone-400"
                                />
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                                {filteredProducts.length === 0 ? (
                                    <p className="text-center py-6 text-xs text-stone-400">Nenhum produto encontrado.</p>
                                ) : (
                                    filteredProducts.map((p) => {
                                        const isSelected = selectedProduct?.id === p.id
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => handleSelectProduct(p)}
                                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'border-amber-800 bg-amber-50/40'
                                                        : 'border-stone-100 hover:border-stone-200 bg-stone-50/30'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-9 h-9 rounded-lg bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center overflow-hidden">
                                                        {p.photo_url ? (
                                                            <img src={p.photo_url} alt={p.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <Package className="w-4 h-4 text-stone-400" />
                                                        )}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="font-semibold text-stone-900 text-sm truncate">{p.name}</p>
                                                        <p className="text-[11px] text-stone-400 font-mono">
                                                            Estoque atual: {p.stock_quantity || 0} un
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="font-mono text-xs text-stone-500 font-medium">
                                                    Custo: R$ {Number(p.cost_price || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Formulário de Entrada */}
                        {selectedProduct && (
                            <form onSubmit={handleSubmitEntry} className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-2">
                                    2. Dados da Reposição: <span className="text-stone-900 font-semibold">{selectedProduct.name}</span>
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-stone-700">Qtd. Adicionada *</label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-stone-700">Preço de Custo Un. (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={costPrice}
                                            onChange={(e) => setCostPrice(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-stone-700">Preço de Venda Un. (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={salePrice}
                                            onChange={(e) => setSalePrice(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-stone-700">Observações / Fornecedor</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Compra com nota fiscal de lote extra"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex items-center gap-2 px-6 py-3 bg-amber-900 hover:bg-amber-950 text-white text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <PackagePlus className="w-4 h-4" />
                                        )}
                                        <span>Confirmar Entrada</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Coluna Direita: Histórico de Entradas Recentes */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                                <History className="w-5 h-5 text-amber-900" />
                                <h2 className="font-bold text-stone-900 text-sm">Entradas Recentes</h2>
                            </div>

                            {recentEntries.length === 0 ? (
                                <p className="text-center py-10 text-xs text-stone-400">
                                    Nenhuma entrada registrada recentemente.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {recentEntries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="p-3 bg-stone-50/60 rounded-xl border border-stone-200/60 text-xs space-y-1"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-stone-900 truncate max-w-[200px]">
                                                    {entry.products?.name || 'Produto indisponível'}
                                                </span>
                                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                    +{entry.quantity} un
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-stone-500 text-[11px] font-mono">
                                                <span>Custo Un: R$ {Number(entry.unit_price || 0).toFixed(2)}</span>
                                                <span>{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
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