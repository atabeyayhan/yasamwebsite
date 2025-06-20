const admin = require("firebase-admin");
const fs = require("fs");

// The service account key is loaded from the GOOGLE_APPLICATION_CREDENTIALS environment variable
// const serviceAccount = require("./yasam-website-firebase-adminsdk-fbsvc-92d681f95f.json");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://yasam-website-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.firestore();

async function listAdmins() {
  try {
    const listUsersResult = await admin.auth().listUsers();
    console.log("Searching for admins...");
    listUsersResult.users.forEach(user => {
      if (user.customClaims && user.customClaims.admin === true) {
        console.log(` - ${user.email} (UID: ${user.uid}) is an admin.`);
      }
    });
    console.log("Search complete.");
    process.exit(0);
  } catch (error) {
    console.error("Error listing users:", error);
    process.exit(1);
  }
}

listAdmins(); 