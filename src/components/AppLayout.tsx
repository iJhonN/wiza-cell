'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

export function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isLoginPage = pathname === '/login'

    if (isLoginPage) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center bg-stone-950">
                {children}
            </div>
        )
    }

    return (
        <div className="min-h-screen flex w-full">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-y-auto bg-stone-50 text-stone-900">
                {children}
            </main>
        </div>
    )
}