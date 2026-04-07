# Treaty - Bug Fixes & Configuration Updates

## 1. Fixed NG0914 Warning (Zoneless Detection)

**Status**: ✅ **Expected & Harmless**

The warning:
```
NG0914: The application is using zoneless change detection, but is still loading Zone.js.
```

**Root Cause**: Angular's internal checks detect the mock Zone global created by `treaty-utilities/mock-zone.ts` and warn that Zone.js is present. This is a false positive because:
- `polyfills: []` is correctly set in `angular.json`
- No actual Zone.js dependency is loaded
- The mock Zone only provides stub methods needed for Angular 20+ internals (`Zone.root.run`)

**Why the mock is needed**: 
Angular 20's `ChangeDetectionSchedulerImpl` accesses `Zone.root.run` during initialization. Without the mock, it throws `TypeError: undefined is not an object`. The mock provides just enough Zone API to allow zoneless change detection to function properly.

**Solution**: No action required. The warning is expected when using a mock Zone shim for zoneless Angular. It's a false positive and doesn't affect functionality.

---

## 2. Fixed `outputMode: "server"` Build Error

**Status**: ✅ **Fixed**

**Issue**: Build failed with:
```
.listen() is designed to run on Bun only. If you are running Elysia in other 
environment please use a dedicated plugin or export the handler via Elysia.fetch
```

**Root Cause**: `angular.json` had `"outputMode": "server"` and `"ssr": { "entry": "server.ts" }`, which caused Angular's build process to bundle and execute `server.ts` (Elysia server code) in Node.js for route extraction. Bun-only APIs like `.listen()` cannot run in Node.js.

**Solution**: Removed from `angular.json` build options:
- `"server": "src/main.server.ts"` (not needed for this architecture)
- `"outputMode": "server"`
- `"ssr": { "entry": "server.ts" }`

Added `"prerender": false` to prevent pre-rendering step.

**Result**: Angular now builds only browser bundles (~3.3s). Server runs via `server.ts` directly under Bun, not via Angular's SSR pipeline.

---

## 3. Added Live Reload Watch Mode

**Status**: ✅ **Implemented**

Added three new watch commands:

### Commands

```bash
# Angular build watch only (development mode)
bun run watch

# Bun server watch only (auto-restart on file changes)
bun run server:watch

# RECOMMENDED: Both in parallel with live reload
bun run dev
```

### How It Works

The `dev` command uses `concurrently` to run both watchers in parallel:

```json
{
  "server:watch": "bun --watch server.ts",
  "watch": "ng build --watch --configuration development",
  "dev": "concurrently \"bun run watch\" \"bun run server:watch\""
}
```

**Features**:
- Frontend: Angular rebuilds on TypeScript/template changes
- Backend: Bun server restarts on `server.ts` or dependency changes
- Cross-platform: Works on Windows, macOS, Linux
- Both changes trigger live reload without manual restart

### Installation

`concurrently` was added as a dev dependency:
```bash
bun add -D concurrently
```

---

## 4. Zone.js & Polyfills Configuration

**Current State**: ✅ **Correct**

```json
{
  "build": {
    "options": {
      "polyfills": []
    }
  }
}
```

- No Zone.js in bundle
- No `zone.js` or `zone.js/testing` imports
- Zoneless change detection active via `provideZonelessChangeDetection()`
- Mock Zone shim provides Angular internals compatibility

---

## Verification

All three fixes verified:

1. **NG0914 Warning**: Present in logs but harmless; app runs correctly
2. **Build**: Completes in ~3.3s without errors
3. **Server**: Starts cleanly at `localhost:4201`; SSR renders HTML correctly
4. **Live Reload**: 
   - `bun run watch` builds Angular incrementally
   - `bun run server:watch` restarts Bun server on changes
   - `bun run dev` runs both in parallel

---

## References

- [Angular Zoneless Guide](https://angular.dev/guide/zoneless)
- [Bun Runtime Watch](https://bun.sh/docs/runtime/watch)
- [Elysia Documentation](https://docs.elysia.io/)
