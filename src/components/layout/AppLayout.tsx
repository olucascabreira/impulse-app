import React, { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { Settings, LogOut, Eye, EyeOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, user, signOut } = useAuth();
  const [valuesHidden, setValuesHidden] = useState(() => {
    // Get initial state from localStorage or default to false
    const saved = localStorage.getItem('valuesHidden');
    return saved === 'true';
  });
  
  // Get initials for the avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 
      ? names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase()
      : names[0][0].toUpperCase();
  };

  // Toggle the visibility of financial values
  const toggleValuesVisibility = () => {
    const newValue = !valuesHidden;
    setValuesHidden(newValue);
    localStorage.setItem('valuesHidden', String(newValue));
    
    // Dispatch a custom event so other components can listen for changes
    window.dispatchEvent(new CustomEvent('valuesVisibilityChanged', { detail: newValue }));
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-background flex items-center px-6">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1">
              <h1 className="font-semibold text-lg text-foreground">
                Sistema de Gestão Financeira
              </h1>
            </div>
            
            {/* Hide/Show Values Button */}
            <Button 
              variant="ghost" 
              size="sm"
              className="mr-2 h-8 w-8 p-0"
              onClick={toggleValuesVisibility}
              title={valuesHidden ? "Mostrar valores" : "Ocultar valores"}
            >
              {valuesHidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            
            {/* User profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full flex items-center justify-center p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={profile?.avatar_url || profile?.photo_url || ""} 
                      alt={profile?.nome || "User"} 
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(profile?.nome || user?.email || "User")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-4" align="end">
                <div className="flex items-center gap-3 pb-3 mb-3 border-b">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={profile?.avatar_url || profile?.photo_url || ""} 
                      alt={profile?.nome || "User"} 
                    />
                    <AvatarFallback className="text-sm">
                      {getInitials(profile?.nome || user?.email || "User")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {profile?.nome || "Nome não informado"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email || "Email não disponível"}
                    </p>
                  </div>
                </div>
                
                <DropdownMenuItem 
                  onClick={() => {
                    // Navigate to settings page
                    window.location.href = '/configuracoes';
                  }}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={signOut}
                  className="flex items-center gap-2 mt-1"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          
          <main className="flex-1 p-6 bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}