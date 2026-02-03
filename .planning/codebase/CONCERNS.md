# Codebase Concerns

**Analysis Date:** 2026-02-02

## Tech Debt

**Feed Filtering Not Implemented:**
- Issue: "Following" feed type has TODO stubs that bypass the filtering logic. The feed returns same results for "for-you" and "following" feeds.
- Files: `backend/lib/backend/content.ex` (lines 39, 84, 125, 155)
- Impact: Users cannot see only posts from followed accounts; the following feed shows chronological posts from everyone. This breaks a core social media feature.
- Fix approach: Implement filtering by `current_user`'s followed users in the `list_unified_feed/1` and `list_feed_posts/1` functions. Join with `follows` table where follower_id = current_user_id.

**Duplicate SSE Parsing Logic:**
- Issue: Server-Sent Event (SSE) parsing for streaming AI responses is duplicated in two methods with identical buffer/parsing logic.
- Files: `frontend/src/lib/api.ts` (lines 813-843 in `improvePost`, lines 881-911 in `improveGig`)
- Impact: Code duplication increases maintenance burden and increases risk of divergent behavior if one is fixed but not the other.
- Fix approach: Extract SSE parsing into a private helper method `parseSSEStream(reader, onChunk)` that both methods call.

**Monolithic Component Files:**
- Issue: `ProjectComposer.tsx` (1345 lines) and `GigPostForm.tsx` (851 lines) contain multiple concerns: state management, form validation, file handling, image conversion, editor initialization, and rendering.
- Files: `frontend/src/components/feed/ProjectComposer.tsx`, `frontend/src/components/gigs/GigPostForm.tsx`
- Impact: Components are difficult to test, maintain, and reason about. Changes to one feature (e.g., image handling) risk breaking others (e.g., form validation).
- Fix approach: Split into smaller components: separate form sections into sub-components, extract file/image handling to custom hooks (`useImageUpload`, `useFileToBase64`), extract editor logic to a custom hook (`useTiptapEditor`).

**Manual HTML-to-Markdown Conversion:**
- Issue: HTML to markdown conversion uses regex pattern matching instead of a proper HTML parser. Multiple regex patterns for different tags (lines 143-160 in ProjectComposer.tsx and similar in GigPostForm.tsx).
- Files: `frontend/src/components/feed/ProjectComposer.tsx` (lines 143-160), `frontend/src/components/gigs/GigPostForm.tsx` (lines 88-105)
- Impact: Edge cases with nested HTML, malformed tags, or complex formatting will produce incorrect markdown. Duplicate conversion logic creates maintenance burden.
- Fix approach: Use a library like `turndown` or implement a proper HTML parser. Extract conversion to a utility function.

## Known Bugs

**Editor State Force Re-render Anti-pattern:**
- Symptoms: Force re-renders on every editor transaction using a counter state (`setEditorState(prev => prev + 1)`).
- Files: `frontend/src/components/feed/ProjectComposer.tsx` (lines 76, 134)
- Trigger: Any text edit in the TipTap editor triggers a re-render by incrementing counter
- Workaround: None - the re-render happens but doesn't cause visible bugs, only performance degradation
- Fix: TipTap already triggers re-renders; the counter state is unnecessary and should be removed

**Image Index Boundary Bug:**
- Symptoms: When removing the last image in ProjectComposer, currentImageIndex can become incorrect
- Files: `frontend/src/components/feed/ProjectComposer.tsx` (lines 216-221)
- Trigger: Remove last image when viewing that image. currentImageIndex stays at 3 but only 2 images remain.
- Workaround: Click different image before removing
- Fix: The logic `if (currentImageIndex >= images.length - 1)` should check `currentImageIndex >= newArray.length` where newArray is computed before checking

## Security Considerations

