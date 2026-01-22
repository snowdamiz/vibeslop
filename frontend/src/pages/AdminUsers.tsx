import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, ShieldCheck, Trash2, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api, type AdminUser } from '@/lib/api'
import { cn } from '@/lib/utils'

export function AdminUsers() {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth()
    const navigate = useNavigate()

    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const limit = 50

    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

    useEffect(() => {
        if (!authLoading && (!isAuthenticated || !user?.is_admin)) {
            navigate('/', { replace: true })
        }
    }, [authLoading, isAuthenticated, user, navigate])

    useEffect(() => {
        if (user?.is_admin) {
            loadUsers()
        }
    }, [page, search, user])

    const loadUsers = async () => {
        setLoading(true)
        try {
            const offset = (page - 1) * limit
            const response = await api.getAdminUsers({ limit, offset, search })
            setUsers(response.data)
            setTotal(response.meta.total)
        } catch (error) {
            console.error('Failed to load users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1) // Reset to first page on new search
        loadUsers()
    }

    const toggleVerified = async (userId: string) => {
        try {
            const response = await api.toggleUserVerified(userId)
            setUsers(users.map(u => u.id === userId ? response.data : u))
        } catch (error) {
            console.error('Failed to toggle verification:', error)
        }
    }

    const handleDelete = async (userId: string) => {
        try {
            await api.deleteUser(userId)
            setUsers(users.filter(u => u.id !== userId))
            setConfirmDelete(null)
            setTotal(prev => prev - 1)
        } catch (error) {
            console.error('Failed to delete user:', error)
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
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Users</h1>
                        <p className="text-xs text-muted-foreground">
                            {total} registered accounts
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-[1000px] mx-auto px-4 py-6">
                {/* Search */}
                <form onSubmit={handleSearch} className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search users by name, username or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 transition-all font-medium text-sm"
                    />
                </form>

                {/* Users List */}
                <div className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="p-8 flex justify-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No users found matching "{search}".
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/30 border-b border-border/60">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-muted-foreground w-[40%]">User</th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">Joined</th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                    {users.map(user => (
                                        <tr key={user.id} className="group hover:bg-muted/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                                                        alt={user.username}
                                                        className="w-10 h-10 rounded-full object-cover bg-muted"
                                                    />
                                                    <div>
                                                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                                                            {user.display_name}
                                                            {user.is_verified && (
                                                                <CheckCircle className="w-3.5 h-3.5 text-primary fill-primary/10" />
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground font-mono">
                                                            @{user.username} • {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1.5 align-middle">
                                                    {user.is_verified ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary w-fit">
                                                            Verified
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground w-fit">
                                                            Unverified
                                                        </span>
                                                    )}

                                                </div>
                                            </td>
                                            <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">
                                                {new Date(user.inserted_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleVerified(user.id)}
                                                        className={cn(
                                                            "p-2 rounded-lg transition-colors",
                                                            user.is_verified
                                                                ? "text-primary hover:bg-primary/10"
                                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        )}
                                                        title={user.is_verified ? "Remove verification" : "Verify user"}
                                                    >
                                                        <ShieldCheck className="w-4 h-4" />
                                                    </button>

                                                    {confirmDelete === user.id ? (
                                                        <div className="flex items-center gap-2 bg-destructive/10 p-1 rounded-lg">
                                                            <span className="text-[10px] font-bold text-destructive pl-1">SURE?</span>
                                                            <button
                                                                onClick={() => handleDelete(user.id)}
                                                                className="p-1 rounded bg-destructive text-destructive-foreground hover:scale-105 transition-transform"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDelete(null)}
                                                                className="p-1 rounded hover:bg-background/50 text-muted-foreground"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmDelete(user.id)}
                                                            className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                            title="Delete user"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {total > limit && (
                        <div className="p-4 border-t border-border/60 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Page {page} of {Math.ceil(total / limit)}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page >= Math.ceil(total / limit)}
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
    )
}
