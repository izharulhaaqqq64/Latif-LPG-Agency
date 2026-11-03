# Latif LPG Agency

A responsive English-language LPG business application for Windows, mobile browsers and desktop browsers.

## Run

Requires Node.js 20+. Run `npm start` from the project folder; the default port is 3000 (`PORT` can override it). No runtime packages or database installation are needed.

On Windows 11, install Node.js LTS, download the GitHub ZIP, extract it, and double-click **START-APP.bat**. Keep the server window open. Refresh the browser if startup takes more than three seconds.

To update, export a backup, close the server, extract the latest ZIP and start the new folder. Use the same browser and `http://localhost:3000` to retain existing data. Do not clear browser storage.

## One workspace per task

- **Overview:** eight cards for sales, monthly revenue, active customers, gas stock, parts stock value, outstanding credit, daily expenses and empty-cylinder count, plus a dated Total daily cash panel, month-by-month revenue trend, cylinder-wise full stock and low-stock alerts. Inventory and account balances show the current position; sales, cash and expenses use the selected date. Detailed weights and transaction tables remain in their own sections. Initial demo records are retained and included in totals.
- **Sales:** Daily cash sales and Customer sales & invoices tabs. Anonymous cash entries require only an amount, with separate entries/totals for each selected date. Optional kg reduces Shop stock. Named sales support full/partial payment, credit, retail/wholesale/supply and linked cylinder movements.
- **Money & cylinder ledger:** one customer-selectable money/cylinder statement, without separate account or payment-history tabs. Customer, credit-entry, collection, due-date, reminder, CSV and print actions remain in the ledger. The selected customer statement retains cylinder sizes, last purchase date/time and elapsed purchase time. Monetary summaries show total debit and total credit only. Record other debts using Credit entry; gas invoices already post automatically and must not be manually reposted. Collections reduce debt. Statements can be printed or downloaded as CSV. Reminder drafts can be reviewed and downloaded locally; the app sends no messages.
- **Gas & inventory:** full-cylinder counts for 11.8, 15 and 45.4 kg, measured gas kg, receipt breakdowns and purchase costs. Retail draws from Shop, wholesale from Main godown and supply from Supply vehicle.
- **Supplier credit:** a separate supplier purchase/payment ledger for gas and parts bought on debt.
- **Cylinder tracking:** new customer dispatches and returns for 11.8, 15 and 45.5 kg capacities. The 45.4 kg option is retired from tracking; historical movements and balances remain readable, and plant calculations still accept 45.4 kg. Returns must match the same customer's outstanding size. Legacy untyped movements remain under Size not recorded. Container movements alone do not change gas kg inventory.
- **Gas parts:** stock, actual cost/selling price/profit, and movement-history tabs. Purchases increase stock; cash sales decrease it. Actual cost uses a weighted average; each sale preserves its cost for gross profit. Untracked legacy invoices remain intact without invented costs.
- **Gas calculator:** mixed plant purchases at a price per 11.8 kg unit, plus the KG/unit converter. Add cylinder quantities and actual capacities; `total kg = sum(quantity × capacity)`, `units = kg / 11.8`, and `cost = units × unit price`. For 40 × 15 kg + 10 × 45.4 kg, weight is 1,054 kg and units are 89.3220338983…; at Rs. 1,180/unit, cost is Rs. 105,400. Review and save to add purchased gas and cost to inventory. This is not a customer sale or supplier payment. 45.4 and 45.5 kg remain separate sizes.
- **Expenses:** dated operating expenses with category, payment method and note. These are separate from inventory purchases. Daily and monthly reports include them; collections after expenses is not a complete cash/bank balance or net profit.
- **Reports:** Daily report, Daily closing, Weekly closing and Monthly closing tabs. Closing snapshots include opening/bills/manual credit/receipts/closing money, capacity-specific cylinder quantities and expenses. Balances carry forward by calculation without duplicate entries. Saved months and earlier dates that affect them are locked; reopen dependent closings newest first to correct a period.

## Credit and dates

Last purchase is the latest customer-linked gas or parts sale date. Collections and manual debt entries do not change it. Customers with only an opening balance have no recorded purchase date.

