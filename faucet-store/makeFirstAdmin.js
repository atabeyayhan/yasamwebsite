/**
 * @fileoverview This script is for bootstrapping the first admin user.
 * It should be run manually ONE TIME from a secure local environment.
 * To run this script:
 * 1. Make sure you have the service account key file.
 * 2. Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of the key file.
 *    Example (PowerShell): $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\key.json"
 * 3. Run the script: node makeFirstAdmin.js
 *
 * DO NOT commit the service account key file to Git.
 * After the first admin is created, you should use the in-app admin tools.
 */

const admin = require("firebase-admin");

// The service account key is loaded from the GOOGLE_APPLICATION_CREDENTIALS environment variable
// const serviceAccount = require("./yasam-website-firebase-adminsdk-fbsvc-92d681f95f.json");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://yasam-website-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.firestore();

const email = "devre1132@gmail.com"; // <-- Replace with your email

admin.auth().getUserByEmail(email)
  .then(user => {
    return admin.auth().setCustomUserClaims(user.uid, { admin: true });
  })
  .then(() => {
    console.log(`Success! ${email} is now an admin.`);
    process.exit(0);
  })
  .catch(err => {
    console.error("Error setting admin claim:", err);
    process.exit(1);
  });
