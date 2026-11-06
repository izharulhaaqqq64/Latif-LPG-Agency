# Latif LPG Agency

A private English-language LPG business application with owner/manager/driver logins, shared SQLite storage and responsive laptop/mobile screens. See **[PRIVATE-SETUP.md](PRIVATE-SETUP.md)** for account creation, migration and HTTPS hosting.

## Run

Requires Node.js 24+. Run `npm start` from the project folder; the default port is 3000 (`PORT` can override it). SQLite is included in Node; no runtime packages or separate database installation are needed. Create your owner login using the one-time setup code displayed in the server window.

On Windows 11, install Node.js LTS, download the GitHub ZIP, extract it, and double-click **START-APP.bat**. Keep the server window open. Refresh the browser if startup takes more than three seconds.

To update, export a backup, wait for Synced, close the old server, extract the latest ZIP and start the new folder. Windows keeps the database in `%LOCALAPPDATA%\Latif LPG Agency\data`; other systems must preserve LPG_DATA_DIR (or the existing data folder). Version 1 browser data can be explicitly imported on first setup or through Open backup.

## One workspace per task

- **Overview:** eight cards for sales, monthly revenue, active customers, gas stock, parts stock value, outstanding credit, daily expenses and empty-cylinder count, plus a dated Total daily cash panel, month-by-month revenue trend, cylinder-wise full stock and low-stock alerts. Inventory and account balances show the current position; sales, cash and expenses use the selected date. Detailed weights and transaction tables remain in their own sections. New private workspaces start empty. Imported legacy/demo records are retained if you choose to import them.
- **Sales:** Daily sales, Customer sales & invoices and Sold cylinders tabs. Anonymous paid entries require only an amount, with separate entries/totals for each selected date. Optional kg reduces Shop stock. Named sales support full/partial payment, credit, retail/wholesale/supply and linked cylinder movements.
- **Money & cylinder ledger:** one customer-selectable money/cylinder statement, without separate account or payment-history tabs. Customer, credit-entry, collection, due-date, reminder, CSV and print actions remain in the ledger. The selected customer statement retains cylinder sizes, last purchase date/time and elapsed purchase time. Monetary summaries show total debit and total credit only. Record other debts using Credit entry; gas invoices already post automatically and must not be manually reposted. Collections reduce debt. Statements can be printed or downloaded as CSV. Reminder drafts can be reviewed and downloaded locally; the app sends no messages.
- **Gas & inventory:** full-cylinder counts for 11.8, 15 and 45.4 kg, measured gas kg, receipt breakdowns and purchase costs. Retail draws from Shop, wholesale from Main godown and supply from Supply vehicle.
- **Supplier credit:** a separate supplier purchase/payment ledger for gas and parts bought on debt.
- **Cylinder tracking:** new customer dispatches and returns for 11.8, 15 and 45.4 kg capacities, with Original/Local types. Existing 45.4 kg movements remain readable and can be returned as their original size. Returns must match the same customer's outstanding size. Legacy untyped movements remain under Size not recorded. Container movements alone do not change gas kg inventory.
- **Gas parts:** stock, actual cost/selling price/profit, and movement-history tabs. Purchases increase stock; cash sales decrease it. Actual cost uses a weighted average; each sale preserves its cost for gross profit. Untracked legacy invoices remain intact without invented costs.
- **Gas calculator:** mixed plant purchases at a price per 11.8 kg unit, plus the KG/unit converter. Add cylinder quantities and actual capacities; `total kg = sum(quantity × capacity)`, `units = kg / 11.8`, and `cost = units × unit price`. For 40 × 15 kg + 10 × 45.4 kg, weight is 1,054 kg and units are 89.3220338983…; at Rs. 1,180/unit, cost is Rs. 105,400. Review and save to add purchased gas and cost to inventory. This is not a customer sale or supplier payment. 45.4 and 45.4 kg remain separate sizes.
- **Expenses:** dated operating expenses with category, payment method and note. These are separate from inventory purchases. Daily and monthly reports include them; collections after expenses is not a complete cash/bank balance or net profit.
- **Reports:** Daily report, Daily closing, Weekly closing and Monthly closing tabs. Closing snapshots include opening/bills/manual credit/receipts/closing money, capacity-specific cylinder quantities and expenses. Balances carry forward by calculation without duplicate entries. Saved months and earlier dates that affect them are locked; reopen dependent closings newest first to correct a period.

## Credit and dates

Last purchase is the latest customer-linked gas or parts sale date. Collections and manual debt entries do not change it. Customers with only an opening balance have no recorded purchase date.

Due dates remain customer-account reminders, not invoice-level aging. Updating a due date does not alter the debt or saved financial closing. New credit and expense entries respect date validation and closing locks.

Amounts are rounded to two decimals. Gas unit pricing uses full intermediate precision; display rounding does not change purchase cost. Cash gas weights support 0.01 kg precision. Unmeasured cash entries retain their payments without inventing kg and are flagged in stock/reports.

## Storage and backups

