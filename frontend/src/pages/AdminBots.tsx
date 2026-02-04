import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
    ArrowLeft,
    Loader2,
    Bot,
    TrendingUp,
    Trash2,
    Play,
    Megaphone,
    Trophy,
    Clock,
    Hash,
    X,
    CheckCircle,
    ExternalLink,
} from 'lucide-react'
import { api, type AdminBotPost } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

// Bot type configuration - easily extensible for new bot types
const BOT_TYPES = {
    trending_projects: {
        label: 'Trending Projects',
        icon: TrendingUp,
        description: 'Showcases the top trending projects in the feed weekly',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        schedule: 'Weekly (Mondays)',
    },
    milestone: {
        label: 'Milestones',
        icon: Trophy,
        description: 'Celebrates user achievements and platform milestones',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        schedule: 'Event-driven',
    },
    announcement: {
        label: 'Announcements',
        icon: Megaphone,
        description: 'Official platform announcements and updates',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        schedule: 'Manual',
    },
} as const

type BotType = keyof typeof BOT_TYPES

export function AdminBots() {
    const navigate = useNavigate()
    const { user, isAuthenticated, isLoading: authLoading } = useAuth()
    const [botPosts, setBotPosts] = useState<AdminBotPost[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<AdminBotPost | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [triggeringBot, setTriggeringBot] = useState<BotType | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const limit = 50

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !user?.is_admin)) {
            navigate('/', { replace: true })
        }
    }, [authLoading, isAuthenticated, user, navigate])

    useEffect(() => {
        if (user?.is_admin) {
            fetchBotPosts()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [offset, user])

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [message])

    const fetchBotPosts = async () => {
        setIsLoading(true)
        try {
            const response = await api.getAdminBotPosts({ limit, offset })
            setBotPosts(response.data)
            setTotal(response.meta.total)
        } catch (error) {
            console.error('Failed to fetch bot posts:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleTriggerBot = async (botType: BotType) => {
        setTriggeringBot(botType)
        setMessage(null)
        try {
            if (botType === 'trending_projects') {
                await api.triggerTrendingBot()
                setMessage({ type: 'success', text: 'Trending projects post created successfully!' })
                fetchBotPosts()
            } else {
                setMessage({ type: 'error', text: `Bot type "${botType}" is not yet implemented` })
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to trigger bot'
            setMessage({ type: 'error', text: errorMessage })
        } finally {
            setTriggeringBot(null)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await api.deleteAdminBotPost(deleteTarget.id)
            setMessage({ type: 'success', text: 'Bot post deleted successfully' })
            fetchBotPosts()
        } catch (error) {
            console.error('Failed to delete bot post:', error)
            setMessage({ type: 'error', text: 'Failed to delete bot post' })
        } finally {
            setIsDeleting(false)
            setDeleteTarget(null)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    }

    const totalPages = Math.ceil(total / limit)
    const currentPage = Math.floor(offset / limit) + 1

    if (authLoading || !user?.is_admin) {
        return null
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
                <div className="max-w-[1000px] mx-auto px-4 h-14 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Bot Management</h1>
                        <p className="text-xs text-muted-foreground">
                            {total} generated post{total !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Toast Message */}
            {message && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div
                        className={cn(
                            'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border',
                            message.type === 'success'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-destructive/10 text-destructive border-destructive/20'
                        )}
                    >
                        {message.type === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <X className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">{message.text}</span>
                        <button
                            onClick={() => setMessage(null)}
                            className="ml-2 p-1 hover:bg-black/10 rounded"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-[1000px] mx-auto px-4 py-6">
                {/* Bot Triggers Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-medium text-muted-foreground mb-4">Available Bots</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(Object.keys(BOT_TYPES) as BotType[]).map((botType) => {
                            const config = BOT_TYPES[botType]
                            const Icon = config.icon
                            const isTriggering = triggeringBot === botType
                            const isImplemented = botType === 'trending_projects'

                            return (
                                <div
                                    key={botType}
                                    className={cn(
                                        'relative group rounded-xl border bg-card p-5 transition-all',
                                        config.borderColor,
                                        isImplemented
                                            ? 'hover:shadow-md hover:border-opacity-50'
                                            : 'opacity-60'
                                    )}
                                >
                                    {!isImplemented && (
                                        <div className="absolute top-3 right-3">
                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                Coming Soon
                                            </span>
                                        </div>
                                    )}

                                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', config.bgColor)}>
                                        <Icon className={cn('w-6 h-6', config.color)} />
                                    </div>

                                    <h3 className="font-semibold text-foreground mb-1">{config.label}</h3>
                                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                        {config.description}
                                    </p>

                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                                        <Clock className="w-3 h-3" />
                                        <span>{config.schedule}</span>
                                    </div>

                                    <Button
                                        size="sm"
                                        variant={isImplemented ? 'default' : 'secondary'}
                                        disabled={isTriggering || !isImplemented}
                                        onClick={() => handleTriggerBot(botType)}
                                        className="w-full"
                                    >
                                        {isTriggering ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 mr-2" />
                                                Trigger Now
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Generated Posts Section */}
                <div>
                    <h2 className="text-sm font-medium text-muted-foreground mb-4">Generated Posts</h2>

                    <div className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm">
                        {isLoading ? (
                            <div className="p-8 flex justify-center">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : botPosts.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bot className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium">No bot posts yet</p>
                                <p className="text-sm text-muted-foreground/60 mt-1">
                                    Use the trigger buttons above to create posts
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/30 border-b border-border/60">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground w-[40%]">Content</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Metadata</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {botPosts.map((botPost) => {
                                            const config = BOT_TYPES[botPost.bot_type as BotType] || {
                                                label: botPost.bot_type,
                                                icon: Bot,
                                                color: 'text-slate-500',
                                                bgColor: 'bg-slate-500/10',
                                            }
                                            const Icon = config.icon
                                            const projectCount = botPost.metadata?.project_ids
                                                ? (botPost.metadata.project_ids as string[]).length
                                                : 0

                                            return (
                                                <tr key={botPost.id} className="group hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
                                                                <Icon className={cn('w-4 h-4', config.color)} />
                                                            </div>
                                                            <span className="font-medium text-foreground whitespace-nowrap">
                                                                {config.label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-foreground/80 line-clamp-2">
                                                            {botPost.post.content}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {projectCount > 0 ? (
                                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                                <Hash className="w-3.5 h-3.5" />
                                                                <span>{projectCount} project{projectCount !== 1 ? 's' : ''}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground/50">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                                        {formatDate(botPost.inserted_at)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Link to={`/bot-post/${botPost.post.id}`}>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </Button>
                                                            </Link>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => setDeleteTarget(botPost)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {total > limit && (
                            <div className="p-4 border-t border-border/60 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setOffset(o => Math.max(0, o - limit))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setOffset(o => o + limit)}
                                        disabled={currentPage >= totalPages}
                                        className="px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null)
                }}
                title="Delete Bot Post?"
                description="This will permanently delete the bot post from the feed. This action cannot be undone."
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
                cancelLabel="Cancel"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={handleDelete}
            />
        </div>
    )
}
