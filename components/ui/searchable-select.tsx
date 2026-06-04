"use client"

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  side?: "top" | "right" | "bottom" | "left"
}

export function SearchableSelect({
  value,
  onValueChange,
  placeholder = "Select...",
  options = [],
  groups = [],
  className,
  disabled,
  side = "bottom",
}: Props) {
  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent side={side}>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}{o.sub ? <span className="ml-1.5 text-xs text-gray-400">{o.sub}</span> : null}
          </SelectItem>
        ))}
        {groups.map(g => (
          <SelectGroup key={g.label}>
            <SelectLabel>{g.label}</SelectLabel>
            {g.options.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}{o.sub ? <span className="ml-1.5 text-xs text-gray-400">{o.sub}</span> : null}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
