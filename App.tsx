
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { UserProfile } from './types';
import AuthView from './components/AuthView';
import SetPasswordModal from './components/SetPasswordModal';
import Dashboard from './components/Dashboard';
import LoadingScreen from './components/LoadingScreen';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        // Check if the user signed in with a password provider
        const hasPasswordProvider = firebaseUser.providerData.some(
          (p) => p.providerId === 'password'
        );

        if (!userDoc.exists()) {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${firebaseUser.email}`,
            hasSetPassword: hasPasswordProvider,
            status: 'online',
          };
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
          setNeedsPassword(!hasPasswordProvider);
        } else {
          const data = userDoc.data() as UserProfile;
          setProfile(data);
          // If the DB says they don't have a password, but they are a password provider user, sync it
          if (data.hasSetPassword === false && hasPasswordProvider) {
            await setDoc(userDocRef, { hasSetPassword: true }, { merge: true });
            setNeedsPassword(false);
          } else {
            setNeedsPassword(data.hasSetPassword === false);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        setNeedsPassword(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time profile updates
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        setProfile(data);
        setNeedsPassword(data.hasSetPassword === false);
      }
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) return <LoadingScreen />;

  if (!user) return <AuthView />;

  if (needsPassword) return <SetPasswordModal uid={user.uid} />;

  return <Dashboard profile={profile!} />;
};

export default App;
