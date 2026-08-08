'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    Package,
    Plus,
    Search,
    Trash2,
    Pencil,
    Loader2,
    AlertCircle,
    Layers,
    X
} from 'lucide-react'

interface DropdownOption {
    id: string
    name: string
}

interface ProductModelRelation {
    models: {
        id: string
        name: string
        manufacturers: {
            id: string
            name: string
        } | null
    } | null
}

interface Product {
    id: string
    name: string
    qr_code: string | null
    barcode: string | null
    cost_price: number
    sale_price: number
    stock_quantity: number
    min_quantity: number
    photo_url: string | null
    categories?: { name: string } | null
    product_models?: ProductModelRelation[]
}

export default function ProdutosPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [manufacturers, setManufacturers] = useState<DropdownOption[]>([])
    const [models, setModels] = useState<DropdownOption[]>([])

    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Filtros
    const [search, setSearch] = useState('')
    const [selectedManufacturerId, setSelectedManufacturerId] = useState('')
    const [selectedModelId, setSelectedModelId] = useState('')

    const supabase = createClient()

    const fetchData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [productsRes, manRes, modRes] = await Promise.all([
                supabase
                    .from('products')
                    .select(`
                        *,
                        categories(name),
                        product_models(
                            models(
                                id,
                                name,
                                manufacturers(id, name)
                            )
                        )
                    `)
                    .order('name', { ascending: true }),
                supabase.from('manufacturers').select('id, name').order('name'),
                supabase.from('models').select('id, name').order('name')
            ])

            if (productsRes.error) throw productsRes.error
            if (manRes.error) throw manRes.error
            if (modRes.error) throw modRes.error

            setProducts(productsRes.data || [])
            setManufacturers(manRes.data || [])
            setModels(modRes.data || [])
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar os dados.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return

        try {
            setDeletingId(id)
            const { error: deleteErr } = await supabase.from('products').delete().eq('id', id)
            if (deleteErr) throw deleteErr

            setProducts((prev) => prev.filter((p) => p.id !== id))
        } catch (err: any) {
            alert('Não foi possível excluir o produto.')
            console.error(err)
        } finally {
            setDeletingId(null)
        }
    }

    const clearFilters = () => {
        setSearch('')
        setSelectedManufacturerId('')
        setSelectedModelId('')
    }

    // Filtragem combinada (Pesquisa, Marca e Modelo)
    const filteredProducts = products.filter((p) => {
        // Busca textual (Nome, SKU ou Código de Barras)
        const matchesSearch =
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.barcode && p.barcode.includes(search)) ||
            (p.qr_code && p.qr_code.toLowerCase().includes(search.toLowerCase()))

        // Obter marcas e modelos vinculados ao produto
        const productModelsList = p.product_models || []

        const hasManufacturer = selectedManufacturerId
            ? productModelsList.some(
                (pm) => pm.models?.manufacturers?.id === selectedManufacturerId
            )
            : true

        const hasModel = selectedModelId
            ? productModelsList.some((pm) => pm.models?.id === selectedModelId)
            : true

        return matchesSearch && hasManufacturer && hasModel
    })

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Cabeçalho */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                            Produtos & Estoque
                        </h1>
                        <p className="text-sm text-stone-500 mt-1">
                            Gerencie o catálogo de produtos e consulte o saldo de estoque.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/produtos/combos"
                            className="flex items-center gap-2 px-4 py-2.5 bg-stone-200/70 hover:bg-stone-200 text-stone-800 text-sm font-medium rounded-xl transition-all"
                        >
                            <Layers className="w-4 h-4 text-stone-600" />
                            <span>Combos</span>
                        </Link>
                        <Link
                            href="/produtos/novo"
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-900 hover:bg-amber-950 text-white text-sm font-medium rounded-xl transition-all shadow-sm active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Novo Produto</span>
                        </Link>
                    </div>
                </div>

                {/* Notificação de Erro */}
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

                {/* Barra de Pesquisa e Filtros (Marca / Modelo) */}
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">

                    {/* Campo de Pesquisa Textual */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, SKU ou código de barras..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all placeholder:text-stone-400"
                        />
                    </div>

                    {/* Filtro por Marca / Fabricante */}
                    <div className="w-full md:w-48">
                        <select
                            value={selectedManufacturerId}
                            onChange={(e) => setSelectedManufacturerId(e.target.value)}
                            className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:border-amber-800"
                        >
                            <option value="">Todas as Marcas</option>
                            {manufacturers.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro por Modelo */}
                    <div className="w-full md:w-48">
                        <select
                            value={selectedModelId}
                            onChange={(e) => setSelectedModelId(e.target.value)}
                            className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:border-amber-800"
                        >
                            <option value="">Todos os Modelos</option>
                            {models.map((mod) => (
                                <option key={mod.id} value={mod.id}>
                                    {mod.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Limpar Filtros */}
                    {(search || selectedManufacturerId || selectedModelId) && (
                        <button
                            onClick={clearFilters}
                            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors shrink-0 flex items-center gap-1 text-xs font-semibold"
                            title="Limpar Filtros"
                        >
                            <X className="w-4 h-4" />
                            <span className="md:hidden">Limpar</span>
                        </button>
                    )}
                </div>

                {/* Tabela de Produtos */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
                        <Loader2 className="w-6 h-6 text-amber-900 animate-spin" />
                        <p className="text-xs text-stone-500">Carregando catálogo...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-stone-200/80 shadow-sm text-center p-6 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-stone-800">Nenhum produto encontrado</h3>
                            <p className="text-xs text-stone-500 mt-1">
                                {search || selectedManufacturerId || selectedModelId
                                    ? 'Tente ajustar os filtros da busca.'
                                    : 'Cadastre seu primeiro produto clicando no botão acima.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                <tr className="bg-stone-50/80 border-b border-stone-200/80 text-stone-500 font-semibold uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Produto</th>
                                    <th className="py-3.5 px-4">Categoria</th>
                                    <th className="py-3.5 px-4">Marca / Modelo</th>
                                    <th className="py-3.5 px-4 text-right">Custo</th>
                                    <th className="py-3.5 px-4 text-right">Venda</th>
                                    <th className="py-3.5 px-4 text-center">Estoque</th>
                                    <th className="py-3.5 px-4 text-right">Ações</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 text-stone-700">
                                {filteredProducts.map((p) => {
                                    const isLowStock = p.stock_quantity <= p.min_quantity

                                    // Formatação das marcas e modelos vinculados ao produto
                                    const modelInfoList = p.product_models
                                        ?.map((pm) => {
                                            const brand = pm.models?.manufacturers?.name
                                            const modelName = pm.models?.name
                                            if (brand && modelName) return `${brand} (${modelName})`
                                            if (modelName) return modelName
                                            return null
                                        })
                                        .filter(Boolean) || []

                                    const modelInfoDisplay =
                                        modelInfoList.length > 0
                                            ? modelInfoList.join(', ')
                                            : 'Sem modelo'

                                    return (
                                        <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 shrink-0 overflow-hidden flex items-center justify-center p-0.5">
                                                        {p.photo_url ? (
                                                            <img src={p.photo_url} alt={p.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <Package className="w-4 h-4 text-stone-400" />
                                                        )}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="font-semibold text-stone-900 truncate text-sm">{p.name}</p>
                                                        <p className="text-[11px] text-stone-400 font-mono">
                                                            {p.qr_code ? `SKU: ${p.qr_code}` : ''} {p.barcode ? `| EAN: ${p.barcode}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="font-medium text-stone-800">{p.categories?.name || 'Geral'}</span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="font-medium text-stone-800 truncate block max-w-xs" title={modelInfoDisplay}>
                                                    {modelInfoDisplay}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono text-stone-500">
                                                R$ {Number(p.cost_price || 0).toFixed(2)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-semibold text-stone-900">
                                                R$ {Number(p.sale_price || 0).toFixed(2)}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                                                    isLowStock
                                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                    {p.stock_quantity || 0} un
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/produtos/editar/${p.id}`}
                                                        className="p-1.5 text-stone-400 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title="Editar Produto"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(p.id)}
                                                        disabled={deletingId === p.id}
                                                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                        title="Excluir Produto"
                                                    >
                                                        {deletingId === p.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
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