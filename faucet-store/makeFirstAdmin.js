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
