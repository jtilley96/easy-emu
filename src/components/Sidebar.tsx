import { NavLink } from 'react-router-dom'
import {
  Library,
  Gamepad2,
  Settings,
  Clock,
  Star,
  FolderOpen
} from 'lucide-react'

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
          isActive
            ? 'bg-accent text-white'
            : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'
        }`
      }
    >
      {icon}
      <span className="font-medium">{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  return (
    <aside className="w-56 bg-surface-950 border-r border-surface-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
            <Gamepad2 size={24} />
          </div>
          <span className="text-xl font-bold">EasyEmu</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        <NavItem to="/" icon={<Library size={20} />} label="Library" />
        <NavItem to="/systems" icon={<FolderOpen size={20} />} label="Systems" />

        <div className="pt-4 pb-2">
          <span className="px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
            Quick Access
          </span>
        </div>

        <NavItem to="/?filter=recent" icon={<Clock size={20} />} label="Recently Played" />
        <NavItem to="/?filter=favorites" icon={<Star size={20} />} label="Favorites" />
      </nav>

      {/* Settings at bottom */}
      <div className="p-3 border-t border-surface-800">
        <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
      </div>
    </aside>
  )
}
