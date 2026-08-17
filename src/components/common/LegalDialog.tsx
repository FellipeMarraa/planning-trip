// src/components/common/LegalDialog.tsx
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X, type LucideIcon } from "lucide-react";
import type { LegalSection } from "@/lib/legalContent";

interface LegalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    icon: LucideIcon;
    title: string;
    sections: LegalSection[];
}

export function LegalDialog({ open, onOpenChange, icon: Icon, title, sections }: LegalDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-[520px] w-[95vw] max-h-[85vh] rounded-3xl p-0 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/40 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <AlertDialogTitle className="text-base font-semibold text-foreground">{title}</AlertDialogTitle>
                    </div>
                    <AlertDialogCancel className="h-8 w-8 p-0 border-0 bg-transparent hover:bg-muted rounded-full flex items-center justify-center text-muted-foreground flex-shrink-0">
                        <X className="w-4 h-4" />
                    </AlertDialogCancel>
                </div>

                <div className="p-6 sm:p-8 overflow-y-auto scrollbar-none space-y-5 text-sm text-muted-foreground leading-relaxed flex-1 min-h-0">
                    {sections.map((section) => (
                        <section key={section.title} className="space-y-1.5">
                            <h4 className="font-semibold text-foreground">{section.title}</h4>
                            {section.body.map((paragraph, idx) => (
                                <p key={idx}>{paragraph}</p>
                            ))}
                        </section>
                    ))}
                </div>

                <div className="p-6 border-t border-border bg-muted/40 flex-shrink-0">
                    <AlertDialogAction className="w-full" onClick={() => onOpenChange(false)}>
                        Entendido
                    </AlertDialogAction>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
