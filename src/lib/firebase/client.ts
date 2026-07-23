import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken,
  type AppCheck,
} from "firebase/app-check";

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
  storageBucket: pickValue(
    process.env.NEXT_PUBLIC_AUTH_FIREBASE_STORAGE_BUCKET,
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
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
    storageBucket:
      firebaseConfig.storageBucket ||
      (projectId ? `${projectId}.firebasestorage.app` : undefined),
  };
}

export function isFirebaseConfigured() {
  return getMissingFirebaseEnvVars().length === 0;
}

let appCheckInstance: AppCheck | null = null;
let debugTokenConfigured = false;

function configureAppCheckDebugTokenIfNeeded() {
  if (debugTokenConfigured || typeof window === "undefined") {
    return;
  }

  debugTokenConfigured = true;

  const isProduction = process.env.NODE_ENV === "production";
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN?.trim();

  if (!isProduction && debugToken) {
    (self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
      debugToken;
  }
}

function initializeAppCheckIfConfigured(app: ReturnType<typeof getFirebaseApp>) {
  if (typeof window === "undefined" || appCheckInstance) {
    return;
  }

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?.trim();
  if (!siteKey) {
    return;
  }

  // La llave de App Check está registrada como reCAPTCHA Enterprise en
  // app-oficial-leon; el provider debe coincidir o el exchange devuelve 400.
  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export function getAppCheckInstance(): AppCheck | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!appCheckInstance && isFirebaseConfigured()) {
    getFirebaseApp();
  }

  return appCheckInstance;
}

export async function getAppCheckToken(
  forceRefresh = false,
): Promise<string | null> {
  if (typeof window === "undefined" || !isFirebaseConfigured()) {
    return null;
  }

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY?.trim();
  if (!siteKey) {
    return null;
  }

  configureAppCheckDebugTokenIfNeeded();

  try {
    getFirebaseApp();
    if (!appCheckInstance) {
      return null;
    }

    const result = await getToken(appCheckInstance, forceRefresh);
    return result.token;
  } catch {
    return null;
  }
}

function getFirebaseApp() {
  if (!isFirebaseConfigured()) {
    const missingVars = getMissingFirebaseEnvVars();
    throw new Error(
      `Firebase no está configurado. Faltan: ${missingVars.join(", ")}`,
    );
  }

  const config = normalizeFirebaseConfig();
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  initializeAppCheckIfConfigured(app);
  return app;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

const STORE_FIRESTORE_DATABASE =
  process.env.NEXT_PUBLIC_FIRESTORE_DATABASE?.trim() || "tiendacl";

export function getFirebaseFirestore() {
  return getFirestore(getFirebaseApp(), STORE_FIRESTORE_DATABASE);
}

export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}
