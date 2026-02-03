import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Heading2,
  Quote,
  Code,
  List,
  Link2,
} from 'lucide-react'

interface DescriptionEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  disabled?: boolean
}

export function DescriptionEditor({
  content,
  onChange,
  placeholder = 'Describe what you built...',
  disabled = false,
}: DescriptionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[180px] text-[15px] px-3 py-2.5',
      },
    },
    onUpdate: ({ editor }) => {
      // Convert HTML to markdown
      const html = editor.getHTML()
      const markdown = htmlToMarkdown(html)
      onChange(markdown)
    },
  })

  // Add link to editor
  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run()
    }
  }

  if (!editor) return null

  return (
    <div className={cn(
      "rounded-xl border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all bg-background overflow-hidden",
      disabled && "opacity-50 cursor-not-allowed"
    )}>
      <EditorContent
        editor={editor}
        className="[&_.tiptap]:min-h-[160px] [&_.tiptap]:focus:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
      />

      {/* Formatting Toolbar */}
      {!disabled && (
        <div className="px-2 py-1.5 border-t border-border bg-muted/20">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                editor.isActive('bold') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                editor.isActive('italic') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              type="button"
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                editor.isActive('heading') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                editor.isActive('blockquote') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                editor.isActive('code') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="Code"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              type="button"
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                editor.isActive('bulletList') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
                editor.isActive('link') ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={addLink}
              title="Link"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to convert HTML to markdown
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '_$1_')
    .replace(/<code>(.*?)<\/code>/g, '`$1`')
    .replace(/<blockquote><p>(.*?)<\/p><\/blockquote>/g, '> $1\n')
    .replace(/<li><p>(.*?)<\/p><\/li>/g, '- $1\n')
    .replace(/<ul>/g, '')
    .replace(/<\/ul>/g, '')
    .replace(/<ol>/g, '')
    .replace(/<\/ol>/g, '')
    .replace(/<p><\/p>/g, '\n')
    .replace(/<p>(.*?)<\/p>/g, '$1\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<a href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)')
    .replace(/\n+/g, '\n')
    .trim()
}
