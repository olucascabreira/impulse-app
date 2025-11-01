import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useCompanies } from '@/hooks/use-companies';
import { toast } from '@/hooks/use-toast';

export type EmailProvider = 'sendgrid' | 'smtp' | 'resend';

export interface NotificationPreferences {
  id?: string;
  user_id?: string;
  company_id?: string;
  email_notifications: boolean;
  due_date_alerts: boolean;
  monthly_reports: boolean;
  app_notifications: boolean;
  email_provider: EmailProvider;
  days_before_due: number;
  preferred_time: string;
}

export interface EmailConfiguration {
  id?: string;
  company_id?: string;
  active_provider: EmailProvider;

  // SendGrid
  sendgrid_api_key?: string;
  sendgrid_from_email?: string;
  sendgrid_from_name?: string;

  // SMTP
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;
  smtp_secure?: boolean;

  // Resend
  resend_api_key?: string;
  resend_from_email?: string;
  resend_from_name?: string;
}

const defaultPreferences: NotificationPreferences = {
  email_notifications: true,
  due_date_alerts: true,
  monthly_reports: false,
  app_notifications: true,
  email_provider: 'smtp',
  days_before_due: 3,
  preferred_time: '09:00:00',
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const { currentCompany } = useCompanies();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [emailConfig, setEmailConfig] = useState<EmailConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && currentCompany) {
      loadPreferences();
      loadEmailConfiguration();
    }
  }, [user, currentCompany]);

  const loadPreferences = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setPreferences(data as NotificationPreferences);
      } else {
        // Criar preferências padrão
        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user!.id,
            company_id: currentCompany!.id,
            ...defaultPreferences,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newPrefs as NotificationPreferences);
      }
    } catch (error: any) {
      console.error('Error loading notification preferences:', error);
      toast({
        title: 'Erro ao carregar preferências',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmailConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setEmailConfig(data as EmailConfiguration);
      }
    } catch (error: any) {
      console.error('Error loading email configuration:', error);
    }
  };

  const savePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      setSaving(true);

      const updated = { ...preferences, ...newPreferences };

      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user!.id,
          company_id: currentCompany!.id,
          ...updated,
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences(data as NotificationPreferences);

      toast({
        title: 'Preferências salvas',
        description: 'Suas preferências de notificação foram atualizadas.',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  };

  const saveEmailConfiguration = async (config: Partial<EmailConfiguration>) => {
    try {
      setSaving(true);

      const updated = { ...emailConfig, ...config };

      const { data, error } = await supabase
        .from('email_configurations')
        .upsert({
          company_id: currentCompany!.id,
          ...updated,
        })
        .select()
        .single();

      if (error) throw error;

      setEmailConfig(data as EmailConfiguration);

      toast({
        title: 'Configuração salva',
        description: 'As configurações de email foram atualizadas.',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error saving email configuration:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  };

  const testEmailConfiguration = async () => {
    try {
      setSaving(true);

      // Adicionar email de teste à fila
      const { error } = await supabase
        .from('email_queue')
        .insert({
          user_id: user!.id,
          company_id: currentCompany!.id,
          to_email: user!.email!,
          subject: 'Teste de Configuração de Email - Impulse Financeiro',
          html_content: `
            <h1>Teste de Email</h1>
            <p>Parabéns! Suas configurações de email estão funcionando corretamente.</p>
            <p>Este é um email de teste enviado via <strong>${emailConfig?.active_provider}</strong>.</p>
          `,
          notification_type: 'due_soon',
          scheduled_for: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Email de teste enviado',
        description: 'Um email de teste foi adicionado à fila. Verifique sua caixa de entrada em alguns instantes.',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Erro ao enviar teste',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  };

  const processEmailQueue = async () => {
    try {
      setSaving(true);

      // Chamar a Edge Function para processar a fila
      const { data, error } = await supabase.functions.invoke('send-email-notifications', {
        body: {},
      });

      if (error) throw error;

      // Verificar quantos emails foram processados
      const result = data as { processed: number; sent: number; failed: number };

      if (result.processed === 0) {
        toast({
          title: 'Fila vazia',
          description: 'Não há emails pendentes para processar.',
        });
      } else {
        toast({
          title: 'Fila processada com sucesso',
          description: `${result.sent} email(s) enviado(s), ${result.failed} falha(s). Verifique sua caixa de entrada.`,
        });
      }

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Error processing email queue:', error);
      toast({
        title: 'Erro ao processar fila',
        description: error.message || 'Verifique se a Edge Function está deployada e configurada.',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    emailConfig,
    loading,
    saving,
    savePreferences,
    saveEmailConfiguration,
    testEmailConfiguration,
    processEmailQueue,
    reload: () => {
      loadPreferences();
      loadEmailConfiguration();
    },
  };
}