Due dates remain customer-account reminders, not invoice-level aging. Updating a due date does not alter the debt or saved financial closing. New credit and expense entries respect date validation and closing locks.

Amounts are rounded to two decimals. Gas unit pricing uses full intermediate precision; display rounding does not change purchase cost. Cash gas weights support 0.01 kg precision. Unmeasured cash entries retain their payments without inventing kg and are flagged in stock/reports.

## Storage and backups

Data remains in this browser's localStorage under `latif-lpg-v1`. New fields are initialized without resetting sales, customers, receipts, cylinders, parts or closing snapshots. Existing names, notes and saved records are not translated or deleted. JSON export includes the complete saved state; CSV statements contain ledger rows and running money/cylinder balances. Use **Save backup** to download a complete JSON backup. **Open backup** accepts current backups and older raw-state exports (up to 10 MB), validates the records and shows a preview. **Restore backup** replaces the current browser records only after confirmation; save your current backup first. A safety copy of the previous browser data is also retained locally under `latif-lpg-before-open`. Invalid files do not change current records.

There is no authentication, server database, cross-device synchronization or automatic cloud backup. Publication/deployment is separate from running the app locally. The monthly report reconciles customer/inventory records and calculates net profit when recorded costs are complete. It is not statutory accounts; expenses and costs not entered in the app cannot be included.

## Validation

With the app running, Playwright installed and Chromium available at `/usr/bin/chromium`, run `npm test`. Browser tests cover the consolidated navigation, credit and recoveries, due-date context, reminder drafts, CSV statements, last purchase, expenses/reports, persistence, monthly lock/carry-forward, mixed plant purchases, gas calculations, parts costing, size-matched cylinder returns and mobile layouts. The browser dependency is only needed for tests.


## Empty cylinders and last-purchase elapsed time

Cylinder tracking includes a separate empty-cylinder inventory. Set the current physical empty count once per size (including zero), optionally entering an average tare weight read from cylinder markings. This count includes returns already received; only movements recorded after the count change it. Before all opening counts are entered, totals are explicitly partial/unknown. Existing customer cylinder history is not assumed to be current empty stock.

New customer returns marked **empty** add one linked empty-stock receipt per movement, including returns on customer sales. Uncheck the option for full/non-empty returns. Filling, sending to the plant or other removals are entered as empty stock movements and cannot exceed available quantity. These change empty stock, not gas kg or customer debt. Tare weights can be updated independently. Empty quantities and optional average tare weights persist in browser storage and backups.

Capacity (11.8 / 15 / 45.4 kg, with existing 45.5 kg records preserved) describes nominal gas capacity, not empty-shell mass. Cylinder tracking displays capacity-wise empty counts and estimated shell mass only when tare weights and opening quantities are known; Overview shows the empty-cylinder count. Empty-shell total uses average tare per size, so it is an estimate rather than a weighed load.

The ledger shows **Time since last purchase**, refreshing every minute. Recorded purchase timestamps or local sale times support hours/minutes; date-only history explicitly says time not recorded. Manual debt entries and collections do not reset last purchase time. No old transaction is deleted when removing the 45.4 kg tracking option.


## Total daily cash

Overview and Daily cash sales use the same dated cash calculation: received cash on gas/parts/customer sales plus cash debt recoveries. Credit bill amounts, bank transfers and wallet payments are excluded. Cash expenses are shown separately; net daily cash flow deducts cash operating expenses and explicitly recorded supplier cash payments. It is not an opening-to-closing cash balance. Inventory purchases without a recorded payment are not assumed paid.

New customer gas sales have an explicit payment-method selector. Older sales with no recorded payment method are counted as cash, matching the original cash-entry workflow; this assumption is shown beside the total. Existing records are not rewritten. The anonymous-entry subtotal remains separate from the total that includes all cash sales and recoveries.


## Revenue, active customers, stock alerts and reports

The dashboard date selects the reporting month for monthly revenue, active customers and the month-wise revenue trend. Monthly revenue is gas plus parts invoice amounts, including credit sales and excluding manual debts, stock purchases and recovered debt. Active customers are unique saved customer accounts with at least one purchase in that month; anonymous sales, recoveries alone and opening balances do not count. The revenue trend compares monthly invoice totals for the last 12 months ending in the selected month, with month/year labels. It does not plot individual days.

