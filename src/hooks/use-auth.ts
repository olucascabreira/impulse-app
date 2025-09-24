import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;
  user_id: string;
  nome: string;
  perfil: 'admin' | 'financeiro' | 'visualizacao';
  telefone?: string | null;
  cargo?: string | null;
  photo_url?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              if (error) {
                console.error('Error fetching profile:', error);
                toast({
                  title: "Erro ao carregar perfil",
                  description: "Tente fazer login novamente.",
                  variant: "destructive",
                });
              } else {
                setProfile(profileData as Profile);
              }
            } catch (error) {
              console.error('Error in profile fetch:', error);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    return { data };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Cadastro realizado!",
      description: "Verifique seu e-mail para confirmar a conta.",
    });

    return { data };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    }
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile?.id) return { error: new Error('Perfil não encontrado') };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data as Profile);
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });

      return { data };
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Ocorreu um erro ao atualizar suas informações.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const uploadUserProfilePicture = async (file: File) => {
    if (!user || !profile) return { error: new Error('User not authenticated') };

    try {
      // Validar tipo de arquivo
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      const maxSize = 2 * 1024 * 1024; // 2MB
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Formato de arquivo não suportado. Use PNG, JPG, JPEG ou WEBP.');
      }
      
      if (file.size > maxSize) {
        throw new Error('Arquivo muito grande. O tamanho máximo é 2MB.');
      }

      // Upload do arquivo para o storage do Supabase
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-profile-pictures')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL público do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('user-profile-pictures')
        .getPublicUrl(fileName);

      // Atualizar registro do perfil com a URL da foto
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Atualizar estado local
      setProfile(data as Profile);

      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });

      return { data };
    } catch (error: any) {
      console.error('Error uploading user profile picture:', error);
      toast({
        title: "Erro ao atualizar foto",
        description: error.message || "Ocorreu um erro ao atualizar sua foto de perfil.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const removeUserProfilePicture = async () => {
    if (!user || !profile) return { error: new Error('User not authenticated') };

    try {
      // Update the profile record to remove the photo URL
      const { data, error } = await supabase
        .from('profiles')
        .update({ photo_url: null })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setProfile(data as Profile);

      toast({
        title: "Foto removida!",
        description: "Sua foto de perfil foi removida com sucesso.",
      });

      return { data };
    } catch (error: any) {
      console.error('Error removing user profile picture:', error);
      toast({
        title: "Erro ao remover foto",
        description: error.message || "Ocorreu um erro ao remover sua foto de perfil.",
        variant: "destructive",
      });
      return { error };
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    uploadUserProfilePicture,
    removeUserProfilePicture,
  };
}