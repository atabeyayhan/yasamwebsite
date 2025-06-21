/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

const db = admin.firestore();
const adminConfigRef = db.doc("adminConfig/master");

// Add a new admin and update the adminConfig document
export const addAdminRole = onCall(async (request) => {
  // Ensure the caller is an admin
  if (request.auth?.token.admin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Only admins can add other admins."
    );
  }

  const email: string = request.data.email;
  if (!email) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with an 'email' argument."
    );
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    // Set the custom claim
    await admin.auth().setCustomUserClaims(user.uid, {admin: true});

    // Update the adminConfig document in Firestore
    await adminConfigRef.set({
      emails: admin.firestore.FieldValue.arrayUnion(user.email),
      uids: admin.firestore.FieldValue.arrayUnion(user.uid),
    }, {merge: true});

    return {message: `Success! ${email} has been made an admin.`};
  } catch (error) {
    console.error("Error in addAdminRole:", error);
    throw new HttpsError("not-found", "User not found or an error occurred.");
  }
});

// Remove an admin and update the adminConfig document
export const removeAdminRole = onCall(async (request) => {
  // Ensure the caller is an admin
  if (request.auth?.token.admin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Only admins can remove other admins."
    );
  }

  const email: string = request.data.email;
  if (!email) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with an 'email' argument."
    );
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    // Remove the custom claim
    await admin.auth().setCustomUserClaims(user.uid, {admin: false});

    // Update the adminConfig document in Firestore
    await adminConfigRef.update({
      emails: admin.firestore.FieldValue.arrayRemove(user.email),
      uids: admin.firestore.FieldValue.arrayRemove(user.uid),
    });

    return {message: `Success! ${email} is no longer an admin.`};
  } catch (error) {
    console.error("Error in removeAdminRole:", error);
    throw new HttpsError("not-found", "User not found or an error occurred.");
  }
});

// List all admins from the adminConfig document
export const listAdmins = onCall(async (request) => {
  // Ensure the caller is an admin
  if (request.auth?.token.admin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Only admins can view the admin list."
    );
  }

  try {
    const snap = await adminConfigRef.get();
    if (!snap.exists) {
      return {emails: []};
    }
    const config = snap.data() || {};
    return {emails: config.emails || []};
  } catch (error) {
    console.error("Error in listAdmins:", error);
    throw new HttpsError("internal", "Error fetching admin list.");
  }
});
