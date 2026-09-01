import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Painel de chat é estreito (380px no desktop, tela cheia no mobile) — estilo
// próprio em vez do `prose` do @tailwindcss/typography (não instalado),
// compacto o suficiente pra não estourar a bolha. Tabela larga vira scroll
// horizontal em vez de espremer/quebrar o layout.
export function ChatMarkdown({ content }: { content: string }) {
    return (
        <div className="text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
                    h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
                    h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
                    hr: () => <hr className="my-2 border-border/50" />,
                    a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                            {children}
                        </a>
                    ),
                    code: ({ children }) => (
                        <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs">{children}</code>
                    ),
                    table: ({ children }) => (
                        <div className="mb-2 overflow-x-auto rounded-lg border border-border/50">
                            <table className="w-full text-xs">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-black/5">{children}</thead>,
                    th: ({ children }) => <th className="px-2 py-1 text-left font-semibold whitespace-nowrap">{children}</th>,
                    td: ({ children }) => <td className="px-2 py-1 align-top">{children}</td>,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
