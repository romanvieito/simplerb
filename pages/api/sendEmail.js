import { google } from "googleapis";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
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

        // Verify connection configuration
        await transporter.verify();
        console.log("Server is ready to take messages");

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
        console.error("Full error:", error);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        });
    }
}