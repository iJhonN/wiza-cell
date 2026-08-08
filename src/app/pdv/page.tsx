'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Search,
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    Check,
    AlertCircle,
    Loader2,
    DollarSign,
    User,
    CreditCard,
    Lock,
    Unlock,
    Package
} from 'lucide-react'

interface Product {
    id: string
    name: string
    sale_price: number
    stock_quantity: number
    barcode: string | null
    qr_code: string | null
    photo_url: string | null
}

interface Customer {
    id: string
    name: string
    phone: string | null
}

interface PaymentMethod {
    id: string
    name: string
}

interface CartItem {
    product: Product
    quantity: number
    unit_price: number
}

interface CashRegister {
    id: string
    opening_amount: number
    opened_at: string
}

export default function PDVPage() {
    const supabase = createClient()

    // Estados do Caixa
    const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
    const [openingAmount, setOpeningAmount] = useState('0.00')
    const [openingLoading, setOpeningLoading] = useState(false)

    // Dados auxiliares
    const [products, setProducts] = useState<Product[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

    // Estados de Seleção/Busca
    const [searchQuery, setSearchQuery] = useState('')
    const [cart, setCart] = useState<CartItem[]>([])
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('')
    const [isCreditSale, setIsCreditSale] = useState(false)

    // Estados de Interface/Aviso
    const [loadingData, setLoadingData] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        try {
            setLoadingData(true)
            setError(null)

            // 1. Verificar se existe caixa aberto
            const { data: openRegister, error: registerErr } = await supabase
                .from('cash_registers')
                .select('*')
                .is('closed_at', null)
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (registerErr) throw registerErr
            setCashRegister(openRegister)

            // 2. Carregar produtos, clientes e formas de pagamento
            const [prodRes, custRes, payRes] = await Promise.all([
                supabase
                    .from('products')
                    .select('id, name, sale_price, stock_quantity, barcode, qr_code, photo_url')
                    .gt('stock_quantity', 0)
                    .order('name'),
                supabase.from('customers').select('id, name, phone').order('name'),
                supabase.from('payment_methods').select('id, name').order('name')
            ])

            if (prodRes.error) throw prodRes.error
            if (custRes.error) throw custRes.error
            if (payRes.error) throw payRes.error

            setProducts(prodRes.data || [])
            setCustomers(custRes.data || [])
            setPaymentMethods(payRes.data || [])

            if (payRes.data && payRes.data.length > 0) {
                setSelectedPaymentMethodId(payRes.data[0].id)
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados do PDV.')
            console.error(err)
        } finally {
            setLoadingData(false)
        }
    }

    // Abertura de Caixa
    const handleOpenRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setOpeningLoading(true)
            setError(null)

            const amount = parseFloat(openingAmount) || 0

            const { data, error: err } = await supabase
                .from('cash_registers')
                .insert([{ opening_amount: amount }])
                .select()
                .single()

            if (err) throw err

            setCashRegister(data)
            setSuccessMsg('Caixa aberto com sucesso!')
            setTimeout(() => setSuccessMsg(null), 3000)
        } catch (err: any) {
            setError(err.message || 'Erro ao abrir o caixa.')
        } finally {
            setOpeningLoading(false)
        }
    }

    // Fechamento de Caixa
    const handleCloseRegister = async () => {
        if (!cashRegister) return
        if (!confirm('Deseja realmente fechar o caixa atual?')) return

        try {
            setError(null)
            const { error: err } = await supabase
                .from('cash_registers')
                .update({ closed_at: new Date().toISOString() })
                .eq('id', cashRegister.id)

            if (err) throw err

            setCashRegister(null)
            setCart([])
            setSuccessMsg('Caixa fechado com sucesso!')
            setTimeout(() => setSuccessMsg(null), 3000)
        } catch (err: any) {
            setError(err.message || 'Erro ao fechar o caixa.')
        }
    }

    // Operações do Carrinho
    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existingIndex = prev.findIndex((item) => item.product.id === product.id)
            if (existingIndex > -1) {
                const currentQty = prev[existingIndex].quantity
                if (currentQty >= product.stock_quantity) {
                    alert('Quantidade máxima em estoque atingida.')
                    return prev
                }
                const updated = [...prev]
                updated[existingIndex].quantity += 1
                return updated
            } else {
                return [...prev, { product, quantity: 1, unit_price: product.sale_price }]
            }
        })
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => {
                    if (item.product.id === productId) {
                        const newQty = item.quantity + delta
                        if (newQty > item.product.stock_quantity) {
                            alert('Quantidade limite do estoque atingida.')
                            return item
                        }
                        return newQty > 0 ? { ...item, quantity: newQty } : null
                    }
                    return item
                })
                .filter(Boolean) as CartItem[]
        )
    }

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId))
    }

    const totalAmount = cart.reduce((acc, item) => acc + item.quantity * item.unit_price, 0)

    // Filtragem de produtos para a lista
    const filteredProducts = products.filter((p) => {
        const q = searchQuery.toLowerCase()
        return (
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.includes(q)) ||
            (p.qr_code && p.qr_code.toLowerCase().includes(q))
        )
    })

    // Submissão da Venda
    const handleFinalizeSale = async () => {
        if (cart.length === 0) {
            setError('Adicione pelo menos um produto ao carrinho.')
            return
        }

        if (isCreditSale && !selectedCustomerId) {
            setError('Selecione um cliente para realizar uma venda Fiado/A Prazo.')
            return
        }

        try {
            setSubmitting(true)
            setError(null)

            const customerId = selectedCustomerId || null
            const paymentMethodId = isCreditSale ? null : selectedPaymentMethodId

            // 1. Inserir Movimentações de Estoque (saída) para cada item
            for (const item of cart) {
                const { data: movement, error: movErr } = await supabase
                    .from('stock_movements')
                    .insert([
                        {
                            product_id: item.product.id,
                            type: 'saida',
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            payment_method_id: paymentMethodId,
                            customer_id: customerId,
                            notes: isCreditSale ? 'Venda a Prazo (Fiado)' : 'Venda PDV'
                        }
                    ])
                    .select()
                    .single()

                if (movErr) throw movErr

                // 2. Decrementar estoque do produto
                const newStock = item.product.stock_quantity - item.quantity
                const { error: stockErr } = await supabase
                    .from('products')
                    .update({ stock_quantity: newStock })
                    .eq('id', item.product.id)

                if (stockErr) throw stockErr

                // 3. Se for venda Fiado, registrar em credit_sales
                if (isCreditSale && movement) {
                    const { error: creditErr } = await supabase.from('credit_sales').insert([
                        {
                            customer_id: customerId,
                            stock_movement_id: movement.id,
                            total_amount: item.quantity * item.unit_price,
                            paid_amount: 0,
                            status: 'pendente'
                        }
                    ])

                    if (creditErr) throw creditErr
                }
            }

            setSuccessMsg('Venda realizada com sucesso!')
            setCart([])
            setSelectedCustomerId('')
            setIsCreditSale(false)

            // Recarregar estoque atualizado
            fetchInitialData()

            setTimeout(() => setSuccessMsg(null), 3500)
        } catch (err: any) {
            setError(err.message || 'Erro ao finalizar a venda.')
            console.error(err)
        } finally {
            setSubmitting(false)
        }
    }

    if (loadingData) {
        return (
            <div className="min-h-screen bg-stone-50/60 p-6 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-amber-900 animate-spin" />
                <p className="text-sm text-stone-500">Inicializando PDV...</p>
            </div>
        )
    }

    // TELA DE ABERTURA DE CAIXA (bloqueante)
    if (!cashRegister) {
        return (
            <div className="min-h-screen bg-stone-50/60 p-6 flex items-center justify-center text-stone-800">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-stone-200/80 shadow-sm space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100/70 border border-amber-200 text-amber-900 flex items-center justify-center mx-auto">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-bold text-stone-900">Caixa Fechado</h1>
                        <p className="text-xs text-stone-500">
                            Abra o caixa informando o valor do fundo inicial para realizar vendas.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleOpenRegister} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-stone-700">Valor Inicial do Caixa (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={openingAmount}
                                onChange={(e) => setOpeningAmount(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={openingLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-900 hover:bg-amber-950 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
                        >
                            {openingLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Unlock className="w-4 h-4" />
                            )}
                            <span>Abrir Caixa</span>
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-50/60 p-4 md:p-8 text-stone-800">
            <div className="max-w-7xl mx-auto space-y-4">

                {/* Status do Caixa */}
                <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                            <p className="text-xs font-bold text-stone-900">Caixa Aberto</p>
                            <p className="text-[11px] text-stone-500 font-mono">
                                Abertura: {new Date(cashRegister.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | Fundo: R$ {Number(cashRegister.opening_amount).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleCloseRegister}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors border border-stone-200"
                    >
                        Fechar Caixa
                    </button>
                </div>

                {/* Notificações */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{error}</span>
                        </div>
                        <button onClick={() => setError(null)} className="text-xs underline font-semibold">
                            Fechar
                        </button>
                    </div>
                )}

                {successMsg && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Layout Principal: Busca + Carrinho */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Coluna da Esquerda: Seleção de Produtos */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar produto por nome, SKU ou Código de Barras..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50/50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-800 transition-all"
                                />
                            </div>

                            {/* Lista de Produtos Encontrados */}
                            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
                                {filteredProducts.length === 0 ? (
                                    <div className="text-center py-12 text-stone-400 text-xs">
                                        Nenhum produto em estoque encontrado.
                                    </div>
                                ) : (
                                    filteredProducts.map((p) => (
                                        <div
                                            key={p.id}
                                            onClick={() => addToCart(p)}
                                            className="flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:border-amber-800/40 hover:bg-amber-50/30 cursor-pointer transition-all group"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 shrink-0 flex items-center justify-center overflow-hidden">
                                                    {p.photo_url ? (
                                                        <img src={p.photo_url} alt={p.name} className="w-full h-full object-contain" />
                                                    ) : (
                                                        <Package className="w-4 h-4 text-stone-400" />
                                                    )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="font-semibold text-stone-900 text-sm truncate">{p.name}</p>
                                                    <p className="text-[11px] text-stone-400 font-mono">
                                                        Estoque: {p.stock_quantity} un
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="font-mono font-bold text-stone-900 text-sm">
                                                    R$ {Number(p.sale_price).toFixed(2)}
                                                </span>
                                                <div className="p-1.5 bg-stone-100 group-hover:bg-amber-900 group-hover:text-white rounded-lg transition-colors text-stone-600">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Coluna da Direita: Carrinho e Checkout */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-sm space-y-5">
                            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5 text-amber-900" />
                                    <h2 className="font-bold text-stone-900">Carrinho de Compras</h2>
                                </div>
                                <span className="text-xs text-stone-500 font-mono">{cart.length} item(ns)</span>
                            </div>

                            {/* Itens do Carrinho */}
                            <div className="max-h-[260px] overflow-y-auto space-y-3 pr-1">
                                {cart.length === 0 ? (
                                    <div className="text-center py-10 text-stone-400 text-xs">
                                        Carrinho vazio. Clique nos produtos ao lado para adicionar.
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <div
                                            key={item.product.id}
                                            className="flex items-center justify-between p-2.5 bg-stone-50/60 rounded-xl border border-stone-200/60 text-xs"
                                        >
                                            <div className="flex-1 overflow-hidden pr-2">
                                                <p className="font-semibold text-stone-900 truncate">{item.product.name}</p>
                                                <p className="text-stone-500 font-mono">
                                                    R$ {item.unit_price.toFixed(2)} x {item.quantity} = {' '}
                                                    <span className="font-semibold text-stone-800">
                                                        R$ {(item.quantity * item.unit_price).toFixed(2)}
                                                    </span>
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, -1)}
                                                    className="p-1 bg-white border border-stone-200 hover:bg-stone-100 rounded-md text-stone-600"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="font-mono font-bold w-6 text-center">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, 1)}
                                                    className="p-1 bg-white border border-stone-200 hover:bg-stone-100 rounded-md text-stone-600"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => removeFromCart(item.product.id)}
                                                    className="p-1 text-stone-400 hover:text-red-600 ml-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Configuração de Cliente e Pagamento */}
                            <div className="space-y-3 pt-3 border-t border-stone-100">
                                {/* Seleção de Cliente */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                                        <User className="w-3.5 h-3.5 text-stone-500" />
                                        <span>Cliente</span>
                                    </label>
                                    <select
                                        value={selectedCustomerId}
                                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                                        className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-amber-800"
                                    >
                                        <option value="">Cliente Não Identificado (Consumidor)</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.phone ? `(${c.phone})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Opção de Fiado / Venda a Prazo */}
                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="creditSaleCheck"
                                        checked={isCreditSale}
                                        onChange={(e) => setIsCreditSale(e.target.checked)}
                                        className="rounded border-stone-300 text-amber-900 focus:ring-amber-900"
                                    />
                                    <label htmlFor="creditSaleCheck" className="text-xs font-medium text-stone-700 cursor-pointer">
                                        Venda Fiado / A Prazo (Caderneta)
                                    </label>
                                </div>

                                {/* Forma de Pagamento (Se não for Fiado) */}
                                {!isCreditSale && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                                            <CreditCard className="w-3.5 h-3.5 text-stone-500" />
                                            <span>Forma de Pagamento</span>
                                        </label>
                                        <select
                                            value={selectedPaymentMethodId}
                                            onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                                            className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-amber-800"
                                        >
                                            {paymentMethods.map((pm) => (
                                                <option key={pm.id} value={pm.id}>
                                                    {pm.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Total e Ação Final */}
                            <div className="pt-3 border-t border-stone-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs uppercase tracking-wider font-bold text-stone-400">Total a Pagar</span>
                                    <span className="text-2xl font-black text-stone-900 font-mono">
                                        R$ {totalAmount.toFixed(2)}
                                    </span>
                                </div>

                                <button
                                    onClick={handleFinalizeSale}
                                    disabled={submitting || cart.length === 0}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-amber-900 hover:bg-amber-950 text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <DollarSign className="w-5 h-5" />
                                    )}
                                    <span>Finalizar Venda</span>
                                </button>
                            </div>

                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}