**Plain Text Token Storage in localStorage:**
- Risk: Auth tokens stored in localStorage are vulnerable to XSS attacks. Any injected script can read and transmit the token to attacker.
- Files: `frontend/src/lib/api.ts` (lines 230, 237, 244), `frontend/src/context/AuthContext.tsx` (lines 71, 97, 112)
- Current mitigation: JWT tokens have expiration times; HTTPS prevents interception
- Recommendations:
  1. Consider httpOnly cookies for token storage (requires backend support)
  2. Implement Content Security Policy (CSP) headers to prevent XSS
  3. Add Subresource Integrity (SRI) for third-party scripts
  4. Audit for XSS vulnerabilities in user-generated content rendering

**OAuth State Parameter Validation:**
- Risk: OAuth state parameter in AuthController validates via cookie comparison, but cookie is set with `same_site: "Lax"`. An attacker could potentially perform CSRF under certain conditions.
- Files: `backend/lib/backend_web/controllers/auth_controller.ex` (lines 43, 13)
- Current mitigation: Lax SameSite cookie setting provides cross-site protection
- Recommendations:
  1. Validate state parameter explicitly in callback handler (not visible in provided code)
  2. Consider upgrading to `same_site: "Strict"` if frontend is same-origin
  3. Add CSRF token to regular form submissions

**User Input in Error Messages:**
- Risk: Error messages that include user input or auth failure details could leak sensitive information
- Files: `backend/lib/backend_web/controllers/auth_controller.ex` (line 77 includes inspect(fails) in error response)
- Current mitigation: Marked as `details: inspect(fails)` - may expose sensitive OAuth state
- Recommendations:
  1. Log detailed errors server-side only
  2. Return generic error messages to clients: "Authentication failed. Please try again."
  3. Add structured logging for auth failures

**Missing Input Validation:**
- Risk: GitHub URL and live URLs stored without validation
- Files: `frontend/src/components/feed/ProjectComposer.tsx` (lines 101-102 setLiveUrl, setGithubUrl)
- Current mitigation: None - URLs accepted as-is
- Recommendations:
  1. Validate URL format before sending to backend
  2. Backend should validate against whitelist of allowed domains
  3. Add checks for malicious protocols (javascript:, data:, etc.)

## Performance Bottlenecks

**N+1 Query Pattern in Feed Queries:**
- Problem: `list_unified_feed/1` fetches reposts, then for each repost, calls `Repo.get()` to load the original post or project. With many reposts, this causes many individual DB queries.
- Files: `backend/lib/backend/content.ex` (lines 140-225)
- Cause: Manual loop with `Repo.get()` inside instead of eager loading or batch queries
- Improvement path:
  1. Collect all repostable_ids grouped by type
  2. Use single batch query per type: `Repo.all(from p in Post, where: p.id in ^post_ids)`
  3. Build map for O(1) lookup in the loop
  4. Estimated improvement: 50-200ms faster for typical feeds

**Inefficient Engagement Status Computation:**
- Problem: `add_engagement_status/2` called on each feed item and likely makes individual queries to check likes, bookmarks, reposts
- Files: `backend/lib/backend/content.ex` (lines 238-240)
- Cause: No visibility into `add_engagement_status` but likely uses N+1 pattern
- Improvement path: Batch check all engagement statuses in single query, build map, attach to items

**Full Page Re-render on Editor Changes:**
- Problem: ProjectComposer and GigPostForm components re-render on every keystroke in TipTap editor due to state management
- Files: `frontend/src/components/feed/ProjectComposer.tsx`, `frontend/src/components/gigs/GigPostForm.tsx`
- Cause: Counter state increments on `onTransaction`, causing parent and all children to re-render
- Improvement path:
  1. Remove force re-render counter
  2. Use TipTap's `useEditor()` hook which handles its own re-renders
  3. Memoize child components with React.memo
  4. Use useCallback for handlers

