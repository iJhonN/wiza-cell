'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    LayoutDashboard,
    ShoppingCart,
    Boxes,
    Package,
    Tags,
    Building2,
    Smartphone,
    ArrowLeftRight,
    Users,
    CreditCard,
    Receipt,
    Store,
    LogOut,
    Menu,
    X
} from 'lucide-react'

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'PDV (Caixa)', href: '/pdv', icon: ShoppingCart },
    { name: 'Estoque', href: '/estoque', icon: Boxes },
    { name: 'Produtos', href: '/produtos', icon: Package },
    { name: 'Categorias', href: '/categorias', icon: Tags },
    { name: 'Fabricantes', href: '/fabricantes', icon: Building2 },
    { name: 'Modelos', href: '/modelos', icon: Smartphone },
    { name: 'Movimentações', href: '/movimentacoes', icon: ArrowLeftRight },
    { name: 'Clientes', href: '/clientes', icon: Users },
    { name: 'Vendas a Prazo', href: '/crediario', icon: CreditCard },
    { name: 'Caixa / Fechamento', href: '/caixa', icon: Receipt },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <>
            {/* Header / Botão Hambúrguer para Dispositivos Móveis */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-stone-900 border-b border-stone-800 flex items-center justify-between px-4 z-40">
                <div className="flex items-center gap-2 text-stone-100 font-bold text-sm">
                    <Store className="w-5 h-5 text-amber-500" />
                    <span>Wiza Cell</span>
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 text-stone-300 hover:text-white rounded-lg bg-stone-800"
                >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Overlay para fechar ao clicar fora no mobile */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`
                    w-64 bg-stone-900 text-stone-300 flex flex-col shrink-0 border-r border-stone-800
                    fixed lg:static top-0 bottom-0 left-0 z-50 transition-transform duration-300 ease-in-out
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Brand / Logo Area */}
                <div className="p-6 border-b border-stone-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-700/20 border border-amber-600/30 flex items-center justify-center text-amber-500">
                            <Store className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-stone-100 tracking-wide">Wiza Cell</h1>
                            <p className="text-[11px] text-stone-400 font-medium">Gestão Comercial</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setMobileOpen(false)}
                        className="lg:hidden p-1.5 text-stone-400 hover:text-white rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Menu Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-amber-900/40 text-amber-400 border border-amber-700/30 font-semibold'
                                        : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                                <span>{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* Rodapé com Identificação e Botão de Sair */}
                <div className="p-4 border-t border-stone-800/80">
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-stone-800/40 border border-stone-800">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-amber-800/30 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                                WC
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-medium text-stone-200 truncate">Wiza Cell Store</p>
                                <p className="text-[10px] text-stone-500 truncate">Painel Administrativo</p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            title="Sair do Sistema"
                            className="p-2 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors shrink-0"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    )
}