# Synora — Product Requirements Document

## 1. Original Problem Statement
Build **Synora**, a mobile-first, context-aware dating app for Gen-Z India. Users discover each other through shared physical presence at venues, events, and gatherings. **No swipe mechanics anywhere.**

**Core rules**
- No swipe UI · No silent likes · Users must **comment on a prompt** to like someone
- Women have free access · Men pay **₹499/month**
- Only "Nearby" is shown (no exact distance) · Manual profile approval system

## 2. Architecture
| Layer         | Tech                                                                 |
|---------------|----------------------------------------------------------------------|
| Client        | **Expo (React Native Web)** — expo-router v6, zustand, react-query   |
| Data/Auth     | **Supabase** — Postgres + RLS, Storage, Realtime, Auth               |
| Server stub   | **FastAPI** on port 8001 — only hosts `POST /api/auth/mock-otp`      |
| Design system | Dark-first · `#08060F` void bg · `#E8572A→#C23B8A` ember→bloom CTA gradient · `#8B68D4→#1FBFA0` venue-mode gradient · serif headings + sans body |

Deployed on Emergent: Expo web at `/` (port 3000), FastAPI at `/api/*` (port 8001).

## 3. User Personas
- **Ananya, 24, F, Bangalore** — Serious intent, lives in Indiranagar, visits Third Wave Coffee weekly
- **Aarav, 26, M, Bangalore** — Serious intent, tabletop RPGs, pays ₹499/mo for full access
- **Kabir, 28, M, Bangalore** — Casual intent, filter coffee purist
- **Meher, 26, F, Bangalore** — Exploring, has a dog, loves IKEA

## 4. Core Requirements (static)
1. Onboarding → invite code → phone OTP (mock) → 6-slot photo grid → 2 prompt answers → intent → basic info → gender paywall
2. Discovery feed → opposite-gender, approved, non-banned, non-invisible, not-already-commented users → "Comment to Connect" (mandatory text comment)
3. Mutual comment → auto-match via Postgres trigger → chat unlocked
4. Venue Mode → 12 seeded venues → activate within 500m geofence → 4-hour auto-expire → real-time "Here Now" list
5. Crossed Paths → `get_crossed_paths(user, venue)` RPC → blurred profiles until Reveal
6. Chat → realtime messages, unread counts, match-gated
7. Trust & Safety → Invisible toggle, Block, Report with 5 reason presets

## 5. What's Implemented (Jan 17, 2026)

### ✅ Infrastructure
- Expo 54 web bundle served on port 3000 via supervisor
- FastAPI stub on 8001 (`/api/health`, `/api/auth/mock-otp`)
- Supabase schema + RLS + realtime + storage + 12 seeded venues (`/app/supabase_schema.sql`)
- 6 seeded demo users (3M + 3F in Bangalore)
- Desktop mobile-frame wrapper (420×900 on >640px viewports)

### ✅ Auth
- Mock phone OTP: any 10-digit phone + any 6-digit code
- Backend provisions confirmed Supabase user via admin API
- Client signs in via `signInWithPassword` → real session for RLS/realtime

### ✅ Onboarding (auto-approve for MVP)
- Invite code (any code starting with `SYN`)
- Photo grid (3-6 slots) → Supabase storage `profile-photos` bucket
- Prompts (select 2 of 12) + answers
- Intent selection (serious/casual/exploring)
- Basic info (name, age, gender)
- Gender paywall: free for women, mock Razorpay (1.8s spinner) for men, both upsert with `is_approved=true`

### ✅ Discovery
- Opposite-gender filter, excludes already-commented users, excludes blockers
- ProfileCard with photo carousel, intent tag, prompt card, "Comment to Connect"
- Mutual comment → Postgres trigger creates match → celebration modal

### ✅ Venue Mode
- Search across 12 seeded venues (Bangalore/Delhi/Mumbai)
- Activate toggle with GPS validation (`expo-location` + haversine)
- 4-hour countdown + auto-deactivate
- Scheduled notification 45 min after exit: "You crossed paths ✦"

### ✅ Crossed Paths
- Calls `get_crossed_paths` RPC
- Stats row (people / activated / compatible)
- Blurred avatar → Reveal Crossed Paths (gradient CTA)
- "Express Interest" sends a comment

### ✅ Chat
- Match list with unread indicator
- Chat thread with realtime `postgres_changes` subscription on `messages`
- Gradient bubbles for sender, neutral for other

### ✅ Trust & Safety
- Go Invisible toggle in profile tab (with persistent "You're invisible" header)
- Block + Report bottom sheet (5 reasons + free-form details)
- Blocked users excluded from Discovery

### ✅ Testing
- Programmatic E2E script `/tmp/e2e_test.mjs` — all green
- Testing agent iteration_1: 100% backend + 100% frontend pass

## 6. Prioritized Backlog

### P0 — MVP Blockers (all done)
- ✅ Supabase schema + RLS + RPC + storage
- ✅ Mock OTP + mock Razorpay + auto-approve
- ✅ Discovery + comment-to-match + chat
- ✅ Venue mode + crossed paths
- ✅ Block / report / invisible

### P1 — Next session (when user returns)
- 🔲 Real phone OTP (Twilio) to replace mock
- 🔲 Real Razorpay subscription with webhook verification
- 🔲 Admin dashboard (approve/reject/ban) — spec had manual approval
- 🔲 Photo upload fallback for Expo Go (blob issue)
- 🔲 Edit profile screen (currently Edit button is inert)
- 🔲 Push notifications via `notify-message` edge function + Expo push tokens

### P2 — Polish
- 🔲 Tab bar icons from FontAwesome/Lucide (currently Unicode glyphs)
- 🔲 Haptics on key interactions (`expo-haptics`)
- 🔲 "Request Access" lead-capture form on landing
- 🔲 Presence-based typing indicator in chat
- 🔲 Venue analytics for hosts

## 7. Next Tasks (if user asks to continue)
1. Wire Twilio SMS via `supabase.auth.signInWithOtp({ phone })` + Twilio provider in Supabase Auth
2. Plug Razorpay Standard Checkout using `react-native-razorpay` on native + Razorpay Web Checkout on web
3. Build `/admin` route (behind a founder Supabase role) for approval queue
4. Add edit-profile screen reusing onboarding components
