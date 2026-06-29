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
        uid: userId,
        planId,
        startDate: Date.now(),
        endDate: expiryDate.getTime(),
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

// ─── Device Session Management ────────────────────────────────────────────────
// Collection: deviceLocations/{userId}
// Schema:
//   {
//     uid: string,
//     email: string,
//     devices: [{
//       deviceId, deviceName, browser, platform, os,
//       ip, city, country, latitude, longitude,
//       loginTime, lastActive
//     }],
//     createdAt, updatedAt
//   }
//
// Max 2 devices per user (enforced client-side + here as backup).
// This function is a SERVER-SIDE backup for device recording.
// The primary enforcement is done client-side in deviceManager.ts.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_DEVICES = 2;

/**
 * recordDeviceLogin (Cloud Function backup)
 * Called as a server-side backup to record/update a device in deviceLocations.
 * Primary enforcement happens client-side. This function is an additional
 * server-side safety net and is used for server-triggered scenarios.
 */
export const recordDeviceLogin = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }

    const { userId, deviceId, deviceName, browser, platform, os, ip, city, country, latitude, longitude } = data;

    if (!userId || !deviceId || !deviceName) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: userId, deviceId, deviceName');
    }

    // Security check: Verify that the caller matches the target userId
    if (context.auth.uid !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot modify another user\'s devices.');
    }

    const db = admin.firestore();
    const docRef = db.collection('deviceLocations').doc(userId);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      const now = admin.firestore.Timestamp.now();

      let devices: any[] = [];
      let createdAt = now;

      if (snap.exists) {
        const existing = snap.data()!;
        devices = existing.devices || [];
        createdAt = existing.createdAt || now;
      }

      // ─── Filter Stale Devices (older than 30 days) ───
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const thresholdMillis = now.toMillis() - thirtyDaysMs;
      devices = devices.filter((d: any) => {
        const lastActiveTime = d.lastActive?.toMillis?.() || d.lastActive?.seconds * 1000 || 0;
        return lastActiveTime > thresholdMillis;
      });

      const idx = devices.findIndex((d: any) => d.deviceId === deviceId);

      if (idx >= 0) {
        // Update existing device
        devices[idx] = {
          ...devices[idx],
          deviceName,
          browser: browser || devices[idx].browser,
          platform: platform || devices[idx].platform,
          os: os || devices[idx].os,
          ip: ip || devices[idx].ip,
          city: city || devices[idx].city,
          country: country || devices[idx].country,
          latitude: latitude ?? devices[idx].latitude,
          longitude: longitude ?? devices[idx].longitude,
          lastActive: now,
        };
      } else {
        // New device — enforce MAX_DEVICES
        if (devices.length >= MAX_DEVICES) {
          throw new functions.https.HttpsError(
            'resource-exhausted',
            'Maximum device limit reached. Please logout from another device first.'
          );
        }
        devices.push({
          deviceId,
          deviceName,
          browser: browser || '',
          platform: platform || 'Desktop',
          os: os || '',
          ip: ip || null,
          city: city || null,
          country: country || null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          loginTime: now,
          lastActive: now,
        });
      }

      transaction.set(docRef, {
        uid: userId,
        email: data.email || '',
        devices,
        createdAt,
        updatedAt: now,
      }, { merge: true });
    });

    return { success: true };

  } catch (error: any) {
    console.error("recordDeviceLogin error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error.message || 'Failed to record device login.');
  }
});

/**
 * revokeDeviceSession
 * Removes a specific device from deviceLocations/{userId}.
 * Called from the Profile page "Log Out" button for other devices.
 */
export const revokeDeviceSession = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }

    const { userId, deviceId } = data;

    if (!userId || !deviceId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: userId, deviceId');
    }

    const db = admin.firestore();

    // Security check: Only the account owner or an admin/superadmin can revoke
    if (context.auth.uid !== userId) {
      const callerSnap = await db.collection('users').doc(context.auth.uid).get();
      const role = callerSnap.data()?.role;
      if (role !== 'admin' && role !== 'superadmin') {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized to revoke this session.');
      }
    }

    const docRef = db.collection('deviceLocations').doc(userId);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);

      if (snap.exists) {
        let devices: any[] = snap.data()?.devices || [];
        devices = devices.filter((d: any) => d.deviceId !== deviceId);

        transaction.set(docRef, {
          devices,
          updatedAt: admin.firestore.Timestamp.now(),
        }, { merge: true });
      }
    });

    return { success: true };

  } catch (error: any) {
    console.error("revokeDeviceSession error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error.message || 'Failed to revoke device session.');
  }
});

/**
 * deleteDeviceDocument
 * Deletes the entire deviceLocations/{userId} document.
 * Called during account deletion.
 */
export const deleteDeviceDocument = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }

    const { userId } = data;

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: userId');
    }

    // Security: only the user themselves (or admin) can delete
    if (context.auth.uid !== userId) {
      const db = admin.firestore();
      const callerSnap = await db.collection('users').doc(context.auth.uid).get();
      const role = callerSnap.data()?.role;
      if (role !== 'admin' && role !== 'superadmin') {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized.');
      }
    }

    const db = admin.firestore();
    await db.collection('deviceLocations').doc(userId).delete();

    return { success: true };

  } catch (error: any) {
    console.error("deleteDeviceDocument error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error.message || 'Failed to delete device document.');
  }
});