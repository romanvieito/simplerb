import sgMail from '@sendgrid/mail';

class MailService {
  constructor(private apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(to: string, from: string, subject: string, text: string, html: string): Promise<void> {
    const msg = {
      to,
      from,
      subject,
      text,
      html,
    };

    try {
      await sgMail.send(msg);
      console.log('Send email successful');
    } catch (error) {
      console.error('Fail send email:', error);
      throw error;
    }
  }
}

export default MailService;