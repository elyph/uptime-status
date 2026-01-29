# Uptime Status Page (Free)

A **zero-cost uptime monitor + public status page** powered by **GitHub Actions (cron)** and **GitHub Pages**.

- Checks configured URLs every 5 minutes  
- Tracks latency, **24h uptime**, and **p95 latency**  
- Deploys a clean public dashboard via GitHub Pages  
- Optional Discord alerts on **UP/DOWN** state changes

**Live demo:** https://elyph.github.io/uptime-status/

---

## How it works

- You list endpoints in `targets.json`.
- A scheduled GitHub Actions workflow runs every **5 minutes**.
- `monitor.js` pings each target, records results to `site/data.json`, and keeps a rolling history.
- GitHub Pages deploys the `site/` folder as a public status page.

---

## Project structure
.github/workflows/monitor-and-deploy.yml # cron + deploy pipeline
targets.json # monitored endpoints
monitor.js # checker + metrics + alerts
site/
index.html # status UI
app.js # renders cards + charts
style.css # styling
data.json # generated status data

---

## Enable Discord alerts (optional)

- Create a Discord webhook URL.
- In your GitHub repo, go to:  
  `Settings → Secrets and variables → Actions → New repository secret`
- Add a secret:
  - `Name`: `DISCORD_WEBHOOK_URL`
  - `Value`: `<your_webhook_url>`

Alerts are sent only when a target changes state:
- 🔴 `UP → DOWN`
- 🟢 `DOWN → UP`
> If the secret is not set, the monitor runs normally but sends no alerts.

---

## Configure targets

Edit `targets.json` to add/remove monitored URLs:

```json
[
  { "name": "GitHub Status", "url": "https://www.githubstatus.com/api/v2/status.json" },
  { "name": "Google 204", "url": "https://www.google.com/generate_204" }
]