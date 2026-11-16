import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export function authErrorMessage(error: any): string {
  switch (error?.code) {
    case 'auth/email-already-in-use': return 'Este e-mail já está cadastrado.';
    case 'auth/invalid-email': return 'E-mail inválido.';
    case 'auth/weak-password': return 'Senha muito fraca.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests': return 'Muitas tentativas. Tente novamente mais tarde.';
    case 'auth/network-request-failed': return 'Sem conexão com a internet.';
    case 'auth/requires-recent-login': return 'Por segurança, confirme sua senha atual.';
    case 'auth/operation-not-allowed': return 'Operação não permitida. Verifique o Firebase Auth.';
    default: return 'Ocorreu um erro inesperado. Tente novamente.';
  }
}

// US01
export async function registerUser(name: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name.trim() });
  await setDoc(doc(db, 'users', cred.user.uid), {
    displayName: name.trim(),
    deviceId: null,
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

// US02
export async function loginUser(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export const logoutUser = () => signOut(auth);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim());

// ---- US14: alterar dados da conta ----
async function reauth(currentPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw { code: 'auth/user-not-found' };
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  return user;
}

export async function updateDisplayName(name: string) {
  const user = auth.currentUser;
  if (!user) throw { code: 'auth/user-not-found' };
  await updateProfile(user, { displayName: name.trim() });
  await updateDoc(doc(db, 'users', user.uid), { displayName: name.trim() });
  await user.reload();
}

// O Firebase envia um link de verificação para o NOVO e-mail; a troca só vale após o clique.
export async function requestEmailChange(currentPassword: string, newEmail: string) {
  const user = await reauth(currentPassword);
  await verifyBeforeUpdateEmail(user, newEmail.trim());
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const user = await reauth(currentPassword);
  await updatePassword(user, newPassword);
}

export async function deleteAccount(currentPassword: string) {
  const user = await reauth(currentPassword);
  await deleteDoc(doc(db, 'users', user.uid));
  await deleteUser(user);
}
