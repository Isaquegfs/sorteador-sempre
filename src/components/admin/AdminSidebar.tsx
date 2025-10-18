import { Home, Sparkles, Users, Database, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo-sempre.png';

export function AdminSidebar() {
  const { isAdmin } = useAuth();

  const menuItems = [
    { title: 'Dashboard', url: '/admin', icon: Home },
    { title: 'Participantes', url: '/admin/participantes', icon: Users },
    { title: 'Base Oficial', url: '/admin/base-oficial', icon: Database },
    { title: 'Sorteio', url: '/admin/sorteio', icon: Sparkles },
    { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
  ];

  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'relative bg-gradient-glass text-sidebar-accent-foreground font-medium shadow-glass backdrop-blur-sm border border-glass-orange/20 transition-all duration-300' 
      : 'hover:bg-gradient-glass hover:backdrop-blur-sm hover:shadow-glass hover:border hover:border-glass-orange/20 transition-all duration-300';

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <div className="p-4 border-b border-sidebar-border">
        <img src={logo} alt="Sempre Internet" className="h-12 w-auto mx-auto" />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground font-semibold">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClasses}
                      style={{
                        WebkitBackdropFilter: 'blur(10px)',
                      }}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
