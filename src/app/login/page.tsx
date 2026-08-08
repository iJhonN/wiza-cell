'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Store, Lock, Mail, Loader2, AlertCircle } from 'lucide-react'

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
        <div className="w-full max-w-md bg-stone-950 border border-stone-800 p-8 rounded-2xl shadow-2xl space-y-6 mx-auto">

            {/* Logo e Identificação */}
            <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-700/20 border border-amber-600/30 text-amber-500 flex items-center justify-center mx-auto">
                    <Store className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-stone-100">Wiza Cell</h1>
                <p className="text-xs text-stone-400">Entre com suas credenciais para acessar o ERP</p>
            </div>

            {/* Mensagem de Erro */}
            {errorMsg && (
                <div className="p-3.5 bg-red-950/50 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Formulário de Autenticação */}
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-300">E-mail</label>
                    <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                        <input
                            type="email"
                            required
                            placeholder="seuemail@wizacell.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-600 transition-colors"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-300">Senha</label>
                    <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-600 transition-colors"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>Acessar Sistema</span>
                </button>
            </form>

            <div className="text-center pt-2 border-t border-stone-800/80">
                <p className="text-[11px] text-stone-500">
                    Wiza Cell ERP &copy; {new Date().getFullYear()} - Acesso Restrito
                </p>
            </div>

        </div>
    )
}