import { memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
  hideFirstHeading?: boolean
}

export const MarkdownContent = memo(function MarkdownContent({ content, className, hideFirstHeading }: MarkdownContentProps) {
  // Memoize the processed content to avoid recomputation on every render
  const processedContent = useMemo(() => {
    if (!hideFirstHeading) return content

    // Remove the first line if it starts with # or ##
    const lines = content.split('\n')
    const firstNonEmptyIndex = lines.findIndex(line => line.trim().length > 0)
    if (firstNonEmptyIndex >= 0) {
      const firstLine = lines[firstNonEmptyIndex].trim()
      if (firstLine.startsWith('#')) {
        // Remove the first heading line
        lines.splice(firstNonEmptyIndex, 1)
        return lines.join('\n').trim()
      }
    }
    return content
  }, [content, hideFirstHeading])

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        components={{
          // Override default elements with custom styling
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-normal">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mt-3 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-3 mb-1 first:mt-0">{children}</h3>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          code: ({ children, className }) => {
            // Check if it's an inline code block (no language class)
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              )
            }
            // Block code
            return (
              <code className={cn('block bg-muted p-3 rounded-lg text-sm font-mono overflow-x-auto', className)}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="bg-muted rounded-lg overflow-hidden my-2">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-normal">{children}</li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
})
