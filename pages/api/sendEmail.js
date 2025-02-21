import { google } from "googleapis";
import nodemailer from "nodemailer";
import { sql } from '@vercel/postgres';
import { load } from 'cheerio';

function wrapLinksWithTracking(html, emailId, baseUrl) {
    const $ = load(html);
    
    $('a').each((i, link) => {
        const originalUrl = $(link).attr('href');
        console.log('Processing link:', originalUrl); // Debug log
        
        if (originalUrl && !originalUrl.startsWith('mailto:') && !originalUrl.startsWith('@')) {
            // Remove the @ symbol if it exists
            const cleanUrl = originalUrl.replace('@', '');
            const trackingUrl = `${baseUrl}/api/track/click/${emailId}?url=${encodeURIComponent(cleanUrl)}`;
            $(link).attr('href', trackingUrl);
            console.log('Wrapped URL:', trackingUrl); // Debug log
        }
    });

    const finalHtml = $.html();
    console.log('Final HTML:', finalHtml); // Debug log
    return finalHtml;
}

export default async function handler(req, res) {
    try {
        const { id, to, subject } = req.body;

        // Fetch the email content from database
        const { rows } = await sql`
            SELECT * FROM emails WHERE id = ${id}
        `;

        if (rows.length === 0) {
            throw new Error('Email not found');
        }

        const emailContent = rows[0];

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

            // Update status to sending
            await sql`
                UPDATE emails 
                SET status = 'sending'
                WHERE id = ${id}
            `;

            // Send email with content from database
            const info = await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to,
                subject,
                html: emailContent.body,
                text: 'Please view this email in an HTML-capable client'
            });

            console.log('Email sent successfully:', info.messageId);

            // Update status to sent
            await sql`
                UPDATE emails 
                SET status = 'sent'
                WHERE id = ${id}
            `;

            return res.status(200).json({ success: true, messageId: info.messageId });

        } catch (oauthError) {
            console.error('OAuth/Email Error details:', {
                name: oauthError.name,
                message: oauthError.message,
                code: oauthError.code,
                command: oauthError.command
            });
            throw new Error(`Email sending failed: ${oauthError.message}`);
        }

    } catch (error) {
        console.error('Error sending email:', error);
        
        if (req.body?.id) {
            await sql`
                UPDATE emails 
                SET status = 'pending'
                WHERE id = ${req.body.id}
            `;
        }
        
        return res.status(500).json({ 
            error: error.message,
            details: 'Check Gmail OAuth2 configuration and permissions'
        });
    }
}