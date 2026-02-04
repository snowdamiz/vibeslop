import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { FeaturedProjectCard } from '@/components/feed/FeaturedProjectCard'
import type { BotPost, FeaturedProject } from '@/components/feed/types'
import {
    ArrowLeft,
    Loader2,
    TrendingUp,
    Trophy,
    Megaphone,
    BadgeCheck,
} from 'lucide-react'
import { api } from '@/lib/api'

const BOT_TYPE_CONFIG = {
    trending_projects: {
        label: 'Weekly Trending',
        icon: TrendingUp,
        color: 'bg-primary/10 text-primary',
    },
    milestone: {
        label: 'Milestone',
        icon: Trophy,
        color: 'bg-emerald-500/10 text-emerald-600',
    },
    announcement: {
        label: 'Announcement',
        icon: Megaphone,
        color: 'bg-blue-500/10 text-blue-600',
    },
} as const

type BotType = keyof typeof BOT_TYPE_CONFIG

export function BotPostDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [post, setPost] = useState<BotPost | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!id) return

        const fetchPost = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const response = await api.getPost(id)
                const postData = response.data as BotPost

                // If it's not a bot post, redirect to regular post page
                if (postData.type !== 'bot_post') {
                    navigate(`/post/${id}`, { replace: true })
                    return
                }

                setPost(postData)
            } catch (err) {
                console.error('Failed to fetch post:', err)
                setError('Failed to load post')
            } finally {
                setIsLoading(false)
            }
        }

        fetchPost()
    }, [id, navigate])

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !post) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-lg font-semibold mb-2">Post not found</p>
                    <Link to="/">
                        <Button variant="outline">Go home</Button>
                    </Link>
                </div>
            </div>
        )
    }

    const botConfig = BOT_TYPE_CONFIG[post.bot_type as BotType] || BOT_TYPE_CONFIG.trending_projects
    const Icon = botConfig.icon
    const projects = post.featured_projects || []

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
                <div className="max-w-[600px] mx-auto flex items-center gap-4 px-4 h-14">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <h1 className="font-bold text-lg">Post</h1>
                        <Badge variant="secondary" className={botConfig.color}>
                            <Icon className="w-3 h-3 mr-1" />
                            {botConfig.label}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="max-w-[600px] mx-auto">
                {/* Main Post */}
                <div className="px-4 py-4">
                    {/* Author Header */}
                    <div className="flex items-start gap-3 mb-3">
                        <Link to={`/user/${post.author.username}`}>
                            <Avatar className="w-12 h-12 hover:opacity-90 transition-opacity">
                                <AvatarImage src={post.author.avatar_url} alt={post.author.name} />
                                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                                    {post.author.initials}
                                </AvatarFallback>
                            </Avatar>
                        </Link>
                        <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                    to={`/user/${post.author.username}`}
                                    className="font-semibold hover:underline"
                                >
                                    {post.author.name}
                                </Link>
                                {post.author.is_verified && (
                                    <BadgeCheck className="w-4 h-4 text-primary fill-primary/20" />
                                )}
                            </div>
                            <Link
                                to={`/user/${post.author.username}`}
                                className="text-muted-foreground text-sm"
                            >
                                @{post.author.username}
                            </Link>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="mb-4 text-[17px] leading-relaxed">
                        {post.content}
                    </div>

                    {/* Timestamp */}
                    <div className="text-muted-foreground text-sm border-b border-border pb-4">
                        {formatDate(post.created_at)}
                    </div>
                </div>

                {/* Featured Projects Section */}
                {projects.length > 0 && (
                    <div className="px-4 pt-4 pb-6">
                        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            Featured Projects
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {projects.map((project: FeaturedProject) => (
                                <FeaturedProjectCard
                                    key={project.id}
                                    project={project}
                                    className="h-full"
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {projects.length === 0 && (
                    <div className="px-4 py-8 text-center">
                        <Icon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No featured projects in this post</p>
                    </div>
                )}
            </div>
        </div>
    )
}
