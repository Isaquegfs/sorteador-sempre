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
    `
      relative flex items-center px-3 py-2.5 rounded-lg text-sidebar-foreground font-medium
      transition-all duration-300 ease-in-out
      ${isActive 
        ? 'bg-transparent' 
        : 'bg-transparent hover:bg-glass-orange/10 hover:backdrop-blur-md hover:shadow-[0_4px_20px_rgba(242,116,53,0.15)] hover:border hover:border-glass-orange/30'
      }
    `.trim();

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <div className="p-6 border-b border-sidebar-border">
        <img src={logo} alt="Sempre Internet" className="h-10 w-auto mx-auto" />
      </div>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="w-full">
                    <NavLink 
                      to={item.url} 
                      className={getNavClasses}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      <span className="text-sm">{item.title}</span>
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
