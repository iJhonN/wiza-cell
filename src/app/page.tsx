'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Boxes,
  Users,
  ArrowUpRight,
  Loader2,
  PackageCheck
} from 'lucide-react'

interface DashboardStats {
  todaySalesTotal: number
  todaySalesCount: number
  lowStockCount: number
  totalCustomers: number
}

interface RecentSale {
  id: string
  created_at: string
  total_amount: number
  customers: { name: string } | null
  payment_methods: { name: string } | null
}

export default function DashboardPage() {
  const supabase = createClient()

  const [stats, setStats] = useState<DashboardStats>({
    todaySalesTotal: 0,
    todaySalesCount: 0,
    lowStockCount: 0,
    totalCustomers: 0
  })
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Define início do dia atual no fuso local
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayIso = todayStart.toISOString()

      // 1. Buscar movimentações de saída (vendas) do dia atual com os relacionamentos
      const { data: movementsToday, error: movError } = await supabase
          .from('stock_movements')
          .select(`
            id,
            quantity,
            unit_price,
            created_at,
            customers(name),
            payment_methods(name)
          `)
          .eq('type', 'saida')
          .gte('created_at', todayIso)
          .order('created_at', { ascending: false })

      if (movError) {
        console.error('Erro ao buscar movimentações de saída:', movError.message)
        throw movError
      }

      // Calcular total faturado hoje e contagem de itens/pedidos
      const totalToday = movementsToday?.reduce((acc, m) => {
        const itemTotal = Number(m.quantity || 0) * Number(m.unit_price || 0)
        return acc + itemTotal
      }, 0) || 0

      const countToday = movementsToday?.length || 0

      // Formatar vendas recentes para exibição na tabela
      const formattedRecentSales: RecentSale[] = (movementsToday || []).slice(0, 5).map((m: any) => ({
        id: m.id,
        created_at: m.created_at,
        total_amount: Number(m.quantity || 0) * Number(m.unit_price || 0),
        customers: m.customers,
        payment_methods: m.payment_methods
      }))

      // 2. Alertas de Estoque Baixo (produtos com <= 3 unidades)
      const { count: lowStock, error: stockError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .lte('stock_quantity', 3)

      if (stockError) {
        console.error('Erro ao buscar estoque baixo:', stockError.message)
        throw stockError
      }

      // 3. Total de Clientes Cadastrados
      const { count: customersCount, error: customerError } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })

      if (customerError) {
        console.error('Erro ao buscar clientes:', customerError.message)
        throw customerError
      }

      setStats({
        todaySalesTotal: totalToday,
        todaySalesCount: countToday,
        lowStockCount: lowStock || 0,
        totalCustomers: customersCount || 0
      })

      setRecentSales(formattedRecentSales)

    } catch (err: any) {
      console.error('Erro ao carregar indicadores do Dashboard:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return (
      <div className="min-h-screen bg-stone-50/60 p-6 md:p-10 text-stone-800">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
                Visão Geral
              </h1>
              <p className="text-sm text-stone-500 mt-1">
                Acompanhe o desempenho das vendas e a saúde do seu estoque hoje.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                  href="/pdv"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                Abrir PDV
              </Link>
              <Link
                  href="/estoque"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <Boxes className="w-4 h-4" />
                Entrada de Estoque
              </Link>
            </div>
          </div>

          {/* Cards de Métricas */}
          {loading ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-stone-200/80 shadow-sm space-y-3">
                <Loader2 className="w-6 h-6 text-amber-900 animate-spin" />
                <p className="text-xs text-stone-500">Atualizando indicadores...</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

                {/* Card: Total Faturado Hoje */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Vendas Hoje</p>
                    <p className="text-2xl font-bold font-mono text-stone-900">
                      R$ {stats.todaySalesTotal.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {stats.todaySalesCount} ítem(ns) vendido(s)
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                {/* Card: Atendimentos do Dia */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Atendimentos</p>
                    <p className="text-2xl font-bold font-mono text-stone-900">
                      {stats.todaySalesCount}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Saídas registradas
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-100">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                </div>

                {/* Card: Estoque Crítico */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Estoque Crítico</p>
                    <p className="text-2xl font-bold font-mono text-rose-700">
                      {stats.lowStockCount}
                    </p>
                    <p className="text-[11px] text-rose-600 font-medium">
                      Produtos com ≤ 3 un
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>

                {/* Card: Clientes Cadastrados */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Base de Clientes</p>
                    <p className="text-2xl font-bold font-mono text-stone-900">
                      {stats.totalCustomers}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Clientes ativos
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center border border-stone-200">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

              </div>
          )}

          {/* Seção Principal: Últimas Vendas & Ações Rápidas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Tabela Resumida das Últimas Vendas */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-stone-900">Últimas Vendas Realizadas</h2>
                  <p className="text-xs text-stone-500 font-medium">Transações de hoje no PDV</p>
                </div>
                <Link
                    href="/movimentacoes"
                    className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 transition-colors"
                >
                  Ver histórico completo
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentSales.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl space-y-2">
                    <PackageCheck className="w-8 h-8 text-stone-300 mx-auto" />
                    <p className="text-xs text-stone-500 font-medium">Nenhuma venda realizada hoje até o momento.</p>
                  </div>
              ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                      <tr className="border-b border-stone-100 text-stone-400 uppercase tracking-wider font-semibold">
                        <th className="pb-3">Cliente</th>
                        <th className="pb-3">Pagamento</th>
                        <th className="pb-3 text-right">Valor</th>
                        <th className="pb-3 text-right">Hora</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                      {recentSales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-stone-50/50">
                            <td className="py-3 font-semibold text-stone-800">
                              {sale.customers?.name || 'Cliente Avulso'}
                            </td>
                            <td className="py-3 text-stone-600">
                              {sale.payment_methods?.name || 'A Prazo / Crediário'}
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-stone-900">
                              R$ {Number(sale.total_amount).toFixed(2)}
                            </td>
                            <td className="py-3 text-right font-mono text-stone-400 text-[11px]">
                              {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
              )}
            </div>

            {/* Painel de Acesso Rápido */}
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-6 space-y-4">
              <h2 className="text-base font-bold text-stone-900">Atalhos do Sistema</h2>

              <div className="space-y-2.5">
                <Link
                    href="/pdv"
                    className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/80 hover:border-amber-700/40 hover:bg-amber-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100/70 text-amber-800 flex items-center justify-center font-bold">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-800 group-hover:text-amber-900">Frente de Caixa (PDV)</p>
                      <p className="text-[11px] text-stone-400">Registrar nova venda rápida</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-amber-800 transition-colors" />
                </Link>

                <Link
                    href="/crediario"
                    className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/80 hover:border-amber-700/40 hover:bg-amber-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-800 group-hover:text-amber-900">Gestão de Caderneta</p>
                      <p className="text-[11px] text-stone-400">Dar baixa em fiados/débitos</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-amber-800 transition-colors" />
                </Link>

                <Link
                    href="/caixa"
                    className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200/80 hover:border-amber-700/40 hover:bg-amber-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-800 group-hover:text-amber-900">Caixa & Fechamento</p>
                      <p className="text-[11px] text-stone-400">Conferência diária e sangria</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-amber-800 transition-colors" />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>
  )
}