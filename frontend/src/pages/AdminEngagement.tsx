import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
    ArrowLeft,
    Loader2,
    Users,
    Activity,
    Plus,
    Trash2,
    Power,
    Clock,
    CheckCircle,
    X,
    Bot,
    Star,
    Heart,
    Repeat,
    MessageCircle,
    UserPlus,
    Zap,
    FileText,
    FolderCode,
    RefreshCw,
} from 'lucide-react'
import { api, type EngagementBot, type EngagementSettings, type EngagementStats, type CuratedContent, type EngagementLog } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const PERSONA_TYPES = {
    enthusiast: {
        label: 'Enthusiast',
        description: 'High engagement, active 6-8 hours/day',
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
    },
    casual: {
        label: 'Casual',
        description: 'Medium engagement, mostly likes',
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
    },
    supportive: {
        label: 'Supportive',
        description: 'Focused on encouraging new creators',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
    },
    lurker: {
        label: 'Lurker',
        description: 'Low engagement, rare interactions',
        color: 'text-slate-500',
        bgColor: 'bg-slate-500/10',
    },
}

const INTENSITY_OPTIONS = [
    { value: 'low', label: 'Low', description: '3-8 likes, 0-2 reposts, 0-1 comments per post' },
    { value: 'medium', label: 'Medium', description: '8-20 likes, 2-5 reposts, 1-3 comments per post' },
    { value: 'high', label: 'High', description: '20-50 likes, 5-15 reposts, 3-8 comments per post' },
]

type Tab = 'settings' | 'bots' | 'curated' | 'logs'

