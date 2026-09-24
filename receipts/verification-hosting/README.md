# Hosting verification

On 24 September 2026 the owner asked to host Far Door on a new VM under a `rapidoai.dev` subdomain, in their existing infrastructure, with analytics in their existing Umami. It is live at <https://fardoor.rapidoai.dev/>. It is a hosted prototype, not a jam entry. The private deployment notes (machines, routing, certificate, analytics registration) stay outside this repository.

## What is served

The `game/` folder of commit `cd00160ce4055b21e1d461dff1bbfc6eb1f6b4af`, packed with `git archive` after the recipe's ship check: 115 files, 790 KB compressed. Files are revalidated by ETag on every load (`Cache-Control: no-cache`), so a new release never mixes with cached modules.

## Checks against the public URL

- **HTTPS:** 200 with HSTS and no Server header; plain HTTP answers 301 to the same path and query over HTTPS. The Let's Encrypt certificate is valid until 23 December 2026 and a renewal dry run passed.
- **Files:** `main.js` served compressed as `text/javascript`; an ETag revalidation answers 304.
- **Analytics routes:** the tracker script answers 200; any other `/analytics/` path, and a collection request without the game's origin and headers, answer 404.
- **A real pageview:** a browser with a desktop user agent loaded `/?probe=1#section`. The collection request was accepted, and the stored visit carries the path `/` with no query, no hash and no referrer, titled Far Door. Headless browsers are refused by Umami's bot filter, so automated runs record nothing.
- **The whole game:** `node scripts/playthrough.mjs outputs/public --url='https://fardoor.rapidoai.dev/?nolock=1'` played from the title through the three levels to the credits and back, with no page or console error and no shader compiled in play (126 programs at the first start and at the end) ([log](playthrough/log.json), [the isles](playthrough/22-isles-bridge.png), [credits](playthrough/27-credits.png)). The public page was ready 1.6 s after navigation.

## Privacy

`game/analytics.js` runs only on `fardoor.rapidoai.dev`. It respects Do Not Track, Global Privacy Control and Umami's own opt-out, and reports the page alone: no search, hash, detailed referrer, custom event or identifier. Session recording is off.

## Limits

These runs used headless Chrome on a desktop viewport. The game has no touch controls, so a phone cannot play it; a physical-device test, pointer lock and a gamepad remain to be checked by hand.
