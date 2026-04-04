import { useEffect, useRef, useState } from 'react'
import { searchCities } from '../lib/api'

/**
 * Real-time city search via backend → API Ninjas City API.
 * `value` / `onChange` are the city string stored on the profile (geocodable text).
 */
export default function CitySearchField({
  id = 'city-search',
  name = 'city',
  label,
  value,
  onChange,
  required = false,
  inputClassName = '',
}) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = String(value || '').trim()
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchCities(q)
        const list = Array.isArray(data.results) ? data.results : []
        setResults(list)
        setOpen(list.length > 0)
      } catch {
        setResults([])
        setOpen(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  useEffect(() => {
    const onDoc = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const handleSelect = (item) => {
    const next = item.city || item.displayName || item.label || ''
    onChange(next)
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative block">
      {label ? (
        <span className="mb-2 block text-[14px] font-semibold text-[#5e6572]">{label}</span>
      ) : null}
      <input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        required={required}
        placeholder="City"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true)
        }}
        className={inputClassName}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
      />
      {open && results.length > 0 ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#d8d2c6] bg-white py-1 shadow-lg"
        >
          {results.map((item) => (
            <li key={String(item.placeId)}>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-left text-[13px] text-[#3a3f49] hover:bg-[#f1efea]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
              >
                <span className="line-clamp-2">{item.displayName || item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
