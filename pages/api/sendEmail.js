import { google } from "googleapis";
import nodemailer from "nodemailer";
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        const { to, subject, html, emailId } = req.body;
        
        // Debug log
        console.log('Processing email:', { emailId, to, subject });

        // Determine the base URL based on environment
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : 'https://simplerb.com';  // Hardcode production URL as fallback

        // Generate tracking pixel with absolute URL
        const trackingUrl = `${baseUrl}/api/track/${emailId}`;
        console.log('Using tracking URL:', trackingUrl); // Debug log

        const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none" />`;
        
        const htmlWithTracking = `
            <div>
                ${html}
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

        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        const accessToken = await oauth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.GMAIL_USER,
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN,
                accessToken: accessToken.token
            },
        });

        // Verify connection
        await transporter.verify();
        console.log("Server is ready to take messages");

        // Send emails
        const results = [];
        for (const email of pendingEmails) {
            try {
                // Generate tracking ID
                const trackingId = email.id; // Using the email ID as tracking ID for simplicity

                // Add tracking pixel to email body
                const trackingPixel = `<img src="${baseUrl}/api/track/${trackingId}" width="1" height="1" alt="" style="display:none" />`;
                const htmlBody = `
                    <div>${email.body}</div>
                    ${trackingPixel}
                `;

                const mailOptions = {
                    from: process.env.GMAIL_USER,
                    to: email.to_email,
                    subject: email.subject,
                    text: email.body, // Plain text version
                    html: htmlBody,   // HTML version with tracking pixel
                };

                const result = await transporter.sendMail(mailOptions);
                
                // Update email status in database
                await sql`
                    UPDATE emails 
                    SET status = 'sent', sent_at = NOW() 
                    WHERE id = ${email.id}
                `;

                results.push({ 
                    id: email.id, 
                    status: 'success', 
                    messageId: result.messageId 
                });
            } catch (error) {
                // Update email status to failed
                await sql`
                    UPDATE emails 
                    SET status = 'failed' 
                    WHERE id = ${email.id}
                `;

                results.push({ 
                    id: email.id, 
                    status: 'error', 
                    error: error.message 
                });
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: "Email processing complete", 
            results 
        });
    } catch (error) {
        console.error("Full error:", error);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
}