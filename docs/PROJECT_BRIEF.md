# Vibeslop - Project Brief

> A social media platform for showcasing vibe-coded projects

---

## Overview

Vibeslop is a social portfolio platform designed specifically for the vibe coding community—developers and creators who embrace AI-assisted development. Users can showcase their projects, share the tools and processes behind them, connect with like-minded builders, and build professional credibility in this emerging space.

**Target Launch**: Web-first application  
**Ambition Level**: Potential startup (scalable, monetizable)  
**Tech Stack**: Vite + React + Tailwind (frontend), Elixir + Phoenix (backend)

---

## Problem Statement

The vibe coding community—people who build software with AI assistance (Cursor, Claude, v0, Bolt, etc.)—has no dedicated home. Current options fail them:

- **Traditional portfolios** (GitHub, personal sites) don't capture the AI-native workflow
- **Social platforms** (Twitter/X) are ephemeral—threads disappear, no structured showcase
- **Design platforms** (Behance, Dribbble) are visual-only, not code-focused
- **Developer platforms** (Dev.to, Peerlist) can be dismissive of AI-assisted work
- **Artist platforms** (Cara) are explicitly anti-AI

There's a growing community of builders who want to:
1. **Show off** what they've created with AI assistance
2. **Share** their process, prompts, and learnings
3. **Connect** with others doing the same
4. **Build credibility** without hiding their AI-augmented workflow

---

## Target Users

### Persona 1: "Weekend Viber" - Casey
| Attribute | Details |
|-----------|---------|
| **Background** | Software engineer by day, builds random projects on weekends using Cursor/Claude |
| **Goal** | Show off cool projects, get feedback, find inspiration |
| **Pain Point** | Twitter threads disappear, GitHub repos feel too "serious" for half-finished experiments |
| **Usage Pattern** | Post project screenshots, share what prompts worked, browse the feed for ideas |

### Persona 2: "Career Pivoter" - Jordan
| Attribute | Details |
|-----------|---------|
| **Background** | Former marketer learning to code via AI tools, building real projects |
| **Goal** | Build a legitimate portfolio to land their first dev job |
| **Pain Point** | Traditional portfolios don't capture their AI-native approach; feels like they have to hide the AI assistance |
| **Usage Pattern** | Curated portfolio of best work, detailed "how I built this" breakdowns, list specializations |

### Persona 3: "Indie Hacker" - Alex
| Attribute | Details |
|-----------|---------|
| **Background** | Serial builder, ships MVPs fast using vibe coding, monetizes some |
| **Goal** | Build an audience, find collaborators, attract users to their projects |
| **Pain Point** | Posting everywhere (Twitter, Reddit, HN) is exhausting; wants one home base |
| **Usage Pattern** | Regular posts about builds, networking via DMs, discovery through the feed |

---

## Competitive Landscape

| Platform | Focus | Strengths | Why Vibeslop is Different |
|----------|-------|-----------|---------------------------|
| **Behance/Dribbble** | Visual design portfolios | Beautiful showcases, established communities | Not code-focused, no "how it was built" context |
| **Cara** | Artist-focused social + portfolio | Anti-AI scraping, community-first | Against AI-generated content (opposite stance) |
| **Read.cv / Peerlist** | Developer resumes/portfolios | Clean, professional, dev-focused | Static portfolios, limited social features |
| **Dev.to** | Developer blogging/community | Great engagement, dev culture | Writing-focused, not project showcase |
| **LinkedIn** | Professional networking | Everyone's on it | Boring, not creative, projects are an afterthought |
| **Contra** | Freelancer portfolios | Built-in payments/hiring | Freelance-focused, not community |
| **GitHub** | Code repositories | Universal for developers | Too technical, not showcase-friendly |

### Market Gap
No platform specifically serves vibe coders or celebrates AI-assisted development. Vibeslop fills this gap by being explicitly welcoming to AI-augmented workflows and making the "how" (tools, prompts, process) as important as the "what" (final product).

---

## Unique Value Proposition

### Core Differentiators

1. **"Built With" Context**
   - Every project showcases the AI tools used (Cursor, Claude, v0, Bolt, GPT-4, etc.)
   - Framework and tech stack visibility
   - Optional prompt sharing

2. **Process Storytelling**
   - Show the journey, not just the result
   - Timeline of iterations with descriptions and images
   - Before/after comparisons
   - Key learnings and pivots

3. **Non-Judgmental Community**
   - Explicitly celebrates AI-augmented creation
   - No stigma around "AI slop"
   - Welcoming to all skill levels

4. **Technical Specializations**
   - "Prompting for React apps" as a skill category
   - "AI-assisted data visualization" specialization
   - New vocabulary for AI-native skills

