import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Razorpay from "razorpay";
import crypto from "crypto";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";

// Validate keys on cold start
if (!razorpayKeyId || !razorpayKeySecret) {
  console.warn("⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set in environment variables");
}

export const createRazorpayOrder = onCall(
  { cors: true },
  async (request) => {
    try {
      const { planId, price, name, userId } = request.data;
      if (!userId || !planId || !price) {
        throw new HttpsError("invalid-argument", "Missing required parameters: userId, planId, and price are required");
      }

      if (!razorpayKeyId || !razorpayKeySecret) {
         throw new HttpsError("internal", "Razorpay keys not configured on server. Please contact support.");
      }

      // Validate price is a positive number
      const numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        throw new HttpsError("invalid-argument", "Price must be a positive number");
      }

      const instance = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });

      const amountInPaise = Math.round(numericPrice * 100);

      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${userId}_${Date.now()}`,
        notes: {
          userId,
          planId,
          planName: name || "Subscription"
        }
      };

      console.log(`Creating Razorpay order: plan=${planId}, amount=${amountInPaise} paise, user=${userId}`);

      const order = await instance.orders.create(options);

      console.log(`Razorpay order created: ${order.id}`);

      return { orderId: order.id, amount: order.amount, currency: order.currency };
    } catch (error: any) {
      console.error("Error creating Razorpay order:", {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        error: error.error,
      });

      // If it's already an HttpsError, re-throw it
      if (error instanceof HttpsError) {
        throw error;
      }

      // Map Razorpay-specific errors
      if (error.statusCode === 401) {
        throw new HttpsError("unauthenticated", "Payment service authentication failed. Please contact support.");
      }

      if (error.statusCode === 400) {
        throw new HttpsError("invalid-argument", error.error?.description || "Invalid order parameters");
      }

      throw new HttpsError("internal", "Failed to create payment order. Please try again later.");
    }
  }
);

export const verifyRazorpayPayment = onCall(
  { cors: true },
  async (request) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planId, amount, currency } = request.data;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new HttpsError("invalid-argument", "Missing required payment parameters");
      }

      if (!razorpayKeySecret) {
        throw new HttpsError("internal", "Server configuration error. Please contact support.");
      }

      console.log(`Verifying payment: order=${razorpay_order_id}, payment=${razorpay_payment_id}`);

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(body.toString())
        .digest("hex");

      const isAuthentic = expectedSignature === razorpay_signature;

      if (!isAuthentic) {
        console.error("Payment signature verification failed", {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
        });
        throw new HttpsError("permission-denied", "Invalid payment signature. Payment could not be verified.");
      }

      console.log(`Payment verified successfully: ${razorpay_payment_id}`);

      // Save to Firestore
      const db = admin.firestore();

      // Use a batch to also update the user's membership status
      const batch = db.batch();

      // Save transaction record
      const transactionRef = db.collection("transactions").doc(razorpay_payment_id);
      batch.set(transactionRef, {
        type: "razorpay.payment.success",
        userId: userId || null,
        planId: planId || null,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amountTotal: amount,
        currency: currency,
        status: "completed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update user's membership status if userId is provided
      if (userId) {
        const userRef = db.collection("users").doc(userId);
        batch.update(userRef, {
          membershipPlanId: planId,
          membershipStatus: "active",
          membershipStartDate: admin.firestore.FieldValue.serverTimestamp(),
          lastPaymentId: razorpay_payment_id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      console.log(`Transaction and user membership saved for payment: ${razorpay_payment_id}`);

      return { success: true, paymentId: razorpay_payment_id };
    } catch (error: any) {
      console.error("Error verifying Razorpay payment:", {
        message: error.message,
        code: error.code,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to verify payment. Please contact support with your payment details.");
    }
  }
);
