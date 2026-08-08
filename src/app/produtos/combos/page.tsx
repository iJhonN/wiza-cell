'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeft,
    Layers,
    Plus,
    Trash2,
    Loader2,
    Package,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'

interface Product {
    id: string
    name: string
    sale_price: number
    stock_quantity: number
}

interface ComboItemSelection {
    component_product_id: string
    name: string
    unit_price: number
    quantity: number
}

interface ComboGroup {
    id: string
    name: string
    sale_price: number
    created_at: string
    product_combo_items: {
        combo_id: string
        component_product_id: string
        quantity: number
        products: {
            name: string
            sale_price: number
        }
    }[]
}

export default function CombosPage() {
    const supabase = createClient()

    const [combos, setCombos] = useState<ComboGroup[]>([])
    const [availableProducts, setAvailableProducts] = useState<Product[]>([])

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Formulário de Criação
    const [comboName, setComboName] = useState('')
    const [comboPrice, setComboPrice] = useState('')
    const [selectedItems, setSelectedItems] = useState<ComboItemSelection[]>([])

    // Seleção de componentes
    const [selectedProductId, setSelectedProductId] = useState('')
    const [itemQuantity, setItemQuantity] = useState('1')
    const [productSearch, setProductSearch] = useState('')

    const fetchData = async () => {
        try {
            setLoading(true)

            // Buscar produtos simples (não combos) para compor o kit
            const { data: prods, error: prodErr } = await supabase
                .from('products')
                .select('id, name, sale_price, stock_quantity')
                .eq('is_combo', false)
                .order('name')

            if (prodErr) throw prodErr
            setAvailableProducts(prods || [])

            // Buscar combos cadastrados com a relação exata do DDL
            const { data: comboData, error: comboErr } = await supabase
                .from('products')
                .select(`
          id, name, sale_price, created_at,
          product_combo_items!product_combo_items_combo_id_fkey (
            combo_id, component_product_id, quantity,
            products!product_combo_items_component_product_id_fkey ( name, sale_price )
          )
        `)
                .eq('is_combo', true)
                .order('created_at', { ascending: false })

            if (comboErr) throw comboErr
            setCombos((comboData as unknown as ComboGroup[]) || [])
        } catch (err: any) {
            setError('Erro ao carregar combos e produtos do banco.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleAddItemToCombo = () => {
        if (!selectedProductId) return

        const product = availableProducts.find((p) => p.id === selectedProductId)
        if (!product) return

        const qty = parseInt(itemQuantity) || 1

        const existingIndex = selectedItems.findIndex((item) => item.component_product_id === product.id)
        if (existingIndex > -1) {
            const updated = [...selectedItems]
            updated[existingIndex].quantity += qty
            setSelectedItems(updated)
        } else {
            setSelectedItems([
                ...selectedItems,
                {
                    component_product_id: product.id,
                    name: product.name,
                    unit_price: Number(product.sale_price),
                    quantity: qty,
                },
            ])
        }

        setSelectedProductId('')
        setItemQuantity('1')
    }

    const handleRemoveItemFromCombo = (componentProductId: string) => {
        setSelectedItems((prev) => prev.filter((item) => item.component_product_id !== componentProductId))
    }

    const totalOriginalPrice = selectedItems.reduce(
        (acc, item) => acc + item.unit_price * item.quantity,
        0
    )

    const handleCreateCombo = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!comboName.trim() || !comboPrice || selectedItems.length === 0) return

        try {
            setSaving(true)
            setError(null)

            // 1. Inserir produto com flag is_combo = true
            const { data: newCombo, error: comboErr } = await supabase
                .from('products')
                .insert([
                    {
                        name: comboName.trim(),
                        sale_price: parseFloat(comboPrice),
                        cost_price: 0,
                        stock_quantity: 0,
                        min_quantity: 0,
                        is_combo: true,
                    },
                ])
                .select()
                .single()

            if (comboErr) throw comboErr

            // 2. Inserir itens na tabela product_combo_items
            const comboItemsPayload = selectedItems.map((item) => ({
                combo_id: newCombo.id,
                component_product_id: item.component_product_id,
                quantity: item.quantity,
            }))

            const { error: itemsErr } = await supabase
                .from('product_combo_items')
                .insert(comboItemsPayload)

            if (itemsErr) throw itemsErr

            setComboName('')
            setComboPrice('')
            setSelectedItems([])
            fetchData()
        } catch (err: any) {
            setError(err.message || 'Erro ao criar o combo.')
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteCombo = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este combo?')) return

        try {
            setDeletingId(id)
            const { error } = await supabase.from('products').delete().eq('id', id)
            if (error) throw error

            setCombos((prev) => prev.filter((c) => c.id !== id))
        } catch (err: any) {
            alert('Erro ao excluir o combo.')
            console.error(err)
        } finally {
            setDeletingId(null)
        }
    }

    const filteredProductsSelect = availableProducts.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Cabeçalho */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/produtos"
                            className="p-2 bg-white border border-stone-200 rounded-xl hover:bg-stone-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-stone-600" />
                        </Link>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                                Combos & Kits
                            </h1>
                            <p className="text-sm text-stone-500 mt-1">
                                Agrupe produtos cadastrados para venda promocional conjunta.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-100/60 text-amber-900 px-3.5 py-1.5 rounded-lg text-sm font-medium w-fit border border-amber-200/50">
                        <Layers className="w-4 h-4 text-amber-800" />
                        <span>{combos.length} {combos.length === 1 ? 'combo' : 'combos'}</span>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{error}</span>
                        </div>
                        <button onClick={() => setError(null)} className="text-xs underline font-semibold hover:text-red-800">
                            Fechar
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Formulário (5 Colunas) */}
                    <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm h-fit space-y-5">
                        <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
                            <Plus className="w-4 h-4 text-amber-900" />
                            Montar Novo Combo
                        </h2>

                        <form onSubmit={handleCreateCombo} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                                    Nome do Combo / Kit *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Combo Capa + Película + Cabo"
                                    value={comboName}
                                    onChange={(e) => setComboName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all placeholder:text-stone-400"
                                />
                            </div>

                            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
                <span className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Adicionar Componentes
                </span>

                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Filtrar por nome..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                                    />

                                    <div className="flex gap-2">
                                        <select
                                            value={selectedProductId}
                                            onChange={(e) => setSelectedProductId(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none"
                                        >
                                            <option value="">Selecione o produto...</option>
                                            {filteredProductsSelect.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} (R$ {Number(p.sale_price).toFixed(2)})
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            type="number"
                                            min="1"
                                            value={itemQuantity}
                                            onChange={(e) => setItemQuantity(e.target.value)}
                                            className="w-16 px-2 py-2 bg-white border border-stone-200 rounded-xl text-xs text-center font-semibold"
                                        />

                                        <button
                                            type="button"
                                            onClick={handleAddItemToCombo}
                                            disabled={!selectedProductId}
                                            className="px-3 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-medium disabled:opacity-40 transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {selectedItems.length > 0 && (
                                    <div className="pt-2 divide-y divide-stone-200/60">
                                        {selectedItems.map((item) => (
                                            <div key={item.component_product_id} className="py-2 flex items-center justify-between text-xs">
                                                <div>
                                                    <p className="font-semibold text-stone-800">{item.name}</p>
                                                    <p className="text-[11px] text-stone-500">
                                                        {item.quantity}x R$ {item.unit_price.toFixed(2)} = R$ {(item.quantity * item.unit_price).toFixed(2)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItemFromCombo(item.component_product_id)}
                                                    className="text-stone-400 hover:text-red-600 p-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 space-y-2">
                                <div className="flex items-center justify-between text-xs text-stone-600">
                                    <span>Soma dos itens individuais:</span>
                                    <span className="font-mono font-medium line-through">R$ {totalOriginalPrice.toFixed(2)}</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-amber-900 uppercase tracking-wider mb-1">
                                        Preço Promocional do Combo (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0,00"
                                        value={comboPrice}
                                        onChange={(e) => setComboPrice(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                    />
                                </div>

                                {parseFloat(comboPrice) > 0 && totalOriginalPrice > parseFloat(comboPrice) && (
                                    <p className="text-[11px] text-emerald-700 font-medium text-right">
                                        Desconto para o cliente: R$ {(totalOriginalPrice - parseFloat(comboPrice)).toFixed(2)}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={saving || !comboName.trim() || !comboPrice || selectedItems.length === 0}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-900 hover:bg-amber-950 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all shadow-sm active:scale-[0.98]"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Salvando Combo...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        <span>Cadastrar Combo</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Listagem (7 Colunas) */}
                    <div className="lg:col-span-7 space-y-4">
                        <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Combos Cadastrados
                        </h2>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
                                <Loader2 className="w-6 h-6 text-amber-900 animate-spin" />
                                <p className="text-xs text-stone-500">Carregando catálogo de combos...</p>
                            </div>
                        ) : combos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-stone-200/80 shadow-sm text-center p-6 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-stone-800">Nenhum combo cadastrado</h3>
                                    <p className="text-xs text-stone-500 mt-1">
                                        Crie o primeiro pacote promocional utilizando o formulário ao lado.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {combos.map((combo) => {
                                    const originalSum = combo.product_combo_items.reduce(
                                        (acc, item) => acc + (Number(item.products?.sale_price) || 0) * item.quantity,
                                        0
                                    )

                                    return (
                                        <div
                                            key={combo.id}
                                            className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm space-y-4 hover:border-stone-300 transition-all"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 mb-1 border border-amber-200/60">
                            Kit Promocional
                          </span>
                                                    <h3 className="text-base font-bold text-stone-900">{combo.name}</h3>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-lg font-extrabold text-stone-900 font-mono">
                                                            R$ {Number(combo.sale_price).toFixed(2)}
                                                        </p>
                                                        {originalSum > combo.sale_price && (
                                                            <p className="text-[11px] text-stone-400 line-through font-mono">
                                                                R$ {originalSum.toFixed(2)}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <button
                                                        onClick={() => handleDeleteCombo(combo.id)}
                                                        disabled={deletingId === combo.id}
                                                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                                                        title="Excluir Combo"
                                                    >
                                                        {deletingId === combo.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-stone-100">
                                                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                                                    Componentes do Kit:
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {combo.product_combo_items.map((ci) => (
                                                        <div
                                                            key={ci.component_product_id}
                                                            className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg text-xs border border-stone-200/60"
                                                        >
                                                            <Package className="w-3.5 h-3.5 text-amber-900 shrink-0" />
                                                            <span className="font-medium text-stone-800 truncate">
                                {ci.quantity}x {ci.products?.name || 'Produto não encontrado'}
                              </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    )
}