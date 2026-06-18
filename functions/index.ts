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
      currency: order.currency,
      keyId: razorpayKeyId
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
      currency,
      billingCycle
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
      billingCycle: billingCycle || 'monthly',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amountTotal: Number(amount) / 100,
      currency,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update user membership 
    if (userId) {
      const isYearly = billingCycle === 'yearly';
      const durationDays = isYearly ? 365 : 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + durationDays);

      await db.collection('users').doc(userId).set({
        membershipPlanId: planId,
        membershipStatus: 'active',
        membershipBillingCycle: billingCycle || 'monthly',
        membershipStartDate: admin.firestore.FieldValue.serverTimestamp(),
        membershipExpiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
        lastPaymentId: razorpay_payment_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Fetch plan details to get the plan name
      let planName = "Premium";
      try {
        const planDoc = await db.collection('plans').doc(planId).get();
        if (planDoc.exists) {
          planName = planDoc.data()?.name || "Premium";
        }
      } catch (err) {
        console.log("Error fetching plan name in Cloud Function:", err);
      }

      // Save membership notification
      await db.collection('notifications').add({
        userId,
        title: "Subscription Purchased! 👑",
        description: `You successfully subscribed to the ${planName} plan.`,
        type: "membership",
        image: "/assets/headerLogo.png",
        read: false,
        createdAt: Date.now(),
        link: "/profile"
      });
    }

    console.log("Payment verified and saved");

    return { success: true, paymentId: razorpay_payment_id };

  } catch (error: any) {
    console.error("Verification error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

export const deleteUser = functions.https.onCall(async (data, context) => {
  try {
    console.log("deleteUser called");

    const { uid } = data;

    if (!uid) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required user UID');
    }

    // Security check: Verify that the caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Check caller's role from Firestore
    const db = admin.firestore();
    const callerRef = db.collection('users').doc(context.auth.uid);
    const callerSnap = await callerRef.get();
    
    if (!callerSnap.exists) {
      throw new functions.https.HttpsError('permission-denied', 'Caller user document does not exist.');
    }

    const callerData = callerSnap.data();
    if (callerData?.role !== 'admin' && callerData?.role !== 'superadmin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admin or superadmin can delete users.');
    }

    // Perform deletion in Firebase Authentication
    await admin.auth().deleteUser(uid);
    console.log(`Successfully deleted auth user with UID: ${uid}`);

    return { success: true, message: `Successfully deleted user ${uid} from authentication.` };

  } catch (error: any) {
    console.error("Error in deleteUser function:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message || 'Failed to delete user.');
  }
});