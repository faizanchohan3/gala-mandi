"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { DismissableLayerBranch } from "@radix-ui/react-dismissable-layer"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type SelectOption = {
  value: string
  label: string
  sub?: string
}

export type SelectGroup = {
  label: string
  options: SelectOption[]
}

type Props = {
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
  options?: SelectOption[]
  groups?: SelectGroup[]
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder = "Select...",
  options = [],
  groups = [],
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Resolve display label for current value directly from props
  let selectedLabel = ""
  for (const o of options) {
    if (o.value === value) { selectedLabel = o.label; break }
  }
  if (!selectedLabel) {
    outer: for (const g of groups) {
      for (const o of g.options) {
        if (o.value === value) { selectedLabel = o.label; break outer }
      }
    }
  }

  // Show search text while open, selected label while closed
  const displayValue = open ? search : selectedLabel

  // Close when clicking outside both the input and the dropdown
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (!inputRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  // Keep dropdown aligned to input on scroll / resize
  useEffect(() => {
    if (!open) return
    function pos() {
      if (!inputRef.current) return
      const r = inputRef.current.getBoundingClientRect()
      setDropdownStyle({ position: "fixed", top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 })
    }
    pos()
    window.addEventListener("scroll", pos, true)
    window.addEventListener("resize", pos)
    return () => { window.removeEventListener("scroll", pos, true); window.removeEventListener("resize", pos) }
  }, [open])

  const q = search.toLowerCase()
  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q)
  )
  const filteredGroups = groups
    .map(g => ({ ...g, options: g.options.filter(o => o.label.toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q)) }))
    .filter(g => g.options.length > 0)
  const hasResults = filteredOptions.length > 0 || filteredGroups.length > 0

  function openDropdown() {
    if (disabled) return
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect()
      setDropdownStyle({ position: "fixed", top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 })
    }
    setSearch("")
    setOpen(true)
  }

  function handleActivate() {
    if (!open) openDropdown()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    if (!open) openDropdown()
  }

  function select(v: string) {
    onValueChange(v)
    setOpen(false)
    setSearch("")
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function clearValue(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onValueChange("")
    setOpen(false)
    setSearch("")
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // DismissableLayerBranch is the official Radix way to tell the Dialog
  // "this portalled DOM node belongs to me — don't treat clicks here as outside".
  // It registers its DOM node in the DismissableLayerContext.branches set,
  // which Radix checks before firing onPointerDownOutside or onFocusOutside.
  const dropdown = open ? (
    <DismissableLayerBranch
      ref={dropdownRef}
      style={{ ...dropdownStyle, pointerEvents: "auto" }}
      className="rounded-md border border-gray-200 bg-white shadow-lg"
    >
      <div className="max-h-56 overflow-y-auto p-1">
        {filteredOptions.map(o => (
          <OptionRow key={o.value} option={o} selected={value === o.value} onSelect={select} />
        ))}
        {filteredGroups.map(g => (
          <div key={g.label}>
            <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide select-none">
              {g.label}
            </p>
            {g.options.map(o => (
              <OptionRow key={o.value} option={o} selected={value === o.value} onSelect={select} />
            ))}
          </div>
        ))}
        {!hasResults && <p className="py-4 text-center text-sm text-gray-400">No results</p>}
      </div>
    </DismissableLayerBranch>
  ) : null

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleActivate}
          onClick={handleActivate}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 pr-8 text-sm shadow-sm transition-colors",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        {value ? (
          <button
            type="button"
            onMouseDown={clearValue}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className={cn(
            "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 transition-transform duration-200",
            open && "rotate-180"
          )} />
        )}
      </div>
      {mounted && createPortal(dropdown, document.body)}
    </div>
  )
}

function OptionRow({ option, selected, onSelect }: {
  option: SelectOption
  selected: boolean
  onSelect: (v: string) => void
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(option.value)}
      className={cn(
        "w-full flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-gray-100 transition-colors",
        selected && "bg-green-50 text-green-700 font-medium"
      )}
    >
      <span className="flex-1 truncate">
        {option.label}
        {option.sub && <span className="ml-1.5 text-xs text-gray-400 font-normal">{option.sub}</span>}
      </span>
      {selected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
    </button>
  )
}
