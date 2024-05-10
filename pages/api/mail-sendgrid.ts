import type { NextApiRequest, NextApiResponse } from 'next';

import { Client } from "@sendgrid/client";
import mail from "@sendgrid/mail";

const TWILIO_SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';
const TWILIO_SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? '';

//import mail from '@sendgrid/mail';

//mail.setApiKey(process.env.SENDGRID_API_KEY ?? '');

/*
interface EmailData {
  email: string;
  name: string;
}

interface PersonalizationData {
  from: EmailData;   // required
  to: EmailData[];   // required
  cc?: EmailData[];  // optional
  bcc?: EmailData[]; // optional  
  subject?: string;   // optional
}

interface MailContent {
  type: string;
  value: string;
}

interface MailDataRequired {
  personalizations: PersonalizationData[];
  from: EmailData;
  replyTo: EmailData;
  subject: string;
  content: MailContent[];
}*/

const account = {
  from : {
    name: 'Adony Gonzalez',
    email: 'adonyglez850209@gmail.com',
  },
  to : {
    name: 'Alberto Roman Vieito',
    email: 'romanvieito@gmail.com'
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { nameTo, emailTo, subject, content } : { nameTo: string, emailTo: string, subject: string, content: string } = req.body;

  // Test setClient() method
  mail.setClient(new Client());

  // Test setApiKey() method
  mail.setApiKey(TWILIO_SENDGRID_API_KEY);

  // Test setSubstitutionWrappers() method
  mail.setSubstitutionWrappers("{{", "}}")

  // Test send() method
  /*
  mail.send({
    from: account.email,
    to: emailTo,
    cc: { name: account.cc.name, email: account.cc.email },
    subject: subject,
    text: content,
    html: `<p>${content}</p>`
  }).then(result => {
    console.log("Sent email", result);
  }, err => {
    console.error(err);
  });
*/
// Test sendMultiple() method
mail.sendMultiple({
  from: account.from.email,
  to: [
    `${account.to.name} <${account.to.email}>`,
    { name: account.to.name, email: account.to.email }
  ],
  cc: { name: account.from.name, email: account.from.email },
  subject: subject,
  text: content,
  html: `<p>${content}</p>`,
  mailSettings: {
    sandboxMode: {
      enable: true
    }
  },  
}).then(result => {
  console.log("Sent email");
}, err => {
  console.error(err);
});

/*
  const payload = {
    personalizations: [{
      to: [{ email: emailTo, name: nameTo }],
      subject: subject
    }],
    from: {
      // This address should be a verified sender in your Twilio SendGrid account.
      email: account.email,
      name: account.name
    },
    replyTo: {
      email: account.cc.email,
      name: account.cc.name
    },
    subject: subject,
    content: [{
      type: 'text/plain',
      value: content
    }]
  };
*/
  /*const data: mail.MailDataRequired = {
    personalizations: [{
      // This address should be a verified sender in your Twilio SendGrid account.
      from: {
        email: account.email,
        name: account.name
      },
      to: [{
          email: nameTo,
          name: emailTo
      }],
      cc: [{
          email: account.cc.email,
          name: account.cc.name
      }]
    }],
    from: {
      // This address should be a verified sender in your Twilio SendGrid account.
      email: account.email,
      name: account.name
    },
    replyTo: {
      email: account.cc.email,
      name: account.cc.name
    },
    subject: subject,
    content: [{
      type: 'text/plain',
      value: content
    }]
  };*/

  /*const data = {
    personalizations: [{
        to: [{
            email: account.email,
            name: account.name
        }],
        cc: [{
            email: account.cc.email,
            name: account.cc.name
        }]
      },
      {
        from: {
          email: emailFrom,
          name: nameFrom
        }
      }
    ],
    from: {
      // Cuenta Verificada en sendgrid
      email: account.email,
      name: account.name
    },
    replyTo: {
      email: account.cc.email,
      name: account.cc.name
    },
    subject: subject,
    content: [{
      type: 'text/plain',
      value: content
    }]
  };*/
/*
  try {
    const response = await fetch(TWILIO_SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TWILIO_SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('result1', response);
    //if (!response.ok) 
    //  return res.status(500).json({ error: response.statusText });

    const data = await response.json();
    console.log('result2', data);
    return res.status(200).json({ data: data, message: 'Mail sent successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }*/

/*
  await mail.send(data).then(() => {
      return res.status(200).json({ message: 'Mail sent successfully' });
    })
    .catch(error => {
      console.log('error api send grid', error);
      return res.status(500).json({ error: error.message });
    });
*/
  /*
  const response = await fetch(`${SENDGRID_API_URL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_TOKEN}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const availabilityResults = [];

  for (const domain of domains) {
    const response = await fetch(`${DNSIMPLE_API_URL}${DNSIMPLE_ACCOUNT_ID}/registrar/domains/${domain}/check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DNSIMPLE_API_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // If the HTTP request fails, add the error to the results
      availabilityResults.push({
        domain,
        available: false,
        error: `Error checking domain: ${domain}`
      });
      continue;
    }

    const data = await response.json();
    availabilityResults.push({
      domain,
      available: data.data.available,
    });
  }

  res.status(200).json(availabilityResults);
  */
}
