// src/contexts/AppContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeUsers,
  subscribeProjects,
  subscribeEmployeeProjects,
  subscribeNotifications,
} from '../firebase/firestore';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const { user, role } = useAuth();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUsers([]);
      setProjects([]);
      setNotifications([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    const unsubs = [];

    // Users — everyone except employee sees all
    if (role !== 'employee') {
      unsubs.push(subscribeUsers(setUsers));
    }

    // Projects — employees see only assigned
    if (role === 'employee') {
      unsubs.push(subscribeEmployeeProjects(user.uid, (data) => {
        setProjects(data);
        setDataLoading(false);
      }));
    } else {
      unsubs.push(subscribeProjects((data) => {
        setProjects(data);
        setDataLoading(false);
      }));
    }

    // Notifications
    unsubs.push(subscribeNotifications(user.uid, setNotifications));

    return () => unsubs.forEach((u) => u());
  }, [user, role]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider value={{ users, projects, notifications, unreadCount, dataLoading }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
