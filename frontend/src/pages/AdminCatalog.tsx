import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Navigate, useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ArrowLeft, Plus, Trash2, Loader2, Sparkles, Layers, RefreshCw } from 'lucide-react'

type CatalogType = 'ai-tools' | 'tech-stacks'

interface CatalogItem {
    id: string
    name: string
    slug: string
    category?: string
}

export function AdminCatalog() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth()
    const { type } = useParams<{ type: CatalogType }>()
    const [items, setItems] = useState<CatalogItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [newName, setNewName] = useState('')
    const [newCategory, setNewCategory] = useState('other')
    const [isCreating, setIsCreating] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)

    // Delete confirmation dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<CatalogItem | null>(null)

    const isAiTools = type === 'ai-tools'
    const title = isAiTools ? 'AI Tools' : 'Tech Stacks'
    const Icon = isAiTools ? Sparkles : Layers

    useEffect(() => {
        loadItems()
    }, [type])

    async function loadItems() {
        setIsLoading(true)
        try {
            if (isAiTools) {
                const res = await api.getTools()
                setItems(res.data as CatalogItem[])
            } else {
                const res = await api.getStacks()
                setItems(res.data as CatalogItem[])
            }
        } catch (error) {
            console.error('Failed to load items:', error)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        if (!newName.trim()) return

        setIsCreating(true)
        try {
            if (isAiTools) {
                const res = await api.createAiTool(newName.trim())
                setItems(prev => [...prev, res.data])
            } else {
                const res = await api.createTechStack(newName.trim(), newCategory)
                setItems(prev => [...prev, res.data])
            }
            setNewName('')
        } catch (error) {
            console.error('Failed to create item:', error)
            alert('Failed to create item. It may already exist.')
        } finally {
            setIsCreating(false)
        }
    }

    function openDeleteDialog(item: CatalogItem) {
        setItemToDelete(item)
        setDeleteDialogOpen(true)
    }

    async function handleConfirmDelete() {
        if (!itemToDelete) return

        setDeletingId(itemToDelete.id)
        setDeleteDialogOpen(false)

        try {
            if (isAiTools) {
                await api.deleteAiTool(itemToDelete.id)
            } else {
                await api.deleteTechStack(itemToDelete.id)
            }
            setItems(prev => prev.filter(item => item.id !== itemToDelete.id))
        } catch (error) {
            console.error('Failed to delete item:', error)
            alert('Failed to delete item.')
        } finally {
            setDeletingId(null)
            setItemToDelete(null)
        }
    }

    async function handleSyncOpenRouter() {
        setIsSyncing(true)
        try {
            const result = await api.syncOpenRouterModels()
            alert(`Synced ${result.created} new models (${result.skipped} already existed, ${result.total} total from OpenRouter)`)
            // Reload the list to show new items
            loadItems()
        } catch (error) {
            console.error('Failed to sync OpenRouter models:', error)
            alert('Failed to sync OpenRouter models. Check console for details.')
        } finally {
            setIsSyncing(false)
        }
    }

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!isAuthenticated || !user?.is_admin) {
        return <Navigate to="/" replace />
    }

    return (
        <div className="min-h-screen">
            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title={`Delete ${isAiTools ? 'AI Tool' : 'Tech Stack'}`}
                description={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="destructive"
                onConfirm={handleConfirmDelete}
            />

            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
                <div className="max-w-[600px] mx-auto flex items-center justify-between gap-3 px-4 h-14">
                    <div className="flex items-center gap-3">
                        <Link
                            to="/admin"
                            className="p-2 -ml-2 rounded-full hover:bg-accent transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5 text-primary" />
                            <h1 className="font-bold text-lg">{title}</h1>
                        </div>
                    </div>
                    {isAiTools && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSyncOpenRouter}
                            disabled={isSyncing}
                        >
                            {isSyncing ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Sync OpenRouter
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[600px] mx-auto px-4 py-6">
                {/* Add Form */}
                <form onSubmit={handleCreate} className="flex gap-3 mb-6">
                    <Input
                        placeholder={`New ${isAiTools ? 'AI tool' : 'tech stack'} name...`}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1"
                    />
                    {!isAiTools && (
                        <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                            <option value="frontend">Frontend</option>
                            <option value="backend">Backend</option>
                            <option value="language">Language</option>
                            <option value="database">Database</option>
                            <option value="mobile">Mobile</option>
                            <option value="devops">DevOps</option>
                            <option value="cloud">Cloud</option>
                            <option value="other">Other</option>
                        </select>
                    )}
                    <Button type="submit" disabled={isCreating || !newName.trim()}>
                        {isCreating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                    </Button>
                </form>

                {/* Items List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No {isAiTools ? 'AI tools' : 'tech stacks'} yet. Add one above.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                                        <Icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.slug}
                                            {item.category && ` • ${item.category}`}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openDeleteDialog(item)}
                                    disabled={deletingId === item.id}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    {deletingId === item.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                <p className="text-xs text-muted-foreground mt-6 text-center">
                    {items.length} {isAiTools ? 'AI tools' : 'tech stacks'}
                </p>
            </div>
        </div>
    )
}
