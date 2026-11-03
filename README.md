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

## Direct cash entries and tracked gas parts

Use **Daily cash sales** for amount-only, unnamed cash gas payments. Each payment contributes once to sales, collections and the automatic ledger, with today's direct-entry total at the bottom. The header **Cash entry** button also offers optional kg. Entries without kg do not fabricate quantities or reduce gas stock; the inventory and overview display a warning for unmeasured payments. Use Collections for recovering existing customer debt and Sales & invoices for named/credit sales.

The **Gas parts** page has Stock / quantity, Actual price & profit, and movement-history tabs. Add a part with opening quantity, cost per piece and selling price. Purchases increase stock and update the weighted-average cost. Cash part sales decrease stock, post an invoice/payment, and preserve the cost at sale time for realized gross profit. Overselling, negative prices and fractional piece counts are rejected. Gross profit excludes business expenses. Existing untracked parts invoices remain unchanged and are excluded from tracked-stock profit calculations because their purchase cost is unknown. Parts purchases are stock movements, not a supplier/payables ledger.

Existing localStorage data stays in place; new parts arrays are initialized without resetting prior sales, khata, cylinder or receipt entries. Continue using the same browser and localhost:3000 after updating.

## Money and cylinders together, date-wise cash, monthly closing

The Automatic ledger and customer khata show outstanding rupees and cylinders together. Cylinder movements appear as their own ledger rows with running quantity; linked sales are not counted twice. Negative legacy cylinder balances are labeled unmatched returns.

Daily cash sales has a date selector. Entries and the bottom total belong only to that date, and new payments use the selected date. The cash-entry dialog also has an explicit date. Historical dates are allowed, future and invalid dates are rejected. Initial selection is today's date in Asia/Karachi. Existing entries keep their original saved dates.

Monthly closing shows customer opening rupees, new-account opening adjustments, bills, received payments, closing rupees, opening cylinders, dispatched, returned, and closing cylinders. Sales and collections include anonymous cash and parts sales once. Parts gross profit only uses cost-tracked parts. Save monthly closing persists a snapshot in the existing browser data. The next month's opening is derived from all preceding activity; balances are never duplicated or reset.

Saving a closing locks new entries for that month and earlier dates that could alter the closing. To correct an entry period, reopen dependent closings in newest-to-oldest order. Current-month named sales, receipts, customers, gas stock, cylinder and parts entries also respect the lock. Reopening removes only the saved closing, not business entries. The report includes unmatched historical cylinder returns and unmeasured cash gas entries rather than assuming missing quantities.

Monthly closing is a customer receivables/cylinder reconciliation, not statutory accounts or a complete profit-and-loss report. Like other records, closing snapshots remain browser-local and are included in Export backup.