**Missing Pagination Offset in Reposts:**
- Problem: In `list_unified_feed/1`, pagination happens AFTER combining posts+projects+reposts, but reposts are loaded without limit/offset. Could load thousands of reposts from DB.
- Files: `backend/lib/backend/content.ex` (lines 140, 162, 230-232)
- Cause: Reposts query has no limit; pagination applied to combined results
- Improvement path: Apply limit to reposts_query before combining, adjust logic to fetch balanced amounts

## Fragile Areas

**TipTap Editor Integration:**
- Files: `frontend/src/components/feed/ProjectComposer.tsx` (lines 112-136), `frontend/src/components/gigs/GigPostForm.tsx` (lines 58-81)
- Why fragile:
  1. Editor initialization happens in component setup but editor state is not validated
  2. `getMarkdownContent()` assumes editor exists and HTML format matches regex patterns
  3. Multiple components duplicate editor setup code
  4. No error handling if editor fails to initialize
- Safe modification:
  1. Extract to reusable hook: `useTiptapEditor(placeholder, initialContent)`
  2. Add validation: guard on editor existence before calling methods
  3. Wrap getMarkdownContent in try-catch
  4. Test coverage: Need tests for edge case HTML inputs (nested tags, special chars, empty editor)
- Test coverage: No tests visible for markdown conversion

**Feed Algorithm:**
- Files: `backend/lib/backend/content.ex`, `backend/lib/backend/feed.ex`
- Why fragile:
  1. Complex query combining posts, projects, reposts with different preload patterns
  2. Add functions like `add_engagement_status` called after DB queries (possible N+1)
  3. Sorting happens in Elixir after fetching, not in DB
  4. Comments indicate incomplete "following" feed implementation
  5. Easy to accidentally break when adding new features
- Safe modification:
  1. Write integration tests for feed output (ensure posts in order, no duplicates)
  2. Test following vs for-you feeds produce different results
  3. Add query monitoring to catch N+1 issues
  4. Document the preload strategy
- Test coverage: Needs tests for feed combining logic, engagement status calculation

**Image Handling in ProjectComposer:**
- Files: `frontend/src/components/feed/ProjectComposer.tsx` (lines 166-195, 216-221)
- Why fragile:
  1. Base64 image encoding in browser for potentially large files (5MB limit enforced in browser only)
  2. Multiple images stored in state, manipulated by index
  3. Index boundary bugs when removing images
  4. File validation happens after FileReader completes (potential race conditions)
- Safe modification:
  1. Extract to `useImageUpload` hook
  2. Add queue/batch processing if many images selected
  3. Test on various file types and sizes
  4. Add error recovery for failed conversions
- Test coverage: No visible tests for image handling

**Authentication Context:**
- Files: `frontend/src/context/AuthContext.tsx`
- Why fragile:
  1. `handleAuthCallback` can fail during user fetch but token is already stored
  2. No retry logic if network fails during getCurrentUser
  3. localStorage dependency without fallback
  4. User transformation can crash if API returns unexpected shape
- Safe modification:
  1. Use try-finally to ensure consistent state
  2. Add validation/zod schema for API user shape
  3. Test with missing/extra fields from backend
- Test coverage: Needs tests for failed auth scenarios

## Scaling Limits

**In-Memory Feed Sorting:**
- Current capacity: Feeds work up to thousands of items fetched at once
- Limit: Sorting `(posts ++ projects ++ reposts) |> Enum.sort_by()` happens in Elixir after fetching all results. With 10k+ items, this becomes slow.
- Scaling path:
  1. Move sorting to database: Use UNION queries with proper DB-level sorting
  2. Implement keyset pagination instead of offset pagination
  3. Separate concern: fetch top N posts, top N projects, top N reposts separately (currently done for posts/projects)

**WebSocket Connections for Real-Time:**
- Current capacity: No visible WebSocket implementation; all updates require polling
- Limit: Frequent polling for notifications/messages scales poorly with user count
- Scaling path: Implement Phoenix Channels for real-time updates (infrastructure exists with Phoenix)

