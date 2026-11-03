# Latif LPG Agency

A responsive English-language LPG business application for Windows, mobile browsers and desktop browsers.

## Run

Requires Node.js 20+. Run `npm start` from the project folder; the default port is 3000 (`PORT` can override it). No runtime packages or database installation are needed.

On Windows 11, install Node.js LTS, download the GitHub ZIP, extract it, and double-click **START-APP.bat**. Keep the server window open. Refresh the browser if startup takes more than three seconds.

To update, export a backup, close the server, extract the latest ZIP and start the new folder. Use the same browser and `http://localhost:3000` to retain existing data. Do not clear browser storage.

## One workspace per task

- **Overview:** eight cards for sales, monthly revenue, active customers, gas stock, parts stock value, outstanding credit, daily expenses and empty-cylinder count, plus a dated Total daily cash panel, daily revenue trend, current stock by location and low-stock alerts. Inventory and account balances show the current position; sales, cash and expenses use the selected date. Detailed weights and transaction tables remain in their own sections. Initial demo records are retained and included in totals.
- **Sales:** Daily cash sales and Customer sales & invoices tabs. Anonymous cash entries require only an amount, with separate entries/totals for each selected date. Optional kg reduces Shop stock. Named sales support full/partial payment, credit, retail/wholesale/supply and linked cylinder movements.
- **Money & cylinder ledger:** one customer-selectable money/cylinder statement, without separate account or payment-history tabs. Customer, credit-entry, collection, due-date, reminder, CSV and print actions remain in the ledger. The selected customer summary shows money owed, cylinder sizes, last purchase date/time and elapsed time since purchase. Record other debts using Credit entry; gas invoices already post automatically and must not be manually reposted. Collections reduce debt. Statements can be printed or downloaded as CSV. Reminder drafts can be reviewed and downloaded locally; the app sends no messages.
- **Gas & inventory:** gas arrivals, plant purchase costs and all godown/location balances together. Retail draws from Shop, wholesale from Main godown and supply from Supply vehicle.
- **Cylinder tracking:** new customer dispatches and returns for 11.8, 15 and 45.5 kg capacities. The 45.4 kg option is retired from tracking; historical movements and balances remain readable, and plant calculations still accept 45.4 kg. Returns must match the same customer's outstanding size. Legacy untyped movements remain under Size not recorded. Container movements alone do not change gas kg inventory.
- **Gas parts:** stock, actual cost/selling price/profit, and movement-history tabs. Purchases increase stock; cash sales decrease it. Actual cost uses a weighted average; each sale preserves its cost for gross profit. Untracked legacy invoices remain intact without invented costs.
- **Gas calculator:** mixed plant purchases at a price per 11.8 kg unit, plus the KG/unit converter. Add cylinder quantities and actual capacities; `total kg = sum(quantity × capacity)`, `units = kg / 11.8`, and `cost = units × unit price`. For 40 × 15 kg + 10 × 45.4 kg, weight is 1,054 kg and units are 89.3220338983…; at Rs. 1,180/unit, cost is Rs. 105,400. Review and save to add purchased gas and cost to inventory. This is not a customer sale or supplier payment. 45.4 and 45.5 kg remain separate sizes.
- **Expenses:** dated operating expenses with category, payment method and note. These are separate from inventory purchases. Daily and monthly reports include them; collections after expenses is not a complete cash/bank balance or net profit.
- **Reports:** Daily report and Monthly closing tabs. Closing snapshots include opening/bills/manual credit/receipts/closing money, capacity-specific cylinder quantities and expenses. Balances carry forward by calculation without duplicate entries. Saved months and earlier dates that affect them are locked; reopen dependent closings newest first to correct a period.

## Credit and dates

Last purchase is the latest customer-linked gas or parts sale date. Collections and manual debt entries do not change it. Customers with only an opening balance have no recorded purchase date.

Due dates remain customer-account reminders, not invoice-level aging. Updating a due date does not alter the debt or saved financial closing. New credit and expense entries respect date validation and closing locks.

Amounts are rounded to two decimals. Gas unit pricing uses full intermediate precision; display rounding does not change purchase cost. Cash gas weights support 0.01 kg precision. Unmeasured cash entries retain their payments without inventing kg and are flagged in stock/reports.

## Storage and backups

