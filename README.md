# QuidTools

A small browser-based toolbox: five free tools and five additional tools unlocked with a £1/month subscription.

## Run locally

Requires Node.js 18 or newer.

```sh
npm start
```

Open http://localhost:3000.

## Admin access

Set a strong, private password when starting the server to enable owner sign-in and unlock Plus without a subscription:

```sh
ADMIN_PASSWORD='your-long-unique-password' npm start
```

Use the **Admin sign in** control in the membership panel. The password is only checked by the server; the login cookie is HttpOnly, SameSite, and expires after 12 hours. Admin sessions are cleared when the server restarts. Do not use a shared or guessable password, especially on a public deployment.

## Payments

The Subscribe button in `index.html` links to a Stripe payment link. Payments do not unlock Plus automatically; use admin sign-in or add automatic verification separately.

The app does not include an ad network. The free tier has a clearly marked sponsor placement; Plus hides it. Add an ad provider separately if you want the free placement to serve paid ads.