The authoritative records are in the private server’s SQLite database. A device cache remains in localStorage under `latif-lpg-v1`, with queued pending saves and revision checks. Check the header status to confirm synchronization. New fields are initialized without resetting sales, customers, receipts, cylinders, parts or closing snapshots. Existing names, notes and saved records are not translated or deleted. JSON export includes the complete saved state; CSV statements contain ledger rows and running money/cylinder balances. Use **Save backup** to download a complete JSON backup. **Open backup** accepts current backups and older raw-state exports (up to 10 MB), validates the records and shows a preview. **Restore backup** replaces the shared records only after confirmation and sync validation; save your current backup first. A safety copy of the previous browser data is also retained locally under `latif-lpg-before-open`. Invalid files do not change current records.

Owner authentication, a shared database and conflict-safe synchronization are included. Hosting/deployment is separate from running locally. Server recovery retains 20 previous revisions and snapshots for the last 30 active days; these are not offsite backups. See PRIVATE-SETUP.md. The monthly report reconciles customer/inventory records and calculates net profit when recorded costs are complete. It is not statutory accounts; expenses and costs not entered in the app cannot be included.

## Validation

With Playwright installed and Chromium available at `/usr/bin/chromium`, run `npm test`. The test runner starts isolated local servers and temporary databases. Browser tests cover the consolidated navigation, credit and recoveries, due-date context, reminder drafts, CSV statements, last purchase, expenses/reports, persistence, monthly lock/carry-forward, mixed plant purchases, gas calculations, parts costing, size-matched cylinder returns and mobile layouts. The browser dependency is only needed for tests.


## Empty cylinders and last-purchase elapsed time

Cylinder tracking includes a separate empty-cylinder inventory. Set the current physical empty count once per size (including zero), optionally entering an average tare weight read from cylinder markings. This count includes returns already received; only movements recorded after the count change it. Before all opening counts are entered, totals are explicitly partial/unknown. Existing customer cylinder history is not assumed to be current empty stock.

New customer returns marked **empty** add one linked empty-stock receipt per movement, including returns on customer sales. Uncheck the option for full/non-empty returns. Filling, sending to the plant or other removals are entered as empty stock movements and cannot exceed available quantity. These change empty stock, not gas kg or customer debt. Tare weights can be updated independently. Empty quantities and optional average tare weights persist in browser storage and backups.

Capacity (11.8 / 15 / 45.4 kg, with existing 45.4 kg records preserved) describes nominal gas capacity, not empty-shell mass. Cylinder tracking displays capacity-wise empty counts and estimated shell mass only when tare weights and opening quantities are known; Overview shows the empty-cylinder count. Empty-shell total uses average tare per size, so it is an estimate rather than a weighed load.

The ledger shows **Time since last purchase**, refreshing every minute. Recorded purchase timestamps or local sale times support hours/minutes; date-only history explicitly says time not recorded. Manual debt entries and collections do not reset last purchase time. Changing the standard sizes never deletes historical transactions.


## Total daily cash

Overview and Daily sales use the same dated net cash calculation: received cash on gas/parts/customer sales plus cash debt recoveries, less cash operating expenses. Credit bill amounts, bank transfers and wallet payments are excluded. The breakdown shows cash operating expenses; supplier cash payments are displayed separately in the monthly report. It is not an opening-to-closing cash balance. Inventory purchases without a recorded payment are not assumed paid.

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

Use **Overview → Update counts** to enter the current physical full-cylinder count for 11.8, 15 and 45.4 kg. Counts include all earlier receipts/issues. New plant receipt line quantities and customer dispatches marked **full** update subsequent stock automatically. Uncheck the full-dispatch option for empty or other container movements. Manual full-cylinder receipts/issues are available for movements not already recorded. Known stock cannot be over-issued; before a count is set, no exact availability is claimed. Full-cylinder counts are independent of gas kg, empties and client-held balances. Kg-only cash sales cannot identify cylinder size and do not change full-cylinder counts automatically. Tracking and full-stock screens both use 11.8, 15 and 45.4 kg for new entries.

Monthly **Net profit** is calculated automatically as invoice revenue minus gas cost of sales, parts cost of sales and recorded operating expenses. Gas cost uses a chronological pooled weighted average of dated receipts, or an explicitly entered actual unit cost for that sale. Parts use their recorded unit cost. Only sold inventory is expensed; unsold purchases remain stock. Credit sales count as revenue; recovered debt does not add revenue again. Purchases after the report period are excluded.

Unpriced gas receipts, missing gas weights, unreconciled gas stock or uncosted parts sales can make profit incomplete. The report then shows Incomplete instead of inventing a figure. **Gas & inventory → Gas purchase costs for profit** records actual receipt costs. **Complete sale costs** records missing gas kg and/or actual unit cost, preserving invoice value, payment and customer balance. Missing kg reduces recorded gas inventory; adding cost alone does not. Corrections are logged and respect all closing locks. Reopen affected closings first. Older saved snapshots keep their values and mark profit as not stored; newly saved monthly closings include the profit calculation and missing-data status.


## Supplier credit purchases

**Supplier credit** is separate from the customer ledger. Add a supplier with an optional opening amount owed and its date. If stock was already recorded elsewhere, use the opening debt instead of re-entering its inventory purchase.

**Buy on credit** records either a gas cylinder-size/quantity purchase at the price per 11.8 kg unit, or a part-item purchase at cost per piece. The paid-now amount defaults to zero and may be partial or full. Saving creates one supplier invoice and one linked inventory receipt. Gas adds measured kg, cost and full-cylinder movements; parts add stock and recorded cost. Create a part with zero opening stock before buying it here. Do not duplicate the same purchase in the gas calculator or parts purchase form.

