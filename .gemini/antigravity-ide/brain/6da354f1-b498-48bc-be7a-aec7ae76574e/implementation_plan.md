# Razorpay Payment & Subscription Integration

This plan outlines the steps required to completely replace Stripe with **Razorpay** for your membership payment flow.

## User Review Required

> [!IMPORTANT]
> **Razorpay Keys Configuration**: You will need to generate API keys in your Razorpay Dashboard (Test Mode).
> 1. Your **Key ID** (`rzp_test_...`) will go into the `.env` file on the frontend.
> 2. Your **Key Secret** will go into the `functions/.env` file.
> 3. You will also need a **Webhook Secret** if you decide to set up webhooks in Razorpay.

## Open Questions

> [!WARNING]
> 1. **Razorpay Subscriptions vs Standard Orders**: Razorpay has a dedicated "Subscriptions" API for recurring payments, and a standard "Orders" API for one-time payments. Do you want this to be a recurring subscription (requires creating Plans in the Razorpay Dashboard beforehand) or a simple one-time standard payment for the membership?
> 2. **Frontend Library**: I plan to use the `react-razorpay` library for a seamless checkout experience. Does that sound good?

## Proposed Changes

---

### Backend (Firebase Cloud Functions)

#### [MODIFY] `functions/package.json`
- Replace `stripe` dependency with `razorpay` and `crypto` (for signature verification).

#### [NEW] `functions/index.ts`
- **`createRazorpayOrder` (Callable)**: Takes the selected plan's price, creates a Razorpay Order using the Razorpay Node SDK, and returns the `order_id` to the frontend.
- **`verifyRazorpayPayment` (Callable)**: Takes the `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature` from the frontend, verifies the signature using your Key Secret, and saves the transaction metadata to your `transactions` Firestore collection.
- *(Optional)* **`razorpayWebhook` (HTTP)**: If you prefer asynchronous webhook tracking over immediate frontend verification.

---

### Frontend (React & Redux)

#### [MODIFY] `package.json`
- Remove `@stripe/stripe-js`.
- Install `react-razorpay`.

#### [MODIFY] `src/store/slices/membershipSlice.ts`
- Replace Stripe thunk with `createRazorpayOrderAsync`.
- Add a new thunk `verifyRazorpayPaymentAsync` to handle the backend verification after payment success.

#### [MODIFY] `src/pages/membership/Membership.tsx`
- Remove Stripe redirect logic.
- Initialize Razorpay Checkout when a plan is selected. The checkout will open as an overlay (modal) on top of the Membership page.
- On payment success (handled via Razorpay's `handler` callback), dispatch the verification thunk. If verified, display the `SubscriptionSuccess` component.

#### [MODIFY] `src/pages/membership/SubscriptionSuccess.tsx`
- Ensure this beautifully displays exactly like before but integrates with the new Razorpay success flow.

## Verification Plan

### Manual Verification
1. User logs in and visits `/membership`.
2. User clicks "Select" on a plan.
3. App calls `createRazorpayOrder` to get an Order ID.
4. Razorpay Checkout modal opens.
5. User completes payment with test UPI or Test Card.
6. Razorpay calls the success handler in the frontend.
7. Frontend calls `verifyRazorpayPayment` to cryptographically verify the payment and save the transaction to Firestore.
8. User is shown the `SubscriptionSuccess` component.