### Tagline Ideas
- "Where vibe coders show their work"
- "The portfolio platform for AI-native builders"
- "Show the vibe, share the process"

---

## Feature Roadmap

### MVP (Version 1.0) - Essential Features

#### User Profiles
- [ ] Username, display name, bio
- [ ] Avatar and banner image upload
- [ ] External links (GitHub, Twitter/X, website, etc.)
- [ ] Technical specializations (tag-based skills)
- [ ] Public profile pages with unique URLs

#### Projects
- [ ] Title and description
- [ ] Multiple screenshot uploads
- [ ] External links (live demo, repository)
- [ ] "Built With" section (AI tools, frameworks, languages)
- [ ] Prompt Snippets (optional) - share effective prompts used
- [ ] Process timeline (optional) - key moments with descriptions + images
- [ ] Tags for categorization
- [ ] Draft/Published status - save drafts, publish when ready

#### Social Features
- [ ] Follow/unfollow users
- [ ] Feed with two modes: "Trending" (default) and "Following" (chronological)
- [ ] Trending algorithm (engagement score: likes, comments, recency)
- [ ] Like projects
- [ ] Comment on projects
- [ ] Share projects (external links)

#### Discovery
- [ ] Trending/hot projects on homepage
- [ ] Search by username, project name, tags
- [ ] Filter by specialization
- [ ] Filter by AI tools used
- [ ] Filter by tech stack
- [ ] Explore/discover page for non-logged-in users

#### Core Infrastructure
- [ ] User authentication (GitHub + Google OAuth)
- [ ] Image upload and storage
- [ ] Responsive design (mobile-friendly)
- [ ] Basic SEO (meta tags, OpenGraph)

---

### Version 1.1 - Important Enhancements

#### Communication
- [ ] Direct messages (1:1)
- [ ] Notification system (likes, comments, follows, DMs)
- [ ] Email notifications (digest options)