**Pay supplier** records later payments. Supplier balances include opening debt, purchases, initial payments and later payments; overpayments and payments before the supplier opening date are rejected. Supplier account credit is purchases/debt; debit is payments. Dates and costs respect closing locks. Historical receipts before a physical cylinder count do not add that count again.

Supplier cash payments, including paid-now amounts, are excluded from Total daily cash. They appear separately in the monthly report and reduce its Cash value once. Period closing reports retain net cash after supplier payments. Bank/wallet payments do not reduce the cash total. These payments are not operating expenses and do not reduce net profit again: profit expenses inventory only through gas/parts cost of sales. Customer debt and revenue remain unchanged by supplier purchases/payments. Supplier data and links persist in the existing browser storage and JSON backup.


## Daily rates, inventory and receipts

Overview stores a selling rate per kg for each date and shows the corresponding 11.8 kg, 15 kg and 45.4 kg gas prices. Changing a rate does not change saved invoices or actual inventory costs. New customer gas invoices use today's saved rate when available.

In **Gas & inventory**, search receipts by date, size or reference. **Add cylinder receipt** converts cylinder quantity and capacity into gas kg and 11.8 kg units automatically. Record the actual purchase cost for profit calculations. Use Supplier credit for supplier purchases instead of recording the same purchase twice. **Open** previews a saved receipt and offers printing.

**Sales → Sold cylinders** records sales of empty containers in 11.8 kg, 15 kg and 45.4 kg sizes, including quantity, selling price, payment and optional actual container cost. Empty-container prices are separate from gas rates. Set physical empty stock first; sales deduct available empties without changing gas kg, full-cylinder stock or cylinders loaned to customers. Unpaid sales require a customer and appear in their money ledger. Missing actual costs leave the profit calculation incomplete.

Sales, customer payments, supplier purchases/payments and gas receipts have receipt previews with **Print receipt / Save PDF**. Select your printer or Save as PDF in the browser print dialog. Receipts and the app show the Latif LPG Agency flame logo and business details: The Right Energy, Every Time; Palosy Road Near Shinqamar Resturent, Peshawar; Cell No: 03320981963.

The selected customer ledger displays the time since their last recorded purchase, alongside the purchase date. Older date-only purchases are identified accordingly.


## Central search and receipt centre

The **Search all records** bar is available on every screen. Search by customer/supplier name, phone, invoice/reference, date, item or amount. Results include sales, customer and supplier payments, purchases, gas receipts, customers, suppliers, parts, cylinder movements, credit entries and expenses. Multiple search words narrow results; large result lists show the first 80 matches. Clear the search to hide results.

Open **Receipts** in the sidebar or beside the search bar to find saved sales, collections, supplier purchases/payments and gas receipts. Each row offers **View receipt** and **Print receipt**; printing opens the browser printer/PDF dialog and never records another payment or sale. **Receive customer payment** records a new collection using the existing customer-ledger workflow.


## Daily operations update

**Centralized search · Search anything** is visible on the main page and every workspace. Search names, optional contact details, dates, invoice numbers, payment methods, descriptions, stock and movements without first choosing a screen.

Gas inventory uses **11.8 kg, 15 kg and 45.4 kg cylinder counts**. **Add cylinders** automatically records quantity × capacity as measured gas kg and adds full-cylinder movements once. **Add kg receipt** remains available for weight-only arrivals. Physical cylinder counts remain independent of measured gas: loose-kg sales cannot identify which cylinder size was used. Existing records, including legacy 45.4 kg entries, are preserved.

The headline **Total daily cash** now shows cash sales + cash collections − cash operating expenses + transfers in − transfers out. Bank/wallet transactions stay outside cash; the breakdown shows each deduction. This is the day's net movement, excluding opening cash.

**Daily sales** accepts payment amount, optional gas kg, optional description and Cash / Bank transfer / Easypaisa-JazzCash. Entered kg reduce Shop gas stock once; blank kg remain unmeasured. No customer name is needed for these fully paid sales. The overview daily price list shows per kg and 11.8 / 15 / 45.4 kg prices calculated from the saved dated selling rate.

Customers have optional mobile number and address fields. Edit them from a selected ledger using **Edit contact / due date**. Notes, descriptions and bill references are optional throughout; names, quantities, prices and necessary account selections are still required.

New cylinder dispatches select **Original** or **Local** for every current size. Tracking shows both balances separately, and returns cannot exceed the selected size/type balance. Older movements without a recorded type remain **Unspecified**; use that option for their returns instead of relabelling history. The standard large cylinder size is 45.4 kg for dispatches and returns.

**Invoices** is a separate sidebar section for finding, viewing and printing sales invoices. **Receipts** remains the section for sales/payment/purchase receipts. Both use the agency branding and browser Print / Save PDF. Neither viewing nor printing creates a new financial entry.


## Main overview and direct ledger entries

Overview has a **Daily price list**, a **Combined search · all records** shortcut, and a persistent combined search field above the page content. Search covers customers, contacts, sales, payments, suppliers, parts, expenses, stock and cylinder movements.

