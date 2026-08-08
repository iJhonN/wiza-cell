'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Smartphone, Loader2, Search } from 'lucide-react'

interface Manufacturer {
    id: string
    name: string
}

interface ModelItem {
    id: string
    name: string
    manufacturer_id: string
    created_at: string
    manufacturers?: {
        name: string
    }
}

export default function ModelosPage() {
    const [models, setModels] = useState<ModelItem[]>([])
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [selectedManufacturer, setSelectedManufacturer] = useState('')
    const [search, setSearch] = useState('')
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()

    const fetchData = async () => {
        try {
            setLoading(true)

            const [manufacturersRes, modelsRes] = await Promise.all([
                supabase.from('manufacturers').select('*').order('name', { ascending: true }),
                supabase.from('models').select('*, manufacturers(name)').order('name', { ascending: true })
            ])

            if (manufacturersRes.error) throw manufacturersRes.error
            if (modelsRes.error) throw modelsRes.error

            setManufacturers(manufacturersRes.data || [])
            setModels(modelsRes.data || [])

            if (manufacturersRes.data && manufacturersRes.data.length > 0) {
                setSelectedManufacturer(manufacturersRes.data[0].id)
            }
        } catch (err: any) {
            setError('Erro ao carregar dados.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !selectedManufacturer) return

        try {
            setCreating(true)
            setError(null)
            const { data, error } = await supabase
                .from('models')
                .insert([{ name: name.trim(), manufacturer_id: selectedManufacturer }])
                .select('*, manufacturers(name)')

            if (error) throw error

            if (data) {
                setModels((prev) => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
                setName('')
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao criar modelo.')
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este modelo?')) return

        try {
            setDeletingId(id)
            const { error } = await supabase.from('models').delete().eq('id', id)
            if (error) throw error

            setModels((prev) => prev.filter((m) => m.id !== id))
        } catch (err: any) {
            alert('Não foi possível excluir o modelo.')
            console.error(err)
        } finally {
            setDeletingId(null)
        }
    }

    const filteredModels = models.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.manufacturers?.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Cabeçalho */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                            Modelos
                        </h1>
                        <p className="text-sm text-stone-500 mt-1">
                            Gerencie os modelos vinculados aos fabricantes (ex: iPhone 13, Galaxy S23).
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-100/60 text-amber-900 px-3.5 py-1.5 rounded-lg text-sm font-medium w-fit border border-amber-200/50">
                        <Smartphone className="w-4 h-4 text-amber-800" />
                        <span>{models.length} {models.length === 1 ? 'modelo' : 'modelos'}</span>
                    </div>
                </div>

                {/* Mensagem de Erro */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-xs underline font-semibold hover:text-red-800">
                            Fechar
                        </button>
                    </div>
                )}

                {/* Formulário e Busca */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Card de Cadastro */}
                    <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm h-fit space-y-4">
                        <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-amber-900" />
                            Novo Modelo
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label htmlFor="manufacturerSelect" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                    Fabricante
                                </label>
                                <select
                                    id="manufacturerSelect"
                                    value={selectedManufacturer}
                                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all"
                                >
                                    {manufacturers.length === 0 ? (
                                        <option value="">Nenhum fabricante cadastrado</option>
                                    ) : (
                                        manufacturers.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="modelName" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                    Nome do Modelo
                                </label>
                                <input
                                    id="modelName"
                                    type="text"
                                    placeholder="Ex: iPhone 15 Pro, Galaxy S24..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all placeholder:text-stone-400"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={creating || !name.trim() || !selectedManufacturer}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-900 hover:bg-amber-950 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-amber-900/10 active:scale-[0.98]"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        <span>Adicionar Modelo</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Listagem de Modelos */}
                    <div className="md:col-span-2 space-y-4">

                        {/* Campo de Busca */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Buscar modelo ou fabricante..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all placeholder:text-stone-400 shadow-sm"
                            />
                        </div>

                        {/* Grid de Cards */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
                                <Loader2 className="w-6 h-6 text-amber-900 animate-spin" />
                                <p className="text-xs text-stone-500">Carregando modelos...</p>
                            </div>
                        ) : filteredModels.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-stone-200/80 shadow-sm text-center p-6 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-stone-800">Nenhum modelo encontrado</h3>
                                    <p className="text-xs text-stone-500 mt-1">
                                        {search ? 'Tente buscar por outro termo.' : 'Cadastre seu primeiro modelo ao lado.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {filteredModels.map((model) => (
                                    <div
                                        key={model.id}
                                        className="group bg-white p-4 rounded-xl border border-stone-200/80 shadow-sm hover:shadow-md hover:border-stone-300 transition-all flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-900 shrink-0">
                                                <Smartphone className="w-4 h-4" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h4 className="text-sm font-medium text-stone-800 truncate">
                                                    {model.name}
                                                </h4>
                                                <p className="text-xs text-stone-400 truncate">
                                                    {model.manufacturers?.name || 'Sem fabricante'}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDelete(model.id)}
                                            disabled={deletingId === model.id}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                            title="Excluir modelo"
                                        >
                                            {deletingId === model.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>
        </div>
    )
}