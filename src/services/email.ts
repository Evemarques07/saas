/**
 * Serviço de envio de emails usando Supabase Edge Function + MailerSend
 */

import { supabase } from './supabase';

interface InviteEmailParams {
  email: string;
  companyName: string;
  inviteLink: string;
  invitedByName?: string;
}

/**
 * Envia email de convite para administrador de empresa
 * Usa Supabase Edge Function para evitar problemas de CORS
 */
export async function sendInviteEmail(params: InviteEmailParams): Promise<{ success: boolean; error?: string }> {
  const { email, companyName, inviteLink, invitedByName } = params;

  try {
    const { data, error } = await supabase.functions.invoke('send-invite-email', {
      body: {
        email,
        companyName,
        inviteLink,
        invitedByName,
      },
    });

    if (error) {
      console.error('[Email] Erro ao chamar Edge Function:', error);
      return { success: false, error: error.message };
    }

    if (data?.success) {
      console.log('[Email] Email enviado com sucesso para:', email);
      return { success: true };
    }

    console.error('[Email] Erro retornado pela Edge Function:', data?.error);
    return { success: false, error: data?.error || 'Erro desconhecido' };

  } catch (error) {
    console.error('[Email] Exceção ao enviar email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
