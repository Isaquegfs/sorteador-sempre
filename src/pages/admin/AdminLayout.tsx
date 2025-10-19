import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AdminLayout = () => {
  const { user, isLoading, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin && !isModerator) {
        // Aguardar um pouco para as roles serem carregadas
        setTimeout(() => {
          if (!isAdmin && !isModerator) {
            toast({
              title: 'Acesso negado',
              description: 'Você não tem permissão para acessar esta área.',
              variant: 'destructive',
            });
            navigate('/');
          }
        }, 500);
      }
    }
  }, [user, isLoading, isAdmin, isModerator, navigate, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </Button>
          </header>

          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
