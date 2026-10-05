---
name: MagiaFoot manager direction
description: Product boundaries and tone for the MagiaFoot mobile football-management game.
---

MagiaFoot is a lightweight, playable football manager in Brazilian Portuguese. Keep the green-and-lime sports identity, center the game on the player's career, and use only fictional clubs, badges, league names, and football content. The quoted product line is “Sua história. Seu clube. Sua magia.” The user cited Brasfoot as a pacing/genre reference and asked for touch-first squad management, including drag substitutions where appropriate.

**Why:** the user explicitly set these product and content boundaries.

**How to apply:** use this direction for new career, squad, tactics, match, league, transfer, finance, and stadium features; do not reintroduce the earlier real-club fixture browser.

Keep the entry screen visible while local storage hydrates. Gate career creation or replacement until saved state has loaded, and show loading feedback inside the existing screen rather than hiding the root.

**Why:** delaying the root behind asynchronous storage made the first preview appear blank; direct entry to career creation also needs protection from racing a saved career.

**How to apply:** keep the welcome and new-career routes responsive during hydration, and only enable actions that can create or replace a save after storage is ready.
