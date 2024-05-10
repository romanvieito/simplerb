import type { NextApiRequest, NextApiResponse } from 'next';

const API_URL = 'https://send.api.mailtrap.io/api/send';
const API_TOKEN = process.env.MAILTRAP_API_KEY ?? '';

const sender = {
    email: "mailtrap@demomailtrap.com",
    name: "Simplebr",
};

const recipients = {
    email: "adonyglez850209@gmail.com",
    name: "Adony Gonzalez"
};

const cc = {
    email: 'romanvieito@gmail.com',
    name: 'Alberto Roman Vieito'
};

export default async function handler (
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    if (req.method !== 'POST') {
      return res.status(405).end('Method Not Allowed');
    }

    const { username, useremail, subject, content } : { username: string, useremail: string, subject: string, content: string } = req.body;    

    const body = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Feedback from simplerb</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #333;
            }
            .container {
                padding: 20px;
                margin: 30px auto;
                width: 80%;
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
            }
            h2, h4 {
                color: #2c3e50;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>${username}</h2>
            <h4>${useremail}</h4>
            <p>
                ${content}
            </p>
        </div>
    </body>
    </html>
    `;
    
    const data = {
        "to": [
          {
            "email": recipients.email,
            "name": recipients.name
          }
        ],
        // Con el cc
        // Demo domains can only be used to send emails to account owners. 
        // You can only send testing emails to your own email address.
        /*"cc": [
          {
            "email": cc.email,
            "name": cc.name
          }
        ],*/
        "from": {
          "email": sender.email,
          "name": sender.name
        },
        "headers": {
          "X-Message-Source": "simplerb.com"
        },
        "subject": subject,
        "html": body,
        "category": "Feedback"
    };
    
    const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Api-Token': API_TOKEN
        },
        body: JSON.stringify(data)
      };    

      try {
        const response = await fetch(API_URL, options);
        const data = await response.json();
        return res.status(200).json({ data: data });
      } catch (error) {
        return res.status(500).json({ error: error });
      }      
};


// Funciona pero no manda correo con copia a...
/*
import { MailtrapClient } from "mailtrap"

const TOKEN = process.env.MAILTRAP_API_KEY ?? '';

const client = new MailtrapClient({ token: TOKEN });

const sender = {
    email: "mailtrap@demomailtrap.com",
    name: "Simplebr",
};

const recipients = [{
    email: "adonyglez850209@gmail.com"
}];

const cc = [{
    email: 'romanvieito@gmail.com'
}];

export default async function handler (
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    if (req.method !== 'POST') {
      return res.status(405).end('Method Not Allowed');
    }

    const { username, useremail, subject, content } : { username: string, useremail: string, subject: string, content: string } = req.body;

    const body = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Feedback from simplerb</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                color: #333;
            }
            .container {
                padding: 20px;
                margin: 30px auto;
                width: 80%;
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
            }
            h2, h4 {
                color: #2c3e50;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>${username}</h2>
            <h4>${useremail}</h4>
            <p>
                ${content}
            </p>
        </div>
    </body>
    </html>
    `;

    client
    .send({
      from: sender,
      to: recipients,
      //bcc: cc,
      subject: subject,
      html: body,
      category: "Feedback",
    })
    .then(result => {
        return res.status(200).json({ data: result.success });
    }, err => {
        return res.status(500).json({ error: err });
    });
}
*/