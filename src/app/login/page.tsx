'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, Loader2, AlertCircle, ArrowRight } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()

        const cleanEmail = email.trim()

        if (!cleanEmail || !password) {
            setErrorMsg('Preencha o e-mail e a senha.')
            return
        }

        try {
            setLoading(true)
            setErrorMsg(null)

            const { error } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: password,
            })

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('E-mail ou senha incorretos.')
                }
                throw error
            }

            router.push('/')
            router.refresh()
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro ao realizar login. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative w-full max-w-md mx-auto p-4 sm:p-0">
            {/* Efeito Glow / Brilho sutil de fundo */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Card Principal */}
            <div className="relative bg-stone-950/90 backdrop-blur-md border border-stone-800/90 p-8 rounded-3xl shadow-2xl space-y-7 ring-1 ring-white/5">

                {/* Header com Logo e Identificação */}
                <div className="text-center space-y-3">
                    <div className="relative w-24 h-24 mx-auto rounded-2xl overflow-hidden border border-amber-600/30 shadow-lg shadow-amber-950/40 p-1 bg-stone-900">
                        <div className="relative w-full h-full rounded-xl overflow-hidden">
                            <Image
                                src="/logo.jpeg"
                                alt="Logo Wiza Cell"
                                fill
                                priority
                                className="object-cover"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-stone-100">
                            Wiza Cell
                        </h1>
                        <p className="text-xs text-stone-400 font-medium">
                            Acesse o painel de gestão comercial
                        </p>
                    </div>
                </div>

                {/* Notificação de Erro */}
                {errorMsg && (
                    <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-2xl text-red-300 text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="font-medium">{errorMsg}</span>
                    </div>
                )}

                {/* Formulário de Autenticação */}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-stone-300">
                            E-mail de Acesso
                        </label>
                        <div className="relative group">
                            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-amber-500 transition-colors" />
                            <input
                                type="email"
                                required
                                placeholder="seuemail@wizacell.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-stone-900/80 border border-stone-800 rounded-2xl text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-stone-300">
                            Sua Senha
                        </label>
                        <div className="relative group">
                            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-amber-500 transition-colors" />
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-stone-900/80 border border-stone-800 rounded-2xl text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all font-medium"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] cursor-pointer mt-2"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>Entrar no Sistema</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Rodapé do Card */}
                <div className="text-center pt-2 border-t border-stone-900">
                    <p className="text-[11px] text-stone-500 font-medium">
                        Wiza Cell ERP &copy; {new Date().getFullYear()} — Todos os direitos reservados
                    </p>
                </div>

            </div>
        </div>
    )
}