**Total daily cash** includes both gas and parts cash payments once. Its breakdown shows gas cash, parts/container cash, debt collections and cash operating expenses separately. Supplier cash payments are shown in the monthly report. Online bank/wallet receipts remain outside cash. Net daily cash still excludes opening cash.

Every customer money/cylinder ledger row opens the saved entry. Click any row or its entry link, or focus the row and press Enter/Space. Opening balances, invoices, collections, direct debits and cylinder movements all have details; viewing does not change records.

Use **Debit · customer owes** to record a direct customer amount owed, and **Credit · payment received** for a collection. The selected customer is prefilled. A direct debit does not add stock or sales revenue; a cash credit adds collected cash and reduces the outstanding amount once. Total debit and Total credit remain visible. The existing `creditEntries` backup field still stores legacy/manual amounts owed; its schema has not been renamed.

**Supplier credit & debit** has Combined supplier ledger, Credit/Purchases and Debit/Payments tabs. Tabs filter rows without changing the complete selected supplier's totals or running balance. Purchases add inventory once; payments settle supplier debt and do not count as operating expenses again.

The current three standard sizes are **11.8, 15 and 45.4 kg** in daily prices, inventory, dashboard stock/alerts, empty-container sales and Original/Local customer tracking. Old 45/45.5 labels migrate into the 45.4 kg cylinder category, retaining recorded gas weights, prices, amounts and source count audit data. The gas calculator can still handle historical 45.4 kg purchase examples; no old record is silently resized.

App branding and the Receipts section retain the supplied flame logo, **LATIF LPG AGENCY**, **The Right Energy, Every Time**, **Palosy Road Near Shinqamar Resturent, Peshawar**, and **Cell No: 03320981963**. Select View receipt or Print receipt to print or save PDF.


## Supplier cash and customer statement links

**Total daily cash** = gas/parts cash receipts + customer cash collections − cash operating expenses + cash transfers in − cash transfers out. Supplier payments do not reduce this daily figure. The monthly report has a separate **Supplier cash payments** card; its **Cash** value deducts those payments exactly once. Paid-now supplier purchase amounts and later cash payments are included; bank/wallet payments are excluded. Supplier settlement remains separate from expenses and net profit. Saved monthly closings retain these amounts; older snapshots without a recorded supplier total show Not recorded rather than being recalculated.

Customer names in monthly, daily and weekly statements open their clickable money/cylinder ledger. The selected customer statement heading also opens the ledger. Invoice/payment/cylinder/manual-entry links inside it open the underlying saved detail. Viewing and printing leave business records unchanged.


## WhatsApp payment reminders

Use the highlighted green **WhatsApp reminder** button at the top of **Money & cylinder ledger**. From the combined ledger, choose a customer with an outstanding payment and preview the reminder. With a customer already selected, the button opens their reminder directly. Add their optional mobile number using Edit contact / due date first. Local Pakistani 03xx numbers and international numbers with country codes are supported. Review the reminder with the customer's amount due, due date if set, cylinder balance and agency contact number.

**Open WhatsApp** opens the customer's chat with the prepared message. Press Send yourself in WhatsApp, then return and choose **Mark as sent**. Opening a chat alone does not mark it sent. The app cannot verify delivery; the status records your confirmation. Missing/invalid phone numbers disable opening and sent confirmation.

The ledger shows the last marked-sent time and message history. Records persist in browser storage and Save/Open backups. Sending/marking a reminder never changes money, gas, cash or cylinder balances. When payment is received, record it separately using **Credit · payment received**.


## Edit and delete records

**Edit / delete records** is available above every workspace. Choose a record type and search by name/date/reference. Record rows also show Edit/Delete buttons in sales, invoices, receipts, customer ledgers, supplier accounts, parts, gas receipts, expenses, cylinder history and reminder history. Counts, physical openings, manual stock movements, daily prices and saved closings are available through the same manager. Overview charts and calculated reports update from their source records.

Edits preserve record IDs. A generated stock line opens its supplier purchase or sale, so related inventory and ledger entries change together. Deleting a sale reverses its linked parts/empty-cylinder movements and invoice cylinder movements. Deleting a supplier purchase removes its linked receipt and full-cylinder/parts movements once. Supplier and customer payments update balances and cash automatically. Invoice numbers continue forward after deletion.

Changes are checked for newly negative gas/parts/empty/full stock, overpaid customer/supplier accounts and unmatched cylinder returns. Existing legacy mismatches are preserved but cannot be worsened. Part purchase cost edits recalculate later tracked sale costs. Closed dates block financial changes; reopen affected daily/weekly/monthly closings first. Contact-only corrections remain available. Customers, suppliers and parts with dependent history cannot be deleted until those dependencies are removed.

Delete always opens a review dialog. **Save backup first** downloads the current records. A successful change also retains the previous full state locally; open the manager and choose **Download state before last change** to recover that JSON through Open backup. This keeps only the latest pre-change state; download regular backups for longer history. Storage failures or validation errors roll back the proposed change.

To revise a saved closing, choose Edit in the manager and confirm **Reopen for editing**; correct its source entries and save it again. Delete removes the saved snapshot only. Both actions respect later dependent closings. Never edit a calculated report total separately from its transactions.


