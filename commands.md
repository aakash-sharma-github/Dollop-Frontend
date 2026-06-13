# Dollop — Commands Reference

## App environment (`APP_ENV`)

Dollop's logger is controlled by `EXPO_PUBLIC_APP_ENV` in `.env`:

```bash
# .env
EXPO_PUBLIC_APP_ENV=development   # tagged logs print to console (adb logcat)
EXPO_PUBLIC_APP_ENV=production    # logger.* calls are complete no-ops
```

After changing this value, restart Metro with a cache clear so the new env
value is picked up:

```bash
bun run start --clear
```

### How it works

`src/utils/logger.ts` checks `process.env['EXPO_PUBLIC_APP_ENV']` once at
module load. When it's `'development'`, every `logger.debug/info/warn/error`
call prints to the console with a `[Tag]` prefix:

```typescript
logger.info('LocalMusic', 'scan complete', { count: 42 });
// → [LocalMusic] scan complete {"count":42}
```

When `APP_ENV` is `'production'`, these calls do nothing — no string
formatting, no console output, zero runtime cost.

There is **no in-app log viewer** — all logs are read via `adb logcat` as
described below.

---

## adb logcat commands

All commands assume a physical Android device connected via USB with
USB debugging enabled, and the Dollop app running in development mode
(`EXPO_PUBLIC_APP_ENV=development`).

### Clear old logs and watch live (recommended starting point)

```bash
adb logcat -c && adb logcat | grep "\[Local\]\|\[LibraryScreen\]\|\[Player\]\|\[Queue\]\|\[GoogleDrive\]\|\[Auth\]"
```

Shows all Dollop-tagged logs across the main modules. `-c` clears the buffer
first so you only see logs from this point forward.

### Per-module filters

```bash
# Local music scanning / library
adb logcat -c && adb logcat | grep "\[LocalMusic\]\|\[LibraryScreen\]"

# Playback and queue
adb logcat -c && adb logcat | grep "\[AudioPlayer\]\|\[Player\]\|\[Queue\]"

# Authentication / session
adb logcat -c && adb logcat | grep "\[Auth\]"

# Google Drive integration
adb logcat -c && adb logcat | grep "\[GoogleDrive\]"

# Spotify import
adb logcat -c && adb logcat | grep "\[SpotifyImport\]"

# Lyrics (LRCLIB)
adb logcat -c && adb logcat | grep "\[Lyrics\]"

# Network connectivity changes
adb logcat -c && adb logcat | grep "\[Network\]"

# Jamendo API
adb logcat -c && adb logcat | grep "\[Jamendo\]"

# App startup / init
adb logcat -c && adb logcat | grep "\[App\]"
```

### Errors only (any module)

```bash
adb logcat -c && adb logcat *:E | grep ReactNativeJS
```

Shows only `console.error` output across all tags — fastest way to spot
crashes or failed requests.

### All Dollop JS logs (no tag filter)

```bash
adb logcat -c && adb logcat ReactNativeJS:V *:S
```

Useful if you added a `logger.debug()` call with a tag not in the lists
above — this catches everything from the JS thread regardless of tag.

### Save logs to a file for sharing/review

```bash
adb logcat -c
# ... reproduce the issue in the app ...
adb logcat -d ReactNativeJS:V *:S > dollop-logs.txt
```

`-d` dumps the current buffer and exits (instead of following live).

---

## Logger tags in use

| Tag | Module |
|---|---|
| `[App]` | App.tsx startup/init |
| `[Auth]` | authStore — session, token refresh |
| `[LocalMusic]` | localMusicService — device music scanning |
| `[LibraryScreen]` | Library screen state, enable/diagnostics flow |
| `[AudioPlayer]` | audioPlayer — playback engine |
| `[Player]` | PlayerScreen interactions |
| `[Queue]` | Queue reordering/management |
| `[GoogleDrive]` | Google Drive OAuth + file listing |
| `[SpotifyImport]` | Spotify link parsing + Jamendo matching |
| `[Lyrics]` | LRCLIB lyrics fetching |
| `[Network]` | Connectivity change detection |
| `[Jamendo]` | Jamendo API calls |

When adding new logging, reuse an existing tag if the code belongs to that
module, or add a new short PascalCase tag and document it here.

---

## Other useful commands

```bash
# Install dependencies after package.json changes
bun install

# Start Metro with cache clear (required after .env changes)
bun run start --clear

# Run on connected Android device
bun run android

# Version bump
bun run release:patch   # or :minor / :major
```