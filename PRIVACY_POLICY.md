# Privacy Policy for CF Harvest

**Last Updated:** September 2026

**CF Harvest** ("the Extension") is committed to protecting your privacy. This policy outlines how your data is handled.

---

### 1. Data Collection and Usage
- **No Personal Data Collection:** CF Harvest does **not** collect, store, or transmit any personal identifiable information (PII) to external servers or third parties.
- **Codeforces Public API:** The extension communicates exclusively with the public [Codeforces API](https://codeforces.com/apiHelp) (`https://codeforces.com/*`) to fetch public user submission data, contest rankings, and problem statistics.
- **Local Storage:** Extension settings (such as rating filters, custom date ranges, and alt account handles) are stored locally on your device via Chrome Sync Storage (`chrome.storage.sync`). This data never leaves your browser.

---

### 2. Permissions Required
- `storage`: Used to save user preferences locally in your browser sync storage.
- `host_permissions` (`https://codeforces.com/*`): Required to inject profile analytics graphs and load public submission statistics on Codeforces profile pages (`https://codeforces.com/profile/*`).

---

### 3. Contact & Support
If you have any questions or feedback regarding this Privacy Policy, please open an issue on the official GitHub repository:
- **GitHub Repository:** [https://github.com/OmarMoBadr/cf-analytics](https://github.com/OmarMoBadr/cf-analytics)
