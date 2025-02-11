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

    try {
        const { to, subject, html, emailId } = req.body;
        
        // Debug log
        console.log('Processing email:', { emailId, to, subject });

        // Determine the base URL
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000';

        // Add tracking to links
        const htmlWithTrackedLinks = wrapLinksWithTracking(html, emailId, baseUrl);
        
        // Add tracking pixel (existing code)
        const trackingUrl = `${baseUrl}/api/track/${emailId}`;
        const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none" />`;
        
        const htmlWithTracking = `
            <div>
                ${htmlWithTrackedLinks}
                ${trackingPixel}
            </div>
        `;

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

        const OAuth2 = google.auth.OAuth2;
        const oauth2Client = new OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });

        const accessToken = await oauth2Client.getAccessToken();

        const transport = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: "ybolanoscu@gmail.com",
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
                accessToken: accessToken
            }
        });

        // Verify connection
        await transport.verify();
        console.log("Server is ready to take messages");

        // Send email with tracking
        const result = await transport.sendMail({
            from: 'ybolanoscu@gmail.com',
            to: to,
            subject: subject,
            html: htmlWithTrackedLinks
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ error: error.message });
    }
}