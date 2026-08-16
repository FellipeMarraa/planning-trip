// src/components/common/money-input.tsx
import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MoneyInputProps {
    value: number;
    onValueChange: (value: number) => void;
    decimals?: number;
    prefix?: string;
    className?: string;
    placeholder?: string;
    required?: boolean;
}

function digitsToNumber(raw: string, decimals: number): number {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return 0;
    return Number(digits) / 10 ** decimals;
}

function formatValue(value: number, decimals: number): string {
    if (!value) return '';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ value, onValueChange, decimals = 2, prefix, className, placeholder, required }, ref) => {
        const zeroPlaceholder = (0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

        return (
            <div className="relative">
                {prefix && (
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                        {prefix}
                    </span>
                )}
                <Input
                    ref={ref}
                    type="text"
                    inputMode="decimal"
                    value={formatValue(value, decimals)}
                    onChange={(e) => onValueChange(digitsToNumber(e.target.value, decimals))}
                    placeholder={placeholder ?? zeroPlaceholder}
                    required={required}
                    className={cn("tabular-nums", prefix && "pl-9", className)}
                />
            </div>
        );
    }
);
MoneyInput.displayName = 'MoneyInput';
