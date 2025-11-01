import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useCompanies } from '@/hooks/use-companies';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export function EmailDiagnostic() {
  const { user } = useAuth();
  const { currentCompany } = useCompanies();
  const [results, setResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    const diagnosticResults: any[] = [];

    try {
      // 1. Verificar se as tabelas existem
      diagnosticResults.push({
        test: 'Verificar tabela notification_preferences',
        status: 'running',
      });

      try {
        const { error: prefsError } = await supabase
          .from('notification_preferences')
          .select('id')
          .limit(1);

        diagnosticResults[diagnosticResults.length - 1] = {
          test: 'Verificar tabela notification_preferences',
          status: prefsError ? 'error' : 'success',
          message: prefsError ? prefsError.message : 'Tabela existe',
        };
      } catch (err: any) {
        diagnosticResults[diagnosticResults.length - 1] = {
          test: 'Verificar tabela notification_preferences',
          status: 'error',
          message: err.message,
        };
      }

      // 2. Verificar tabela email_configurations
      diagnosticResults.push({
        test: 'Verificar tabela email_configurations',
        status: 'running',
      });

      try {
        const { error: configError } = await supabase
          .from('email_configurations')
          .select('id')
          .limit(1);

        diagnosticResults[diagnosticResults.length - 1] = {
          test: 'Verificar tabela email_configurations',
          status: configError ? 'error' : 'success',
          message: configError ? configError.message : 'Tabela existe',
        };
      } catch (err: any) {
        diagnosticResults[diagnosticResults.length - 1] = {
          test: 'Verificar tabela email_configurations',
          status: 'error',
          message: err.message,
        };
      }

      // 3. Verificar tabela email_queue
      diagnosticResults.push({
        test: 'Verificar tabela email_queue',
        status: 'running',
      });

      try {
        const { error: queueError } = await supabase
          .from('email_queue')
          .select('id')
          .limit(1);

        diagnosticResults[diagnosticResults.length - 1] = {
          test: 'Verificar tabela email_queue',
          status: queueError ? 'error' : 'success',
          message: queueError ? queueError.message : 'Tabela existe',
        };
      } catch (err: any) {
        diagnosticResults[diagnosticResults.length - 1] = {
          test: 'Verificar tabela email_queue',
          status: 'error',
          message: err.message,
        };
      }

      // 4. Verificar tabela email_logs
      diagnosticResults.push({
        test: 'Verificar tabela email_logs',
        status: 'running',
      });

      try {
        const { error: logsError } = await supabase
          .from('email_logs')
          .select('id')
          .limit(1);

        diagnosticResults[diagnosticResults.length - 1] = {
          test: 'Verificar tabela email_logs',
          status: logsError ? 'error' : 'success',
          message: logsError ? logsError.message : 'Tabela existe',
        };
      } catch (err: any) {
        diagnosticResults[diagnosticResults.length - 1] = {
          test: 'Verificar tabela email_logs',
          status: 'error',
          message: err.message,
        };
      }

      // 5. Verificar configuração de email da empresa
      if (currentCompany) {
        diagnosticResults.push({
          test: 'Verificar configuração de email da empresa',
          status: 'running',
        });

        const { data: emailConfig, error: configCheckError } = await supabase
          .from('email_configurations')
          .select('*')
          .eq('company_id', currentCompany.id)
          .maybeSingle();

        diagnosticResults[diagnosticResults.length - 1] = {
          test: 'Verificar configuração de email da empresa',
          status: emailConfig ? 'success' : 'warning',
          message: emailConfig
            ? `Provedor configurado: ${emailConfig.active_provider}`
            : 'Nenhuma configuração de email encontrada. Configure SendGrid/SMTP/Resend.',
          data: emailConfig,
        };
      }

      // 6. Verificar preferências do usuário
      if (user) {
        diagnosticResults.push({
          test: 'Verificar preferências de notificação do usuário',
          status: 'running',
        });

        const { data: userPrefs, error: prefsCheckError } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        diagnosticResults[diagnosticResults.length - 1] = {
          test: 'Verificar preferências de notificação do usuário',
          status: userPrefs ? 'success' : 'warning',
          message: userPrefs
            ? `Notificações por email: ${userPrefs.email_notifications ? 'Ativadas' : 'Desativadas'}`
            : 'Nenhuma preferência encontrada. Será criada automaticamente.',
          data: userPrefs,
        };
      }

      // 7. Verificar emails na fila
      diagnosticResults.push({
        test: 'Verificar emails na fila',
        status: 'running',
      });

      const { data: queueItems, error: queueCheckError } = await supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      diagnosticResults[diagnosticResults.length - 1] = {
        test: 'Verificar emails na fila',
        status: 'success',
        message: queueItems
          ? `${queueItems.length} email(s) na fila. Últimos: ${queueItems.map((q) => q.status).join(', ')}`
          : 'Fila vazia',
        data: queueItems,
      };

      // 8. Verificar logs de email
      diagnosticResults.push({
        test: 'Verificar logs de emails enviados',
        status: 'running',
      });

      const { data: logs, error: logsCheckError } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

      diagnosticResults[diagnosticResults.length - 1] = {
        test: 'Verificar logs de emails enviados',
        status: 'success',
        message: logs
          ? `${logs.length} log(s) encontrado(s). ${logs.filter((l) => l.success).length} sucesso(s), ${logs.filter((l) => !l.success).length} falha(s)`
          : 'Nenhum log encontrado',
        data: logs,
      };

      // 9. Testar inserção na fila
      if (user && currentCompany) {
        diagnosticResults.push({
          test: 'Testar inserção de email na fila',
          status: 'running',
        });

        try {
          const { data: testInsert, error: insertError } = await supabase
            .from('email_queue')
            .insert({
              user_id: user.id,
              company_id: currentCompany.id,
              to_email: user.email!,
              subject: '[TESTE DIAGNÓSTICO] Impulse Financeiro',
              html_content: '<h1>Email de teste do diagnóstico</h1>',
              notification_type: 'due_soon',
              scheduled_for: new Date().toISOString(),
            })
            .select()
            .single();

          diagnosticResults[diagnosticResults.length - 1] = {
            test: 'Testar inserção de email na fila',
            status: insertError ? 'error' : 'success',
            message: insertError
              ? `Erro ao inserir: ${insertError.message}`
              : `Email inserido com sucesso! ID: ${testInsert.id}`,
            data: testInsert,
          };
        } catch (err: any) {
          diagnosticResults[diagnosticResults.length - 1] = {
            test: 'Testar inserção de email na fila',
            status: 'error',
            message: err.message,
          };
        }
      }

      setResults(diagnosticResults);
    } catch (err: any) {
      console.error('Diagnostic error:', err);
      setResults([
        ...diagnosticResults,
        {
          test: 'Erro geral',
          status: 'error',
          message: err.message,
        },
      ]);
    } finally {
      setTesting(false);
    }
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico do Sistema de Email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button onClick={runDiagnostics} disabled={testing}>
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando diagnóstico...
              </>
            ) : (
              'Executar Diagnóstico'
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <Alert
                key={index}
                variant={result.status === 'error' ? 'destructive' : 'default'}
              >
                <div className="flex items-start gap-3">
                  {getIcon(result.status)}
                  <div className="flex-1">
                    <AlertTitle>{result.test}</AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                    {result.data && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                          Ver detalhes
                        </summary>
                        <pre className="mt-2 overflow-auto rounded bg-muted p-2">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <Alert>
            <AlertTitle>Próximos passos:</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                {results.some((r) => r.status === 'error') && (
                  <li>
                    <strong>Erros encontrados:</strong> Verifique se a migration SQL foi executada
                    corretamente no Supabase.
                  </li>
                )}
                {results.some(
                  (r) =>
                    r.test === 'Verificar configuração de email da empresa' &&
                    r.status === 'warning'
                ) && (
                  <li>
                    <strong>Configure o provedor:</strong> Vá em Configurações → Notificações →
                    Configurar Email
                  </li>
                )}
                {results.some(
                  (r) => r.test === 'Testar inserção de email na fila' && r.status === 'success'
                ) && (
                  <li>
                    <strong>Email adicionado à fila!</strong> Agora você precisa fazer o deploy da
                    Edge Function para processar a fila.
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