## Private server release

Version 2 adds private account setup/login, password changes, 12-hour sessions, shared storage, safe device migration, queued saves, conflict recovery and server recovery downloads. All business functions remain available after signing in. Read [PRIVATE-SETUP.md](PRIVATE-SETUP.md) before deployment. Existing notes about browser storage refer to the device cache; the server database is authoritative once synchronized.


## Cash, online payments and residual gas

Overview's dated daily rate now includes a live **Price ↔ KG calculator**. Enter rupees to calculate kg (`amount / perKg`), or kg to calculate price (`kg × perKg`). The preview follows the entered rate; save the daily rate to use it in sales. **Daily sales → Save payment & calculate gas** calculates weight using the saved date rate or the entered customer rate, to 0.001 kg; there is no separate calculate button. Replace the estimate with actual weighed gas if different. Calculation alone creates no sale.

**Cash & online → Cash & money transfers** records cash sent home, personal advances, money sent online and transfers between Cash / Bank transfer / Easypaisa-JazzCash. Choose From, To, purpose, amount and optional recipient/reference/description. **Outside business → Cash/Bank/Wallet** records money returned or deposited. A Home/Personal advance transfer is an owner/personal money movement and does not reduce operating profit or create a customer invoice. Record actual business expenses or supplier settlement in their own tabs to avoid duplicate entries. Transfers do not claim an actual till or bank balance because opening account balances are excluded.

**Online customer payments** shows existing bank/wallet sale payments and customer collections once, with transaction references. **Receive online customer payment** defaults to Bank transfer and reduces the selected customer's debt. For a new cash/customer/parts/empty-container sale, choose Bank transfer or Easypaisa-JazzCash on that sale instead. These are manually entered records; no bank feed or payment verification is connected.

Daily reports, weekly closings and monthly closings now include Bank/Wallet received amounts, online collections and transfer/net account movement. Saved snapshots store the breakdown. Older saved reports display Not stored rather than recalculating historical snapshots; reopen and save to include it. Internal transfers affect both accounts and leave profit unchanged. Supplier cash settlement continues to be excluded from the overview daily cash total and deducted once in period/monthly net cash.

**Gas & inventory → Record gas loss** records discarded residual gas by size, location, cylinder count and grams per cylinder. The default is **350 g**, editable for a 300/400 g estimate or an actual measurement. Example: **10 cylinders × 350 g = 3.5 kg**. Select Estimated or Measured. Only record gas that was included in stock and is now discarded/unusable; do not deduct gas already excluded by a measurement or another record. Loss reduces gas kg once and leaves container counts, customer balances and cash unchanged. Quantities are stored to 0.001 kg.

Gas loss is included in daily/weekly/monthly gas opening/closing stock. Monthly net profit subtracts its chronological weighted-average purchase cost as a separate non-cash inventory write-off. It is not valued at the daily selling price or charged again as an operating expense. Missing purchase costs leave profit incomplete. New loss records cannot exceed recorded stock at that location. Edits/deletes, backups, private-device synchronization and closing locks cover both transfers and losses.


## One-button sale, customer rates and automatic retail residual

Daily sales has a single **Save payment & calculate gas** button. The visible price-per-KG field starts with the selected date's daily rate and can be overridden for the current customer. Saving calculates weight from payment/price to 0.001 kg. An entered actual KG overrides the calculation. The custom price is recorded without changing the daily price list. Without either price or actual weight the payment remains unmeasured, preserving legacy payment-only use; set the daily price for normal automatic operation.

New plant/cylinder gas purchases have an **Automatic residual allowance** setting, enabled by default with **400 g per cylinder**, editable within the usual 300–500 g estimate. The value is saved per batch and becomes the default for subsequent purchases. Counts come from the actual cylinder breakdown. A weight-only receipt needs its actual cylinder count if the allowance is explicitly enabled through Edit. Total KG alone cannot determine how many cylinders were bought. Existing receipts remain unchanged unless explicitly enabled.

Example: **600 kg in 40 × 15 kg cylinders**, at **400 g** per cylinder, has an initial retail residual allowance of **16 kg** and estimated usable retail gas of **584 kg**. No loss is charged while the batch is unsold. When one quarter of its usable gas (146 kg) is sold retail by KG, 4 kg residual is recognized. Once all 584 kg is sold retail, total residual is exactly 16 kg. Quantities are allocated FIFO by location, using integer grams to avoid accumulated rounding drift.

**Only Retail / Per KG gas sales recognize automatic loss. Wholesale, supply and Full cylinder gas sales create no automatic wastage.** Their gross quantity leaves the batch and its corresponding allowance is removed from future retail estimates. For a named retail full-cylinder sale select **Gas sale type → Full cylinder**. Older explicit full-dispatch invoice records are also excluded unless explicitly classified Per KG. Empty-container sales are separate and never generate gas loss.

Recognized automatic residual appears in inventory and daily/weekly/monthly reports. Purchase-cost write-off is included once in monthly profit. Unsold reserve is displayed separately from recognized loss; it is not expensed upfront. Edits and deletions recalculate derived residual without appending duplicate loss entries, while closing locks protect saved periods. New sales cannot consume gas reserved as trapped residual.

