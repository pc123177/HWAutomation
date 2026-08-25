# HackerWars Automator

> **Unlike HExbot, which scraped and collected your data, this extension has no sockets. It doesn't even have hardcoded IP addresses or accounts in it.**
>
> The only hardcoded data is the preset names/sizes for the Spam, Warez, and Miner infection buttons:
>
> - **Spam**: `Super Spam.vspam` 1gb, `Advanced Spam.vspam` 236mb, `Decent Spam.vspam` 36mb
> - **Warez**: `Super Warez.vwarez` 1gb, `Advanced Warez.vwarez` 236mb, `Decent Warez.vwarez` 36mb
> - **Miner**: `Super Miner.vminer` 1.7gb, `Advanced Miner.vminer` 413mb, `Decent Miner.vminer` 63mb

A manual-trigger browser extension (Manifest V3) that automates repetitive tasks in [hackerwars.io](https://hackerwars.io), a hacking-themed browser game. It adds an on-page overlay with start/stop controls for each automation; nothing runs until you trigger it.

The source is commented and named in Chinese throughout (a deliberate style choice for this repo) — module/feature names shown in the popup UI, in-game proper nouns (bank names, virus/file names), and anything that has to literally match text on the actual English-language game site are kept in English; everything else (identifiers, comments, on-screen labels/messages) is Chinese.

## Features

| Module | What it does |
| --- | --- |
| `missions.js` | Auto-accepts and completes missions (delete/steal software, bank checks, transfers) by priority. |
| `infection2.js` | Buys/installs viruses (and an optional second file installed after the main one) against target IPs, handling disk space, RAM, and duplicate-install errors. |
| `research.js` | Cycles through research pages/processes with randomized delays to look organic; supports multiple loops per run. |
| `puzzle.js` | Answers in-game riddles/puzzles from a known answer table. |
| `masshack.js` | Walks a queue of target IPs and hacks each one in turn. |
| `repkill.js` | Finds and runs "destroy server" / "delete software" / "steal software" / "transfer money" / "check bank status" missions for reputation. |
| `collect.js` | Collects accumulated in-game money on a timer and clears the log afterward. |
| `softwareGather.js` | Scans the currently connected server for downloadable software and records it. |
| `logs.js` | Scrapes IP addresses out of the in-game log viewer for later use (e.g. by masshack), and can watch/monitor a log on a fast reload loop. |
| `overlay.js` / `content.js` | Injects and wires up the floating control card shown on the game page. |
| `popup.html` / `popup.js` | Extension popup UI for configuring and toggling automations. |
| `background.js` | Service worker handling scheduling (`alarms`), a background own-log intrusion monitor, and cross-tab state. |
| `shared.js` | Common helpers (element finders, step-runner engine, etc.) used across modules. |

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions` (or the equivalent in your Chromium-based browser).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder.
5. Navigate to [hackerwars.io](https://hackerwars.io) and use the overlay card or the extension popup to start/stop individual automations.

## Permissions

Declared in [manifest.json](manifest.json): `activeTab`, `scripting`, `storage`, `downloads`, `alarms`, and host access limited to `https://hackerwars.io/*`.

## Changelog

### Unreleased

_Nothing yet._

### 2.2.0

**Added**

- New `infection2.js` module (replaces `ddos.js`): resolves upload links via a configured Download Center once and caches them, supports an optional single second file installed *after* the main virus on each target (tracked separately, so a target still counts as infected if only that second install fails), and an optional Download Center folder as a second link source. Once the whole target list is done, its own `/log` is fully cleared (`ddos.js` just stopped).
- `research.js`: research target is now picked live from the university page's own list by name, instead of only resuming a stored URL. Multiple research loops can now run from one Start. An optional idle-income collection can run before each loop's log clear. The account's own `/log` is now cleared every loop.
- `repkill.js`: now also grabs "Transfer Money" / "Check Bank Status" missions, in addition to Destroy Server / Delete Software / Steal Software.
- `masshack.js`: a stale/changed target IP's 404 page is now detected and skipped immediately instead of waiting out the full timeout.
- `background.js`: a background own-log monitor that polls `/log` directly from the service worker (no tab has to sit on the page) and badges the toolbar on a genuine intrusion line.

**Changed**

- `missions.js` / `puzzle.js` / `masshack.js`: the hack sequence now navigates straight to the bruteforce method URL instead of clicking through the hack menu first.
- Every module now navigates directly to `internet?view=logout` to log out, instead of finding and clicking a logout element.
- Popup UI: menu reorganized into submenus; the panic "Stop All" button now shows a live list of what's actually running; several panels' explanatory notes were trimmed down to one short sentence each.

**Fixed**

- `research.js`: the "find the Complete link on /processes" step is now scoped to the entry whose description mentions "research" — the old version could click an unrelated already-finished process and mark research done while it was still actually counting down.
- `research.js`: a submission that completes with no countdown at all is now handled, instead of polling forever for a countdown that was never coming.
- `research.js`: the long browse-and-wait loop between research pages no longer uses an in-page timer that could stall in a backgrounded tab overnight — it's routed through `chrome.alarms` instead.
- `overlay.js`: `popup.html` is now fetched with `cache: "no-store"` — a stale cached copy after an extension reload no longer breaks the injected card.
- `background.js`: the own-log intrusion check now matches specifically on a root-login line instead of "anything not localhost-prefixed", which could misflag routine income-report log lines as intrusions.
- `infection2.js`: log-clear submissions (per-target and the final own-log wipe) now wait for the save to actually finish before logging out — previously the runner could navigate away mid-save.

### 2.1.0 and earlier

Baseline release. Version history prior to 2.1.0 was not tracked in this document. Functionality at this point covered the modules listed under Features above: missions, DDoS, research, puzzle solving, mass hacking, collection, Rep Kill, software gathering, log scraping, and the popup/overlay UI.

## Disclaimer

This tool interacts with a third-party game. Use at your own risk with respect to that game's terms of service.
