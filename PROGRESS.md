# Dollop — Progress Tracker

Legend: ✅ Done · 🔄 In Progress · ⏳ Pending · ❓ Awaiting your input

---

## This round — summary

### 1. Lyrics ✅ Done

- Removed "Coming in Phase 2" entirely (verified zero matches for "Phase 2"
  anywhere in the codebase).
- New `src/services/api/lyrics.ts` — LRCLIB integration (free, no API key):
  - `/get` exact match using title+artist+album+duration
  - Falls back to fuzzy `/search` if no exact match
  - Parses LRC-format synced lyrics into timestamped lines
- `PlayerScreen`'s lyrics view now:
  - Shows **synced lyrics** with auto-scroll + highlighted current line
    (driven by `usePlayerProgressStore` position)
  - Falls back to **plain lyrics** (scrollable block) if no sync data
  - Shows **"Lyrics not available."** if LRCLIB has nothing for the track
  - Shows **"This track is instrumental."** for instrumental tracks
  - Shows a loading spinner while fetching

### 2. Queue drag-and-drop ✅ Done

- Used `react-native-draggable-flatlist` (already a dependency, now wired in)
- Each queue row has a visible drag-handle icon on the right
- Drag is bound **only to the handle** via `onLongPress` — tapping the rest
  of the row still plays that song; tapping the X still removes it
- `DraggableFlatList`'s built-in `autoscrollThreshold`/`autoscrollSpeed`
  auto-scrolls near top/bottom edges while dragging
- `onDragEnd` calls the existing `reorderQueue(from, to)` store action —
  order persists in `usePlayerStore` and survives navigation

### 3. Offline banner → Toast ✅ Done

- Removed `OfflineBanner.tsx` (persistent top banner) entirely
- New `src/components/common/Toast.tsx` — `useToast()` hook, themed pill
  toast that fades/slides in, holds ~2s, fades out, zero layout impact
- New `src/hooks/useNetworkStatus.ts` — wraps `@react-native-community/netinfo`,
  fires `onChange` **only on actual state transitions** (online↔offline),
  not continuously while offline
- `App.tsx` shows "You're offline" (warning) / "Back online" (success) toasts
- `authStore.isOffline` is now driven by real connectivity, not just
  "last API call failed"

  ⚠️ **New dependency added**: `@react-native-community/netinfo` (required
  for real connectivity detection — no existing library provided this).
  Run `bun install` after syncing.

### 4. Player screen improvements ❓ Awaiting your input

**Not implemented yet** — per your instructions, here's the review +
proposal. See "Player Screen Proposal" section below. Reply with which
items you'd like built and I'll implement just those.

### 5. Logging system + APP_ENV ✅ Done

- Added `EXPO_PUBLIC_APP_ENV` to `.env.example` (`development` | `production`)
- Rewrote `src/utils/logger.ts`:
  - Reads `EXPO_PUBLIC_APP_ENV` once at load
  - `development` → prints `[Tag] message <data>` via console.log/warn/error
    (visible in `adb logcat`)
  - `production` → every call is a complete no-op
- **Removed the in-app Debug Log screen** (`DebugLogScreen.tsx` deleted,
  routes/nav entries removed, `expo-clipboard` dependency removed) per your
  instruction — logs are read via adb only now
- Added/expanded tagged logging in: `authStore` (`[Auth]`), `playerStore`
  (`[Player]`, `[Queue]`), `jamendo.ts` (`[Jamendo]`), plus existing
  `[LocalMusic]`, `[LibraryScreen]`, `[AudioPlayer]`, `[GoogleDrive]`,
  `[SpotifyImport]`, `[Lyrics]`, `[Network]`
- New `commands.md` at repo root — full `APP_ENV` explanation + adb logcat
  filter commands per module, errors-only, save-to-file, etc.

### 6. Spotify → Google Drive download (restricted) 🔄 Gated UI only

- New `SpotifyImportScreen` — paste a Spotify track/playlist link, preview
  what would be imported (title/artist/album + whether a playable Jamendo
  match exists)
- **Access gate**: "Import from Spotify" only appears in Profile → More for
  `aakashrockers1@gmail.com`; the screen itself re-checks the email as a
  safety net for direct navigation
- **Download/storage NOT implemented** — the screen shows an in-app notice
  explaining why ("download the songs" needs clarification, see below)
- Reuses the `spotifyImport.ts` / Jamendo-matching groundwork from the
  previous round

#### ❓ Needs your decision before building further:

Spotify's Web API does not provide raw audio downloads to third parties
(doing so would violate their Developer Terms regardless of how it's
implemented). "Download and store in Google Drive" needs to mean one of:

**(a)** Store track metadata + a Jamendo CC-licensed match's audio file in
Drive (legal, but it's not literally "the Spotify song" — many tracks
won't have a match)

**(b)** Use a separate third-party audio-sourcing service for the matched
track (legality/quality varies by provider — would need you to pick one)

**(c)** Something else you have in mind?

Let me know which direction and I'll build the actual download → Drive
upload flow for the gated account.

---

## Player Screen Proposal (item 4)

### What the Player screen currently supports

- Play / pause / skip next / previous
- Seek bar with drag-to-seek, correctly centred thumb
- Shuffle toggle, repeat mode cycle (off → all → one)
- Queue: view, add, remove, **drag-to-reorder** (just added)
- Lyrics: synced + plain + "not available" (just added)
- Dots menu: view queue, add current song to queue, toggle lyrics
- Edge-swipe-right (from left edge) to dismiss back to previous screen
- Artwork scale animation on play/pause
- Local / Jamendo / Google Drive playback all working

### Proposed improvements (pick any/none/all)

1. **Sleep timer** — stop playback after N minutes or "end of track",
   accessible from the dots menu
2. **Playback speed control** — 0.75x/1x/1.25x/1.5x/2x, useful for
   podcasts/audiobooks if Dollop expands there
3. **Lock-screen / notification media controls** — play/pause/skip from
   the Android notification shade and lock screen (requires
   `expo-av`'s background audio + a media-session library)
4. **Swipe left/right on artwork** for next/previous track (in addition to
   the skip buttons) — common in Spotify/Apple Music
5. **Mini-player ↔ full player sync** — verify the mini player (visible on
   Home/Library/Search) shows live progress and updates instantly when the
   full player changes track
6. **Volume control** — in-app slider (currently only system volume affects
   playback)
7. **"Why this song" / queue source indicator** — small label showing
   whether the current song came from a playlist, search, or local library
8. **Crossfade between tracks** — short fade out/in on track change
9. **Repeat-one visual countdown / "looping" indicator** when repeat mode
   is "one"
10. **Haptic feedback** on play/pause/skip (using `expo-haptics`, likely
    already available in Expo SDK 51)

I'd suggest starting with **#3 (lock-screen controls)** and **#4 (swipe
gestures)** as the highest-impact, most "expected" features for a music
app — but it's your call. Let me know which numbers to build.

---

## Previously completed (earlier rounds)

- Phase 1: auth, navigation, theming, offline-safe sessions, player UI basics
- Jamendo API, Search screen, local music scan + diagnostics, local playlists
- Google Drive integration (OAuth, file listing, streaming with auth headers)
- Custom themed ConfirmDialog (replacing Alert.alert)
- PlayerScreen button-freeze fix (gesture detector scoping)

## Still pending

- Backend-synced (online) playlists
- Play history / recommendations endpoints
- Search history, Artist/Album detail screens
- Spotify download → Drive flow (blocked on item 6 decision above)
- Player screen enhancements (blocked on item 4 decision above)
