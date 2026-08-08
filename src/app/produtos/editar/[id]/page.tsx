'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeft,
    Save,
    Loader2,
    Package,
    Image as ImageIcon,
    AlertCircle,
    Check
} from 'lucide-react'

interface Category {
    id: string
    name: string
}

interface Manufacturer {
    id: string
    name: string
}

interface DeviceModel {
    id: string
    name: string
    manufacturer_id: string
}

export default function EditarProdutoPage() {
    const router = useRouter()
    const params = useParams()
    const productId = params?.id as string

    const [loadingData, setLoadingData] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Listas auxiliares
    const [categories, setCategories] = useState<Category[]>([])
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
    const [allModels, setAllModels] = useState<DeviceModel[]>([])

    // Estado do formulário
    const [name, setName] = useState('')
    const [qrCode, setQrCode] = useState('')
    const [barcode, setBarcode] = useState('')
    const [costPrice, setCostPrice] = useState('')
    const [salePrice, setSalePrice] = useState('')
    const [stockQuantity, setStockQuantity] = useState('')
    const [minQuantity, setMinQuantity] = useState('')
    const [photoUrl, setPhotoUrl] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])

    const supabase = createClient()

    useEffect(() => {
        if (productId) {
            fetchInitialData()
        }
    }, [productId])

    const fetchInitialData = async () => {
        try {
            setLoadingData(true)
            setError(null)

            // Buscar tabelas auxiliares
            const [catRes, manRes, modRes, prodRes] = await Promise.all([
                supabase.from('categories').select('id, name').order('name'),
                supabase.from('manufacturers').select('id, name').order('name'),
                supabase.from('models').select('id, name, manufacturer_id').order('name'),
                supabase
                    .from('products')
                    .select(`
                        *,
                        product_models(model_id)
                    `)
                    .eq('id', productId)
                    .single()
            ])

            if (catRes.error) throw catRes.error
            if (manRes.error) throw manRes.error
            if (modRes.error) throw modRes.error
            if (prodRes.error) throw prodRes.error

            setCategories(catRes.data || [])
            setManufacturers(manRes.data || [])
            setAllModels(modRes.data || [])

            // Preencher formulário
            const prod = prodRes.data
            setName(prod.name || '')
            setQrCode(prod.qr_code || '')
            setBarcode(prod.barcode || '')
            setCostPrice(prod.cost_price ? String(prod.cost_price) : '0')
            setSalePrice(prod.sale_price ? String(prod.sale_price) : '0')
            setStockQuantity(prod.stock_quantity ? String(prod.stock_quantity) : '0')
            setMinQuantity(prod.min_quantity ? String(prod.min_quantity) : '0')
            setPhotoUrl(prod.photo_url || '')
            setCategoryId(prod.category_id || '')

            // Preencher modelos selecionados
            const linkedModelIds = prod.product_models?.map((pm: any) => pm.model_id) || []
            setSelectedModelIds(linkedModelIds)

        } catch (err: any) {
            setError(err.message || 'Erro ao carregar os dados do produto.')
            console.error(err)
        } finally {
            setLoadingData(false)
        }
    }

    const toggleModelSelection = (modelId: string) => {
        setSelectedModelIds((prev) =>
            prev.includes(modelId)
                ? prev.filter((id) => id !== modelId)
                : [...prev, modelId]
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            setError('O nome do produto é obrigatório.')
            return
        }

        try {
            setSubmitting(true)
            setError(null)

            // 1. Atualizar registro do produto
            const { error: updateErr } = await supabase
                .from('products')
                .update({
                    name: name.trim(),
                    qr_code: qrCode.trim() || null,
                    barcode: barcode.trim() || null,
                    cost_price: parseFloat(costPrice) || 0,
                    sale_price: parseFloat(salePrice) || 0,
                    stock_quantity: parseInt(stockQuantity, 10) || 0,
                    min_quantity: parseInt(minQuantity, 10) || 0,
                    photo_url: photoUrl.trim() || null,
                    category_id: categoryId || null
                })
                .eq('id', productId)

            if (updateErr) throw updateErr

            // 2. Atualizar vínculos em product_models
            // Removar pontes antigas
            const { error: deleteModelsErr } = await supabase
                .from('product_models')
                .delete()
                .eq('product_id', productId)

            if (deleteModelsErr) throw deleteModelsErr

            // Inserir pontes novas
            if (selectedModelIds.length > 0) {
                const newRelations = selectedModelIds.map((mId) => ({
                    product_id: productId,
                    model_id: mId
                }))

                const { error: insertModelsErr } = await supabase
                    .from('product_models')
                    .insert(newRelations)

                if (insertModelsErr) throw insertModelsErr
            }

            router.push('/produtos')
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar as alterações do produto.')
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    if (loadingData) {
        return (
            <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-900 animate-spin" />
                <p className="text-sm text-stone-500">Carregando produto...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Cabeçalho */}
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-6">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/produtos"
                            className="p-2.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 rounded-xl transition-all shadow-sm"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-stone-900">Editar Produto</h1>
                            <p className="text-xs text-stone-500 mt-0.5">
                                Atualize as informações de catálogo, preços e modelos suportados.
                            </p>
                        </div>
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

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Dados Principais */}
                    <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-2">
                            Informações Básicas
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">Nome do Produto *</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Capa Aveludada iPhone 13"
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">Categoria</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-800"
                                >
                                    <option value="">Selecione uma Categoria</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">Código de Barras (EAN)</label>
                                <input
                                    type="text"
                                    value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    placeholder="789..."
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">SKU / QR Code Interno</label>
                                <input
                                    type="text"
                                    value={qrCode}
                                    onChange={(e) => setQrCode(e.target.value)}
                                    placeholder="Ex: 849201"
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preços e Estoque */}
                    <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-2">
                            Valores & Quantidades
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">Preço de Custo (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={costPrice}
                                    onChange={(e) => setCostPrice(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">Preço de Venda (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={salePrice}
                                    onChange={(e) => setSalePrice(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">Qtd. em Estoque</label>
                                <input
                                    type="number"
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">Estoque Mínimo</label>
                                <input
                                    type="number"
                                    value={minQuantity}
                                    onChange={(e) => setMinQuantity(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mídia / Imagem */}
                    <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-2">
                            Imagem do Produto
                        </h2>

                        <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center overflow-hidden">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <ImageIcon className="w-6 h-6 text-stone-400" />
                                )}
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <label className="text-xs font-semibold text-stone-700">URL da Foto</label>
                                <input
                                    type="url"
                                    value={photoUrl}
                                    onChange={(e) => setPhotoUrl(e.target.value)}
                                    placeholder="https://exemplo.com/imagem.png"
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Modelos e Dispositivos Compatíveis */}
                    <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
                                Modelos Compatíveis
                            </h2>
                            <span className="text-xs text-stone-500 font-medium">
                                {selectedModelIds.length} selecionado(s)
                            </span>
                        </div>

                        {manufacturers.length === 0 ? (
                            <p className="text-xs text-stone-400 italic">Nenhum fabricante ou modelo cadastrado.</p>
                        ) : (
                            <div className="space-y-4">
                                {manufacturers.map((m) => {
                                    const mModels = allModels.filter((mod) => mod.manufacturer_id === m.id)
                                    if (mModels.length === 0) return null

                                    return (
                                        <div key={m.id} className="space-y-2">
                                            <p className="text-xs font-bold text-stone-900">{m.name}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {mModels.map((mod) => {
                                                    const isSelected = selectedModelIds.includes(mod.id)
                                                    return (
                                                        <button
                                                            key={mod.id}
                                                            type="button"
                                                            onClick={() => toggleModelSelection(mod.id)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                                isSelected
                                                                    ? 'bg-amber-900 text-white shadow-sm'
                                                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                                            }`}
                                                        >
                                                            {isSelected && <Check className="w-3 h-3" />}
                                                            <span>{mod.name}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Ações de Envio */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Link
                            href="/produtos"
                            className="px-5 py-2.5 bg-stone-200/70 hover:bg-stone-200 text-stone-800 text-sm font-medium rounded-xl transition-all"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-amber-900 hover:bg-amber-950 text-white text-sm font-medium rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            <span>Salvar Alterações</span>
                        </button>
                    </div>

                </form>

            </div>
        </div>
    )
}