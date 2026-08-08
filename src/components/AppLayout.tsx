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
        <div className="min-h-screen flex flex-col lg:flex-row w-full bg-stone-50">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
                {children}
            </main>
        </div>
    )
}