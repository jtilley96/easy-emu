import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  className = ''
}: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-64 pl-10 pr-8 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-700 rounded"
        >
          <X size={14} className="text-surface-400" />
        </button>
      )}
    </div>
  )
}
