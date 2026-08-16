// src/components/trip/ExpenseFilters.tsx
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { CURRENCIES } from "@/lib/currencies";

interface ExpenseFiltersProps {
    categories: string[];
    filterCategory: string;
    filterCurrency: string;
    onCategoryChange: (value: string) => void;
    onCurrencyChange: (value: string) => void;
    onReset: () => void;
}

export function ExpenseFilters({ categories, filterCategory, filterCurrency, onCategoryChange, onCurrencyChange, onReset }: ExpenseFiltersProps) {
    const hasActiveFilter = filterCategory !== 'all' || filterCurrency !== 'all';

    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-card border border-border p-3 rounded-2xl">
            <div className="hidden sm:flex items-center gap-2 text-muted-foreground mr-2 border-r border-border pr-4">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Filtros</span>
            </div>

            <div className="grid grid-cols-1 sm:flex sm:flex-row gap-3 w-full">
                <Select value={filterCategory} onValueChange={onCategoryChange}>
                    <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-xl">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={filterCurrency} onValueChange={onCurrencyChange}>
                    <SelectTrigger className="w-full sm:w-[150px] h-9 rounded-xl">
                        <SelectValue placeholder="Moeda" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as moedas</SelectItem>
                        {CURRENCIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>{c.label} ({c.symbol})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {hasActiveFilter && (
                    <Button
                        variant="ghost"
                        onClick={onReset}
                        className="h-9 px-4 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    >
                        <X className="w-3.5 h-3.5 mr-2" /> Limpar
                    </Button>
                )}
            </div>
        </div>
    );
}