**Gas inventory → Wastage & residual** opens the gas-loss section. Manual loss remains available for additional measured losses, not for repeating the batch's automatic estimate. Automatic entries are changed through their source batch; they are derived from saved purchase and sale data and synchronize consistently across devices.

## Five logins and business owner names

There are exactly **3 owner slots, 1 manager and 1 driver**. All owners have full access to records, accounts and server recovery backups. The first owner activates the other four slots with individual names/usernames/passwords in **Account & backups → Manage 5 logins**. Disabled slots cannot sign in and have no default password. The manager handles business records; the driver has a separate delivery/cylinder view without prices, debt or financial APIs.

Use **Save name** in Account & backups to edit your owner/account name. **Save**, **Open** (backup preview) and **Exit** (sign out) are available in the main file controls. Existing browser and server data, including the previous owner password, are preserved on upgrade.


## Walk-in full gas cylinders and spare parts

**Sales → Daily sales** has **Gas by KG**, **Full gas cylinders** and **Spare parts** options. Each uses the selected sale date, with no required customer name. Cash, Bank transfer and Easypaisa-JazzCash payments and optional descriptions/references are supported.

For new full gas cylinders choose **11.8, 15 or 45.4 kg** , quantity and price per cylinder. The default price is the dated daily per-KG rate × capacity and can be changed for the customer. Bill = quantity × cylinder price; gas sold = quantity × capacity. One save decreases Shop gas and the corresponding full-cylinder count, when counted. Gas KG and known physical counts prevent over-issuing. These are sales of full gas contents; empty-shell sales and customer-loaned cylinders remain separate. No automatic retail residual is applied. Use Update cylinder counts for current physical quantities.

Spare parts use the same part records, prices, stock movements and weighted-average purchase costs as **Gas parts**. Saving creates one sale and one linked stock deduction, not duplicate transactions. A sale made in either Gas parts or Daily sales appears in the daily walk-in list once. Missing/insufficient part stock prevents saving.

The daily list now includes per-KG, full-cylinder and anonymous parts/container sales. Received totals use saved payments. **Total gas sold** at the bottom sums known KG from all gas sales on the selected date, including customer/wholesale invoices. It excludes spare parts, empty containers, residual loss and unmeasured payment-only entries; a separate note shows the walk-in subtotal.

Full-cylinder and parts sales support linked edit/delete, dated records, receipts, private synchronization and recovery backups. Changing/deleting a full-cylinder sale updates its full count and gas KG together; parts changes update their stock/costs. Closed-period and dependent-stock checks still apply.


## Empty exchanges and refundable security (2.4)

In **Sales → Daily sales → Full gas cylinders**, choose **11.8, 15 or 45.4 kg** and **Original / Local**, quantity and gas price. Choose whether the customer brought **all**, **none** or **some** empty cylinders. Partial exchanges accept a returned quantity; the returned variant can differ from the full cylinder issued. Returned empties add to the matching size/variant stock once. Historical sales without exchange information stay unrecorded until explicitly updated; no old empties or deposits are invented.

When an empty is missing, enter **refundable security per cylinder**. The last entered rate is remembered separately for each size and variant; there is no assumed market rate. Optional holder name/mobile help identify a bearer receipt. Gas payment and refundable security appear separately on the receipt, with a combined amount received. Security increases the selected Cash/Bank/Wallet balance, appears separately in daily/weekly/monthly reports, and is excluded from sales revenue and net profit. It is a refundable liability, not customer sale income or a fee.

The **Refundable cylinder security** panel in Daily sales and Cylinder tracking shows outstanding amounts and quantities. **Return cylinder / refund** records the returned empty in its original deposit size/variant and pays quantity × original security rate using the selected account. Refunds have printable receipts in Receipts, are searchable, and can be edited/deleted. A sale with linked refunds must have those refunds removed before editing/deleting it. Closed dates and dependent stock records remain protected. Backups include deposits, refunds and remembered security rates.

**Update cylinder counts** can record Original/Local counts separately. Set both variants for a current size to get a combined exact count; legacy aggregate counts remain supported. A later aggregate recount makes earlier variant counts unknown until counted again. Only 11.8, 15 and 45.4 kg are offered in the current screens. Historical measured gas weights and financial amounts are retained during label migration.


## Simplified daily workspace (2.5)

- **Udhaar book** lists wholesale, shop/hotel accounts and customers with debt, payment or cylinder account history. Anonymous walk-in cash entries and named retail customers who only paid cash do not appear in its combined ledger/totals. Historical settled accounts remain accessible. Daily cash invoices remain in Sales/Invoices/Receipts and still contribute to business reports.
- Select a credit customer, then use **Add debt (Debit)** or **Receive payment (Credit)**. Enter date and amount; descriptions remain optional. A debt entry does not sell inventory. Use a customer invoice when selling gas/parts. Payments cannot exceed the outstanding balance. Entries and customers have direct Edit/Delete controls; closed periods and linked records remain protected.
- Overview and Daily sales show **Cash sent home / transferred out** for the selected day, with dated quick-entry buttons and Edit/Delete actions. Changing the date shows that day's records, without carrying the previous day's withdrawals into its daily total. Transfers reduce their source account; they are not expenses or revenue. Weekly/monthly reports include them once.
- Current stock, prices, tracking, full/empty sales and converters use **11.8, 15 and 45.4 kg**. Historical 45/45.5 size labels consolidate into 45.4. Current full/empty quantities are combined using their former physical counts and movements; original counts/openings are kept in the backup audit trail. Unknown counts stay unknown/partial. This is a size-label migration, not a recalculation of old measured gas KG, invoice values, cost, residual or profit. A saved historical full-cylinder receipt shows its original recorded gas KG. Correct actual quantities via the current count controls after checking physical stock.
- The sidebar help guide is removed. Gas & inventory contains stock controls, receipts and residual records; the global Daily sale shortcut is hidden on that page. Daily sales remain under Sales.

