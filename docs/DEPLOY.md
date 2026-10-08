# Deploy DataPrep Desk on GitHub and Cloudflare Free

This application contains **only static files**. It does not need Pages Functions, a dynamic Worker script, KV, D1, R2, storage buckets or secrets.

## 1 — Register the domain (optional until go-live)

The proposed domain is `dataprepdesk.com`. At the time of selection, the Verisign WHOIS query returned **No match** and RDAP returned **404**. That is a moment-in-time check, **not a reservation**. Confirm availability and pricing at your registrar before paying.

Buy **only the domain** if you intend to use it; decline unrelated hosting and email upsells. Domain pricing and auto-renewal behaviour vary by registrar. You already have free hosting through Cloudflare Static Assets.

**Important if you do not renew:** Do not leave this domain attached to recovery email, identity verification, Claude Console, OAuth clients, Cloudflare login or GitHub account ownership after you lose control of it. Migrate important accounts to a durable email address *before* expiration and verify recovery settings.

## 2 — Create a GitHub organization and repository

1. Open https://github.com/account/organizations/new
2. Select GitHub **Free** (if offered). Use organisation name `dataprepdesk`, if available. Otherwise update references in README and HTML to your chosen organisation name.
3. For a personally operated, unincorporated project, select **This organization belongs to: My personal account**.
4. Create an empty **public** repository named `dataprepdesk` inside the new organisation.
5. Leave GitHub's Initialise README, .gitignore and licence options **off**: all those files are already in this working tree.

On your homelab:

```bash
cd /root/dataprepdesk
git status
git remote -v
git remote add origin git@github.com:dataprepdesk/dataprepdesk.git
git push -u origin main
```

GitHub SSH authentication must already be configured. If not, use HTTPS with a GitHub token or configure an SSH key. Never paste a token into source code or README.

The repository is already committed locally, and this guide assumes you are pushing the prepared project. Do not overwrite existing remote history.

### Account privacy

Configure Git to use your GitHub **noreply** email for public contributions if you do not want to publish a personal email address. GitHub Settings → Emails has your exact noreply address. It is better to set that before the first push than after.

## 3 — Add the new domain to Cloudflare

1. Go to https://dash.cloudflare.com
2. Add `dataprepdesk.com` as a zone on the **Free** plan.
3. Cloudflare will show assigned nameservers. Update these at your domain registrar.
4. Make sure DNS status becomes **Active**. Preserve any existing mail records if present.

Do not point the apex to a VPS or old origin just to make the website work.

## 4 — Configure Cloudflare Worker from GitHub

1. Cloudflare → **Workers & Pages** → Create application.
2. Choose the Git import / Worker Builds option.
3. Authorise the GitHub integration for the new organisation and the repository `dataprepdesk`.
4. Production branch: `main`.
5. Root directory: repository root.
6. Worker name: `dataprepdesk` (matches `wrangler.jsonc`).
7. Build command: **leave blank**. There is no site build.
8. Deploy command: `npx wrangler deploy`.
9. Deploy and verify the initial Worker URL.

`wrangler.jsonc` defines `./public` as the assets directory and intentionally has **no** `main` entrypoint.

Once the Git-connected deployment is configured, future `git push` commands to `main` trigger deployment.

Alternatively deploy once from homelab using `npx wrangler login && npx wrangler deploy`.

## 5 — Attach the custom domain

1. Cloudflare → Workers & Pages → `dataprepdesk`.
2. **Settings → Domains & Routes → Add → Custom Domain**.
3. Enter `dataprepdesk.com`.
4. Resolve any old/conflicting A, AAAA or CNAME records if Cloudflare asks you to.
5. Wait for the hostname/certificate to activate and test using HTTPS.

Optional: add `www.dataprepdesk.com` and redirect it to the apex.

After everything works, you may disable the default `workers.dev` hostname and preview URLs (if offered) to avoid showing the account slug in public.

### SSL 525 troubleshooting

If you see a Cloudflare 525 error, check that the **Custom Domain** is actually attached to the Worker and the hostname does not have stale DNS records pointing to an unrelated TLS origin. Do not blindly turn off Full/Strict SSL.

## 6 — Verify launch

- https://dataprepdesk.com/ — landing page
- https://dataprepdesk.com/workbench — CSV/JSON cleaning UI
- https://dataprepdesk.com/json-tools — formatter and validator
- https://dataprepdesk.com/guide — public user instructions
- https://dataprepdesk.com/privacy — privacy notice
- From Workbench: load sample, inspect metrics, apply cleaning, restore, download CSV and JSON.
- Verify CSV quote handling and JSON import with a real sample.
- Verify mobile design and normal links.
- Confirm the GitHub URLs now point to the repo you created.

There is no `/api` endpoint in this version. A 404 there is expected.

## 7 — Email and the Anthropic application

Cloudflare Email Routing can forward `founder@dataprepdesk.com` to an existing mailbox for free. Forwarding **does not inherently provide outbound sending**. Verify forwarding before using that address with a service.

Answer application questions accurately: owner, organization type, funding status, prior applications, current usage and the distinction between shipped tools and *planned* Claude-powered features. A different top-level domain or company label **does not establish eligibility** and does not reverse a previous decision.

Use the stable email address you control long-term for GitHub, registrar and Cloudflare account recovery. If you decide to let `dataprepdesk.com` lapse later, remove it from all important accounts and notify contacts before expiry.

## 8 — Hosting cost

The website uses Cloudflare Static Assets without Worker script execution, a server or database. Normal domain renewal is separate. No API or AI inference costs exist in this version. Do not add paid services or usage-based infrastructure unless a real feature warrants it.

Check Cloudflare's then-current Free plan policies if the project grows or you add dynamic functionality.
