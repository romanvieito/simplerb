import { google } from 'googleapis';

export default async function handler(req, res) {
    try {
        // Set up OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });

        // Force a token refresh
        const { token } = await oauth2Client.getAccessToken();

        return res.status(200).json({ 
            success: true, 
            message: 'Token refreshed successfully'
        });

    } catch (error) {
        console.error('Error refreshing token:', error);
        return res.status(500).json({ 
            error: error.message,
            details: 'Failed to refresh Gmail token'
        });
    }
} 