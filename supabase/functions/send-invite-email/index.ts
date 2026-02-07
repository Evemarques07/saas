// Supabase Edge Function para enviar emails de convite via MailerSend
// Deploy: npx supabase functions deploy send-invite-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MAILERSEND_API_URL = 'https://api.mailersend.com/v1/email';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteEmailRequest {
  email: string;
  companyName: string;
  inviteLink: string;
  invitedByName?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MAILERSEND_API_TOKEN = Deno.env.get('MAILERSEND_API_TOKEN');
    const FROM_EMAIL = Deno.env.get('MAILERSEND_FROM_EMAIL');
    const FROM_NAME = Deno.env.get('MAILERSEND_FROM_NAME') || 'Mercado Virtual';

    if (!FROM_EMAIL) {
      throw new Error('MAILERSEND_FROM_EMAIL não configurado');
    }

    if (!MAILERSEND_API_TOKEN) {
      throw new Error('MAILERSEND_API_TOKEN não configurado');
    }

    const { email, companyName, inviteLink, invitedByName }: InviteEmailRequest = await req.json();

    if (!email || !companyName || !inviteLink) {
      return new Response(
        JSON.stringify({ error: 'email, companyName e inviteLink são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subject = `Você foi convidado para gerenciar ${companyName} no Mercado Virtual`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite Mercado Virtual</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                Mercado Virtual
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Gestão de Vendas Inteligente
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 22px; font-weight: 600;">
                Você foi convidado! 🎉
              </h2>

              <p style="margin: 0 0 16px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                ${invitedByName ? `<strong>${invitedByName}</strong> convidou você` : 'Você foi convidado'} para ser <strong>administrador</strong> da empresa:
              </p>

              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
                <p style="margin: 0; color: #6366f1; font-size: 24px; font-weight: 700;">
                  ${companyName}
                </p>
              </div>

              <p style="margin: 0 0 24px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Clique no botão abaixo para criar sua conta e começar a gerenciar a empresa:
              </p>

              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}"
                       style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                      Aceitar Convite
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Ou copie e cole este link no seu navegador:<br>
                <a href="${inviteLink}" style="color: #6366f1; word-break: break-all;">${inviteLink}</a>
              </p>

              <hr style="margin: 32px 0; border: none; border-top: 1px solid #e4e4e7;">

              <p style="margin: 0; color: #a1a1aa; font-size: 13px; line-height: 1.5;">
                Este convite expira em <strong>7 dias</strong>.<br>
                Se você não esperava este email, pode ignorá-lo com segurança.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} Mercado Virtual - Gestão de Vendas<br>
                Enviado automaticamente, não responda este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const text = `
Você foi convidado para gerenciar ${companyName} no Mercado Virtual!

${invitedByName ? `${invitedByName} convidou você` : 'Você foi convidado'} para ser administrador da empresa ${companyName}.

Clique no link abaixo para aceitar o convite e criar sua conta:
${inviteLink}

Este convite expira em 7 dias.

Se você não esperava este email, pode ignorá-lo com segurança.

---
Mercado Virtual - Gestão de Vendas
    `.trim();

    // Enviar email via MailerSend
    const response = await fetch(MAILERSEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERSEND_API_TOKEN}`,
      },
      body: JSON.stringify({
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        to: [
          {
            email: email,
            name: email,
          },
        ],
        subject: subject,
        html: html,
        text: text,
      }),
    });

    if (response.status === 202) {
      console.log(`[send-invite-email] Email enviado com sucesso para: ${email}`);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const errorData = await response.json().catch(() => ({}));
    console.error(`[send-invite-email] Erro MailerSend:`, response.status, errorData);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorData.message || `Erro ${response.status}`
      }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-invite-email] Exceção:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
