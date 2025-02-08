import { google } from "googleapis";
import nodemailer from "nodemailer";

// Load credentials from environment variables
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const GMAIL_USER = process.env.GMAIL_USER;

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // Get a new access token using the refresh token
        const { token } = await oauth2Client.getAccessToken();

        // Configure Nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: GMAIL_USER,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: token,
            },
        });

        // Email data
        const { to, subject, body } = req.body;
        if (!to || !subject || !body) {
            return res.status(400).json({ error: "Missing email parameters" });
        }

        // Send the email
        const mailOptions = {
            from: `Your Name <${GMAIL_USER}>`,
            to,
            subject,
            text: body,
        };

        const result = await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: "Email sent!", result });
    } catch (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}