Data remains in this browser's localStorage under `latif-lpg-v1`. New fields are initialized without resetting sales, customers, receipts, cylinders, parts or closing snapshots. Existing names, notes and saved records are not translated or deleted. JSON export includes the complete saved state; CSV statements contain ledger rows and running money/cylinder balances. Automated JSON restore is not implemented.

There is no authentication, server database, cross-device synchronization or automatic cloud backup. Publication/deployment is separate from running the app locally. The monthly report is a customer receivables/cylinder reconciliation, not statutory accounts or a complete profit-and-loss report.

## Validation

With the app running, Playwright installed and Chromium available at `/usr/bin/chromium`, run `npm test`. Browser tests cover the consolidated navigation, credit and recoveries, due-date context, reminder drafts, CSV statements, last purchase, expenses/reports, persistence, monthly lock/carry-forward, mixed plant purchases, gas calculations, parts costing, size-matched cylinder returns and mobile layouts. The browser dependency is only needed for tests.


## Empty cylinders and last-purchase elapsed time

Cylinder tracking includes a separate empty-cylinder inventory. Set the current physical empty count once per size (including zero), optionally entering an average tare weight read from cylinder markings. This count includes returns already received; only movements recorded after the count change it. Before all opening counts are entered, totals are explicitly partial/unknown. Existing customer cylinder history is not assumed to be current empty stock.

New customer returns marked **empty** add one linked empty-stock receipt per movement, including returns on customer sales. Uncheck the option for full/non-empty returns. Filling, sending to the plant or other removals are entered as empty stock movements and cannot exceed available quantity. These change empty stock, not gas kg or customer debt. Tare weights can be updated independently. Empty quantities and optional average tare weights persist in browser storage and backups.

Capacity (11.8 / 15 / 45.5 kg) describes nominal gas capacity, not empty-shell mass. Cylinder tracking displays capacity-wise empty counts and estimated shell mass only when tare weights and opening quantities are known; Overview shows the empty-cylinder count. Empty-shell total uses average tare per size, so it is an estimate rather than a weighed load.

The ledger shows **Time since last purchase**, refreshing every minute. Recorded purchase timestamps or local sale times support hours/minutes; date-only history explicitly says time not recorded. Manual debt entries and collections do not reset last purchase time. No old transaction is deleted when removing the 45.4 kg tracking option.


## Total daily cash

Overview and Daily cash sales use the same dated cash calculation: received cash on gas/parts/customer sales plus cash debt recoveries. Credit bill amounts, bank transfers and wallet payments are excluded. Cash expenses are shown separately; net daily cash flow equals cash receipts minus cash expenses and is not an opening-to-closing cash balance. Inventory purchase records are not assumed to be paid in cash.

New customer gas sales have an explicit payment-method selector. Older sales with no recorded payment method are counted as cash, matching the original cash-entry workflow; this assumption is shown beside the total. Existing records are not rewritten. The anonymous-entry subtotal remains separate from the total that includes all cash sales and recoveries.


## Revenue, active customers, stock alerts and closing formulas

The dashboard date selects the reporting month for monthly revenue, active customers and the daily revenue trend. Monthly revenue is gas plus parts invoice amounts, including credit sales and excluding manual debts, stock purchases and recovered debt. Active customers are unique saved customer accounts with at least one purchase in that month; anonymous sales, recoveries alone and opening balances do not count. The current-month trend ends today; past months show their full calendar. No future days are shown as zero revenue for the current month.

Stock overview uses current gas quantities by location and tracked parts quantities. Low stock alerts trigger at or below editable thresholds: default 500 kg per gas location and 5 pieces per part. Thresholds persist in browser data and backups. Unmeasured cash gas cannot reduce recorded stock.

The dashboard Monthly closing & formulas button opens the selected month's closing under Reports. Read-only equations display the actual report figures:

- Customer money: opening receivables + new customer opening adjustments + invoices/other credit − customer payments = closing receivables.
- Customer cylinders: opening quantity + dispatched − returned = closing quantity, also maintained by customer and capacity.
- Revenue: gas invoice value + parts invoice value = monthly revenue.
- Collections after expenses: all-method collections − operating expenses. This is not net profit or a closing cash/bank balance.

Existing closing save/reopen locks and balance carry-forward remain unchanged. Saved snapshots are used when a month is closed.
