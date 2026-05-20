"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
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
  const [inputValue, setInputValue] = useState("")
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Resolve display label for current value
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

  // Sync input display when closed
  useEffect(() => {
    if (!open) setInputValue(selectedLabel)
  }, [open, selectedLabel])

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return
    function reposition() {
      if (!inputRef.current) return
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }
    reposition()
    window.addEventListener("scroll", reposition, true)
    window.addEventListener("resize", reposition)
    return () => {
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("resize", reposition)
    }
  }, [open])

  const q = open ? inputValue.toLowerCase() : ""

  const filteredOptions = options.filter(
    (o) => o.label.toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q)
  )
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      options: g.options.filter(
        (o) => o.label.toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q)
      ),
    }))
    .filter((g) => g.options.length > 0)
  const hasResults = filteredOptions.length > 0 || filteredGroups.length > 0

  function openDropdown() {
    if (disabled) return
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }
    setOpen(true)
  }

  function handleActivate() {
    if (!open) {
      setInputValue("")
      openDropdown()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value)
    if (!open) openDropdown()
  }

  function select(v: string) {
    onValueChange(v)
    setOpen(false)
  }

  function clearValue(e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange("")
    setInputValue("")
    setOpen(false)
    inputRef.current?.focus()
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      onPointerDown={(e) => e.stopPropagation()}
      className="rounded-md border border-gray-200 bg-white shadow-lg"
    >
      <div className="max-h-56 overflow-y-auto p-1">
        {filteredOptions.map((o) => (
          <OptionRow key={o.value} option={o} selected={value === o.value} onSelect={select} />
        ))}
        {filteredGroups.map((g) => (
          <div key={g.label}>
            <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide select-none">
              {g.label}
            </p>
            {g.options.map((o) => (
              <OptionRow key={o.value} option={o} selected={value === o.value} onSelect={select} />
            ))}
          </div>
        ))}
        {!hasResults && (
          <p className="py-4 text-center text-sm text-gray-400">No results</p>
        )}
      </div>
    </div>
  ) : null

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleActivate}
          onClick={handleActivate}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 pr-8 text-sm shadow-sm transition-colors",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring",
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
          <ChevronDown
            className={cn(
              "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        )}
      </div>
      {mounted && createPortal(dropdown, document.body)}
    </div>
  )
}

function OptionRow({
  option,
  selected,
  onSelect,
}: {
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
        {option.sub && (
          <span className="ml-1.5 text-xs text-gray-400 font-normal">{option.sub}</span>
        )}
      </span>
      {selected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
    </button>
  )
}
