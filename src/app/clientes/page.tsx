'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Users,
    UserPlus,
    Search,
    DollarSign,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    Phone,
    X
} from 'lucide-react'

interface Customer {
    id: string
    name: string
    phone: string | null
    created_at: string
}

interface PaymentMethod {
    id: string
    name: string
}

interface CreditSale {
    id: string
    total_amount: number
    paid_amount: number
    status: 'pendente' | 'parcial' | 'pago'
    created_at: string
    stock_movement_id: string | null
}

export default function ClientesPage() {
    const supabase = createClient()

    const [customers, setCustomers] = useState<Customer[]>([])
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

    // Estados de UI e Carregamento
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Filtros
    const [search, setSearch] = useState('')

    // Formulário de Novo Cliente
    const [showNewCustomerModal, setShowNewCustomerModal] = useState(false)
    const [newName, setNewName] = useState('')
    const [newPhone, setNewPhone] = useState('')

    // Estado da Modal de Fiados / Pagamentos do Cliente
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [customerCreditSales, setCustomerCreditSales] = useState<CreditSale[]>([])
    const [loadingCreditSales, setLoadingCreditSales] = useState(false)

    // Formulário de Pagamento de Débito
    const [selectedSaleToPay, setSelectedSaleToPay] = useState<CreditSale | null>(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethodId, setPaymentMethodId] = useState('')

    const fetchData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [custRes, payRes] = await Promise.all([
                supabase.from('customers').select('*').order('name', { ascending: true }),
                supabase.from('payment_methods').select('id, name').order('name')
            ])

            if (custRes.error) throw custRes.error
            if (payRes.error) throw payRes.error

            setCustomers(custRes.data || [])
            setPaymentMethods(payRes.data || [])
            if (payRes.data && payRes.data.length > 0) {
                setPaymentMethodId(payRes.data[0].id)
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar lista de clientes.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Cadastro de Novo Cliente
    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return

        try {
            setSubmitting(true)
            setError(null)

            const { data, error: insertErr } = await supabase
                .from('customers')
                .insert([
                    {
                        name: newName.trim(),
                        phone: newPhone.trim() || null
                    }
                ])
                .select()
                .single()

            if (insertErr) throw insertErr

            setCustomers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
            setNewName('')
            setNewPhone('')
            setShowNewCustomerModal(false)
            setSuccessMsg('Cliente cadastrado com sucesso!')
            setTimeout(() => setSuccessMsg(null), 3000)
        } catch (err: any) {
            setError(err.message || 'Erro ao cadastrar cliente.')
        } finally {
            setSubmitting(false)
        }
    }

    // Carregar vendas a prazo do cliente selecionado
    const handleSelectCustomer = async (customer: Customer) => {
        setSelectedCustomer(customer)
        setSelectedSaleToPay(null)
        try {
            setLoadingCreditSales(true)
            const { data, error: fetchErr } = await supabase
                .from('credit_sales')
                .select('*')
                .eq('customer_id', customer.id)
                .order('created_at', { ascending: false })

            if (fetchErr) throw fetchErr
            setCustomerCreditSales(data || [])
        } catch (err: any) {
            console.error('Erro ao buscar histórico de fiados:', err)
        } finally {
            setLoadingCreditSales(false)
        }
    }

    // Processar pagamento parcial ou total de um débito
    const handleRegisterPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedSaleToPay || !paymentAmount || !paymentMethodId) return

        const amountToPay = parseFloat(paymentAmount)
        const remainingToPay = selectedSaleToPay.total_amount - selectedSaleToPay.paid_amount

        if (amountToPay <= 0 || amountToPay > remainingToPay) {
            alert(`O valor do pagamento deve ser maior que R$ 0,00 e menor ou igual a R$ ${remainingToPay.toFixed(2)}.`)
            return
        }

        try {
            setSubmitting(true)
            setError(null)

            // 1. Inserir registro em credit_payments
            const { error: payErr } = await supabase.from('credit_payments').insert([
                {
                    credit_sale_id: selectedSaleToPay.id,
                    amount: amountToPay,
                    payment_method_id: paymentMethodId
                }
            ])

            if (payErr) throw payErr

            // 2. Atualizar credit_sales
            const newPaidAmount = Number(selectedSaleToPay.paid_amount) + amountToPay
            const newStatus = newPaidAmount >= selectedSaleToPay.total_amount ? 'pago' : 'parcial'

            const { error: updateErr } = await supabase
                .from('credit_sales')
                .update({
                    paid_amount: newPaidAmount,
                    status: newStatus
                })
                .eq('id', selectedSaleToPay.id)

            if (updateErr) throw updateErr

            setSuccessMsg('Pagamento registrado com sucesso!')
            setTimeout(() => setSuccessMsg(null), 3000)

            // Atualizar lista local de fiados
            if (selectedCustomer) {
                handleSelectCustomer(selectedCustomer)
            }
            setSelectedSaleToPay(null)
            setPaymentAmount('')
        } catch (err: any) {
            setError(err.message || 'Erro ao registrar pagamento.')
        } finally {
            setSubmitting(false)
        }
    }

    const filteredCustomers = customers.filter(
        (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.phone && c.phone.includes(search))
    )

    return (
        <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Cabeçalho */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                            Clientes & Caderneta
                        </h1>
                        <p className="text-sm text-stone-500 mt-1">
                            Gerencie o cadastro de clientes e o controle de recebimento de fiados.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowNewCustomerModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-900 hover:bg-amber-950 text-white text-sm font-medium rounded-xl transition-all shadow-sm active:scale-[0.98]"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Novo Cliente</span>
                    </button>
                </div>

                {/* Notificações */}
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

                {successMsg && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Busca e Tabela de Clientes */}
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm space-y-4">
                    <div className="relative max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente por nome ou telefone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all placeholder:text-stone-400"
                        />
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-3">
                            <Loader2 className="w-6 h-6 text-amber-900 animate-spin" />
                            <p className="text-xs text-stone-500">Carregando lista de clientes...</p>
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="text-center py-16 text-stone-400 text-xs">
                            Nenhum cliente cadastrado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                <tr className="bg-stone-50/80 border-b border-stone-200/80 text-stone-500 font-semibold uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Nome do Cliente</th>
                                    <th className="py-3.5 px-4">Telefone</th>
                                    <th className="py-3.5 px-4">Cadastrado Em</th>
                                    <th className="py-3.5 px-4 text-right">Ações</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 text-stone-700">
                                {filteredCustomers.map((c) => (
                                    <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                                        <td className="py-3.5 px-4 font-semibold text-stone-900 text-sm">
                                            {c.name}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-stone-600">
                                            {c.phone ? (
                                                <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3 text-stone-400" />
                                                    {c.phone}
                                                    </span>
                                            ) : (
                                                <span className="text-stone-400 font-sans italic">Não informado</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-stone-500 font-mono">
                                            {new Date(c.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <button
                                                onClick={() => handleSelectCustomer(c)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/10 hover:bg-amber-900 text-amber-900 hover:text-white rounded-lg font-semibold transition-colors text-xs"
                                            >
                                                <DollarSign className="w-3.5 h-3.5" />
                                                <span>Caderneta / Fiados</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL: Novo Cliente */}
                {showNewCustomerModal && (
                    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white max-w-md w-full p-6 rounded-2xl border border-stone-200 shadow-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                                <h2 className="text-base font-bold text-stone-900">Cadastrar Novo Cliente</h2>
                                <button
                                    onClick={() => setShowNewCustomerModal(false)}
                                    className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateCustomer} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-stone-700">Nome Completo *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: João da Silva"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-800"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-stone-700">Telefone / WhatsApp</label>
                                    <input
                                        type="text"
                                        placeholder="(82) 99999-9999"
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-amber-800"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewCustomerModal(false)}
                                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !newName.trim()}
                                        className="px-5 py-2 bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold rounded-xl disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        <span>Salvar Cliente</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL: Caderneta / Fiados do Cliente */}
                {selectedCustomer && (
                    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white max-w-3xl w-full p-6 rounded-2xl border border-stone-200 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                                <div>
                                    <h2 className="text-lg font-bold text-stone-900">
                                        Caderneta de {selectedCustomer.name}
                                    </h2>
                                    <p className="text-xs text-stone-500">
                                        Consulte as compras a prazo e registre os recebimentos.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedCustomer(null)}
                                    className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {loadingCreditSales ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                                    <Loader2 className="w-6 h-6 text-amber-900 animate-spin" />
                                    <p className="text-xs text-stone-500">Carregando fiados...</p>
                                </div>
                            ) : customerCreditSales.length === 0 ? (
                                <div className="text-center py-12 text-stone-400 text-xs">
                                    Este cliente não possui compras a prazo registradas.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-3">
                                        {customerCreditSales.map((sale) => {
                                            const debtRemaining = sale.total_amount - sale.paid_amount
                                            return (
                                                <div
                                                    key={sale.id}
                                                    className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 flex flex-wrap items-center justify-between gap-4 text-xs"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-stone-900 text-sm">
                                                                Total: R$ {Number(sale.total_amount).toFixed(2)}
                                                            </span>
                                                            <span
                                                                className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                                                                    sale.status === 'pago'
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : sale.status === 'parcial'
                                                                            ? 'bg-amber-100 text-amber-900'
                                                                            : 'bg-red-100 text-red-800'
                                                                }`}
                                                            >
                                                                {sale.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-stone-500 font-mono">
                                                            Pago: R$ {Number(sale.paid_amount).toFixed(2)} | {' '}
                                                            <span className="font-semibold text-stone-800">
                                                                Restante: R$ {debtRemaining.toFixed(2)}
                                                            </span>
                                                        </p>
                                                        <p className="text-[11px] text-stone-400">
                                                            Data: {new Date(sale.created_at).toLocaleString('pt-BR')}
                                                        </p>
                                                    </div>

                                                    {debtRemaining > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSaleToPay(sale)
                                                                setPaymentAmount(debtRemaining.toFixed(2))
                                                            }}
                                                            className="px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-white rounded-lg font-semibold transition-colors shrink-0"
                                                        >
                                                            Receber Pagamento
                                                        </button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Formulário de Recebimento de Débito */}
                                    {selectedSaleToPay && (
                                        <form
                                            onSubmit={handleRegisterPayment}
                                            className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3"
                                        >
                                            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                                                Abater Débito
                                            </h3>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[11px] font-semibold text-stone-700">
                                                        Valor a Pagar (R$)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        value={paymentAmount}
                                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-[11px] font-semibold text-stone-700">
                                                        Forma de Pagamento
                                                    </label>
                                                    <select
                                                        value={paymentMethodId}
                                                        onChange={(e) => setPaymentMethodId(e.target.value)}
                                                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                                                    >
                                                        {paymentMethods.map((pm) => (
                                                            <option key={pm.id} value={pm.id}>
                                                                {pm.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSaleToPay(null)}
                                                    className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-lg text-xs font-medium"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="px-4 py-1.5 bg-amber-900 hover:bg-amber-950 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                                                    <span>Confirmar Recebimento</span>
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}