# IPTVCloud.app EPG Branch

A dedicated branch for managing and generating Electronic Program Guide (EPG) data for **IPTVCloud.app**.

This repository branch is focused on automated EPG processing, source synchronization, scheduled updates, and output generation for IPTV players, streaming panels, and XMLTV-compatible systems.

For sites content path, I recommend to use this as your guide for the API Guide. This repository is synced everyday at 00:00 UTC by cron workers. The estimated synchronous time will be 3h every run.

```sh
https://reinfyteam.github.io/IPTVCloud.app/content.json
```

## ✨ Features

- 📺 Automated EPG generation
- 🔄 Scheduled updates via GitHub Actions
- 🌍 Multi-source EPG scraping / syncing
- 🗂 Organized per-site or per-country outputs
- ⚡ Optimized XMLTV delivery
- 🧩 Easy integration with IPTV apps & players
- 🛠 Extendable scripts for custom providers
