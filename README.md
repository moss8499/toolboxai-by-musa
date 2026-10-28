# QuidTools

A small browser-based toolbox: five free tools and five additional tools unlocked with a £1/month PayPal subscription.

## Run locally

Requires Node.js 18 or newer.

```sh
npm start
```

Open http://localhost:3000. The tools work without PayPal credentials; checkout stays disabled until PayPal is configured.

## Admin access

Set a strong, private password when starting the server to enable owner sign-in and unlock Plus without a subscription:

```sh
ADMIN_PASSWORD='your-long-unique-password' npm start
```

Use the **Admin sign in** control in the membership panel. The password is only checked by the server; the login cookie is HttpOnly, SameSite, and expires after 12 hours. Admin sessions are cleared when the server restarts. Do not use a shared or guessable password, especially on a public deployment.

## Connect PayPal

1. Create a REST app in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/) and copy its client ID and secret. Use sandbox app credentials while testing.
2. Create a subscription product with a monthly plan priced at GBP 1.00 and copy the plan ID.
3. Your live client ID is configured as the default. Set `PAYPAL_CLIENT_ID` only when overriding it, such as when testing with a sandbox app. No HTML edits are needed.

```sh
PAYPAL_CLIENT_SECRET=your-client-secret \
PAYPAL_PLAN_ID=your-monthly-plan-id \
PAYPAL_ENV=sandbox \
npm start
```

For sandbox testing, include `PAYPAL_CLIENT_ID=your-sandbox-client-id` in the command above. For live payments, the configured client ID is used by default; set `PAYPAL_ENV=live` and use its matching secret and live plan ID.

The app uses PayPal's subscription SDK, verifies the approved subscription server-side, and redirects successful signups to `/thanks.html`. Customers can cancel through PayPal. Keep the client secret only in server environment variables; never put it in browser code.

The app does not include an ad network. The free tier has a clearly marked sponsor placement; Plus hides it. Add an ad provider separately if you want the free placement to serve paid ads.