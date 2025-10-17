import { Home, Shuffle, Users, Database, FileText, Settings, Info, UserCog } from 'lucide-react';
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
    { title: 'Início', url: '/admin', icon: Home },
    { title: 'Sorteador', url: '/admin/sorteador', icon: Shuffle },
    { title: 'Cadastros', url: '/admin/cadastros', icon: Users },
    { title: 'Cadastro Base', url: '/admin/base', icon: Database },
    { title: 'Logs', url: '/admin/logs', icon: FileText },
  ];

  const adminItems = [
    { title: 'Gerenciar Usuários', url: '/admin/usuarios', icon: UserCog },
    { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
  ];

  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'bg-secondary text-secondary-foreground font-medium' 
      : 'hover:bg-muted/50';

  return (
    <Sidebar className="border-r">
      <div className="p-4 border-b">
        <img src={logo} alt="Sempre Internet" className="h-12 w-auto mx-auto" />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClasses}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavClasses}>
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin/sobre" className={getNavClasses}>
                    <Info className="mr-2 h-4 w-4" />
                    <span>Sobre</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
