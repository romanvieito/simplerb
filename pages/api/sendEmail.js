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

        // Log OAuth2 configuration (remove sensitive data in production)
        console.log('OAuth2 Config:', {
            clientId: process.env.GMAIL_CLIENT_ID ? 'Set' : 'Missing',
            clientSecret: process.env.GMAIL_CLIENT_SECRET ? 'Set' : 'Missing',
            refreshToken: process.env.GMAIL_REFRESH_TOKEN ? 'Set' : 'Missing'
        });

        // Set up OAuth2 client
        const OAuth2 = google.auth.OAuth2;
        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        try {
            // Get new access token
            const tokens = await oauth2Client.getAccessToken();
            console.log('Access token obtained successfully');

            // Create transport
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.GMAIL_USER,
                    clientId: process.env.GMAIL_CLIENT_ID,
                    clientSecret: process.env.GMAIL_CLIENT_SECRET,
                    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                    accessToken: tokens.token
                }
            });

            // Update status to sending
            await sql`
                UPDATE emails 
                SET status = 'sending'
                WHERE id = ${id}
            `;

            // Send email
            await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to,
                subject,
                text: 'Email content here'  // Add your email content
            });

            // Update status to sent
            await sql`
                UPDATE emails 
                SET status = 'sent'
                WHERE id = ${id}
            `;

            return res.status(200).json({ success: true });

        } catch (oauthError) {
            console.error('OAuth/Email Error:', oauthError);
            throw new Error(`Email sending failed: ${oauthError.message}`);
        }

    } catch (error) {
        console.error('Error sending email:', error);
        
        // Reset status to pending on error
        if (req.body?.id) {
            await sql`
                UPDATE emails 
                SET status = 'pending'
                WHERE id = ${req.body.id}
            `;
        }
        
        return res.status(500).json({ 
            error: error.message,
            details: 'Check Gmail OAuth2 configuration'
        });
    }
}