import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import * as jwt from 'jsonwebtoken';

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

// ─── Forgot/Reset Password Management ─────────────────────────────────────────

const JWT_SECRET = 'avr_cinema_reset_secret_key_2026';

/**
 * sendForgotPasswordEmail
 * Validates if the user is present in the Firestore 'users' collection.
 * Generates a short-lived JWT reset token and sends a styled SMTP email.
 */
export const sendForgotPasswordEmail = functions.https.onCall(async (data, context) => {
  try {
    const { email } = data;

    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
    }

    const emailNormalized = email.trim().toLowerCase();

    // 1. Verify if user is present in Firestore 'users' collection
    const db = admin.firestore();
    const usersSnap = await db.collection('users')
      .where('email', '==', emailNormalized)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      throw new functions.https.HttpsError('not-found', 'Invalid user.');
    }

    // 2. Generate a secure, short-lived reset token (expires in 15 minutes)
    const token = jwt.sign({ email: emailNormalized }, JWT_SECRET, { expiresIn: '15m' });

    // 3. Build the reset link — always use the live production URL
    const resetLink = `https://avr-cinema-mobile-app.pages.dev/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(emailNormalized)}`;

    // 4. Configure nodemailer with Google App Password credentials
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'ashishkumaruxdlab@gmail.com',
        pass: 'skbo pgvj acad onss',
      },
    });

    // 5. Send HTML email with AVR Logo
    const logoUrl = 'https://avr-cinema-mobile-app.pages.dev/assets/headerLogo.png';
    const mailOptions = {
      from: '"AVR Cinema Support" <ashishkumaruxdlab@gmail.com>',
      to: emailNormalized,
      subject: 'Reset Your AVR Cinema Password',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #141414; color: #ffffff; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto; border: 1px solid #2a2a2a;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${logoUrl}" alt="AVR Cinema" style="height: 36px; max-width: 160px; object-fit: contain;" />
          </div>
          <div style="background-color: #1a1a1a; padding: 25px; border-radius: 8px; border: 1px solid #333333;">
            <h2 style="color: #ffffff; margin-top: 0; font-size: 18px; text-align: center;">Password Reset Request</h2>
            <p style="color: #cccccc; font-size: 14px; line-height: 1.5;">Hello,</p>
            <p style="color: #cccccc; font-size: 14px; line-height: 1.5;">We received a request to reset the password for your AVR Cinema account associated with <strong>${emailNormalized}</strong>.</p>
            <p style="color: #cccccc; font-size: 14px; line-height: 1.5; margin-bottom: 25px;">Please click the button below to choose a new password. This link is valid for 15 minutes.</p>
            <div style="text-align: center; margin-bottom: 25px;">
              <a href="${resetLink}" style="background-color: #ffffff; color: #000000; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; font-size: 14px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #888888; font-size: 11px; line-height: 1.4; border-top: 1px solid #222222; padding-top: 15px; margin-top: 20px;">
              If you didn't request a password reset, you can safely ignore this email. Your password won't change until you create a new one.
            </p>
          </div>
          <p style="text-align: center; color: #666666; font-size: 11px; margin-top: 20px;">&copy; 2026 AVR Cinema. All Rights Reserved.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email successfully sent to: ${emailNormalized}`);
    return { success: true };

  } catch (error: any) {
    console.error("sendForgotPasswordEmail error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error.message || 'Failed to send forgot password email.');
  }
});

/**
 * resetPasswordWithToken
 * Decodes the JWT token, fetches user's auth record, and updates password in Firebase Auth.
 */
export const resetPasswordWithToken = functions.https.onCall(async (data, context) => {
  try {
    const { token, newPassword } = data;

    if (!token || !newPassword) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing token or new password.');
    }

    if (newPassword.length < 6) {
      throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters.');
    }

    // 1. Verify and decode reset token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err: any) {
      console.warn("Token verification failed:", err);
      throw new functions.https.HttpsError('unauthenticated', 'The reset link is invalid or has expired.');
    }

    const email = decoded.email;
    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid token payload.');
    }

    // 2. Fetch user auth record from Firebase Auth
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err: any) {
      console.error("User not found in Firebase Auth:", err);
      throw new functions.https.HttpsError('not-found', 'User account does not exist.');
    }

    // 3. Update the password in Firebase Auth
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword,
    });

    console.log(`Password successfully updated for user UID: ${userRecord.uid} (${email})`);
    return { success: true };

  } catch (error: any) {
    console.error("resetPasswordWithToken error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error.message || 'Failed to reset password.');
  }
});

/**
 * resetPasswordDirect
 * Verifies user exists in Firestore 'users' collection then directly updates Firebase Auth password.
 * Used by the single-page forgot password flow.
 */
export const resetPasswordDirect = functions.https.onCall(async (data, context) => {
  try {
    const { email, newPassword } = data;

    if (!email || !newPassword) {
      throw new functions.https.HttpsError('invalid-argument', 'Email and new password are required.');
    }

    if (newPassword.length < 6) {
      throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters.');
    }

    const emailNormalized = email.trim().toLowerCase();

    // 1. Verify user is present in Firestore 'users' collection
    const db = admin.firestore();
    const usersSnap = await db.collection('users')
      .where('email', '==', emailNormalized)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      throw new functions.https.HttpsError('not-found', 'Invalid user.');
    }

    // 2. Fetch user auth record
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(emailNormalized);
    } catch (err: any) {
      throw new functions.https.HttpsError('not-found', 'User account does not exist.');
    }

    // 3. Update the password in Firebase Auth
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword,
    });

    console.log(`Password directly reset for UID: ${userRecord.uid} (${emailNormalized})`);
    return { success: true };

  } catch (error: any) {
    console.error("resetPasswordDirect error:", error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error.message || 'Failed to reset password.');
  }
});