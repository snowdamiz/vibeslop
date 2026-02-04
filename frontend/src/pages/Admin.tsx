import { useAuth } from '@/context/AuthContext'
import { Navigate, useNavigate } from 'react-router-dom'
import { Users, ChevronRight, Sparkles, Layers, Flag, Bot } from 'lucide-react'

export function Admin() {
    const { user, isAuthenticated, isLoading } = useAuth()
    const navigate = useNavigate()

    // Wait for auth to load
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Redirect non-admins or unauthenticated users
    if (!isAuthenticated || !user?.is_admin) {
        return <Navigate to="/" replace />
    }

    const tools = [
        {
            icon: Users,
            title: 'Users',
            description: 'Manage accounts',
            onClick: () => navigate('/admin/users'),
        },
        {
            icon: Flag,
            title: 'Reports',
            description: 'Review user reports',
            onClick: () => navigate('/admin/reports'),
        },
        {
            icon: Bot,
            title: 'Bots',
            description: 'Manage platform bots',
            onClick: () => navigate('/admin/bots'),
        },
        {
            icon: Sparkles,
            title: 'AI Tools',
            description: 'Manage AI tools catalog',
            onClick: () => navigate('/admin/catalog/ai-tools'),
        },
        {
            icon: Layers,
            title: 'Tech Stacks',
            description: 'Manage tech stacks catalog',
            onClick: () => navigate('/admin/catalog/tech-stacks'),
        },
    ]

    return (
        <div className="min-h-screen">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
                <div className="max-w-[600px] mx-auto flex items-center justify-between px-4 h-14">
                    <div className="flex items-center gap-3">
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Admin Control</h1>
                            <p className="text-xs text-muted-foreground">
                                Platform management
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-[600px] mx-auto px-4 py-6">
                <h2 className="text-sm font-medium text-muted-foreground mb-4">Tools</h2>
                <div className="flex flex-col gap-2">
                    {tools.map((tool) => (
                        <button
                            key={tool.title}
                            onClick={tool.onClick}
                            className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-border/50 transition-colors"
                        >
                            {/* Icon Container */}
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                                <tool.icon className="w-5 h-5 text-primary" />
                            </div>

                            {/* Text Content */}
                            <div className="flex-1 text-left">
                                <h3 className="font-semibold text-foreground text-sm">
                                    {tool.title}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {tool.description}
                                </p>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
