/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

admin.initializeApp();

export const addAdminRole = functions.https.onCall(
  async (data: any, context: any) => {
    if (!context.auth || context.auth.token.admin !== true) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only admins can add other admins."
      );
    }
    const email = typeof data.email === "string" ? data.email : "";
    if (!email) {
      throw new functions.https.HttpsError("invalid-argument", "Email required.");
    }
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, { admin: true });
      return { message: `Success! ${email} is now an admin.` };
    } catch (error) {
      throw new functions.https.HttpsError("not-found", "User not found.");
    }
  }
);
