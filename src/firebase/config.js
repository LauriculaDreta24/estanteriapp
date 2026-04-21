import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Substitueix aquestes claus per les de la teva consola de Firebase
// (Mira el fitxer FIREBASE_SETUP.md per a més ajuda)
const firebaseConfig = {
  apiKey: "AIzaSyDZrTPTLkQclY6aSZVCrVlmbpjr5a14fY4",
  authDomain: "estanteriappbiblioteca.firebaseapp.com",
  projectId: "estanteriappbiblioteca",
  storageBucket: "estanteriappbiblioteca.firebasestorage.app",
  messagingSenderId: "50371078574",
  appId: "1:50371078574:web:61284c18e155f9a650c03f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
