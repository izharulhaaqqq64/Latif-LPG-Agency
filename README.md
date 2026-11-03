# Latif LPG Agency

A responsive LPG business management application. Start with `npm start` (Node.js 20+), or `PORT=3001 npm start` for another port. No runtime packages or database are required.

Includes retail, wholesale and hotel/shop gas sales; separate parts sales accounting; customer khata and opening balances; credit and recoveries; gas arrivals and stock by location; cylinder arrivals and dispatch; daily reports; printable reports and invoice details; and JSON backup export.

Gas sales reduce stock at Shop (Retail), Main godown (Wholesale), or Supply vehicle (Supply). Sales exceeding location stock and payments exceeding outstanding balances are rejected. Collections reduce customer balances. Sample records are included for demonstration, and the weekly chart is explicitly sample data.

**Current storage:** browser localStorage. Entries persist across refreshes on the same browser only. This is a local prototype, with no authentication or cross-device synchronization. Do not use it as your sole accounting record. Export backups through the application. Multi-user production use requires a backend database, authentication, backups, and audit controls.

## Windows 11

Install Node.js LTS from https://nodejs.org. On GitHub, choose Code > Download ZIP, then extract all files. Open the extracted project folder and double-click START-APP.bat. Keep the Latif LPG Server window open. The app opens in your browser; refresh if startup takes longer than three seconds. No npm install is needed.

## Browser validation

With Playwright installed and Chromium available at `/usr/bin/chromium`, start the server, then run `node tests/browser.cjs`. This checks a credit sale, balance calculation, recovery, persistence, all main pages, mobile overflow, and JavaScript errors. The browser dependency is only needed for testing.

## Daily sale, automatic ledger, and cylinder quantities

Daily sales show quantity, rate, received amount, live bill total and credit balance. Use **Poora cash** or **Poora udhaar**; wholesale, supply, parts, and cylinder counts are in the expandable options. Parts labels change to pieces automatically.

The **Automatic ledger** page derives debits, credits and running balances from opening balances, sales, sale payments, and recoveries; no duplicate manual posting is needed. Select a customer for their own ledger. All-customer mode shows the combined running balance.

**Cylinder tracking** shows customer-wise sent, returned, and outstanding quantities plus movement history. Sales can record both dispatches and returns linked to the invoice. Cylinders are whole quantities, separate from gas kg. Returns above the customer's available quantity are rejected; legacy unmatched returns remain visible for reconciliation. This tracks cylinders held by customers, not total agency-owned inventory.

To update an existing Windows installation, export a backup first, close the old server, download and extract the latest GitHub ZIP, and launch START-APP.bat from the new folder. Use the same browser and http://localhost:3000 to retain existing browser data. Do not clear browser storage. Existing data is kept under the same localStorage key. JSON export is a backup file; automated restore is not implemented.
