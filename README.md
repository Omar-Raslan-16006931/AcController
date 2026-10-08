<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12&height=200&section=header&text=AcController&fontSize=56&fontColor=ffffff&fontAlignY=36&desc=Smart%20AC%20control%20with%20a%20Raspberry%20Pi%2C%20IR%20and%20a%20React%20app&descSize=16&descAlignY=58&animation=fadeIn" width="100%" alt="AcController"/>

<a href="https://ac-controller-ten.vercel.app"><img src="https://img.shields.io/badge/Live%20Demo-Visit-22c55e?style=for-the-badge&logo=vercel&logoColor=white" alt="Live demo"/></a>
<img src="https://img.shields.io/github/last-commit/Omar-Raslan-16006931/AcController?style=for-the-badge&color=6366f1" alt="Last commit"/>
<img src="https://img.shields.io/github/languages/top/Omar-Raslan-16006931/AcController?style=for-the-badge&color=0ea5e9" alt="Top language"/>

<br/><br/>

<img src="https://skillicons.dev/icons?i=react,ts,vite,tailwind,python,fastapi,supabase,raspberrypi,githubactions,vercel&theme=dark" alt="Tech stack"/>

</div>

---

A smart controller for a Carrier air conditioner. A Raspberry Pi sends IR signals to the AC, and you control it from a web app or an iPhone app.


```
React app (Vercel)  →  HTTPS  →  FastAPI on Raspberry Pi  →  IR LED (GPIO17)  →  AC
```

## ✨ Features

- **Remote control:** power, mode, fan speed, swing and temperature, with a custom temperature dial
- **Schedules and timers** run by a background worker on the Pi
- **Usage dashboard:** daily and weekly runtime charts and estimated energy cost
- **AC detection:** brute-forces the brand/protocol from a library of 116+ captured IR codes
- **IR learning:** record buttons from any remote with an IR receiver and replay them
- **Tuya / Smart Life IR blaster** support as an alternative to the Pi's own IR LED
- **Siri / iOS Shortcuts API** with API-key auth
- **iOS app:** Capacitor shell, Live Activity / Dynamic Island and a home-screen widget, built as an unsigned IPA by GitHub Actions
- **Auth:** Supabase login with passkeys; the backend verifies Supabase JWTs (HS256 or JWKS)
- **Wi-Fi fallback:** setup page and watchdog so the Pi can recover when the network changes

## 🛠️ Tech stack

| Part | Tech |
| --- | --- |
| Frontend | React 19, Vite, TypeScript, Tailwind, shadcn/ui, TanStack Query, Framer Motion |
| Backend | Python, FastAPI, Pydantic, APScheduler, psutil, `ir-ctl` |
| Data / auth | Supabase (Postgres + RLS, Auth, passkeys) |
| Hardware | Raspberry Pi Zero 2 W, IR LED + transistor, optional TSOP38238 receiver |
| Infra | Vercel, Cloudflare Tunnel / Tailscale, systemd, GitHub Actions |

## 📁 Project structure

```
frontend/   React web app (also wrapped as the iOS app)
backend/    FastAPI service that runs on the Pi
database/   Supabase schema and RLS policies
docs/       Deployment, iOS, IR learning, AC detection, Tuya, Wi-Fi fallback
```

## 🚀 Getting started

```bash
# Frontend
cd frontend
npm install
cp .env.example .env.local   # Supabase URL/key + backend URL
npm run dev

# Backend (on the Pi)
cd backend
pip install -r requirements.txt
cp .env.example .env         # Supabase + IR settings
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Full Pi setup: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). iOS build: [`docs/IOS.md`](docs/IOS.md).

---

<div align="center">

**Made with ❤️ by [Omar Raslan](https://github.com/Omar-Raslan-16006931)**

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12&height=100&section=footer" width="100%"/>

</div>
