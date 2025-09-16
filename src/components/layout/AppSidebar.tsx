import { useState } from "react";
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  Users, 
  FileText, 
  PieChart,
  Settings,
  LogOut,
  DollarSign,
  Wallet
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Fluxo de Caixa", url: "/fluxo-caixa", icon: TrendingUp },
  { title: "Contas Bancárias", url: "/contas-bancarias", icon: Wallet },
  { title: "Lançamentos", url: "/lancamentos", icon: DollarSign },
  { title: "Contas a Pagar", url: "/contas-pagar", icon: CreditCard },
  { title: "Contas a Receber", url: "/contas-receber", icon: FileText },
  { title: "Contatos", url: "/contatos", icon: Users },
  { title: "Plano de Contas", url: "/plano-contas", icon: PieChart },
  { title: "Relatórios", url: "/relatorios", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

  const handleSignOut = () => {
    signOut();
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-64"}
    >
      <SidebarContent>
        <div className="p-4">
          <h2 className={`font-bold text-xl text-sidebar-primary ${isCollapsed ? 'hidden' : 'block'}`}>
            Impulse Financeiro
          </h2>
          {isCollapsed && (
            <div className="text-sidebar-primary text-xl font-bold">IF</div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configurações</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/configuracoes" className={getNavCls}>
                    <Settings className="mr-2 h-4 w-4" />
                    {!isCollapsed && <span>Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!isCollapsed && (
          <div className="text-xs text-sidebar-foreground/60 mb-2">
            {profile?.nome} ({profile?.perfil})
          </div>
        )}
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "sm"}
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}