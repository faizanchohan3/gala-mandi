"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { DismissableLayerBranch } from "@radix-ui/react-dismissable-layer"
import { Check, ChevronDown } from "lucide-react"
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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
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

  // Close when clicking outside both the trigger and the dropdown
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  // Keep dropdown aligned to trigger on scroll / resize
  useEffect(() => {
    if (!open) return
    function pos() {
      if (!triggerRef.current) return
      const r = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({ position: "fixed", top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 })
    }
    pos()
    window.addEventListener("scroll", pos, true)
    window.addEventListener("resize", pos)
    return () => { window.removeEventListener("scroll", pos, true); window.removeEventListener("resize", pos) }
  }, [open])

  function toggle() {
    if (disabled) return
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({ position: "fixed", top: r.bottom + 4, left: r.left, width: r.width, zIndex: 9999 })
    }
    setOpen(o => !o)
  }

  function select(v: string) {
    onValueChange(v)
    setOpen(false)
  }

  const allOptions = [
    ...options,
    ...groups.flatMap(g => g.options),
  ]

  const dropdown = open ? (
    <DismissableLayerBranch
      ref={dropdownRef}
      style={{ ...dropdownStyle, pointerEvents: "auto" }}
      className="rounded-md border border-gray-200 bg-white shadow-lg"
    >
      <div className="max-h-56 overflow-y-auto p-1">
        {options.map(o => (
          <OptionRow key={o.value} option={o} selected={value === o.value} onSelect={select} />
        ))}
        {groups.map(g => (
          <div key={g.label}>
            <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide select-none">
              {g.label}
            </p>
            {g.options.map(o => (
              <OptionRow key={o.value} option={o} selected={value === o.value} onSelect={select} />
            ))}
          </div>
        ))}
        {allOptions.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">No options</p>
        )}
      </div>
    </DismissableLayerBranch>
  ) : null

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
          "focus:outline-none focus:ring-1 focus:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-1 ring-ring"
        )}
      >
        <span className={cn("truncate text-left flex-1", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 opacity-50 flex-shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
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
