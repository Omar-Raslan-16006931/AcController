// Same public values the website ships with (the Supabase anon key is a
// public, row-level-security-protected key; it is already in the web app's
// JavaScript). Nothing secret lives here.
module.exports = {
  SUPABASE_URL: "https://fnizzrtvlhvyymcgepdz.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaXp6cnR2bGh2eXltY2dlcGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNzY3MDIsImV4cCI6MjA5ODY1MjcwMn0.fiEzd2ySkf63TqPK-MzW1Lo1xxdarSr4FrXduGmHJxg",

  // Where the Pi's API lives. The Tailscale Funnel address never changes;
  // the Cloudflare tunnel address changes on every Pi reboot and is
  // published by the website at /pi-url.txt. Both are tried.
  STABLE_API_URL: "https://acpi.taile69735.ts.net",
  PI_URL_FILE: "https://ac-controller-ten.vercel.app/pi-url.txt",
  WEB_APP_URL: "https://ac-controller-ten.vercel.app",
}
