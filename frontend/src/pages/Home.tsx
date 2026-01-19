import { Feed } from '@/components/feed'

export function Home() {
  return (
    <Feed showCompose={true} showTabs={true} initialTab="for-you" />
  )
}
