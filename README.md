# Latif LPG Agency

A responsive LPG business management application. Start with `npm start` (Node.js 20+), or `PORT=3001 npm start` for another port. No runtime packages or database are required.

Includes retail, wholesale and hotel/shop gas sales; separate parts sales accounting; customer khata and opening balances; credit and recoveries; gas arrivals and stock by location; cylinder arrivals and dispatch; daily reports; printable reports and invoice details; and JSON backup export.

Gas sales reduce stock at Shop (Retail), Main godown (Wholesale), or Supply vehicle (Supply). Sales exceeding location stock and payments exceeding outstanding balances are rejected. Collections reduce customer balances. Sample records are included for demonstration, and the weekly chart is explicitly sample data.

**Current storage:** browser localStorage. Entries persist across refreshes on the same browser only. This is a local prototype, with no authentication or cross-device synchronization. Do not use it as your sole accounting record. Export backups through the application. Multi-user production use requires a backend database, authentication, backups, and audit controls.

## Windows 11

Install Node.js LTS from https://nodejs.org. On GitHub, choose Code > Download ZIP, then extract all files. Open the extracted project folder and double-click START-APP.bat. Keep the Latif LPG Server window open. The app opens in your browser; refresh if startup takes longer than three seconds. No npm install is needed.

## Browser validation

With Playwright installed and Chromium available at `/usr/bin/chromium`, start the server, then run `node tests/browser.cjs`. This checks a credit sale, balance calculation, recovery, persistence, all main pages, mobile overflow, and JavaScript errors. The browser dependency is only needed for testing.
