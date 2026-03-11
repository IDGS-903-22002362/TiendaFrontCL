import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

export async function getFirebaseIdTokenWithEmailPassword(
  email: string,
  password: string,
) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user.getIdToken();
}

export async function getFirebaseIdTokenWithGooglePopup() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user.getIdToken();
}

export async function signOutFirebaseClient() {
  const auth = getFirebaseAuth();
  await signOut(auth);
}
