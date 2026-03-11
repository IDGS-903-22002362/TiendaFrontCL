import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

function pickValue(...values: Array<string | undefined>) {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

const firebaseConfig = {
  apiKey: pickValue(
    process.env.NEXT_PUBLIC_AUTH_FIREBASE_API_KEY,
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  ),
  authDomain: pickValue(
    process.env.NEXT_PUBLIC_AUTH_FIREBASE_AUTH_DOMAIN,
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: pickValue(
    process.env.NEXT_PUBLIC_AUTH_FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  appId: pickValue(
    process.env.NEXT_PUBLIC_AUTH_FIREBASE_APP_ID,
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ),
};

const REQUIRED_FIREBASE_ENV_VARS = [
  {
    key: "apiKey",
    envHint: "NEXT_PUBLIC_AUTH_FIREBASE_API_KEY o NEXT_PUBLIC_FIREBASE_API_KEY",
  },
  {
    key: "projectId",
    envHint:
      "NEXT_PUBLIC_AUTH_FIREBASE_PROJECT_ID o NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  },
] as const;

export function getMissingFirebaseEnvVars() {
  return REQUIRED_FIREBASE_ENV_VARS.flatMap((item) => {
    const value = firebaseConfig[item.key];
    return value ? [] : [item.envHint];
  });
}

function normalizeFirebaseConfig() {
  const projectId = firebaseConfig.projectId;
  return {
    ...firebaseConfig,
    authDomain:
      firebaseConfig.authDomain ||
      (projectId ? `${projectId}.firebaseapp.com` : undefined),
  };
}

export function isFirebaseConfigured() {
  return getMissingFirebaseEnvVars().length === 0;
}

function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    const missingVars = getMissingFirebaseEnvVars();
    throw new Error(
      `Firebase no está configurado. Faltan: ${missingVars.join(", ")}`,
    );
  }

  const config = normalizeFirebaseConfig();
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}
