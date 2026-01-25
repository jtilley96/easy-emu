import { ReactNode, createContext, useContext, useState } from 'react'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'

interface LayoutContextType {
  isSidebarFocused: boolean
  setIsSidebarFocused: (focused: boolean) => void
}

export const LayoutContext = createContext<LayoutContextType | null>(null)

export function useLayoutContext() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayoutContext must be used within Layout')
  }
  return context
}

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarFocused, setIsSidebarFocused] = useState(true)

  return (
    <LayoutContext.Provider value={{ isSidebarFocused, setIsSidebarFocused }}>
      <div className="h-screen w-screen flex flex-col bg-surface-950 text-surface-100 overflow-hidden">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden bg-surface-900">
            {children}
          </main>
        </div>
      </div>
    </LayoutContext.Provider>
  )
}
