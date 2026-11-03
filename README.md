# Latif LPG Agency

A responsive English-language LPG business application for Windows, mobile browsers and desktop browsers.

## Run

Requires Node.js 20+. Run `npm start` from the project folder; the default port is 3000 (`PORT` can override it). No runtime packages or database installation are needed.

On Windows 11, install Node.js LTS, download the GitHub ZIP, extract it, and double-click **START-APP.bat**. Keep the server window open. Refresh the browser if startup takes more than three seconds.

To update, export a backup, close the server, extract the latest ZIP and start the new folder. Use the same browser and `http://localhost:3000` to retain existing data. Do not clear browser storage.

## One workspace per task

- **Overview:** current sales, collections, outstanding credit, stock and a real seven-day sales chart derived from saved entries. Initial demo records are retained and included in totals.
- **Sales:** Daily cash sales and Customer sales & invoices tabs. Anonymous cash entries require only an amount, with separate entries/totals for each selected date. Optional kg reduces Shop stock. Named sales support full/partial payment, credit, retail/wholesale/supply and linked cylinder movements.
- **Credit book:** Accounts & outstanding, Money & cylinder ledger, and Payments & recoveries tabs. Customers, ledger and collections share one workspace rather than duplicate sidebar pages. Accounts show outstanding money, cylinder sizes, last recorded purchase, due date and overdue status. Record other debts using Credit entry; gas invoices already post automatically and must not be manually reposted. Collections reduce debt. Statements can be printed or downloaded as CSV. Reminder drafts can be reviewed and downloaded locally; the app sends no messages.
- **Gas & inventory:** gas arrivals, plant purchase costs and all godown/location balances together. Retail draws from Shop, wholesale from Main godown and supply from Supply vehicle.
- **Cylinder tracking:** customer dispatches, returns and balances for 11.8, 15, 45.4 and 45.5 kg capacities. Returns must match the same customer's outstanding size. Legacy untyped movements remain under Size not recorded. Container movements alone do not change gas kg inventory.
- **Gas parts:** stock, actual cost/selling price/profit, and movement-history tabs. Purchases increase stock; cash sales decrease it. Actual cost uses a weighted average; each sale preserves its cost for gross profit. Untracked legacy invoices remain intact without invented costs.
- **Gas calculator:** mixed plant purchases at a price per 11.8 kg unit, plus the KG/unit converter. Add cylinder quantities and actual capacities; `total kg = sum(quantity × capacity)`, `units = kg / 11.8`, and `cost = units × unit price`. For 40 × 15 kg + 10 × 45.4 kg, weight is 1,054 kg and units are 89.3220338983…; at Rs. 1,180/unit, cost is Rs. 105,400. Review and save to add purchased gas and cost to inventory. This is not a customer sale or supplier payment. 45.4 and 45.5 kg remain separate sizes.
- **Expenses:** dated operating expenses with category, payment method and note. These are separate from inventory purchases. Daily and monthly reports include them; collections after expenses is not a complete cash/bank balance or net profit.
- **Reports:** Daily report and Monthly closing tabs. Closing snapshots include opening/bills/manual credit/receipts/closing money, capacity-specific cylinder quantities and expenses. Balances carry forward by calculation without duplicate entries. Saved months and earlier dates that affect them are locked; reopen dependent closings newest first to correct a period.

## Credit and dates

Last purchase is the latest customer-linked gas or parts sale date. Collections and manual debt entries do not change it. Customers with only an opening balance have no recorded purchase date.

Due dates apply to the current customer account balance, not invoice-level aging. Updating a due date does not alter the debt or saved financial closing. New credit and expense entries respect date validation and closing locks.

Amounts are rounded to two decimals. Gas unit pricing uses full intermediate precision; display rounding does not change purchase cost. Cash gas weights support 0.01 kg precision. Unmeasured cash entries retain their payments without inventing kg and are flagged in stock/reports.

## Storage and backups

Data remains in this browser's localStorage under `latif-lpg-v1`. New fields are initialized without resetting sales, customers, receipts, cylinders, parts or closing snapshots. Existing names, notes and saved records are not translated or deleted. JSON export includes the complete saved state; CSV statements contain ledger rows and running money/cylinder balances. Automated JSON restore is not implemented.

There is no authentication, server database, cross-device synchronization or automatic cloud backup. Publication/deployment is separate from running the app locally. The monthly report is a customer receivables/cylinder reconciliation, not statutory accounts or a complete profit-and-loss report.

## Validation

With the app running, Playwright installed and Chromium available at `/usr/bin/chromium`, run `npm test`. Browser tests cover the consolidated navigation, credit and recoveries, overdue accounts, reminder drafts, CSV statements, last purchase, expenses/reports, persistence, monthly lock/carry-forward, mixed plant purchases, gas calculations, parts costing, size-matched cylinder returns and mobile layouts. The browser dependency is only needed for tests.