**Owner reset:** use **Reset business data**, read the warning, download a backup, type `RESET BUSINESS`, and enter your current owner password. The app must be online and fully synced. Reset clears business transactions, customers/suppliers, inventory, rates, security and closings across devices; it preserves login accounts/passwords and retains a server recovery copy. It never runs during an update. Managers/drivers cannot use the reset endpoint. An old device cannot overwrite the reset using its stale revision. Regular downloaded backups are still recommended.


## Customer list and linked cylinder KG (2.6)

**Udhaar book** opens a customer list with exactly one row per credit customer: total debit, total credit, balance and cylinders. Click the name/row to open the complete dated transaction history, including opening balance, sales, collections, debt entries and cylinders. **All customers** returns to the list. Each row has **Credit** (receive payment) and **Debit** (add debt) buttons with that customer already selected; saving returns to the customer list. Existing receipts, WhatsApp reminders, contact editing and transaction Edit/Delete remain in the detailed account.

**Gas & inventory → Update count** now saves the cylinder correction and gas KG together. The KG change is **(new count − previous recorded count) × capacity** at the selected gas location. For example, 8 → 10 cylinders of 15 kg adds 30 kg; 10 → 8 removes 30 kg. Repeating the same count changes KG by zero. Existing gas receipts already contribute their cylinder quantity to the previous recorded count, even before a physical count is set, so recounting an existing receipt does not add it twice. Loose gas and stock at other locations are retained. The preview shows the KG change and resulting total before saving. This corrects recorded quantities; it is not a new purchase, supplier bill, sale, cash payment or manual wastage entry. Use Add cylinders for actual purchases and Wastage for discarded gas.

Corrections have a linked audit record, appear separately in gas closing reports and are included in backups and synchronization. Positive corrections use the existing residual allowance for later retail KG sales; wholesale/full-cylinder sales still do not create automatic residual. Stock valuation carries the existing average cost; an optional cost per KG supports an initial correction when no priced purchase exists. Missing costs remain incomplete in profit calculations. Edit/Delete updates the linked KG once; later dependent counts and closed dates must be corrected/reopened first. Stock cannot become negative in the chosen location. Wastage/residual tables and correction history are collapsed under details to keep the main inventory screen short.


## Compact search and dated overview (2.7)

Search is at the top of the workspace with a magnifying-glass button. Click a result row, use Enter/Space, or use its existing Open/Receipt button to open the saved record. Customer results open the account history; sales open receipts. Selecting a result closes the results list; focus the search again to continue with the same query. Escape dismisses results. The price ↔ KG calculator uses a compact desktop row/mobile grid and the entered daily rate.

The overview cash card explicitly shows **cash after expenses before outgoing transfers − cash sent home / transferred out = total daily cash**. Cash transfers were already deducted by the account totals and remain counted once; bank/wallet transfers are not deducted from cash. Refundable security and incoming cash transfers retain their existing accounting treatment.

Click the overview date button to choose an earlier day. Sales, cash, collections, expenses, transfers and monthly trend context use that selected date. Past dates expand that day's records with clickable rows; today's compact summary and a Full daily report link remain available; current inventory and account balances are labelled as current. The Daily sale header shortcut is shown only on Overview and Sales, rather than every tab. Other pages retain their own task-specific actions.


## Visible received pieces and location stock (2.8)

**Add cylinders** already saved a linked full-cylinder movement, but the inventory and overview hid that recorded balance behind “Not set” until an opening count was verified. These screens now show the recorded PCS even without an opening count, with an explicit unverified-opening label. This display fix does not invent an earlier opening balance, add purchases again, change gas KG or alter historical money. Update count verifies the current physical total; it prefills the recorded balance.

New cylinder receipts select **Original / Local** and save their receiving location. **Gas & inventory → Full cylinders by location** shows Godown, Shop and Supply vehicle, with separate 11.8, 15 and 45.4 kg quantities and a total PCS column. Older receipt movements inherit location from the source gas receipt. Wholesale/supply/retail invoice dispatches inherit their sales channel location; manual full-cylinder dispatches now select a location. Full-cylinder walk-in sales reduce Shop pieces. KG-only gas entries do not identify cylinder sizes. Empty-cylinder stock remains in its separate tracking system.

Old physical counts or movements without a recorded location appear under **Unassigned**. **Correct locations** identifies where existing pieces are recorded; its corrections preserve global PCS, gas KG, cash and purchases. It is a metadata correction, not a physical gas transfer. Corrections are searchable, backed up and editable/deletable, and cannot overdraw recorded source pieces. Negative recorded location balances are explicitly marked for checking. Warehouse tables reconcile to the global cylinder balance; unknown earlier location information is never silently guessed.


