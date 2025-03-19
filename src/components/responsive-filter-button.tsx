"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"

interface FilterOption {
    value: string | null
    label: string
}

interface ResponsiveFilterButtonProps {
    icon: React.ReactNode
    label: string
    value: string | null
    options: FilterOption[]
    onChange: (value: string | null) => void
    isOpen: boolean
    onOpenChange: (isOpen: boolean) => void
    closeOtherFilters: () => void
}

export function ResponsiveFilterButton({
    icon,
    label,
    value,
    options,
    onChange,
    isOpen,
    onOpenChange,
    closeOtherFilters,
}: ResponsiveFilterButtonProps) {
    const handleClick = () => {
        if (!isOpen) {
            closeOtherFilters()
        }
        onOpenChange(!isOpen)
    }

    const handleOptionClick = (optionValue: string | null) => {
        onChange(optionValue)
        onOpenChange(false)
    }

    const selectedOption = options.find((option) => option.value === value)

    return (
        <div className="relative h-10">
            <Button variant="outline" className="w-full h-10 rounded-lg shadow-sm" onClick={handleClick}>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 overflow-hidden">
                        {icon}
                        <span className="block truncate">{selectedOption ? selectedOption.label : label}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                </div>
            </Button>

            {isOpen && (
                <Card className="absolute top-full left-0 mt-1 w-48 z-10 animate-fadeIn shadow-modern">
                    <div className="p-1">
                        {options.map((option) => (
                            <button
                                key={option.value ?? "all"}
                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                                onClick={() => handleOptionClick(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}

