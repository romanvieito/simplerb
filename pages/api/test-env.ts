import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const envVars = {
    GADS_CLIENT_ID: !!process.env.GADS_CLIENT_ID,
    GADS_CLIENT_SECRET: !!process.env.GADS_CLIENT_SECRET,
    GADS_DEVELOPER_TOKEN: !!process.env.GADS_DEVELOPER_TOKEN,
    GADS_REFRESH_TOKEN: !!process.env.GADS_REFRESH_TOKEN,
    GADS_CUSTOMER_ID: !!process.env.GADS_CUSTOMER_ID,
    GADS_LOGIN_CUSTOMER_ID: !!process.env.GADS_LOGIN_CUSTOMER_ID,
    GADS_USE_KEYWORD_PLANNING: process.env.GADS_USE_KEYWORD_PLANNING,
    NODE_ENV: process.env.NODE_ENV,
  };

  console.log('Environment variables in API route:', envVars);

  res.status(200).json({
    message: 'Environment variables check',
    envVars,
    raw: {
      GADS_CLIENT_ID: process.env.GADS_CLIENT_ID?.substring(0, 10) + '...',
      GADS_REFRESH_TOKEN: process.env.GADS_REFRESH_TOKEN?.substring(0, 10) + '...',
    }
  });
}