Dashboard Stock overview and Low stock alerts use full-cylinder counts for 11.8, 15 and 45.4 kg. Each size has its own whole-cylinder threshold, default 5. Unknown opening counts show Not set rather than a fabricated zero. Old kg/parts alert settings remain in saved data; location gas kg and part quantities remain available in their respective inventory pages.

The dashboard Monthly closing button opens the selected month's closing under Reports. Reports show calculated results without visible formula blocks.

Existing closing save/reopen locks and balance carry-forward remain unchanged. Saved snapshots are used when a month is closed.


## Daily, weekly and monthly closing

All three closing periods use the same recorded-transaction calculation. Daily closing covers one date, weekly closing runs Monday–Sunday (including weeks crossing a month/year), and monthly closing covers a calendar month. Each report derives opening balances from earlier records, activity from records inside the period, and calculated closing balances. Money and customer-cylinder balances carry forward without creating duplicate entries.

Reports include invoice revenue, collections, operating expenses, customer receivables/cylinders, recorded gas opening/arrivals/sales/closing, and cash receipts/expenses/net flow. Unknown gas weights remain unmeasured. Cash net flow excludes opening cash and unrecorded inventory payments and is not a closing till balance or net profit.

Saving a period persists its snapshot in the existing browser data and locks entries through its end, including earlier dates that could change its opening. A period in progress may be incomplete; saving it freezes further entry until reopened. Reopen later dependent daily/weekly/monthly closings before earlier ones. Existing monthly snapshots are preserved; new financial summary values absent from older snapshots are marked unrecorded instead of invented.

The ledger totals show debit (opening balances + invoices/other credit) and credit (payments received). Running balances remain in the rows. CSV export includes a totals row. Cylinder values are quantities, not monetary asset valuations.

Cylinder tracking starts with total cylinders held by clients, summing positive balances for each customer and size. Unmatched negative legacy returns are shown separately and do not reduce another customer's physical count. Empty cylinders held at the agency remain a separate inventory.


## Combined ledger and simplified tracking

The customer ledger summary shows only **Total debit** and **Total credit** for all customers. Selected-customer totals also show only debit and credit; individual running balances, last purchase and cylinder history remain in the statement. No separate money-owed or combined-net summary card is displayed. Cylinder quantities are not converted into money without asset prices.

Cylinder tracking focuses on cylinders with clients, empties available, a customer-by-size table, and Give / Receive actions. Empty-stock setup, tare weights and movements are under **Empty stock & setup**. Movement history is collapsed but retained. No transaction is deleted by simplifying the screen.

## Monthly financial values

The monthly report shows **Gas value**, **Parts value**, **Money in market**, **Last month closing** and **Cash**, without formula blocks:

- Gas value is an estimate of recorded closing kg at the last recorded purchase cost per kg before month end. If cost is missing or quantities need reconciliation, no value is invented.
- Parts value is historical tracked stock at its recorded costs, excluding later-month movements and untracked legacy parts.
- Money in market is positive customer receivables at month end; customer credits do not reduce this figure.
- Last month closing is the previous saved net customer balance, or the equivalent opening balance derived from records if no prior snapshot exists.
- Cash is the month's recorded cash receipts less cash expenses. It also deducts explicitly recorded supplier cash payments. Opening cash and unrecorded payments are excluded, so this is not an actual till balance.

These values are frozen in new monthly closing snapshots. Older snapshots are preserved and show missing stored values as unrecorded; reopen and save to add the new summary. Daily/weekly/monthly balances and closing locks continue to work.


## Cylinder-wise full stock and automatic net profit

Use **Overview → Update counts** to enter the current physical full-cylinder count for 11.8, 15 and 45.4 kg. Counts include all earlier receipts/issues. New plant receipt line quantities and customer dispatches marked **full** update subsequent stock automatically. Uncheck the full-dispatch option for empty or other container movements. Manual full-cylinder receipts/issues are available for movements not already recorded. Known stock cannot be over-issued; before a count is set, no exact availability is claimed. Full-cylinder counts are independent of gas kg, empties and client-held balances. Kg-only cash sales cannot identify cylinder size and do not change full-cylinder counts automatically. The retired 45.4 kg client-tracking option stays retired; the dashboard's 45.4 kg full stock remains independently manageable.