## Supplier actions, custom prices and business documents (2.9)

- Supplier credit now includes a supplier directory with **Credit · purchase** and **Debit · payment** beside each supplier. These preselect the supplier and use the existing stock-purchase/payment accounting. Credit adds a purchase/debt and stock once; Debit pays existing supplier debt.
- The overview has a cleaner agency header, softer cards, clearer daily cash and price cards, and responsive spacing. **Daily price list → Edit retail / wholesale cylinder prices** saves independent prices for 11.8, 15 and 45.4 kg. Blank prices calculate from the per-KG rate; a blank wholesale price uses the retail price. Walk-in full-cylinder sales can select Retail/Wholesale pricing for Shop pickup. Named full-cylinder invoices use the wholesale price on the Wholesale channel, with an editable price-per-cylinder field. Saved invoices are never repriced.
- Gas inventory labels no longer use the word “recorded”; the unverified-opening note remains where needed. Existing user reference text in receipt tables is preserved.
- **Receipts → Create manual receipt** creates a saved, searchable, editable printable document with quantity, custom price, received amount, customer/contact information and payment method. It prints the agency logo/address/phone. This is a document only: it does not post another sale/payment or change cash, stock or customer debt. Use Sales or Receive customer payment for actual account entries.
- **Cylinder tracking → Purchase empty cylinders** records new empty containers by size, Original/Local, quantity, receiving location and optional purchase cost/supplier name. One linked incoming empty-stock movement is created. Edit/Delete recalculates that movement with stock/dependency guards. Gas KG and filled cylinders are unchanged; purchase payments are recorded separately. The Receive full gas cylinders shortcut opens the existing gas/filled-cylinder receipt form.
- **Reports → Monthly closing → Online payments** shows bank/wallet customer receipts, online expenses, supplier payments, transfers and security receipts/refunds. Bank/wallet net movement uses the same account totals as the summary. Itemized entries are frozen with newly saved monthly closings. Old closings show an explicit message when itemized online details were not stored, rather than mixing live transactions into an old snapshot.


### Supplier list cleanup (2.9.1)

The supplier page now shows one supplier summary list. Click a supplier name or choose the supplier to open its single transaction history; All suppliers returns to the summary. Credit/Debit quick actions stay beside each supplier on the list, while the selected statement retains purchase/payment actions, filters, receipts and Edit/Delete. This removes the repeated-looking summary/history layout without changing or deleting any payments.


## Dashboard and daily payment workspace (2.10)

The former Overview is now labelled **Dashboard**. The duplicate overview banner is removed. Daily prices appear first, followed by the sales/revenue/stock cards. This group includes a single **Total daily cash** card and the compact price↔KG calculator. The large cash breakdown and cash-sent-home section are removed from Dashboard; the date picker and historical records still work.

**Cash & online** is now inside **Sales → Daily sales** rather than a separate sidebar page. One sale date controls the entry list, cash/online totals, bank/wallet received amounts and transfer/payment history. Money transfer and cash-sent-home actions remain available there. Receive customer payment includes a date and checks both the customer's balance on that date and the current balance; online receipts appear in the correct day's totals and existing reports. Cash/online totals reuse existing transactions without reposting them.

**Cylinder tracking** now includes full and empty location tables. Correct locations opens with the relevant Full/Empty choice, a size and source with available pieces, and a live availability message. Empty-location corrections stay separate from full-cylinder corrections. The save button explains unavailable/overlarge quantities and prevents overdrawing stock. Manual empty returns now allow selecting the return location. Existing corrections without a stock-kind field continue to mean Full. Location corrections do not move gas KG, cash or total pieces.

## Simple everyday workspace (2.11)

The sidebar now has five main tabs: **Dashboard, Sales, Khata, Stock, Reports**. Customers and suppliers are sections of Khata. Gas, cylinders, parts and the purchase calculator are sections of Stock. Invoices, printable receipts and expenses are available inside Sales. **Settings & backups** in the header contains existing account/login, Save, Open, backup, record editor, reset and exit controls. Reset retains its owner/password warning. Existing records, accounting rules and backup format are preserved.

**Sales** opens with Retail / Walk-in, Hotel supply and Shop / Distribution. Retail retains KG, full-cylinder and linked parts entry. Hotel/shop supply uses one form for the customer, dispatch location, size, Original/Local, delivered pieces, returned empties, per-cylinder price and payment. KG and the bill are calculated from cylinder quantities. Wholesale cylinder prices are suggested and remain editable. Saving posts one sale, one set of linked cylinder movements and the associated payment/khata effects through the existing accounting handlers. Full-cylinder supplies do not create retail residual/wastage. New customer supplies use today's business date; older supplies remain searchable/editable under the existing date/closing guards.

**Cash entry** on Dashboard/Sales opens expense, cash sent home, account transfer or customer-payment actions. Cash/online totals still include the original transactions exactly once. On Retail sales, the detailed cash breakdown and payment/transfer history are collapsed under **Cash breakdown, online history & transfers**; cash/online totals remain visible. Customer payment reminders, print receipts, stock corrections, daily/weekly/monthly closings and historical records remain accessible within their related workspaces.
