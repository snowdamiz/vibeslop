import { useEffect, useRef } from 'react'

interface SEOProps {
    title?: string
    description?: string
    image?: string
    url?: string
    type?: 'website' | 'article' | 'profile'
    noindex?: boolean
}

const DEFAULT_TITLE = 'Onvibe – Where AI-native builders show their work'
const DEFAULT_DESCRIPTION = 'The portfolio platform for AI-native builders. Showcase your projects, share your process, and connect with fellow vibe coders.'
const DEFAULT_IMAGE = '/og-image.png'
const SITE_NAME = 'Onvibe'

/**
 * Custom hook for managing SEO meta tags.
 * Updates document head with Open Graph and Twitter Card meta tags.
 * Automatically cleans up on unmount, restoring defaults.
 */
export function useSEO({
    title,
    description,
    image,
    url,
    type = 'website',
    noindex = false,
}: SEOProps = {}) {
    const previousTitle = useRef<string | null>(null)

    useEffect(() => {
        // Store the previous title to restore on unmount
        if (previousTitle.current === null) {
            previousTitle.current = document.title
        }

        const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE
        const metaDescription = description || DEFAULT_DESCRIPTION
        const metaImage = image || DEFAULT_IMAGE
        const metaUrl = url || window.location.href

        // Update document title
        document.title = fullTitle

        // Helper to update or create a meta tag
        const setMetaTag = (
            property: string,
            content: string,
            isName = false
        ) => {
            const attribute = isName ? 'name' : 'property'
            let element = document.querySelector(
                `meta[${attribute}="${property}"]`
            ) as HTMLMetaElement | null

            if (!element) {
                element = document.createElement('meta')
                element.setAttribute(attribute, property)
                document.head.appendChild(element)
            }
            element.setAttribute('content', content)
        }

        // Basic meta tags
        setMetaTag('description', metaDescription, true)
        if (noindex) {
            setMetaTag('robots', 'noindex, nofollow', true)
        }

        // Open Graph tags
        setMetaTag('og:title', fullTitle)
        setMetaTag('og:description', metaDescription)
        setMetaTag('og:image', metaImage)
        setMetaTag('og:url', metaUrl)
        setMetaTag('og:type', type)
        setMetaTag('og:site_name', SITE_NAME)

        // Twitter Card tags
        setMetaTag('twitter:card', 'summary_large_image', true)
        setMetaTag('twitter:title', fullTitle, true)
        setMetaTag('twitter:description', metaDescription, true)
        setMetaTag('twitter:image', metaImage, true)

        // Canonical URL
        let canonical = document.querySelector(
            'link[rel="canonical"]'
        ) as HTMLLinkElement | null
        if (!canonical) {
            canonical = document.createElement('link')
            canonical.setAttribute('rel', 'canonical')
            document.head.appendChild(canonical)
        }
        canonical.setAttribute('href', metaUrl)

        // Cleanup: restore defaults on unmount
        return () => {
            document.title = previousTitle.current || DEFAULT_TITLE
            setMetaTag('description', DEFAULT_DESCRIPTION, true)
            setMetaTag('og:title', DEFAULT_TITLE)
            setMetaTag('og:description', DEFAULT_DESCRIPTION)
            setMetaTag('og:image', DEFAULT_IMAGE)
            setMetaTag('og:type', 'website')

            // Remove noindex if it was set
            if (noindex) {
                const robotsMeta = document.querySelector('meta[name="robots"]')
                robotsMeta?.remove()
            }
        }
    }, [title, description, image, url, type, noindex])
}
