import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import https from 'https';

interface ExchangeTokenRequest {
  code: string;
  userId: string;
}

interface ExchangeTokenResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExchangeTokenResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);
    const { code }: ExchangeTokenRequest = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Any authenticated user can refresh OAuth tokens
    // (This prevents the "dead end" problem for users)

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }

    const clientId = process.env.GADS_CLIENT_ID;
    const clientSecret = process.env.GADS_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://www.simplerb.com/oauth/callback'
      : 'http://localhost:3000/oauth/callback';

    if (!clientId || !clientSecret) {
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }

    // Exchange authorization code for refresh token
    const postData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString();

    console.log('DEBUG: Attempting token exchange...');
    console.log('DEBUG: Redirect URI:', redirectUri);
    console.log('DEBUG: Code length:', code.length);

    const result = await new Promise<any>((resolve, reject) => {
      const options = {
        hostname: 'oauth2.googleapis.com',
        port: 443,
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const request = https.request(options, (response) => {
        console.log('DEBUG: OAuth response status:', response.statusCode);

        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          console.log('DEBUG: OAuth response body:', data);
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Failed to parse OAuth response: ' + data));
          }
        });
      });

      request.on('error', (error) => {
        console.error('DEBUG: OAuth request error:', error);
        reject(error);
      });

      request.write(postData);
      request.end();
    });

    if (result.refresh_token) {
      console.log('✅ SUCCESS: New refresh token obtained');

      // For development: Store the token in environment (this will be lost on restart)
      // In production, you'd store this securely in a database or encrypted storage
      try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env.local');

        // Read current .env.local
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Update or add GADS_REFRESH_TOKEN
        const tokenLine = `GADS_REFRESH_TOKEN=${result.refresh_token}`;
        if (envContent.includes('GADS_REFRESH_TOKEN=')) {
          // Replace existing line
          envContent = envContent.replace(/GADS_REFRESH_TOKEN=.*/, tokenLine);
        } else {
          // Add new line
          envContent += `\n${tokenLine}`;
        }

        // Write back to file
        fs.writeFileSync(envPath, envContent.trim() + '\n');
        console.log('✅ Token saved to .env.local');

        // Update process environment for immediate use
        process.env.GADS_REFRESH_TOKEN = result.refresh_token;

      } catch (storageError) {
        console.error('❌ Failed to save token:', storageError);
        return res.status(500).json({
          success: false,
          error: 'Token obtained but failed to save. Check server logs.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully! Your Google Ads connection has been restored.',
      });
    } else {
      console.log('❌ FAILED: OAuth exchange result:', result);
      return res.status(400).json({
        success: false,
        error: result.error_description || result.error || 'Failed to obtain refresh token',
        details: result
      });
    }

  } catch (error) {
    console.error('Token exchange error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
