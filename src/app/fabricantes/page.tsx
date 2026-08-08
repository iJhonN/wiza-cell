'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Building2, Loader2, Search, Link as LinkIcon, Image as ImageIcon } from 'lucide-react'

interface Manufacturer {
    id: string
    name: string
    logo_url?: string | null
    created_at: string
}

export default function FabricantesPage() {
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [logoUrl, setLogoUrl] = useState('')
    const [search, setSearch] = useState('')
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()

    const fetchManufacturers = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('manufacturers')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error
            setManufacturers(data || [])
        } catch (err: any) {
            setError('Erro ao carregar fabricantes.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchManufacturers()
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        try {
            setCreating(true)
            setError(null)

            const payload = {
                name: name.trim(),
                logo_url: logoUrl.trim() ? logoUrl.trim() : null
            }

            const { data, error } = await supabase
                .from('manufacturers')
                .insert([payload])
                .select()

            if (error) throw error

            if (data) {
                setManufacturers((prev) => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)))
                setName('')
                setLogoUrl('')
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao criar fabricante.')
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este fabricante?')) return

        try {
            setDeletingId(id)
            const { error } = await supabase.from('manufacturers').delete().eq('id', id)
            if (error) throw error

            setManufacturers((prev) => prev.filter((m) => m.id !== id))
        } catch (err: any) {
            alert('Não foi possível excluir o fabricante. Verifique se existem modelos vinculados a ele.')
            console.error(err)
        } finally {
            setDeletingId(null)
        }
    }

    const filteredManufacturers = manufacturers.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Cabeçalho */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                            Fabricantes
                        </h1>
                        <p className="text-sm text-stone-500 mt-1">
                            Gerencie as marcas e logos dos fabricantes (Apple, Samsung, Xiaomi...).
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-100/60 text-amber-900 px-3.5 py-1.5 rounded-lg text-sm font-medium w-fit border border-amber-200/50">
                        <Building2 className="w-4 h-4 text-amber-800" />
                        <span>{manufacturers.length} {manufacturers.length === 1 ? 'fabricante' : 'fabricantes'}</span>
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
                            Novo Fabricante
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label htmlFor="manufacturerName" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                    Nome da Marca / Fabricante
                                </label>
                                <input
                                    id="manufacturerName"
                                    type="text"
                                    placeholder="Ex: Apple, Samsung, Motorola..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all placeholder:text-stone-400"
                                />
                            </div>

                            <div>
                                <label htmlFor="logoUrl" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                                    URL da Logo (Opcional)
                                </label>
                                <div className="relative">
                                    <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        id="logoUrl"
                                        type="url"
                                        placeholder="https://exemplo.com/logo.png"
                                        value={logoUrl}
                                        onChange={(e) => setLogoUrl(e.target.value)}
                                        className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all placeholder:text-stone-400 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Preview da Logo */}
                            {logoUrl.trim() && (
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 flex items-center justify-center overflow-hidden p-1 shrink-0">
                                        <img
                                            src={logoUrl}
                                            alt="Preview"
                                            className="max-w-full max-h-full object-contain"
                                            onError={(e) => {
                                                ;(e.target as HTMLElement).style.display = 'none'
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-stone-500 truncate">Pré-visualização da imagem</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={creating || !name.trim()}
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
                                        <span>Adicionar Fabricante</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Listagem de Fabricantes */}
                    <div className="md:col-span-2 space-y-4">

                        {/* Campo de Busca */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                placeholder="Buscar fabricante por nome..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all placeholder:text-stone-400 shadow-sm"
                            />
                        </div>

                        {/* Grid de Cards */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
                                <Loader2 className="w-6 h-6 text-amber-900 animate-spin" />
                                <p className="text-xs text-stone-500">Carregando fabricantes...</p>
                            </div>
                        ) : filteredManufacturers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-stone-200/80 shadow-sm text-center p-6 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-stone-800">Nenhum fabricante encontrado</h3>
                                    <p className="text-xs text-stone-500 mt-1">
                                        {search ? 'Tente buscar por outro termo.' : 'Cadastre seu primeiro fabricante ao lado.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {filteredManufacturers.map((manufacturer) => (
                                    <div
                                        key={manufacturer.id}
                                        className="group bg-white p-4 rounded-xl border border-stone-200/80 shadow-sm hover:shadow-md hover:border-stone-300 transition-all flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 rounded-lg bg-amber-50/50 border border-stone-200 flex items-center justify-center text-amber-900 shrink-0 overflow-hidden p-1">
                                                {manufacturer.logo_url ? (
                                                    <img
                                                        src={manufacturer.logo_url}
                                                        alt={manufacturer.name}
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            // Se der erro ao carregar a imagem, esconde o img e mostra o ícone
                                                            ;(e.target as HTMLElement).style.display = 'none'
                                                        }}
                                                    />
                                                ) : (
                                                    <Building2 className="w-4 h-4 text-amber-900" />
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-stone-800 truncate">
                        {manufacturer.name}
                      </span>
                                        </div>

                                        <button
                                            onClick={() => handleDelete(manufacturer.id)}
                                            disabled={deletingId === manufacturer.id}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                            title="Excluir fabricante"
                                        >
                                            {deletingId === manufacturer.id ? (
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