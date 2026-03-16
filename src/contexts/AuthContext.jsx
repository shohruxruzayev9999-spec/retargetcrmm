// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange } from '../firebase/auth';
import { getUserProfile, getUserPrivate } from '../firebase/firestore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);         // firebase auth user
  const [profile, setProfile] = useState(null);   // users/{uid}
  const [privateData, setPrivateData] = useState(null); // userPrivate/{uid}
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const [prof, priv] = await Promise.all([
          getUserProfile(firebaseUser.uid),
          getUserPrivate(firebaseUser.uid),
        ]);
        setProfile(prof);
        setPrivateData(priv);
      } else {
        setUser(null);
        setProfile(null);
        setPrivateData(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const role = profile?.role || null;

  const can = {
    seeSalary: role === 'ceo',
    seeReports: role === 'ceo' || role === 'investor',
    crudProjects: role === 'ceo' || role === 'manager' || role === 'supervisor',
    manageEmployees: role === 'ceo' || role === 'manager' || role === 'supervisor',
    fullAccess: role === 'ceo',
    readOnly: role === 'investor',
    isEmployee: role === 'employee',
  };

  return (
    <AuthContext.Provider value={{ user, profile, privateData, authLoading, role, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
