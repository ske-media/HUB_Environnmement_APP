import React, { createContext, useContext, useEffect, useState } from 'react';
import { setSessionPersistence, supabase } from '../lib/supabase';
import { clearSessionStorage } from '../lib/sessionUtils';
import type { User } from '../types';

export type UserRole = 'super_admin' | 'admin' | 'engineer' | 'user';

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEngineer: boolean;
  userRole: UserRole;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEngineer, setIsEngineer] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let networkErrorCount = 0;
    const MAX_NETWORK_ERRORS = 5;

    // Fonction pour détecter les erreurs réseau
    const isNetworkError = (error: any): boolean => {
      if (!error) return false;
      const message = error?.message || String(error);
      return (
        message.includes('Failed to fetch') ||
        message.includes('ERR_NAME_NOT_RESOLVED') ||
        message.includes('ERR_INTERNET_DISCONNECTED') ||
        message.includes('ERR_NETWORK_CHANGED') ||
        error?.name === 'NetworkError' ||
        error?.name === 'TypeError'
      );
    };

    // Écouter TOUS les changements d'état d'authentification
    // onAuthStateChange gère déjà la session initiale via INITIAL_SESSION
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (session?.user) {
          const role = (session.user.user_metadata.role || 'user') as UserRole;
          const normalizedRole: UserRole = 
            role === 'super_admin' ? 'super_admin' :
            role === 'admin' ? 'admin' :
            role === 'engineer' ? 'engineer' :
            'user';
          
          setUser({
            id: session.user.id,
            email: session.user.email!,
            full_name: session.user.user_metadata.full_name,
            first_name: session.user.user_metadata.first_name,
            last_name: session.user.user_metadata.last_name,
            role: normalizedRole === 'super_admin' ? 'super_admin' : 'user' // Garde compatibilité avec type User
          });
          
          setUserRole(normalizedRole);
          setIsSuperAdmin(normalizedRole === 'super_admin');
          setIsAdmin(normalizedRole === 'super_admin' || normalizedRole === 'admin');
          setIsEngineer(normalizedRole === 'engineer' || normalizedRole === 'admin' || normalizedRole === 'super_admin');
          
          networkErrorCount = 0; // Réinitialiser le compteur en cas de succès
        } else {
          setUser(null);
          setIsSuperAdmin(false);
          setIsAdmin(false);
          setIsEngineer(false);
          setUserRole('user');
          // Nettoyer le stockage en cas de déconnexion
          if (event === 'SIGNED_OUT') {
            clearSessionStorage();
          }
        }
      } catch (error: any) {
        // Si c'est une erreur réseau répétée, arrêter les tentatives
        if (isNetworkError(error)) {
          networkErrorCount++;
          console.warn(`[AuthContext] Erreur réseau détectée (${networkErrorCount}/${MAX_NETWORK_ERRORS})`);
          
          if (networkErrorCount >= MAX_NETWORK_ERRORS) {
            console.error('[AuthContext] Trop d\'erreurs réseau. Arrêt des tentatives de connexion.');
            setUser(null);
            setIsSuperAdmin(false);
            setIsAdmin(false);
            setIsEngineer(false);
            setUserRole('user');
          }
        }
      }

      // Le loading passe à false après la première réponse de Supabase
      if (loading) {
        setLoading(false);
      }
    });

    // Nettoyage
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean) => {
    try {
      setSessionPersistence(rememberMe);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message === 'Failed to fetch') {
          throw new Error('Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.');
        }
        
        // Gestion spécifique de l'erreur "Email not confirmed"
        if (error.message === 'Email not confirmed') {
          throw new Error('Votre email n\'est pas encore confirmé. Veuillez vérifier votre boîte mail et cliquer sur le lien de confirmation.');
        }
        
        // Gestion des autres erreurs d'authentification
        if (error.message === 'Invalid login credentials' || error.code === 'invalid_credentials') {
          throw new Error('Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.');
        }
        
        throw error;
      }
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        const message = error.message || '';
        const isSessionAlreadyInvalid =
          error.status === 403 ||
          message.toLowerCase().includes('session') ||
          message.toLowerCase().includes('refresh token') ||
          message.toLowerCase().includes('invalid token');

        // Si la session est déjà invalide côté Supabase, on force une déconnexion locale
        // pour éviter de bloquer l'utilisateur.
        if (!isSessionAlreadyInvalid) {
          throw error;
        }
      }
      // Nettoyer le stockage après déconnexion
      clearSessionStorage();
      setUser(null);
      setIsSuperAdmin(false);
      setIsAdmin(false);
      setIsEngineer(false);
      setUserRole('user');
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Impossible de se déconnecter. Veuillez vérifier votre connexion internet.');
      }
      throw error;
    }
  };

  if (loading) {
    // On peut éventuellement afficher un loader global ici.
    return null;
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      signIn, 
      signOut, 
      isSuperAdmin, 
      isAdmin,
      isEngineer,
      userRole,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}