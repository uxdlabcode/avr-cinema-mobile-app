import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Razorpay from 'razorpay';
import crypto from 'crypto';

admin.initializeApp();

// Get Razorpay keys
const razorpayKeyId = functions.config().razorpay?.key_id || "";
const razorpayKeySecret = functions.config().razorpay?.key_secret || "";

console.log("Razorpay Keys Loaded:", !!razorpayKeyId, !!razorpayKeySecret);

export const createRazorpayOrder = functions.https.onCall(async (data, context) => {
  try {
    console.log("createRazorpayOrder called");

    const { planId, price, name, userId } = data;

    if (!userId || !planId || !price) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new functions.https.HttpsError('internal', 'Razorpay keys not configured');
    }

    const amountInPaise = Math.round(Number(price) * 100);

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId,
        planId,
        planName: name || 'Subscription'
      }
    });

    console.log("Order created:", order.id);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    };

  } catch (error: any) {
    console.error("Error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  try {
    console.log("verifyRazorpayPayment called");

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      planId,
      amount,
      currency
    } = data;

    // Verify signature
    const secret = razorpayKeySecret;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid signature');
    }

    // Save to Firestore
    const db = admin.firestore();

    await db.collection('transactions').doc(razorpay_payment_id).set({
      type: 'razorpay.payment.success',
      userId,
      planId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amountTotal: amount,
      currency,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user membership
    if (userId) {
      await db.collection('users').doc(userId).update({
        membershipPlanId: planId,
        membershipStatus: 'active',
        membershipStartDate: admin.firestore.FieldValue.serverTimestamp(),
        lastPaymentId: razorpay_payment_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log("Payment verified and saved");

    return { success: true, paymentId: razorpay_payment_id };

  } catch (error: any) {
    console.error("Verification error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});