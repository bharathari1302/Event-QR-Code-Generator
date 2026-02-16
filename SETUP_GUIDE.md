# System Configuration Guide

## 1. Firebase Admin SDK Credentials
These are required for the server-side API (uploading participants, verifying tokens).

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project.
3.  Click the **Gear Icon** (Settings) > **Project settings**.
4.  Navigate to the **Service accounts** tab.
5.  Click **Generate new private key** > **Generate key**.
6.  A JSON file will download. Open it with a text editor (Notepad, VS Code).
7.  Copy the values into your `.env.local`:
    *   `FIREBASE_PROJECT_ID` -> `project_id` from JSON
    *   `FIREBASE_CLIENT_EMAIL` -> `client_email` from JSON
    *   `FIREBASE_PRIVATE_KEY` -> `private_key` from JSON (Copy the entire string including `-----BEGIN PRIVATE KEY...`)

> **Note**: For the Client SDK variables (`NEXT_PUBLIC_FIREBASE_...`), go to **Project settings** > **General**, scroll down to "Your apps", and select/create a Web App. Copy the `firebaseConfig` object values.

## 2. Email Settings (Gmail)
To send emails using Gmail, you cannot use your regular password because Google blocks "Less Secure Apps". You must use an **App Password**.

1.  Go to your [Google Account Security](https://myaccount.google.com/security).
2.  Ensure **2-Step Verification** is enabled (required).
3.  Searching for **App Passwords** in the search bar at the top (or look under "How you sign in to Google").
4.  Create a new App Password:
    *   **App name**: "Event QR System"
    *   Click **Create**.
5.  Copy the 16-character code (it looks like `abcd efgh ijkl mnop`).
6.  Update your `.env.local`:
    *   `EMAIL_USER` -> Your Gmail address (e.g., `user@gmail.com`)
    *   `EMAIL_PASS` -> The 16-character App Password (remove spaces if you want, but strictly it handles them).

### Alternative: Resend (Easier)
If Gmail is difficult, sign up for [Resend.com](https://resend.com) (Free tier is great).
1.  Get an API Key.
2.  Update code to use Resend SDK instead of Nodemailer (requires code change).
*For now, sticking to Gmail is fine if you follow the App Password steps.*
