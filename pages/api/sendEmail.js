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
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    let email;
    try {
        // Get pending emails from database
        const { rows: pendingEmails } = await sql`
            SELECT * FROM emails 
            WHERE status = 'pending' 
            ORDER BY created_at ASC
            LIMIT 1
        `;

        if (pendingEmails.length === 0) {
            return res.status(200).json({ message: "No pending emails to send" });
        }

        email = pendingEmails[0];  // Get the first pending email
        
        // Update status to processing to prevent duplicate processing
        await sql`
            UPDATE emails 
            SET status = 'processing'
            WHERE id = ${email.id}
        `;

        // Determine the base URL
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        // Add tracking to links
        const htmlWithTrackedLinks = wrapLinksWithTracking(email.body, email.id, baseUrl);
        
        // Add tracking pixel
        const trackingUrl = `${baseUrl}/api/track/${email.id}`;
        const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none" />`;
        
        const htmlWithTracking = `
            <div>
                ${htmlWithTrackedLinks}
                ${trackingPixel}
            </div>
        `;

        const OAuth2 = google.auth.OAuth2;
        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        let accessToken;
        try {
            accessToken = await oauth2Client.getAccessToken();
        } catch (authError) {
            console.error('OAuth2 Authentication Error:', authError);
            throw new Error('Email authentication failed - refresh token may have expired');
        }

        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "romanvieito@gmail.com",
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: accessToken
            }
        });

        // Verify connection configuration before sending
        try {
            await transport.verify();
            console.log("SMTP connection verified");
        } catch (verifyError) {
            console.error('SMTP Verification Error:', verifyError);
            throw new Error('Failed to verify SMTP connection');
        }

        // Send email with tracking
        const result = await transport.sendMail({
            from: 'romanvieito@gmail.com',
            to: email.to_email,      // Use email from database
            subject: email.subject,   // Use subject from database
            html: htmlWithTracking
        });

        // Update email status to sent
        await sql`
            UPDATE emails 
            SET status = 'sent',
                sent_at = NOW()
            WHERE id = ${email.id}
        `;

        return res.status(200).json(result);
    } catch (error) {
        // More detailed error logging
        console.error('Detailed error:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        if (email?.id) {
            await sql`
                UPDATE emails 
                SET status = 'failed',
                    error = ${error.message},
                    updated_at = NOW()
                WHERE id = ${email.id}
            `;
        }
        
        return res.status(500).json({ 
            error: error.message,
            details: 'If you see invalid_grant, please refresh OAuth2 credentials'
        });
    }
}