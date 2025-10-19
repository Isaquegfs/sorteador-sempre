import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isModerator: boolean;
  isLoading: boolean;
  rolesLoaded: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isModerator: false,
  isLoading: true,
  rolesLoaded: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkUserRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsModerator(false);
          setRolesLoaded(true);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserRole(session.user.id);
      } else {
        setRolesLoaded(true);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar roles:', error);
        throw error;
      }

      console.log('Roles encontradas:', data);
      const roles = data?.map(r => r.role) || [];
      setIsAdmin(roles.includes('admin'));
      setIsModerator(roles.includes('moderator'));
    } catch (error) {
      console.error('Erro ao verificar roles:', error);
      setIsAdmin(false);
      setIsModerator(false);
    } finally {
      setRolesLoaded(true);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isModerator, isLoading, rolesLoaded }}>
      {children}
    </AuthContext.Provider>
  );
};