Monthly **Net profit** is calculated automatically as invoice revenue minus gas cost of sales, parts cost of sales and recorded operating expenses. Gas cost uses a chronological pooled weighted average of dated receipts, or an explicitly entered actual unit cost for that sale. Parts use their recorded unit cost. Only sold inventory is expensed; unsold purchases remain stock. Credit sales count as revenue; recovered debt does not add revenue again. Purchases after the report period are excluded.

Unpriced gas receipts, missing gas weights, unreconciled gas stock or uncosted parts sales can make profit incomplete. The report then shows Incomplete instead of inventing a figure. **Gas & inventory → Gas purchase costs for profit** records actual receipt costs. **Complete sale costs** records missing gas kg and/or actual unit cost, preserving invoice value, payment and customer balance. Missing kg reduces recorded gas inventory; adding cost alone does not. Corrections are logged and respect all closing locks. Reopen affected closings first. Older saved snapshots keep their values and mark profit as not stored; newly saved monthly closings include the profit calculation and missing-data status.


## Supplier credit purchases

**Supplier credit** is separate from the customer ledger. Add a supplier with an optional opening amount owed and its date. If stock was already recorded elsewhere, use the opening debt instead of re-entering its inventory purchase.

**Buy on credit** records either a gas cylinder-size/quantity purchase at the price per 11.8 kg unit, or a part-item purchase at cost per piece. The paid-now amount defaults to zero and may be partial or full. Saving creates one supplier invoice and one linked inventory receipt. Gas adds measured kg, cost and full-cylinder movements; parts add stock and recorded cost. Create a part with zero opening stock before buying it here. Do not duplicate the same purchase in the gas calculator or parts purchase form.

**Pay supplier** records later payments. Supplier balances include opening debt, purchases, initial payments and later payments; overpayments and payments before the supplier opening date are rejected. Supplier account credit is purchases/debt; debit is payments. Dates and costs respect closing locks. Historical receipts before a physical cylinder count do not add that count again.

Supplier cash payments, including paid-now amounts, reduce daily and period cash movement once. Bank/wallet payments do not reduce the cash total. These payments are not operating expenses and do not reduce net profit again: profit expenses inventory only through gas/parts cost of sales. Customer debt and revenue remain unchanged by supplier purchases/payments. Supplier data and links persist in the existing browser storage and JSON backup.


## Daily rates, inventory and receipts

Overview stores a selling rate per kg for each date and shows the corresponding 11.8 kg, 15 kg and 45.5 kg gas prices. Changing a rate does not change saved invoices or actual inventory costs. New customer gas invoices use today's saved rate when available.

In **Gas & inventory**, search receipts by date, size or reference. **Add cylinder receipt** converts cylinder quantity and capacity into gas kg and 11.8 kg units automatically. Record the actual purchase cost for profit calculations. Use Supplier credit for supplier purchases instead of recording the same purchase twice. **Open** previews a saved receipt and offers printing.

**Sales → Sold cylinders** records sales of empty containers in 11.8 kg, 15 kg and 45.4 kg sizes, including quantity, selling price, payment and optional actual container cost. Empty-container prices are separate from gas rates. Set physical empty stock first; sales deduct available empties without changing gas kg, full-cylinder stock or cylinders loaned to customers. Unpaid sales require a customer and appear in their money ledger. Missing actual costs leave the profit calculation incomplete.

Sales, customer payments, supplier purchases/payments and gas receipts have receipt previews with **Print receipt / Save PDF**. Select your printer or Save as PDF in the browser print dialog. Receipts and the app show the Latif LPG Agency flame logo and business details: The Right Energy, Every Time; Palosy Road Near Shinqamar Resturent, Peshawar; Cell No: 03320981963.

The selected customer ledger displays the time since their last recorded purchase, alongside the purchase date. Older date-only purchases are identified accordingly.
