import { useState, useCallback, useRef, type DragEvent, type ClipboardEvent } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { useCompose } from '@/context/ComposeContext'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import type { Instance as TippyInstance } from 'tippy.js'
import {
    Image,
    Sparkles,
    Layers,
    MessageSquare,
    X,
    ChevronDown,
    Bold,
    Italic,
    Heading2,
    Quote,
    Code,
    List,
    Link2,
    Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeedItem, ProjectPost, StatusUpdate } from './types'
import { ProjectComposer } from './ProjectComposer'
import { QuotedPostPreview } from './QuotedPostPreview'
import { MentionList } from '@/components/ui/mention-list'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { api } from '@/lib/api'

type ComposeMode = 'update' | 'project'

type MentionListRef = {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

interface GlobalComposeDialogProps {
    onPost?: (item: Omit<FeedItem, 'id' | 'likes' | 'comments' | 'reposts' | 'created_at' | 'author'>) => void
}

export function GlobalComposeDialog({ onPost }: GlobalComposeDialogProps) {
    const { user } = useAuth()
    const { isOpen, setIsOpen, quotedItem, setQuotedItem, isAIGeneratorOpen, onNewPostCreated } = useCompose()
    const [mode, setMode] = useState<ComposeMode>('update')

    const [projectTitle, setProjectTitle] = useState('')
    const [selectedTools, setSelectedTools] = useState<string[]>([])
    const [, setEditorState] = useState(0)

    const [attachedImage, setAttachedImage] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isImproving, setIsImproving] = useState(false)
    const [ghostWords, setGhostWords] = useState<string[]>([])
    const [improvedText, setImprovedText] = useState('')

    const defaultPlaceholder = mode === 'update'
        ? "What's on your mind?"
        : "Describe your project..."

    const { search, results, isLoading } = useDebouncedSearch()

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3],
                },
                link: {
                    openOnClick: false,
                },
            }),
            Placeholder.configure({
                placeholder: defaultPlaceholder,
            }),
            Mention.configure({
                HTMLAttributes: {
                    class: 'mention',
                },
                suggestion: {
                    char: '@',
                    items: async ({ query }) => {
                        search(query)
                        return []
                    },
                    render: () => {
                        let component: ReactRenderer<MentionListRef> | undefined
                        let popup: TippyInstance[] | undefined

                        return {
                            onStart: (props) => {
                                component = new ReactRenderer(MentionList, {
                                    props: { ...props, items: results, isLoading },
                                    editor: props.editor,
                                })

                                if (!props.clientRect) {
                                    return
                                }

                                popup = tippy('body', {
                                    getReferenceClientRect: props.clientRect as () => DOMRect,
                                    appendTo: () => document.body,
                                    content: component.element,
                                    showOnCreate: true,
                                    interactive: true,
                                    trigger: 'manual',
                                    placement: 'bottom-start',
                                    zIndex: 9999,
                                })
                            },

                            onUpdate(props) {
                                component?.updateProps({ ...props, items: results, isLoading })

                                if (!props.clientRect) {
                                    return
                                }

                                popup?.[0]?.setProps({
                                    getReferenceClientRect: props.clientRect as () => DOMRect,
                                })
                            },

                            onKeyDown(props) {
                                if (props.event.key === 'Escape') {
                                    popup?.[0]?.hide()
                                    return true
                                }

                                return component?.ref?.onKeyDown(props) ?? false
                            },

                            onExit() {
                                popup?.[0]?.destroy()
                                component?.destroy()
                            },
                        }
                    },
                },
            }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[120px] text-[15px]',
            },
        },
        onTransaction: () => {
            setEditorState(prev => prev + 1)
        },
    })

    const fileToBase64 = useCallback((file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith('image/')) {
                reject(new Error('File must be an image'))
                return
            }

            const maxSize = 5 * 1024 * 1024
            if (file.size > maxSize) {
                reject(new Error('Image must be less than 5MB'))
                return
            }

            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }, [])

    const handleImageUpload = useCallback(async (file: File) => {
        try {
            const base64 = await fileToBase64(file)
            setAttachedImage(base64)
        } catch (error) {
            console.error('Error uploading image:', error)
            alert(error instanceof Error ? error.message : 'Failed to upload image')
        }
    }, [fileToBase64])

    const handlePaste = useCallback((e: ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault()
                const file = item.getAsFile()
                if (file) {
                    handleImageUpload(file)
                }
                break
            }
        }
    }, [handleImageUpload])

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
            const file = files[0]
            if (file.type.startsWith('image/')) {
                handleImageUpload(file)
            }
        }
    }, [handleImageUpload])

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleImageUpload(file)
        }
        e.target.value = ''
    }, [handleImageUpload])

    const removeAttachedImage = useCallback(() => {
        setAttachedImage(null)
    }, [])

    const getMarkdownContent = useCallback(() => {
        if (!editor) return ''

        const html = editor.getHTML()
        const markdown = html
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

        return markdown
    }, [editor])

    const resetForm = useCallback(() => {
        editor?.commands.clearContent()
        setProjectTitle('')
        setSelectedTools([])
        setMode('update')
        setAttachedImage(null)
        setIsDragging(false)
        setQuotedItem(null)
    }, [editor, setQuotedItem])

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open)
        if (!open) {
            resetForm()
        }
    }

    const handlePost = async () => {
        const content = getMarkdownContent()
        if (!content.trim() && !attachedImage) return

        if (mode === 'project') {
            if (!projectTitle.trim()) return

            const projectPost: Omit<ProjectPost, 'id' | 'likes' | 'comments' | 'reposts' | 'created_at' | 'author'> = {
                type: 'project',
                title: projectTitle.trim(),
                content: content.trim(),
                tools: selectedTools.length > 0 ? selectedTools : undefined,
                image: attachedImage || undefined,
                impressions: 0,
            }

            if (onPost) {
                onPost(projectPost)
            } else {
                // Call API directly if no onPost handler provided
                try {
                    await api.createProject({
                        title: projectPost.title,
                        description: projectPost.content,
                        tools: projectPost.tools,
                    })
                } catch (err) {
                    console.error('Failed to create project:', err)
                }
            }
        } else {
            const statusUpdate: Omit<StatusUpdate, 'id' | 'likes' | 'comments' | 'reposts' | 'created_at' | 'author'> & {
                quoted_post_id?: string
                quoted_project_id?: string
            } = {
                type: 'update',
                content: content.trim(),
                media: attachedImage ? [attachedImage] : undefined,
                impressions: 0,
            }

            if (quotedItem) {
                if (quotedItem.type === 'update') {
                    statusUpdate.quoted_post_id = quotedItem.id
                } else if (quotedItem.type === 'project') {
                    statusUpdate.quoted_project_id = quotedItem.id
                }
            }

            if (onPost) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onPost(statusUpdate as any)
            } else {
                // Call API directly if no onPost handler provided
                try {
                    const response = await api.createPost({
                        content: statusUpdate.content,
                        media: statusUpdate.media,
                        quoted_post_id: statusUpdate.quoted_post_id,
                        quoted_project_id: statusUpdate.quoted_project_id,
                    })
                    // Notify subscribers about the new post
                    if (response?.data) {
                        onNewPostCreated(response.data as FeedItem)
                    }
                } catch (err) {
                    console.error('Failed to create post:', err)
                    return // Don't close on error
                }
            }
        }

        resetForm()
        setIsOpen(false)
    }

    const handleAIImprove = useCallback(async () => {
        if (!editor || isImproving) return

        const content = getMarkdownContent()
        const words = content.trim().split(/\s+/).filter(w => w.length > 0)

        if (words.length < 5) return

        const originalContent = content

        setGhostWords(words)
        setImprovedText('')
        setIsImproving(true)
        editor.setEditable(false)

        let accumulatedText = ''

        try {
            await api.improvePost(content, (chunk) => {
                accumulatedText += chunk
                setImprovedText(accumulatedText)
            })

            editor.commands.setContent(accumulatedText.trim())
        } catch (error) {
            console.error('AI improvement failed:', error)
            editor.commands.setContent(originalContent)
            alert(error instanceof Error ? error.message : 'Failed to improve post')
        } finally {
            setGhostWords([])
            setImprovedText('')
            setIsImproving(false)
            editor.setEditable(true)
        }
    }, [editor, isImproving, getMarkdownContent])

    const content = getMarkdownContent()
    const charCount = content.length
    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length
    const canUseAI = wordCount >= 5 && mode === 'update'

    const canPost = mode === 'update'
        ? content.trim().length > 0 || attachedImage !== null || quotedItem !== null
        : (content.trim().length > 0 || attachedImage !== null) && projectTitle.trim().length > 0

    if (!user) return null

    const modeConfig = {
        update: { icon: MessageSquare, label: 'Update', description: 'Share a quick thought or update' },
        project: { icon: Layers, label: 'Project', description: 'Showcase something you built' },
    }

    const CurrentModeIcon = modeConfig[mode].icon

    const addLink = () => {
        const url = window.prompt('Enter URL:')
        if (url) {
            editor?.chain().focus().setLink({ href: url }).run()
        }
    }

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
            />

            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogContent
                    className={cn(
                        "p-0 gap-0 overflow-hidden",
                        mode === 'project' ? "sm:max-w-[700px]" : "sm:max-w-[580px]",
                        isAIGeneratorOpen && "opacity-0 pointer-events-none"
                    )}
                    onDragOver={mode === 'update' ? handleDragOver : undefined}
                    onDragLeave={mode === 'update' ? handleDragLeave : undefined}
                    onDrop={mode === 'update' ? handleDrop : undefined}
                    aria-describedby={undefined}
                >
                    <DialogHeader className="sr-only">
                        <DialogTitle>Create a post</DialogTitle>
                    </DialogHeader>

                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                                <AvatarImage src={user.avatar_url} alt={user.name} />
                                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-medium">
                                    {user.initials}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium">{user.name}</p>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:outline-none">
                                            <CurrentModeIcon className="w-3 h-3" />
                                            {modeConfig[mode].label}
                                            <ChevronDown className="w-3 h-3" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56">
                                        <DropdownMenuItem
                                            onClick={() => setMode('update')}
                                            className="flex items-start gap-3 p-3"
                                        >
                                            <MessageSquare className="w-4 h-4 mt-0.5 text-primary" />
                                            <div>
                                                <p className="font-medium">Update</p>
                                                <p className="text-xs text-muted-foreground">Share a quick thought or update</p>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setMode('project')}
                                            className="flex items-start gap-3 p-3"
                                        >
                                            <Layers className="w-4 h-4 mt-0.5 text-primary" />
                                            <div>
                                                <p className="font-medium">Project</p>
                                                <p className="text-xs text-muted-foreground">Showcase something you built</p>
                                            </div>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>

                    {mode === 'project' ? (
                        <ProjectComposer
                            onPost={async (projectPost) => {
                                if (onPost) {
                                    onPost(projectPost)
                                } else {
                                    // Call API directly if no onPost handler provided
                                    try {
                                        const response = await api.createProject({
                                            title: projectPost.title,
                                            description: projectPost.content,
                                            images: projectPost.images,
                                            tools: projectPost.tools,
                                            stack: projectPost.stack,
                                            links: projectPost.links,
                                            highlights: projectPost.highlights,
                                            timeline: projectPost.timeline,
                                        })
                                        // Notify subscribers about the new project
                                        if (response?.data) {
                                            onNewPostCreated(response.data as FeedItem)
                                        }
                                    } catch (err) {
                                        console.error('Failed to create project:', err)
                                        return // Don't close dialog on error
                                    }
                                }
                                resetForm()
                                setIsOpen(false)
                            }}
                            onCancel={() => setIsOpen(false)}
                        />
                    ) : (
                        <>
                            {isDragging && (
                                <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg z-50 flex items-center justify-center">
                                    <div className="text-center">
                                        <Image className="w-12 h-12 mx-auto text-primary mb-2" />
                                        <p className="text-primary font-medium">Drop image here</p>
                                    </div>
                                </div>
                            )}

                            <div className="px-4 pt-3 pb-2" onPaste={handlePaste}>
                                {isImproving ? (
                                    <div className="min-h-[120px] text-[15px] prose prose-sm dark:prose-invert max-w-none py-2">
                                        {(() => {
                                            const improvedWordCount = improvedText.trim()
                                                ? improvedText.trim().split(/\s+/).filter(w => w).length
                                                : 0
                                            const remainingGhostWords = ghostWords.slice(improvedWordCount)

                                            return (
                                                <>
                                                    <span>{improvedText}</span>
                                                    {remainingGhostWords.length > 0 && (
                                                        <>
                                                            {improvedText && !improvedText.endsWith(' ') && ' '}
                                                            <span className="text-muted-foreground/30 select-none">
                                                                {remainingGhostWords.join(' ')}
                                                            </span>
                                                        </>
                                                    )}
                                                </>
                                            )
                                        })()}
                                    </div>
                                ) : (
                                    <EditorContent
                                        editor={editor}
                                        className="[&_.tiptap]:min-h-[120px] [&_.tiptap]:focus:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
                                    />
                                )}

                                {attachedImage && (
                                    <div className="mt-3 relative group">
                                        <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
                                            <img
                                                src={attachedImage}
                                                alt="Attached image"
                                                className="w-full max-h-[300px] object-contain"
                                            />
                                            <button
                                                onClick={removeAttachedImage}
                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remove image"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {quotedItem && (
                                    <div className="mt-3 relative">
                                        <QuotedPostPreview item={quotedItem} />
                                        <button
                                            onClick={() => setQuotedItem(null)}
                                            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 border border-border hover:bg-muted transition-colors"
                                            title="Remove quote"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
                                <div className="flex items-center gap-0.5">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "w-8 h-8 rounded hover:bg-muted",
                                            editor?.isActive('bold') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => editor?.chain().focus().toggleBold().run()}
                                        title="Bold (Ctrl+B)"
                                    >
                                        <Bold className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "w-8 h-8 rounded hover:bg-muted",
                                            editor?.isActive('italic') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                                        title="Italic (Ctrl+I)"
                                    >
                                        <Italic className="w-4 h-4" />
                                    </Button>
                                    <div className="w-px h-4 bg-border mx-1" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "w-8 h-8 rounded hover:bg-muted",
                                            editor?.isActive('heading') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                                        title="Heading"
                                    >
                                        <Heading2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "w-8 h-8 rounded hover:bg-muted",
                                            editor?.isActive('blockquote') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                                        title="Quote"
                                    >
                                        <Quote className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "w-8 h-8 rounded hover:bg-muted",
                                            editor?.isActive('code') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => editor?.chain().focus().toggleCode().run()}
                                        title="Inline Code"
                                    >
                                        <Code className="w-4 h-4" />
                                    </Button>
                                    <div className="w-px h-4 bg-border mx-1" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "w-8 h-8 rounded hover:bg-muted",
                                            editor?.isActive('bulletList') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                        title="List"
                                    >
                                        <List className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "w-8 h-8 rounded hover:bg-muted",
                                            editor?.isActive('link') ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={addLink}
                                        title="Link"
                                    >
                                        <Link2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "w-9 h-9 rounded-full hover:bg-primary/10",
                                            attachedImage ? "text-primary bg-primary/10" : "text-primary"
                                        )}
                                        onClick={() => fileInputRef.current?.click()}
                                        title="Add image"
                                    >
                                        <Image className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-9 h-9 rounded-full text-primary hover:bg-primary/10"
                                        onClick={handleAIImprove}
                                        disabled={!canUseAI || isImproving}
                                        title={canUseAI ? "Improve with AI" : "Write at least 5 words to use AI"}
                                    >
                                        {isImproving ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Sparkles className="w-5 h-5" />
                                        )}
                                    </Button>
                                </div>

                                <div className="flex items-center gap-3">
                                    {charCount > 0 && (
                                        <span className={cn(
                                            "text-xs",
                                            charCount > 500 ? "text-destructive" : "text-muted-foreground"
                                        )}>
                                            {charCount}
                                        </span>
                                    )}
                                    <Button
                                        onClick={handlePost}
                                        disabled={!canPost}
                                        className="rounded-full px-5"
                                    >
                                        Post
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
