import { ReactNode } from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col bg-surface-950 text-surface-100 overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden bg-surface-900">
          {children}
        </main>
      </div>
    </div>
  )
}
