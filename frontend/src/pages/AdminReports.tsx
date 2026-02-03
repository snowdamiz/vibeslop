import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
    ArrowLeft,
    Loader2,
    Flag,
    Trash2,
    CheckCircle,
    XCircle,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
} from 'lucide-react'
import { api, type AdminReport } from '@/lib/api'
import { cn } from '@/lib/utils'

type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed' | ''
type ReportType = 'Post' | 'Project' | 'Comment' | 'Gig' | ''

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    reviewed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    dismissed: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
}

const TYPE_COLORS: Record<string, string> = {
    Post: 'bg-purple-500/10 text-purple-600',
    Project: 'bg-cyan-500/10 text-cyan-600',
    Comment: 'bg-orange-500/10 text-orange-600',
    Gig: 'bg-emerald-500/10 text-emerald-600',
}

export function AdminReports() {
    const navigate = useNavigate()
    const [reports, setReports] = useState<AdminReport[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [offset, setOffset] = useState(0)
    const [statusFilter, setStatusFilter] = useState<ReportStatus>('')
    const [typeFilter, setTypeFilter] = useState<ReportType>('')
    const [actionReport, setActionReport] = useState<AdminReport | null>(null)
    const [actionType, setActionType] = useState<'delete' | 'dismiss' | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const limit = 20

    useEffect(() => {
        fetchReports()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [offset, statusFilter, typeFilter])

    const fetchReports = async () => {
        setIsLoading(true)
        try {
            const response = await api.getAdminReports({
                limit,
                offset,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
            })
            setReports(response.data)
            setTotal(response.meta.total)
        } catch (error) {
            console.error('Failed to fetch reports:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleStatusChange = async (reportId: string, newStatus: string) => {
        try {
            await api.updateReportStatus(reportId, newStatus)
            fetchReports()
        } catch (error) {
            console.error('Failed to update report status:', error)
        }
    }

    const handleDeleteContent = async () => {
        if (!actionReport) return
        setIsProcessing(true)
        try {
            await api.deleteReportedContent(actionReport.id)
            fetchReports()
        } catch (error) {
            console.error('Failed to delete content:', error)
        } finally {
            setIsProcessing(false)
            setActionReport(null)
            setActionType(null)
        }
    }

    const handleDismiss = async () => {
        if (!actionReport) return
        setIsProcessing(true)
        try {
            await api.updateReportStatus(actionReport.id, 'dismissed')
            fetchReports()
        } catch (error) {
            console.error('Failed to dismiss report:', error)
        } finally {
            setIsProcessing(false)
            setActionReport(null)
            setActionType(null)
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

    const getContentLink = (report: AdminReport) => {
        switch (report.reportable_type) {
            case 'Post':
                return `/post/${report.reportable_id}`
            case 'Project':
                return `/project/${report.reportable_id}`
            case 'Gig':
                return `/gigs/${report.reportable_id}`
            case 'Comment':
                return null
            default:
                return null
        }
    }

    const totalPages = Math.ceil(total / limit)
    const currentPage = Math.floor(offset / limit) + 1

    const statusLabel = statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'All Statuses'
    const typeLabel = typeFilter || 'All Types'

    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
                <div className="max-w-[600px] mx-auto flex items-center gap-4 px-4 h-14">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => navigate('/admin')}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Reports</h1>
                        <p className="text-xs text-muted-foreground">
                            {total} total report{total !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-[600px] mx-auto px-4 py-4 border-b border-border">
                <div className="flex gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="min-w-[140px] justify-between">
                                {statusLabel}
                                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => { setStatusFilter(''); setOffset(0) }}>
                                All Statuses
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setStatusFilter('pending'); setOffset(0) }}>
                                Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setStatusFilter('reviewed'); setOffset(0) }}>
                                Reviewed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setStatusFilter('resolved'); setOffset(0) }}>
                                Resolved
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setStatusFilter('dismissed'); setOffset(0) }}>
                                Dismissed
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="min-w-[120px] justify-between">
                                {typeLabel}
                                <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => { setTypeFilter(''); setOffset(0) }}>
                                All Types
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setTypeFilter('Post'); setOffset(0) }}>
                                Post
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setTypeFilter('Project'); setOffset(0) }}>
                                Project
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setTypeFilter('Comment'); setOffset(0) }}>
                                Comment
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setTypeFilter('Gig'); setOffset(0) }}>
                                Gig
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Reports List */}
            <div className="max-w-[600px] mx-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : reports.length === 0 ? (
                    <div className="text-center py-16">
                        <Flag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No reports found</p>
                        {(statusFilter || typeFilter) && (
                            <Button
                                variant="link"
                                onClick={() => {
                                    setStatusFilter('')
                                    setTypeFilter('')
                                }}
                                className="mt-2"
                            >
                                Clear filters
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {reports.map((report) => {
                            const contentLink = getContentLink(report)
                            return (
                                <div key={report.id} className="p-4">
                                    <div className="flex items-start gap-3">
                                        {/* Reporter Avatar */}
                                        <Link to={`/user/${report.reporter.username}`}>
                                            <Avatar className="w-10 h-10">
                                                {report.reporter.avatar_url && (
                                                    <AvatarImage
                                                        src={report.reporter.avatar_url}
                                                        alt={report.reporter.display_name}
                                                    />
                                                )}
                                                <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-600 text-white text-sm">
                                                    {report.reporter.display_name.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Link>

                                        {/* Report Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link
                                                    to={`/user/${report.reporter.username}`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {report.reporter.display_name}
                                                </Link>
                                                <span className="text-muted-foreground text-sm">reported</span>
                                                <span
                                                    className={cn(
                                                        'text-xs px-2 py-0.5 rounded-full font-medium',
                                                        TYPE_COLORS[report.reportable_type]
                                                    )}
                                                >
                                                    {report.reportable_type}
                                                </span>
                                            </div>

                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {formatDate(report.inserted_at)}
                                            </p>

                                            {/* Status Badge */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span
                                                    className={cn(
                                                        'text-xs px-2 py-0.5 rounded-full border capitalize',
                                                        STATUS_COLORS[report.status]
                                                    )}
                                                >
                                                    {report.status}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    ID: {report.reportable_id.slice(0, 8)}...
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 mt-3">
                                                {contentLink && (
                                                    <Link to={contentLink}>
                                                        <Button variant="outline" size="sm" className="h-8">
                                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                                            View
                                                        </Button>
                                                    </Link>
                                                )}

                                                {report.status === 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={() => handleStatusChange(report.id, 'reviewed')}
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                        Mark Reviewed
                                                    </Button>
                                                )}

                                                {report.status !== 'resolved' && report.status !== 'dismissed' && (
                                                    <>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={() => {
                                                                setActionReport(report)
                                                                setActionType('delete')
                                                            }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                            Delete
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={() => {
                                                                setActionReport(report)
                                                                setActionType('dismiss')
                                                            }}
                                                        >
                                                            <XCircle className="w-3.5 h-3.5 mr-1" />
                                                            Dismiss
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 py-6 border-t border-border">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setOffset(offset - limit)}
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setOffset(offset + limit)}
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={actionType === 'delete' && actionReport !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setActionReport(null)
                        setActionType(null)
                    }
                }}
                title={`Delete ${actionReport?.reportable_type}?`}
                description={`This action cannot be undone. The ${actionReport?.reportable_type.toLowerCase()} will be permanently deleted and the report will be marked as resolved.`}
                confirmLabel={isProcessing ? 'Deleting...' : 'Delete'}
                cancelLabel="Cancel"
                variant="destructive"
                isLoading={isProcessing}
                onConfirm={handleDeleteContent}
            />

            {/* Dismiss Confirmation Dialog */}
            <ConfirmDialog
                open={actionType === 'dismiss' && actionReport !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setActionReport(null)
                        setActionType(null)
                    }
                }}
                title="Dismiss Report?"
                description="This will mark the report as dismissed. The reported content will remain unchanged."
                confirmLabel={isProcessing ? 'Dismissing...' : 'Dismiss'}
                cancelLabel="Cancel"
                isLoading={isProcessing}
                onConfirm={handleDismiss}
            />
        </div>
    )
}
