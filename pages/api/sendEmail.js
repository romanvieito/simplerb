import { google } from "googleapis";
import nodemailer from "nodemailer";

const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"  // Must match exactly what's in Google Console
);

// Force credentials to be refreshed
oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
        // Store new refresh token if provided
        console.log('New refresh token:', tokens.refresh_token);
    }
    console.log('Access token:', tokens.access_token);
});

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // Set credentials before getting access token
        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        const accessToken = await oauth2Client.getAccessToken();
        
        if (!accessToken.token) {
            throw new Error('Failed to get access token');
        }

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

        // Test the connection
        await transporter.verify();

        const { to, subject, body } = req.body;
        if (!to || !subject || !body) {
            return res.status(400).json({ error: "Missing email parameters" });
        }

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to,
            subject,
            text: body,
        };

        const result = await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: "Email sent!", result });
    } catch (error) {
        console.error("Error details:", {
            message: error.message,
            name: error.name,
            code: error.code,
            response: error.response?.data
        });
        
        return res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
}