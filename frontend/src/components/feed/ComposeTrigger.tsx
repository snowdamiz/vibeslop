import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useCompose } from '@/context/ComposeContext'

interface ComposeTriggerProps {
    placeholder?: string
}

export function ComposeTrigger({ placeholder }: ComposeTriggerProps) {
    const { user } = useAuth()
    const { openCompose } = useCompose()

    if (!user) return null

    return (
        <div
            className="border-b border-border cursor-pointer transition-colors hover:bg-muted/20"
            onClick={openCompose}
        >
            <div className="flex items-center gap-3 max-w-[600px] mx-auto px-4 py-3">
                <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-medium">
                        {user.initials}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-muted-foreground text-[15px]">
                    {placeholder || "What's on your mind?"}
                </div>

                <Button
                    className="rounded-full px-5"
                    disabled
                >
                    Post
                </Button>
            </div>
        </div>
    )
}
