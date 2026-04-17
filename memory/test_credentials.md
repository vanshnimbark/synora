# Synora — Test Credentials

## Mock phone OTP
Any 10-digit number + any 6-digit code (e.g., `123456`) will create/sign into a Supabase user.

Backend endpoint: `POST /api/auth/mock-otp` with `{"phone":"<10 digits>","otp":"<6 digits>"}`

## Seeded demo profiles (auto-approved, visible in discovery)
| Phone        | Name         | Gender | Age | Intent    | City      |
|--------------|--------------|--------|-----|-----------|-----------|
| 9000000001   | Aarav Mehta  | man    | 26  | serious   | Bangalore |
| 9000000002   | Kabir Singh  | man    | 28  | casual    | Bangalore |
| 9000000003   | Dev Kapoor   | man    | 25  | exploring | Bangalore |
| 9000000101   | Ananya Iyer  | woman  | 24  | serious   | Bangalore |
| 9000000102   | Ira Menon    | woman  | 27  | casual    | Bangalore |
| 9000000103   | Meher Pillai | woman  | 26  | exploring | Bangalore |

To log in as one of them in the UI:
- Enter any invite code starting with `SYN` (e.g., `SYN-TEST`)
- Enter phone (e.g., `9000000001`)
- Click "Send Code"
- Enter OTP `123456`
- Click "Continue" — you'll be taken straight to the Discovery tab.

## Supabase keys (already configured)
- URL: `https://joayxhaghyiysqscopae.supabase.co`
- Anon (publishable) key: in `/app/.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Service role key: in `/app/backend/.env` as `SUPABASE_SERVICE_ROLE_KEY`

## Pair flow (mutual comment → match)
1. Log in as `9000000001` (Aarav), comment on Ananya (9000000101).
2. Log out, log in as `9000000101` (Ananya), comment on Aarav.
3. Match is auto-created by DB trigger; both users can now chat.
