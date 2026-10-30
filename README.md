# QuidTools

A small browser-based toolbox: five free tools and five additional tools unlocked with a £1/month subscription.

## Run locally

Requires Node.js 18 or newer.

```sh
npm start
```

Open http://localhost:3000.

## Admin access

Admin sign-in unlocks Plus without a subscription. The server stores only a hash of the admin code, so the code itself is not in the repository. To use a different code, set `ADMIN_PASSWORD` when starting the server (it overrides the built-in one):

```sh
ADMIN_PASSWORD='your-long-unique-password' npm start
```

Use the **Admin sign in** control in the membership panel. The password is only checked by the server; the login cookie is HttpOnly, SameSite, and expires after 12 hours. Admin sessions are cleared when the server restarts. Do not use a shared or guessable password, especially on a public deployment.

## Payments

The Subscribe button in `index.html` links to a Stripe payment link. To unlock Plus automatically after payment:

1. Edit the payment link in Stripe. Under **After payment**, choose **Don't show confirmation page** and redirect to `https://your-site/?session_id={CHECKOUT_SESSION_ID}`.
2. In Stripe **Developers → API keys**, create a restricted key with **read** access to Checkout Sessions and Subscriptions.
3. Set it on the server as `STRIPE_SECRET_KEY`. Never put it in browser code or the repository.

The server checks the payment with Stripe, and the browser re-checks the saved subscription on each visit, so cancelled subscriptions lock again. `STRIPE_PRODUCT_ID` overrides the Plus product ID.

The app does not include an ad network. The free tier has a clearly marked sponsor placement; Plus hides it. Add an ad provider separately if you want the free placement to serve paid ads.