#### Profile Enhancements
- [ ] Project collections/categories
- [ ] Pinned/featured projects
- [ ] Endorsements (users can endorse others' specializations)
- [ ] "Currently building" status

#### Content Features
- [ ] Project updates/changelog (edit history)
- [ ] Project versioning (v1, v2, etc.)

#### Discovery Enhancements
- [ ] Featured projects (curated/staff picks)
- [ ] "Similar projects" recommendations
- [ ] "More from this creator" suggestions
- [ ] Weekly digest of top projects (email)

#### Analytics
- [ ] Profile views
- [ ] Project views
- [ ] Like/comment counts over time
- [ ] Referral sources

---

### Version 2.0+ - Future Vision

#### Community Features
- [ ] Teams/collaborations (joint projects)
- [ ] Challenges/contests (weekly build prompts)
- [ ] Groups by interest/specialization
- [ ] Long-form blog posts/write-ups

#### Professional Features
- [ ] Job board / "Open to work" flags
- [ ] Company profiles
- [ ] Verified badges
- [ ] Custom profile domains

#### Monetization Features
- [ ] Premium subscriptions
- [ ] Extended analytics for premium users
- [ ] Promoted projects
- [ ] Marketplace for templates/assets

#### Platform Expansion
- [ ] API for integrations
- [ ] Mobile apps (iOS/Android)
- [ ] Browser extension for quick posting
- [ ] GitHub integration (auto-import repos)

---

## User Stories

### MVP User Stories

#### Authentication & Profile
```
As a new user, I want to sign up with GitHub or Google so I can quickly create my account.

As a user, I want my GitHub profile info to auto-populate so setup is faster.

As a user, I want to set up my profile with a bio, avatar, and links so others can learn about me.

As a user, I want to add technical specializations to my profile so others know what I'm good at.

As a visitor, I want to view public profiles so I can see someone's work without signing up.
```

#### Projects
```
As a user, I want to create a new project with screenshots and description so I can showcase my work.

As a user, I want to save a project as a draft so I can finish it later before publishing.

As a user, I want to publish a draft project so it becomes visible to others.

As a user, I want to specify which AI tools I used so others can see my workflow.

As a user, I want to share prompt snippets that worked well so others can learn from my approach.

As a user, I want to add a process timeline to my project so I can show my journey.

As a user, I want to edit or delete my projects so I can keep my portfolio current.
```

#### Social
```
As a user, I want to follow other users so I can see their projects in my feed.

As a user, I want to like projects so I can show appreciation.

As a user, I want to comment on projects so I can give feedback or ask questions.

As a user, I want to see a trending feed so I can discover popular projects.

As a user, I want to switch to a "Following" feed so I can see projects from people I follow.
```

#### Discovery
```
As a user, I want to search for projects by tags so I can find relevant work.

As a user, I want to filter projects by AI tools used so I can find inspiration for my workflow.

As a visitor, I want to browse featured projects so I can see what the platform offers.
```

---

## Technical Considerations

### Frontend Stack
- **Build Tool**: Vite
- **Framework**: React
- **Styling**: Tailwind CSS
- **State Management**: TBD (React Query for server state, Zustand/Jotai for client state)
- **Routing**: React Router

### Backend Stack
- **Language**: Elixir
- **Framework**: Phoenix
- **Database**: PostgreSQL
- **Real-time**: Phoenix Channels (for notifications, live updates)
- **File Storage**: S3-compatible (AWS S3, Cloudflare R2, etc.)

### Infrastructure Considerations
- **Hosting**: TBD (Fly.io is excellent for Elixir)
- **CDN**: For image delivery
- **Search**: PostgreSQL full-text initially, Elasticsearch/Meilisearch later if needed
- **Email**: Transactional email service (Resend, Postmark, etc.)
- **OAuth Providers**: GitHub OAuth App + Google OAuth (via Google Cloud Console)

### Why Elixir/Phoenix?
- Excellent for real-time features (notifications, live updates)
- Highly concurrent, handles many simultaneous connections
- Phoenix LiveView potential for future interactive features
- Great developer experience
- Scales well for startup growth

---

## Key Decisions

### ✅ Confirmed Decisions

| Decision | Choice | Implications |
|----------|--------|--------------|
| **Feed Algorithm** | Trending + Chronological | Need engagement scoring (likes, comments, recency). Show trending by default, option to switch to "Following" (chronological) |
| **"Built With" Depth** | Tool tags + Prompt sharing | Projects have required tool tags, optional "Prompt Snippets" section for sharing effective prompts |
| **Project Privacy** | Draft → Public flow | Users can save drafts, then publish when ready. No fully private projects in MVP |
| **Authentication** | GitHub + Google OAuth | Social login only (no email/password). Simplifies onboarding, gets GitHub profile data |

### Open Questions

These decisions should be made before development begins:

#### Product Questions
1. **Moderation Strategy**: How to handle spam, inappropriate content?
2. **Content Guidelines**: What counts as a "vibe coded" project? Any restrictions?

#### Business Questions
1. **Launch Strategy**: Private beta with invite codes, or open launch?
2. **Monetization Timeline**: When to introduce premium features?
3. **Content Seeding**: How to get initial content before users join?
4. **Community Building**: Discord/community alongside the platform?

#### Technical Questions
1. **Image Handling**: Max sizes, compression, formats supported?
2. **Rate Limiting**: Limits on posts, comments, follows?
3. **Data Export**: Allow users to export their data?

---

## Success Metrics

### MVP Success (Month 1-3)
- 500+ registered users
- 200+ projects posted
- 50+ daily active users
- Average 3+ projects per active user

### Growth Phase (Month 4-6)
- 5,000+ registered users
- 2,000+ projects posted
- 500+ daily active users
- 30%+ week-1 retention

### Scale Phase (Month 7-12)
- 50,000+ registered users
- 20,000+ projects posted
- 5,000+ daily active users
- Clear path to monetization

---

## Next Steps

### Immediate (This Week)
1. [ ] Finalize answers to open questions
2. [ ] Create detailed wireframes/mockups
3. [ ] Set up development environment
4. [ ] Initialize frontend and backend repositories

### Short-term (Weeks 2-4)
1. [ ] Build authentication system
2. [ ] Build user profile CRUD
3. [ ] Build project CRUD with image uploads
4. [ ] Build basic feed and follow system

### Medium-term (Weeks 5-8)
1. [ ] Build search and discovery
2. [ ] Build comments and likes
3. [ ] Polish UI/UX
4. [ ] Internal testing and bug fixes

### Launch Prep (Weeks 9-12)
1. [ ] Private beta with select users
2. [ ] Gather feedback and iterate
3. [ ] Content seeding
4. [ ] Public launch

---

## Appendix

### Inspirational References
- **Cara** (cara.app) - Portfolio + social for artists, strong community focus
- **Read.cv** - Clean, minimal developer portfolios
- **Layers.to** - Design portfolio inspiration
- **Peerlist** - Developer profiles with verification
- **Polywork** - Multi-hyphenate professional profiles

### AI Tools to Support in "Built With"
- Cursor
- Claude (Anthropic)
- ChatGPT / GPT-4
- GitHub Copilot
- v0 (Vercel)
- Bolt
- Replit AI
- Windsurf
- Lovable
- And many more...

### Potential Specialization Tags
- AI Prompting
- Frontend Development
- Backend Development
- Full-Stack
- Mobile Development
- Data Visualization
- Game Development
- Creative Coding
- DevOps/Infrastructure
- UI/UX Design
- Machine Learning
- Web3/Blockchain

---

*Document created: January 2026*  
*Last updated: January 2026*
