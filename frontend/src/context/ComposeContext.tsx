import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import type { FeedItem } from '@/components/feed/types'

type NewPostCallback = (item: FeedItem) => void

interface ComposeContextValue {
    isOpen: boolean
    openCompose: () => void
    closeCompose: () => void
    setIsOpen: (open: boolean) => void
    quotedItem: FeedItem | null
    setQuotedItem: (item: FeedItem | null) => void
    openComposeWithQuote: (item: FeedItem) => void
    isAIGeneratorOpen: boolean
    setIsAIGeneratorOpen: (open: boolean) => void
    // Callback for when a new post/project is created
    onNewPostCreated: (item: FeedItem) => void
    subscribeToNewPosts: (callback: NewPostCallback) => () => void
}

const ComposeContext = createContext<ComposeContextValue | null>(null)

export function ComposeProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [quotedItem, setQuotedItem] = useState<FeedItem | null>(null)
    const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false)

    // Store subscribers for new post notifications
    const subscribersRef = useRef<Set<NewPostCallback>>(new Set())

    const openCompose = useCallback(() => {
        setIsOpen(true)
    }, [])

    const closeCompose = useCallback(() => {
        setIsOpen(false)
        setQuotedItem(null)
    }, [])

    const openComposeWithQuote = useCallback((item: FeedItem) => {
        setQuotedItem(item)
        setIsOpen(true)
    }, [])

    // Notify all subscribers when a new post is created
    const onNewPostCreated = useCallback((item: FeedItem) => {
        subscribersRef.current.forEach(callback => callback(item))
    }, [])

    // Subscribe to new post notifications, returns unsubscribe function
    const subscribeToNewPosts = useCallback((callback: NewPostCallback) => {
        subscribersRef.current.add(callback)
        return () => {
            subscribersRef.current.delete(callback)
        }
    }, [])

    return (
        <ComposeContext.Provider
            value={{
                isOpen,
                openCompose,
                closeCompose,
                setIsOpen,
                quotedItem,
                setQuotedItem,
                openComposeWithQuote,
                isAIGeneratorOpen,
                setIsAIGeneratorOpen,
                onNewPostCreated,
                subscribeToNewPosts,
            }}
        >
            {children}
        </ComposeContext.Provider>
    )
}

export function useCompose() {
    const context = useContext(ComposeContext)
    if (!context) {
        throw new Error('useCompose must be used within a ComposeProvider')
    }
    return context
}
