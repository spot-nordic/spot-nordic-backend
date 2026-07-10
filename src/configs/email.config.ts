import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import './env.config';

class EmailConfig {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST as string,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER as string,
        pass: process.env.SMTP_PASS as string,
      },
    });
  }

  private wrapHtml(subject: string, content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="background-color: #a3705d; padding: 32px 40px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">${subject}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px; text-align: center;">
                  <div style="color: #334155; font-size: 16px; line-height: 1.6;">
                    ${content}
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f1f5f9; padding: 24px 40px; text-align: center;">
                  <p style="color: #64748b; font-size: 14px; margin: 0;">&copy; ${new Date().getFullYear()} Spot Nordic. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }

  public async sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    try {
      const mailOptions: SendMailOptions = {
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to,
        subject,
        html: this.wrapHtml(subject, htmlContent),
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error: unknown) {
      console.error(error);
      throw error;
    }
  }
}

export default new EmailConfig();