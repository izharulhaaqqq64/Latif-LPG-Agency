# Private owner software: setup and hosting

## First run on Windows 11

1. In your old app, download **Save backup** before replacing files. Close its server window.
2. Install Node.js **24 or newer**. Extract this version and double-click **START-APP.bat**.
3. The browser opens `http://localhost:3000`. A separate server window shows a private one-time setup code. Copy it into the setup form; choose your own username and password (at least 12 characters). There are no default credentials or public registration.
4. If the same browser has previous local records, choose **Download existing records** first, then **Use these device records**. A different browser/address starts empty; use **Open backup** to import your saved JSON after login.
5. Wait until the header says **Synced with private server** before closing or switching devices. The browser keeps pending entries if a connection fails.

The Windows database is stored outside the extracted app at `%LOCALAPPDATA%\Latif LPG Agency\data\latif.sqlite`. Keep that folder when updating. On Linux the default is the app's `data/` folder; set `LPG_DATA_DIR` to a persistent location when hosting. Never publish the database or your `.env` file.

## Use laptop and mobile together

Both devices must connect to **one running private server at the same address**. Opening independent copies of START-APP on two computers creates separate databases. `localhost` on your phone refers to your phone, not your laptop.

For use anywhere, deploy this Node application to a host with **HTTPS and a persistent writable disk**. Configure:

- Start command: `npm start` (Node 24+).
- `APP_ORIGIN`: your exact HTTPS origin, e.g. `https://your-agency.example.com`, without a path.
- `LPG_DATA_DIR`: the host's persistent disk directory (e.g. `/var/data/latif-lpg` for a native Node service; `/data` in the included Docker image).
- `PORT`: the platform's assigned application port; default 3000.
- Health path: `/health`.
- One service instance/process. SQLite is a single-server database; do not deploy multiple copies or put it on an ephemeral/serverless filesystem.

The deployment must preserve the request's public Host header and terminate TLS. The app issues Secure cookies when APP_ORIGIN is HTTPS and requires same-origin writes. Use the private one-time setup code from your hosting logs to create the hosted owner account, then import the laptop backup. The local and hosted accounts/databases are separate until you deliberately import your records. Sign in on both devices using the hosted address and owner account.

The included Dockerfile runs as the unprivileged `node` user. Mount a persistent volume at `/data` writable by UID 1000, and set APP_ORIGIN. A custom domain is optional; the hosting provider's HTTPS address works.

For temporary same-Wi-Fi use, configure APP_ORIGIN to the laptop's exact private LAN address, e.g. `http://192.168.1.10:3000`, and allow the Windows firewall only on your private network. Local HTTP does not encrypt passwords or records; HTTPS hosting is the recommended business setup. The laptop must remain running. With no APP_ORIGIN, only localhost/loopback access is accepted.

Hosting is not provisioned automatically by this repository. A static hosting provider alone cannot run the login/database server. No Supabase project or external database has been configured.

## Saving, synchronization and conflicts

Entries first save in this device's browser and then upload to the authenticated private server. The status clearly distinguishes pending entries from confirmed server saves. Other open devices refresh approximately every five seconds while idle. An open entry form is not replaced; cancel/finish it and click Refresh if another device has changed the records.

If two devices save from the same old revision, the server rejects the stale write. The app offers a download of that device's pending records, then **Load shared records · keep a recovery copy**. Review the pending backup and re-enter missing transactions against the latest records. It never automatically merges financial entries or force-overwrites the other device. A recovery copy also remains locally until sign-out.

After a page reload, a matching pending save retries before the workspace opens. A session expires after 12 hours. Sign in again on the same browser to resume pending data. Sign-out waits for pending saves, revokes that session and clears the device's cached business data. Business records are cached locally while signed in, so use your own trusted devices.

**Open backup** deliberately replaces the shared dataset after its preview/confirmation and uses the same revision/conflict checks. All devices then see the restored records. Download a current backup first.

## Password and recovery

- **Account & backups → Change password** requires the current password. Other device sessions are revoked and must sign in again.
- Forgotten password: on the server machine run `node reset-password.js` (or **RESET-PASSWORD.bat** on Windows). Enter the new password twice; it is not echoed. This requires local server filesystem access and signs out all sessions. Run it against the same LPG_DATA_DIR as the app.
- Setup can only create the first owner. Keep server filesystem access private.

Passwords are salted and hashed using scrypt. Session tokens are stored hashed in SQLite, with HttpOnly/SameSite cookies and CSRF checks. Authentication attempts are rate limited. No password is saved in browser localStorage.

## Backups and operational limits

The private server retains the **20 previous dataset revisions** and **the latest saved snapshot for each of the last 30 active days**. Download them from Account & backups; restore through Open backup. These recovery copies are inside the same database, not an offsite backup. Continue downloading independent JSON backups and use your host's disk backup service to protect against disk/account loss. For a file-level SQLite backup, stop the server first and copy its entire data directory; do not copy only an active WAL database file.

The dataset limit is 10 MB. The first version has one owner account, online login, a single shared dataset and conflict recovery. It is not a full offline-installable PWA or a multi-user role system. PWA installation/offline access can be added separately without weakening login protection.


Version 2.1 also synchronizes cash/online transfers, payment references and measured/estimated residual gas write-offs. Those records are included in device backups and server recovery snapshots.
