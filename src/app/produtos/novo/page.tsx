'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowLeft,
    Loader2,
    Upload,
    Tag,
    Layers,
    Smartphone,
    AlertCircle,
    Plus,
    RefreshCw,
    Barcode,
    QrCode
} from 'lucide-react'

interface DropdownItem {
    id: string
    name: string
}

export default function NovoProdutoPage() {
    const router = useRouter()
    const supabase = createClient()

    const [categories, setCategories] = useState<DropdownItem[]>([])
    const [manufacturers, setManufacturers] = useState<DropdownItem[]>([])
    const [models, setModels] = useState<DropdownItem[]>([])

    const [loadingSelects, setLoadingSelects] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [generatingBarcode, setGeneratingBarcode] = useState(false)
    const [generatingSku, setGeneratingSku] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form States
    const [name, setName] = useState('')
    const [qrCode, setQrCode] = useState('') // SKU / QR Code
    const [barcode, setBarcode] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [manufacturerId, setManufacturerId] = useState('')
    const [modelId, setModelId] = useState('')
    const [costPrice, setCostPrice] = useState('')
    const [salePrice, setSalePrice] = useState('')
    const [stockQuantity, setStockQuantity] = useState('0')
    const [minQuantity, setMinQuantity] = useState('5')
    const [photoUrl, setPhotoUrl] = useState('')

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                setLoadingSelects(true)
                const [catRes, manRes, modRes] = await Promise.all([
                    supabase.from('categories').select('id, name').order('name'),
                    supabase.from('manufacturers').select('id, name').order('name'),
                    supabase.from('models').select('id, name').order('name')
                ])

                setCategories(catRes.data || [])
                setManufacturers(manRes.data || [])
                setModels(modRes.data || [])
            } catch (err: any) {
                setError('Erro ao carregar opções do formulário.')
            } finally {
                setLoadingSelects(false)
            }
        }

        fetchOptions()
    }, [])

    // Gerador de SKU Automático e Único
    const handleGenerateSku = async () => {
        try {
            setGeneratingSku(true)
            let isUnique = false
            let generatedSku = ''

            // Extrai as primeiras 3 letras do nome (ou usa 'PRO' como padrão)
            const prefix = name.trim()
                ? name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase()
                : 'PRO'

            while (!isUnique) {
                const randomNum = Math.floor(100 + Math.random() * 900).toString()
                const candidate = `${prefix}-${randomNum}`

                const { data, error } = await supabase
                    .from('products')
                    .select('id')
                    .eq('qr_code', candidate)
                    .maybeSingle()

                if (error) throw error

                if (!data) {
                    generatedSku = candidate
                    isUnique = true
                }
            }

            setQrCode(generatedSku)
        } catch (err: any) {
            setError('Erro ao gerar SKU único.')
        } finally {
            setGeneratingSku(false)
        }
    }

    // Gerador de Código de Barras Único (6 Dígitos)
    const handleGenerateBarcode = async () => {
        try {
            setGeneratingBarcode(true)
            let isUnique = false
            let generatedCode = ''

            while (!isUnique) {
                const randomSix = Math.floor(100000 + Math.random() * 900000).toString()

                const { data, error } = await supabase
                    .from('products')
                    .select('id')
                    .eq('barcode', randomSix)
                    .maybeSingle()

                if (error) throw error

                if (!data) {
                    generatedCode = randomSix
                    isUnique = true
                }
            }

            setBarcode(generatedCode)
        } catch (err: any) {
            setError('Erro ao verificar/gerar código de barras único.')
        } finally {
            setGeneratingBarcode(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setUploading(true)
            setError(null)

            const fileExt = file.name.split('.').pop()
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `products/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: publicUrlData } = supabase.storage
                .from('products')
                .getPublicUrl(filePath)

            setPhotoUrl(publicUrlData.publicUrl)
        } catch (err: any) {
            setError('Erro ao enviar imagem para o bucket "products".')
            console.error(err)
        } finally {
            setUploading(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !costPrice || !salePrice) return

        try {
            setSaving(true)
            setError(null)

            const payload = {
                name: name.trim(),
                qr_code: qrCode.trim() || null,
                barcode: barcode.trim() || null,
                category_id: categoryId || null,
                cost_price: parseFloat(costPrice),
                sale_price: parseFloat(salePrice),
                stock_quantity: parseInt(stockQuantity) || 0,
                min_quantity: parseInt(minQuantity) || 0,
                photo_url: photoUrl || null,
                is_combo: false
            }

            const { data: newProduct, error: prodErr } = await supabase
                .from('products')
                .insert([payload])
                .select()
                .single()

            if (prodErr) throw prodErr

            if (modelId && newProduct) {
                const { error: modelErr } = await supabase
                    .from('product_models')
                    .insert([
                        {
                            product_id: newProduct.id,
                            model_id: modelId
                        }
                    ])

                if (modelErr) throw modelErr
            }

            router.push('/produtos')
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Erro ao cadastrar produto.')
        } finally {
            setSaving(false)
        }
    }

    const cost = parseFloat(costPrice) || 0
    const sell = parseFloat(salePrice) || 0
    const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : '0'

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Cabeçalho de Navegação */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/produtos"
                        className="p-2 bg-white border border-stone-200 rounded-xl hover:bg-stone-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-stone-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-900">Cadastrar Novo Produto</h1>
                        <p className="text-xs text-stone-500">Preencha as informações do produto abaixo.</p>
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

                <form onSubmit={handleCreate} className="bg-white p-6 md:p-8 rounded-2xl border border-stone-200/80 shadow-sm space-y-6">

                    {/* Nome */}
                    <div>
                        <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                            Nome do Produto *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Capa Silicone MagSafe iPhone 15 Pro Max"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all"
                        />
                    </div>

                    {/* Relações */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5" /> Categoria
                            </label>
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                disabled={loadingSelects}
                                className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-800"
                            >
                                <option value="">Selecione...</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5" /> Fabricante
                            </label>
                            <select
                                value={manufacturerId}
                                onChange={(e) => setManufacturerId(e.target.value)}
                                disabled={loadingSelects}
                                className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-800"
                            >
                                <option value="">Selecione...</option>
                                {manufacturers.map((m) => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Smartphone className="w-3.5 h-3.5" /> Modelo
                            </label>
                            <select
                                value={modelId}
                                onChange={(e) => setModelId(e.target.value)}
                                disabled={loadingSelects}
                                className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-800"
                            >
                                <option value="">Selecione...</option>
                                {models.map((mod) => (
                                    <option key={mod.id} value={mod.id}>{mod.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Preços e Margem */}
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                                    Preço de Custo (R$) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="0,00"
                                    value={costPrice}
                                    onChange={(e) => setCostPrice(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-800"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                                    Preço de Venda (R$) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="0,00"
                                    value={salePrice}
                                    onChange={(e) => setSalePrice(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-800"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200/60">
                            <span className="text-stone-500 font-medium">Margem Estimada de Lucro:</span>
                            <span className={`font-bold text-sm ${parseFloat(margin) > 0 ? 'text-emerald-700' : 'text-stone-500'}`}>
                                {margin}%
                            </span>
                        </div>
                    </div>

                    {/* Quantidades e Identificadores */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">Estoque Inicial</label>
                                <input
                                    type="number"
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">Estoque Mínimo</label>
                                <input
                                    type="number"
                                    value={minQuantity}
                                    onChange={(e) => setMinQuantity(e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                    <span>Código QR / SKU</span>
                                    <button
                                        type="button"
                                        onClick={handleGenerateSku}
                                        disabled={generatingSku}
                                        className="text-[10px] text-amber-900 font-bold hover:underline flex items-center gap-0.5"
                                        title="Gerar SKU automático"
                                    >
                                        {generatingSku ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                        Gerar
                                    </button>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ex: CAP-842"
                                        value={qrCode}
                                        onChange={(e) => setQrCode(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono uppercase"
                                    />
                                    <QrCode className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                    <span>Cód. Barras</span>
                                    <button
                                        type="button"
                                        onClick={handleGenerateBarcode}
                                        disabled={generatingBarcode}
                                        className="text-[10px] text-amber-900 font-bold hover:underline flex items-center gap-0.5"
                                        title="Gerar código único de 6 dígitos"
                                    >
                                        {generatingBarcode ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                        Gerar
                                    </button>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ex: 849201"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono"
                                    />
                                    <Barcode className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Imagem */}
                    <div>
                        <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                            Foto do Produto
                        </label>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-xl border border-stone-200 cursor-pointer transition-all">
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-amber-900" /> : <Upload className="w-4 h-4 text-stone-500" />}
                                <span>{uploading ? 'Enviando imagem...' : 'Escolher Arquivo'}</span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                            </label>
                            {photoUrl && (
                                <div className="w-12 h-12 rounded-xl border border-stone-200 overflow-hidden bg-white p-1">
                                    <img src={photoUrl} alt="Preview" className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                        <Link
                            href="/produtos"
                            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-all"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-amber-900 hover:bg-amber-950 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all shadow-sm active:scale-[0.98]"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span>Salvar Produto</span>
                                </>
                            )}
                        </button>
                    </div>

                </form>

            </div>
        </div>
    )
}