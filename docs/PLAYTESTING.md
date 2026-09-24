# Playtesting Slime Queen on Android

Two ways to get it on a phone. The PWA takes thirty seconds and needs nothing
installed; the APK is a real Android app you sideload.

---

## Option 1 — Install the PWA (fastest)

The deployed site is now an installable app: it has a manifest, an icon set and
an offline service worker, so once installed it launches from the home screen
with no browser chrome and works with no connection.

1. Open the Vercel URL in **Chrome on Android**.
2. Tap the **⋮** menu → **Add to Home screen** (Chrome may also show an
   "Install app" prompt on its own).
3. Confirm. It appears in the launcher as **Slime Queen** with its own icon.

It runs fullscreen, portrait-locked, keeps its own storage, and survives going
offline. This is genuinely how a player would hold it.

**Updating:** it updates itself on next launch when a new build deploys. To
force it, long-press the icon → App info → Storage → Clear cache.

---

## Option 2 — Install the APK

### Getting the APK

Every push builds one in CI, because GitHub's runners have the Android SDK.

**From a build:**
1. Go to the repo's **Actions** tab → the **Android APK** run for your commit.
2. Download the **hive-queen-apk** artifact (a zip containing the `.apk`).

**From a release** — easier on a phone, since it's a direct link:
```bash
git tag v0.1.0 && git push origin v0.1.0
```
The workflow attaches the APK to a GitHub Release. Open that release page on the
phone and tap the `.apk` to download it.

### Installing it

1. Tap the downloaded `.apk` (Files app → Downloads).
2. Android will say the source isn't allowed. Tap **Settings** on that prompt and
   enable **Allow from this source** for whichever app you downloaded with
   (Chrome, or Files). Then go back and tap the APK again.
3. Play Protect may warn that it doesn't recognise the app — this is expected for
   an unsigned-by-Google build. Tap **Install anyway**.

### Updating

Sideloaded APKs only install over an existing copy if the **versionCode goes
up**. Before cutting a new playtest build, bump it in
`android/app/build.gradle`:

```gradle
versionCode 2          // must increase every time
versionName "0.2.0"    // cosmetic, shown in app info
```

Otherwise Android refuses with "App not installed". Alternatively, uninstall
first — but that **wipes the save**, which is usually the opposite of what you
want mid-playtest.

---

## Building the APK locally

Only needed if you want a build without pushing. Requires Android Studio (for the
SDK) and a JDK 21.

```bash
npm run android:apk
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Or to open it in Android Studio and run on a device/emulator directly:

```bash
npm run android:open
```

`npm run android:sync` rebuilds the web bundle and copies it into the native
project — run it after any source change, since the APK embeds a *snapshot* of
`build/`.

> **Note:** the container this was set up in cannot reach `dl.google.com`, so it
> could scaffold the Android project but never compile it. That is why the build
> lives in CI. Nothing about the project requires that — on a normal machine
> `npm run android:apk` works.

---

## Where the save lives

`localStorage`, under the key `hive_queen_save_v4`.

The three installs are **three separate saves** — the PWA, the APK, and the
browser tab each get their own storage. Testing progression in one does not
carry to the others.

There is no save migration (see design doc §18), so a build that changes the
state shape starts fresh. For playtesting that is usually what you want.

There is also no in-app export yet. To pull a save off a device for inspection,
use Chrome remote debugging (`chrome://inspect` on a desktop with the phone on
USB debugging) and read the key from the console:

```js
copy(localStorage.getItem('hive_queen_save_v4'))
```

## Regenerating icons

Everything derives from `assets/icon.svg`:

```bash
npm run icons
```

Writes the PWA set, the favicon, and the Android launcher / round / adaptive /
splash images. Edit the SVG, re-run, commit.
