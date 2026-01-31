import { useEffect } from 'react'

type SchemaType =
    | OrganizationSchema
    | WebSiteSchema
    | SoftwareApplicationSchema
    | PersonSchema
    | JobPostingSchema
    | ArticleSchema

interface OrganizationSchema {
    '@type': 'Organization'
    name: string
    url: string
    logo?: string
    description?: string
    sameAs?: string[]
}

interface WebSiteSchema {
    '@type': 'WebSite'
    name: string
    url: string
    potentialAction?: {
        '@type': 'SearchAction'
        target: string
        'query-input': string
    }
}

interface SoftwareApplicationSchema {
    '@type': 'SoftwareApplication'
    name: string
    description?: string
    applicationCategory?: string
    operatingSystem?: string
    author?: {
        '@type': 'Person'
        name: string
        url?: string
    }
    datePublished?: string
    image?: string
    url?: string
}

interface PersonSchema {
    '@type': 'Person'
    name: string
    url?: string
    image?: string
    description?: string
    sameAs?: string[]
}

interface JobPostingSchema {
    '@type': 'JobPosting'
    title: string
    description: string
    datePosted: string
    hiringOrganization?: {
        '@type': 'Organization'
        name: string
        url?: string
    }
    jobLocation?: {
        '@type': 'Place'
        address: string
    }
    employmentType?: string
}

interface ArticleSchema {
    '@type': 'Article'
    headline: string
    description?: string
    image?: string
    author?: {
        '@type': 'Person'
        name: string
        url?: string
    }
    datePublished?: string
    dateModified?: string
}

interface StructuredDataProps {
    schema: SchemaType | SchemaType[]
}

/**
 * Component for injecting JSON-LD structured data into the document head.
 * Supports multiple schema types for rich search results.
 */
export function StructuredData({ schema }: StructuredDataProps) {
    useEffect(() => {
        const schemas = Array.isArray(schema) ? schema : [schema]
        const scriptId = 'structured-data-json-ld'

        // Remove existing script if present
        const existing = document.getElementById(scriptId)
        existing?.remove()

        // Create JSON-LD script
        const script = document.createElement('script')
        script.id = scriptId
        script.type = 'application/ld+json'

        const jsonLd = {
            '@context': 'https://schema.org',
            '@graph': schemas,
        }

        script.textContent = JSON.stringify(jsonLd)
        document.head.appendChild(script)

        return () => {
            const el = document.getElementById(scriptId)
            el?.remove()
        }
    }, [schema])

    return null
}

// Pre-built schema generators for common use cases
export const schemas = {
    organization: (): OrganizationSchema => ({
        '@type': 'Organization',
        name: 'HypeVibe',
        url: 'https://hypevibe.com',
        logo: 'https://hypevibe.com/logo.svg',
        description:
            'The portfolio platform for AI-native builders. Showcase your projects and connect with fellow vibe coders.',
    }),

    website: (): WebSiteSchema => ({
        '@type': 'WebSite',
        name: 'HypeVibe',
        url: 'https://hypevibe.com',
        potentialAction: {
            '@type': 'SearchAction',
            target: 'https://hypevibe.com/search?q={search_term_string}',
            'query-input': 'required name=search_term_string',
        },
    }),

    project: (data: {
        name: string
        description: string
        authorName: string
        authorUsername: string
        datePublished: string
        image?: string
        url: string
    }): SoftwareApplicationSchema => ({
        '@type': 'SoftwareApplication',
        name: data.name,
        description: data.description,
        applicationCategory: 'DeveloperApplication',
        author: {
            '@type': 'Person',
            name: data.authorName,
            url: `https://hypevibe.com/user/${data.authorUsername}`,
        },
        datePublished: data.datePublished,
        image: data.image,
        url: data.url,
    }),

    person: (data: {
        name: string
        username: string
        bio?: string
        avatar?: string
        links?: string[]
    }): PersonSchema => ({
        '@type': 'Person',
        name: data.name,
        url: `https://hypevibe.com/user/${data.username}`,
        image: data.avatar,
        description: data.bio,
        sameAs: data.links,
    }),

    jobPosting: (data: {
        title: string
        description: string
        datePosted: string
        companyName?: string
        location?: string
        employmentType?: string
    }): JobPostingSchema => ({
        '@type': 'JobPosting',
        title: data.title,
        description: data.description,
        datePosted: data.datePosted,
        hiringOrganization: data.companyName
            ? { '@type': 'Organization', name: data.companyName }
            : undefined,
        jobLocation: data.location
            ? { '@type': 'Place', address: data.location }
            : undefined,
        employmentType: data.employmentType,
    }),
}
