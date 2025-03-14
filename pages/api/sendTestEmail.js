import { sql } from '@vercel/postgres';
import { google } from "googleapis";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Get the test email template
        const { rows: [template] } = await sql`
            SELECT * FROM email_templates WHERE id = 1
        `;

        if (!template) {
            return res.status(404).json({ error: 'Email template not found' });
        }

        // Create personalized body
        const greeting = 'Hey there,';
        const personalizedBody = template.body.replace('{greeting}', greeting);

        // Define baseUrl
        const baseUrl = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3000'
            : 'https://simplerb.com';

        // Create the test email and get its ID
        const { rows: [newEmail] } = await sql`
            INSERT INTO emails (to_email, subject, body, status)
            VALUES (
                ${email},
                ${`[TEST] ${template.subject}`},
                ${personalizedBody},
                'processing'
            )
            RETURNING *
        `;

        // Set up OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        try {
            const { token: accessToken } = await oauth2Client.getAccessToken();

            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    type: 'OAuth2',
                    user: process.env.GMAIL_USER,
                    clientId: process.env.GMAIL_CLIENT_ID,
                    clientSecret: process.env.GMAIL_CLIENT_SECRET,
                    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                    accessToken: accessToken
                }
            });

            await transporter.verify();

            // Add tracking pixel and wrap links
            const trackingPixel = `<img src="${baseUrl}/api/track/open/${newEmail.id}" width="1" height="1" alt="" />`;
            const htmlWithTracking = `${personalizedBody}${trackingPixel}`;
            
            // Send email with tracking
            const info = await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: email,
                subject: `[TEST] ${template.subject}`,
                html: htmlWithTracking,
                text: 'Please view this email in an HTML-capable client'
            });

            // Update status and sent_at timestamp
            await sql`
                UPDATE emails 
                SET 
                    status = 'sent',
                    sent_at = CURRENT_TIMESTAMP
                WHERE id = ${newEmail.id}
            `;

            return res.status(200).json({ 
                success: true, 
                messageId: info.messageId 
            });

        } catch (oauthError) {
            console.error('OAuth/Email Error details:', {
                name: oauthError.name,
                message: oauthError.message,
                code: oauthError.code,
                command: oauthError.command
            });

            if (oauthError.message.includes('invalid_grant')) {
                throw new Error(`Email sending failed: Gmail token needs to be refreshed. Please visit https://developers.google.com/oauthplayground/ and follow the token refresh process.`);
            }

            throw new Error(`Email sending failed: ${oauthError.message}`);
        }

    } catch (error) {
        console.error('Error sending test email:', error);
        return res.status(500).json({ error: error.message });
    }
} 