export function AdminEngagement() {
    const navigate = useNavigate()
    const { user, isAuthenticated, isLoading: authLoading } = useAuth()

    const [activeTab, setActiveTab] = useState<Tab>('settings')
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Settings state
    const [settings, setSettings] = useState<EngagementSettings>({ enabled: false, intensity: 'medium', bot_projects_enabled: false, bot_project_frequency: 2, bot_posts_enabled: false, bot_post_frequency: 5 })
    const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)

    // Bots state
    const [bots, setBots] = useState<EngagementBot[]>([])
    const [botsTotal, setBotsTotal] = useState(0)
    const [isCreatingBot, setIsCreatingBot] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<EngagementBot | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Stats state
    const [stats, setStats] = useState<EngagementStats | null>(null)

    // Curated state
    const [curatedContent, setCuratedContent] = useState<CuratedContent[]>([])

    // Logs state
    const [logs, setLogs] = useState<EngagementLog[]>([])

    // Trigger states
    const [isTriggeringContentScan, setIsTriggeringContentScan] = useState(false)
    const [isTriggeringBotPost, setIsTriggeringBotPost] = useState(false)
    const [isTriggeringBotProject, setIsTriggeringBotProject] = useState(false)
    const [isTriggeringBackfill, setIsTriggeringBackfill] = useState(false)

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !user?.is_admin)) {
            navigate('/', { replace: true })
        }
    }, [authLoading, isAuthenticated, user, navigate])

    useEffect(() => {
        if (user?.is_admin) {
            loadData()
        }
    }, [user])

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [message])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [settingsRes, botsRes, statsRes, curatedRes, logsRes] = await Promise.all([
                api.getEngagementSettings(),
                api.getEngagementBots({ limit: 50 }),
                api.getEngagementStats(),
                api.getCuratedContent({ limit: 50 }),
                api.getEngagementLogs({ limit: 50 }),
            ])

            setSettings(settingsRes.data)
            setBots(botsRes.data)
            setBotsTotal(botsRes.meta.total)
            setStats(statsRes.data)
            setCuratedContent(curatedRes.data)
            setLogs(logsRes.data)
        } catch (error) {
            console.error('Failed to load engagement data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleToggleEnabled = async () => {
        setIsUpdatingSettings(true)
        try {
            const res = await api.updateEngagementSettings({ enabled: !settings.enabled })
            setSettings(res.data)
            setMessage({ type: 'success', text: res.data.enabled ? 'Engagement system enabled' : 'Engagement system disabled' })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update settings' })
        } finally {
            setIsUpdatingSettings(false)
        }
    }

    const handleUpdateIntensity = async (intensity: string) => {
        setIsUpdatingSettings(true)
        try {
            const res = await api.updateEngagementSettings({ intensity })
            setSettings(res.data)
            setMessage({ type: 'success', text: `Intensity set to ${intensity}` })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update settings' })
        } finally {
            setIsUpdatingSettings(false)
        }
    }

    const handleToggleBotProjects = async () => {
        setIsUpdatingSettings(true)
        try {
            const res = await api.updateEngagementSettings({ bot_projects_enabled: !settings.bot_projects_enabled })
            setSettings(res.data)
            setMessage({ type: 'success', text: res.data.bot_projects_enabled ? 'Bot projects enabled' : 'Bot projects disabled' })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update settings' })
        } finally {
            setIsUpdatingSettings(false)
        }
    }

    const handleUpdateBotProjectFrequency = async (frequency: number) => {
        setIsUpdatingSettings(true)
        try {
            const res = await api.updateEngagementSettings({ bot_project_frequency: frequency })
            setSettings(res.data)
            setMessage({ type: 'success', text: `Bot project frequency set to ${frequency} per day` })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update settings' })
        } finally {
            setIsUpdatingSettings(false)
        }
    }

    const handleToggleBotPosts = async () => {
        setIsUpdatingSettings(true)
        try {
            const res = await api.updateEngagementSettings({ bot_posts_enabled: !settings.bot_posts_enabled })
            setSettings(res.data)
            setMessage({ type: 'success', text: res.data.bot_posts_enabled ? 'Bot posts enabled' : 'Bot posts disabled' })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update settings' })
        } finally {
            setIsUpdatingSettings(false)
        }
    }

    const handleUpdateBotPostFrequency = async (frequency: number) => {
        setIsUpdatingSettings(true)
        try {
            const res = await api.updateEngagementSettings({ bot_post_frequency: frequency })
            setSettings(res.data)
            setMessage({ type: 'success', text: `Bot post frequency set to ${frequency} per day` })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update settings' })
        } finally {
            setIsUpdatingSettings(false)
        }
    }

    const handleCreateBot = async (personaType?: string) => {
        setIsCreatingBot(true)
        try {
            const res = await api.createEngagementBot(personaType ? { persona_type: personaType } : {})
            setBots([res.data, ...bots])
            setBotsTotal(t => t + 1)
            setMessage({ type: 'success', text: `Bot "${res.data.user.display_name}" created` })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to create bot' })
        } finally {
            setIsCreatingBot(false)
        }
    }

    const handleToggleBot = async (bot: EngagementBot) => {
        try {
            const res = await api.toggleEngagementBot(bot.id)
            setBots(bots.map(b => b.id === bot.id ? res.data : b))
            setMessage({ type: 'success', text: res.data.is_active ? 'Bot activated' : 'Bot deactivated' })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to toggle bot' })
        }
    }

    const handleDeleteBot = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await api.deleteEngagementBot(deleteTarget.id)
            setBots(bots.filter(b => b.id !== deleteTarget.id))
            setBotsTotal(t => t - 1)
            setMessage({ type: 'success', text: 'Bot deleted' })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete bot' })
        } finally {
            setIsDeleting(false)
            setDeleteTarget(null)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    }

    const getEngagementIcon = (type: string) => {
        switch (type) {
            case 'like': return <Heart className="w-3.5 h-3.5" />
            case 'repost': return <Repeat className="w-3.5 h-3.5" />
            case 'comment': return <MessageCircle className="w-3.5 h-3.5" />
            case 'follow': return <UserPlus className="w-3.5 h-3.5" />
            default: return <Activity className="w-3.5 h-3.5" />
        }
    }

    // Trigger handlers
    const handleTriggerContentScan = async () => {
        setIsTriggeringContentScan(true)
        try {
            const res = await api.triggerContentScan()
            setMessage({ type: 'success', text: res.message })
            // Refresh stats after a brief delay
            setTimeout(() => loadData(), 2000)
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to trigger content scan' })
        } finally {
            setIsTriggeringContentScan(false)
        }
    }

    const handleTriggerBotPost = async () => {
        setIsTriggeringBotPost(true)
        try {
            const res = await api.triggerBotPost()
            setMessage({ type: 'success', text: res.message })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to trigger bot post' })
        } finally {
            setIsTriggeringBotPost(false)
        }
    }

    const handleTriggerBotProject = async () => {
        setIsTriggeringBotProject(true)
        try {
            const res = await api.triggerBotProject()
            setMessage({ type: 'success', text: res.message })
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to trigger bot project' })
        } finally {
            setIsTriggeringBotProject(false)
        }
    }

    const handleTriggerBackfill = async () => {
        setIsTriggeringBackfill(true)
        try {
            const res = await api.triggerEngagementBackfill({ hours_back: 24, limit: 20 })
            setMessage({
                type: 'success',
                text: `Backfill triggered: ${res.scheduled_posts} posts, ${res.scheduled_projects} projects`
            })
            setTimeout(() => loadData(), 2000)
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to trigger backfill' })
        } finally {
            setIsTriggeringBackfill(false)
        }
    }

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
                    <div className="flex-1">
                        <h1 className="font-bold text-lg leading-tight">Simulated Engagement</h1>
                        <p className="text-xs text-muted-foreground">
                            {settings.enabled ? (
                                <span className="text-emerald-500">Active</span>
                            ) : (
                                <span className="text-muted-foreground">Disabled</span>
                            )}
                            {' '}&middot; {botsTotal} bots configured
                        </p>
                    </div>

                    {/* Master Toggle */}
                    <Button
                        variant={settings.enabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={handleToggleEnabled}
                        disabled={isUpdatingSettings}
                        className={cn(
                            'gap-2',
                            settings.enabled && 'bg-emerald-600 hover:bg-emerald-700'
                        )}
                    >
                        {isUpdatingSettings ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Power className="w-4 h-4" />
                        )}
                        {settings.enabled ? 'ON' : 'OFF'}
                    </Button>
                </div>

                {/* Tabs */}
                <div className="max-w-[1000px] mx-auto px-4 flex gap-1">
                    {(['settings', 'bots', 'curated', 'logs'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                                activeTab === tab
                                    ? 'text-foreground border-primary'
                                    : 'text-muted-foreground border-transparent hover:text-foreground'
                            )}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
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
                        <button onClick={() => setMessage(null)} className="ml-2 p-1 hover:bg-black/10 rounded">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-[1000px] mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        {/* Settings Tab */}
                        {activeTab === 'settings' && (
                            <div className="space-y-8">
                                {/* Stats Overview */}
                                <div>
                                    <h2 className="text-sm font-medium text-muted-foreground mb-4">Today's Activity</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-card rounded-xl border p-4">
                                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                                <Activity className="w-4 h-4" />
                                                <span className="text-xs font-medium">Executed</span>
                                            </div>
                                            <p className="text-2xl font-bold">{stats?.executed_today || 0}</p>
                                        </div>
                                        <div className="bg-card rounded-xl border p-4">
                                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-xs font-medium">Pending</span>
                                            </div>
                                            <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                                        </div>
                                        <div className="bg-card rounded-xl border p-4">
                                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                                <Users className="w-4 h-4" />
                                                <span className="text-xs font-medium">Active Bots</span>
                                            </div>
                                            <p className="text-2xl font-bold">{stats?.active_bots || 0}</p>
                                        </div>
                                        <div className="bg-card rounded-xl border p-4">
                                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                                <Bot className="w-4 h-4" />
                                                <span className="text-xs font-medium">Total Bots</span>
                                            </div>
                                            <p className="text-2xl font-bold">{stats?.total_bots || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* By Type Breakdown */}
                                {stats?.by_type && Object.keys(stats.by_type).length > 0 && (
                                    <div>
                                        <h2 className="text-sm font-medium text-muted-foreground mb-4">Engagements by Type</h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {Object.entries(stats.by_type).map(([type, count]) => (
                                                <div key={type} className="bg-card rounded-xl border p-4 flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-primary/10">
                                                        {getEngagementIcon(type)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground capitalize">{type}s</p>
                                                        <p className="text-lg font-bold">{count}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Intensity Setting */}
                                <div>
                                    <h2 className="text-sm font-medium text-muted-foreground mb-4">Engagement Intensity</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {INTENSITY_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleUpdateIntensity(option.value)}
                                                disabled={isUpdatingSettings}
                                                className={cn(
                                                    'relative p-4 rounded-xl border text-left transition-all',
                                                    settings.intensity === option.value
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-border hover:border-primary/50'
                                                )}
                                            >
                                                {settings.intensity === option.value && (
                                                    <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-primary" />
                                                )}
                                                <h3 className="font-medium mb-1">{option.label}</h3>
                                                <p className="text-xs text-muted-foreground">{option.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Bot Projects Setting */}
                                <div>
                                    <h2 className="text-sm font-medium text-muted-foreground mb-4">Bot Projects</h2>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Allow bots to create their own projects to appear as active community members.
                                        Bot projects have no external links (GitHub, live demo) to avoid detection.
                                    </p>
                                    <div className="bg-card rounded-xl border p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium text-sm">Enable Bot Projects</h3>
                                                <p className="text-xs text-muted-foreground">Bots will periodically create AI-generated projects</p>
                                            </div>
                                            <Button
                                                variant={settings.bot_projects_enabled ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={handleToggleBotProjects}
                                                disabled={isUpdatingSettings}
                                                className={cn(
                                                    'gap-2 min-w-[80px]',
                                                    settings.bot_projects_enabled && 'bg-emerald-600 hover:bg-emerald-700'
                                                )}
                                            >
                                                {isUpdatingSettings ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Power className="w-4 h-4" />
                                                )}
                                                {settings.bot_projects_enabled ? 'ON' : 'OFF'}
                                            </Button>
                                        </div>

                                        {settings.bot_projects_enabled && (
                                            <div className="pt-4 border-t border-border">
                                                <h3 className="font-medium text-sm mb-3">Projects per Day</h3>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 5].map((freq) => (
                                                        <button
                                                            key={freq}
                                                            onClick={() => handleUpdateBotProjectFrequency(freq)}
                                                            disabled={isUpdatingSettings}
                                                            className={cn(
                                                                'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                                                                settings.bot_project_frequency === freq
                                                                    ? 'border-primary bg-primary/10 text-primary'
                                                                    : 'border-border hover:border-primary/50'
                                                            )}
                                                        >
                                                            {freq}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bot Posts Setting */}
                                <div>
                                    <h2 className="text-sm font-medium text-muted-foreground mb-4">Bot Text Posts</h2>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Allow bots to create text posts (updates, tips, observations, questions).
                                        Posts are AI-generated to sound like authentic developer content.
                                    </p>
                                    <div className="bg-card rounded-xl border p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium text-sm">Enable Bot Posts</h3>
                                                <p className="text-xs text-muted-foreground">Bots will periodically create text updates</p>
                                            </div>
                                            <Button
                                                variant={settings.bot_posts_enabled ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={handleToggleBotPosts}
                                                disabled={isUpdatingSettings}
                                                className={cn(
                                                    'gap-2 min-w-[80px]',
                                                    settings.bot_posts_enabled && 'bg-emerald-600 hover:bg-emerald-700'
                                                )}
                                            >
                                                {isUpdatingSettings ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Power className="w-4 h-4" />
                                                )}
                                                {settings.bot_posts_enabled ? 'ON' : 'OFF'}
                                            </Button>
                                        </div>

                                        {settings.bot_posts_enabled && (
                                            <div className="pt-4 border-t border-border">
                                                <h3 className="font-medium text-sm mb-3">Posts per Day</h3>
                                                <div className="flex gap-2">
                                                    {[3, 5, 10, 15].map((freq) => (
                                                        <button
                                                            key={freq}
                                                            onClick={() => handleUpdateBotPostFrequency(freq)}
                                                            disabled={isUpdatingSettings}
                                                            className={cn(
                                                                'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                                                                settings.bot_post_frequency === freq
                                                                    ? 'border-primary bg-primary/10 text-primary'
                                                                    : 'border-border hover:border-primary/50'
                                                            )}
                                                        >
                                                            {freq}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Actions (Triggers) */}
                                <div>
                                    <h2 className="text-sm font-medium text-muted-foreground mb-4">Quick Actions</h2>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Manually trigger bot activity for testing. Workers normally run on schedules (content scan: 3min, posts: 2h, projects: 6h).
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <button
                                            onClick={handleTriggerContentScan}
                                            disabled={isTriggeringContentScan || !settings.enabled}
                                            className={cn(
                                                'p-4 rounded-xl border text-left transition-all hover:border-primary/50',
                                                'bg-blue-500/10 border-blue-500/20',
                                                !settings.enabled && 'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                {isTriggeringContentScan ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                ) : (
                                                    <Zap className="w-4 h-4 text-blue-500" />
                                                )}
                                                <span className="text-sm font-medium text-blue-500">Content Scan</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Schedule engagement for new posts/projects</p>
                                        </button>

                                        <button
                                            onClick={handleTriggerBackfill}
                                            disabled={isTriggeringBackfill || !settings.enabled}
                                            className={cn(
                                                'p-4 rounded-xl border text-left transition-all hover:border-primary/50',
                                                'bg-purple-500/10 border-purple-500/20',
                                                !settings.enabled && 'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                {isTriggeringBackfill ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                                                ) : (
                                                    <RefreshCw className="w-4 h-4 text-purple-500" />
                                                )}
                                                <span className="text-sm font-medium text-purple-500">Backfill</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Engage with existing content (last 24h)</p>
                                        </button>

                                        <button
                                            onClick={handleTriggerBotPost}
                                            disabled={isTriggeringBotPost || !settings.enabled || !settings.bot_posts_enabled}
                                            className={cn(
                                                'p-4 rounded-xl border text-left transition-all hover:border-primary/50',
                                                'bg-emerald-500/10 border-emerald-500/20',
                                                (!settings.enabled || !settings.bot_posts_enabled) && 'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                {isTriggeringBotPost ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                                ) : (
                                                    <FileText className="w-4 h-4 text-emerald-500" />
                                                )}
                                                <span className="text-sm font-medium text-emerald-500">Bot Post</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Create a text post from a random bot</p>
                                        </button>

                                        <button
                                            onClick={handleTriggerBotProject}
                                            disabled={isTriggeringBotProject || !settings.enabled || !settings.bot_projects_enabled}
                                            className={cn(
                                                'p-4 rounded-xl border text-left transition-all hover:border-primary/50',
                                                'bg-amber-500/10 border-amber-500/20',
                                                (!settings.enabled || !settings.bot_projects_enabled) && 'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                {isTriggeringBotProject ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                                ) : (
                                                    <FolderCode className="w-4 h-4 text-amber-500" />
                                                )}
                                                <span className="text-sm font-medium text-amber-500">Bot Project</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Create a project from a random bot</p>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bots Tab */}
                        {activeTab === 'bots' && (
                            <div className="space-y-6">
                                {/* Create Bot Section */}
                                <div>
                                    <h2 className="text-sm font-medium text-muted-foreground mb-4">Create New Bot</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {(Object.keys(PERSONA_TYPES) as Array<keyof typeof PERSONA_TYPES>).map((type) => {
                                            const config = PERSONA_TYPES[type]
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => handleCreateBot(type)}
                                                    disabled={isCreatingBot}
                                                    className={cn(
                                                        'p-4 rounded-xl border text-left transition-all hover:border-primary/50',
                                                        config.bgColor
                                                    )}
                                                >
                                                    <div className={cn('text-sm font-medium mb-1', config.color)}>
                                                        {config.label}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{config.description}</p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCreateBot()}
                                        disabled={isCreatingBot}
                                        className="mt-4"
                                    >
                                        {isCreatingBot ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4 mr-2" />
                                        )}
                                        Create Random Bot
                                    </Button>
                                </div>

                                {/* Bot List */}
                                <div>
                                    <h2 className="text-sm font-medium text-muted-foreground mb-4">Bot Accounts ({botsTotal})</h2>
                                    <div className="bg-card rounded-xl border overflow-hidden">
                                        {bots.length === 0 ? (
                                            <div className="p-12 text-center">
                                                <Bot className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                                <p className="text-muted-foreground font-medium">No bots configured</p>
                                                <p className="text-sm text-muted-foreground/60 mt-1">
                                                    Create bots using the buttons above
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-muted/30 border-b">
                                                        <tr>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground">Bot</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground">Persona</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground">Activity</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground">Today</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground">Total</th>
                                                            <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {bots.map((bot) => {
                                                            const config = PERSONA_TYPES[bot.persona_type as keyof typeof PERSONA_TYPES] || PERSONA_TYPES.casual
                                                            return (
                                                                <tr key={bot.id} className="hover:bg-muted/30">
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                                                {bot.user.avatar_url ? (
                                                                                    <img src={bot.user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                                                                                ) : (
                                                                                    <Bot className="w-4 h-4 text-muted-foreground" />
                                                                                )}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-medium">{bot.user.display_name}</p>
                                                                                <p className="text-xs text-muted-foreground">@{bot.user.username}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', config.bgColor, config.color)}>
                                                                            {config.label}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={cn(
                                                                            'text-xs font-medium',
                                                                            bot.is_active ? 'text-emerald-500' : 'text-muted-foreground'
                                                                        )}>
                                                                            {bot.is_active ? 'Active' : 'Inactive'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-muted-foreground">
                                                                        {bot.engagements_today} / {bot.daily_engagement_limit}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-muted-foreground">
                                                                        {bot.total_engagements}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => handleToggleBot(bot)}
                                                                                className={cn(
                                                                                    'h-8',
                                                                                    bot.is_active
                                                                                        ? 'text-emerald-500 hover:text-emerald-600'
                                                                                        : 'text-muted-foreground hover:text-foreground'
                                                                                )}
                                                                            >
                                                                                <Power className="w-4 h-4" />
                                                                            </Button>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => setDeleteTarget(bot)}
                                                                                className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Curated Tab */}
                        {activeTab === 'curated' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-medium text-muted-foreground">Priority Content</h2>
                                </div>

                                <div className="bg-card rounded-xl border overflow-hidden">
                                    {curatedContent.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <Star className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                            <p className="text-muted-foreground font-medium">No curated content</p>
                                            <p className="text-sm text-muted-foreground/60 mt-1">
                                                Add posts or projects to boost their engagement
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-muted/30 border-b">
                                                    <tr>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground">Content</th>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground">Priority</th>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground">Multiplier</th>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground">Expires</th>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {curatedContent.map((item) => (
                                                        <tr key={item.id} className="hover:bg-muted/30">
                                                            <td className="px-4 py-3">
                                                                <span className="font-medium">{item.content_type}</span>
                                                                <span className="text-xs text-muted-foreground ml-2">{item.content_id.slice(0, 8)}...</span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-1">
                                                                    {Array.from({ length: item.priority }).map((_, i) => (
                                                                        <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground">
                                                                {item.engagement_multiplier}x
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                                {item.expires_at ? formatDate(item.expires_at) : 'Never'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 text-muted-foreground hover:text-destructive"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Logs Tab */}
                        {activeTab === 'logs' && (
                            <div className="space-y-6">
                                <h2 className="text-sm font-medium text-muted-foreground">Recent Activity</h2>

                                <div className="bg-card rounded-xl border overflow-hidden">
                                    {logs.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <Activity className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                            <p className="text-muted-foreground font-medium">No activity logs</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-muted/30 border-b">
                                                    <tr>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground">Bot</th>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground">Target</th>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground">Scheduled</th>
                                                        <th className="px-4 py-3 font-medium text-muted-foreground">Executed</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {logs.map((log) => (
                                                        <tr key={log.id} className="hover:bg-muted/30">
                                                            <td className="px-4 py-3">
                                                                <span className="text-xs">@{log.bot_user?.user?.username || 'Unknown'}</span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    {getEngagementIcon(log.engagement_type)}
                                                                    <span className="capitalize">{log.engagement_type}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                                {log.target_type} {log.target_id.slice(0, 8)}...
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={cn(
                                                                    'text-xs font-medium px-2 py-1 rounded-full',
                                                                    log.status === 'executed' && 'bg-emerald-500/10 text-emerald-500',
                                                                    log.status === 'pending' && 'bg-amber-500/10 text-amber-500',
                                                                    log.status === 'failed' && 'bg-destructive/10 text-destructive',
                                                                    log.status === 'skipped' && 'bg-muted text-muted-foreground'
                                                                )}>
                                                                    {log.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                                {formatDate(log.scheduled_for)}
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                                {log.executed_at ? formatDate(log.executed_at) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null)
                }}
                title="Delete Bot?"
                description={`This will permanently delete the bot "${deleteTarget?.user.display_name}" and all their engagement history. This action cannot be undone.`}
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
                cancelLabel="Cancel"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={handleDeleteBot}
            />
        </div>
    )
}
