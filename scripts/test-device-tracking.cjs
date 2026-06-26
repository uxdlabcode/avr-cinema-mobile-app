/**
 * Test script for device login tracking using Firebase Client SDK (Single Doc Schema).
 * 
 * Run from project root:
 *   node scripts/test-device-tracking.cjs
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyANtU-Zbwx8qdYzXdQdcB1scIm8PG37I2A",
  authDomain: "avr-cinema-app.firebaseapp.com",
  projectId: "avr-cinema-app",
  storageBucket: "avr-cinema-app.firebasestorage.app",
  messagingSenderId: "678679269485",
  appId: "1:678679269485:web:7e23c26d61d5b35b916f64",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testDeviceTracking() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║    AVR Cinema — Device Tracking Test (Max 2 Limit)  ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📱 deviceLocations collection (Single Doc per User)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const devicesSnap = await getDocs(collection(db, 'deviceLocations'));

    if (devicesSnap.empty) {
      console.log('  ❌ No user device documents found.');
      console.log('     → Log in to the app in the browser to trigger recording.\n');
    } else {
      console.log(`  Found ${devicesSnap.size} user document(s):\n`);

      for (const docSnap of devicesSnap.docs) {
        const data = docSnap.data();
        const devices = data.devices || [];

        console.log(`  ┌─ User ID (Doc ID): ${docSnap.id}`);
        console.log(`  │  Total Active Devices: ${devices.length} (Max allowed: 2)`);

        devices.forEach((dev, idx) => {
          const loggedInAt = dev.loggedInAt?.toDate?.() || dev.loggedInAt || 'N/A';
          console.log(`  │    [${idx + 1}] Device ID: ${dev.deviceId}`);
          console.log(`  │        Name:     ${dev.deviceName}`);
          console.log(`  │        Location: ${dev.location?.city || '?'}, ${dev.location?.region || '?'}, ${dev.location?.country || '?'}`);
          console.log(`  │        Logged In:${loggedInAt}`);
        });

        // Verify user's loginDevices array matches
        try {
          const userDocSnap = await getDoc(doc(db, 'users', docSnap.id));
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const loginDevices = userData?.loginDevices || [];
            const devIds = devices.map(d => d.deviceId);
            const isMatch = JSON.stringify(loginDevices.sort()) === JSON.stringify(devIds.sort());

            console.log(`  │  ─── User Doc Sync Check ───`);
            console.log(`  │  User email:    ${userData?.email || '?'}`);
            console.log(`  │  loginDevices:  [${loginDevices.join(', ')}]`);
            console.log(`  │  Arrays synced: ${isMatch ? '✅ YES' : '❌ NO — MISMATCH!'}`);
          }
        } catch (err) {
          console.log(`  │  ⚠️ Could not read user doc (permissions)`);
        }
        console.log(`  └────────────────────────────────────────────\n`);
      }
    }
  } catch (err) {
    console.error('  ❌ Error querying deviceLocations:', err.message || err);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ Test complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testDeviceTracking()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Script error:', err.message || err);
    process.exit(1);
  });