**Database N+1 Queries:**
- Current capacity: Performant for 100s of concurrent users, but not thousands
- Limit: Multiple N+1 patterns will cause query avalanche under load
- Scaling path: Implement query batching, batch preloads, add DataLoader-like library

## Dependencies at Risk

**Node Version Constraint:**
- Risk: package.json requires `"node": ">=18.0.0"` which is too permissive. Node 18 entered LTS but 20+ has security benefits.
- Impact: Developers might use insecure Node versions; CI/CD might pick outdated versions
- Migration plan: Upgrade to `"node": ">=20.0.0"` to match current LTS standards

**Transitive Dependency Vulnerabilities:**
- Risk: No lockfile audit visible; dependencies like `marked` (markdown parser) and TipTap editor have had vulnerabilities
- Impact: Marked < 11.0 has XSS vulnerabilities in some edge cases
- Migration plan:
  1. Run `npm audit` regularly
  2. Implement Dependabot or Renovate for automated updates
  3. Consider pinning major versions for critical packages

**Unsupported Package Versions:**
- Risk: React 19.2.0 is very new (Feb 2024); limited production usage and potential undiscovered bugs
- Impact: May encounter edge cases not caught by community; harder to find solutions online
- Migration plan: Monitor React issues, have rollback plan to 18.x if problems emerge

## Missing Critical Features

**Rate Limiting Not Visible in Frontend:**
- Problem: Backend implements rate limiting for AI features (`RateLimiter` in AI controller) but frontend has no UI for showing rate limit status or progress
- Blocks: Users cannot see when they'll regain generation quota; UX is confusing when requests suddenly start failing
- Fix: Add rate limit headers to API responses, display countdown to user

**No Offline Support:**
- Problem: Application completely non-functional without internet connection; all content fetched on-demand
- Blocks: Users cannot view previously loaded content if connection drops; critical for mobile experience
- Fix: Implement service worker + basic IndexedDB cache for posts/profiles

**Following Feed Not Working:**
- Problem: Feed type parameter accepted but not implemented (TODO comments throughout)
- Blocks: Core social feature unusable; users cannot curate their feed
- Priority: High - breaks primary user workflow

## Test Coverage Gaps

**Feed Algorithm Testing:**
- What's not tested: Combining posts, projects, reposts in correct order; engagement counts; following vs for-you feed behavior
- Files: `backend/lib/backend/content.ex` (entire `list_unified_feed` function)
- Risk: Bugs in feed ranking or sorting would not be caught by existing tests; could break user experience silently
- Priority: High

**SSE Streaming Error Handling:**
- What's not tested: Edge cases in SSE parsing (malformed JSON, timeout, network interruption)
- Files: `frontend/src/lib/api.ts` (improvePost, improveGig methods)
- Risk: Streaming fails silently with console.error but no user feedback; UX shows loading indefinitely
- Priority: Medium

**Image Handling Edge Cases:**
- What's not tested: File size validation, format validation, multiple image operations
- Files: `frontend/src/components/feed/ProjectComposer.tsx` (image handling)
- Risk: Users can upload invalid files that break post creation; drag-drop race conditions
- Priority: Medium

**Authentication Flow Failures:**
- What's not tested: Token expiration, failed user fetch after successful OAuth, network errors during callback
- Files: `frontend/src/context/AuthContext.tsx`, `backend/lib/backend_web/controllers/auth_controller.ex`
- Risk: Users stuck in login loop or inconsistent auth state
- Priority: High

**Input Validation:**
- What's not tested: URL validation for GitHub/live URLs, budget validation (min > max), title length limits
- Files: `frontend/src/components/feed/ProjectComposer.tsx`, `frontend/src/components/gigs/GigPostForm.tsx`
- Risk: Invalid data reaches backend; backend doesn't validate
- Priority: Medium

---

*Concerns audit: 2026-02-02*
