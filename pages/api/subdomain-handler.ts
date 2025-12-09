import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const hostname = req.headers.host || '';
  const url = req.url;

  console.log('Subdomain handler called:', { hostname, url });

  // Check if this is a subdomain request
  const isSubdomain = hostname.includes('.simplerb.com') && !hostname.startsWith('www.') && hostname !== 'simplerb.com';

  console.log('Is subdomain:', isSubdomain, { hostname });

  // If not a subdomain, return 404 (middleware should handle routing)
  if (!isSubdomain) {
    console.log('Not a subdomain, returning 404');
    return res.status(404).json({ error: 'Not found' });
  }

  // Extract subdomain
  const subdomain = hostname.split('.')[0];

  console.log('Extracted subdomain:', subdomain);

  try {
    console.log('Querying database for subdomain:', subdomain);
    const result = await sql`
      SELECT html FROM sites
      WHERE subdomain = ${subdomain}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    console.log('Database query result:', { rowCount: result.rows.length });

    if (result.rows.length === 0) {
      console.log('Site not found for subdomain:', subdomain);
      return res.status(404).send('Site not found');
    }

    console.log('Site found, serving HTML content');

    // Fix asset URLs to point to the main domain
    let html = result.rows[0].html;
    html = html.replace(/(href|src)="\/([^"]*)"/g, '$1="https://simplerb.com/$2"');

    // Inject contact form handler to keep users on-page (no JSON redirect)
    const contactScript = `
<script id="contact-leads-handler">
(function() {
  const bind = () => {
    const forms = Array.from(document.querySelectorAll('form[action*="/api/contact-leads"]'));
    if (!forms.length) return;
    forms.forEach((form) => {
      if ((form as any)._contactBound) return;
      (form as any)._contactBound = true;
      let statusEl = form.querySelector('[data-contact-status]');
      if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.setAttribute('data-contact-status', 'true');
        statusEl.setAttribute('style', 'margin-top:10px; font-size:14px; color:#2563eb; min-height:20px;');
        form.insertAdjacentElement('afterend', statusEl);
      }

      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        statusEl!.textContent = 'Sending...';
        (statusEl as HTMLElement).style.color = '#2563eb';

        const formData = new FormData(form);
        try {
          const resp = await fetch(form.action || '/api/contact-leads', {
            method: form.method || 'POST',
            body: formData
          });
          if (resp.ok) {
            statusEl!.textContent = 'Message sent! We will reply soon.';
            (statusEl as HTMLElement).style.color = '#16a34a';
            form.reset();
          } else {
            statusEl!.textContent = 'Something went wrong. Please try again.';
            (statusEl as HTMLElement).style.color = '#dc2626';
          }
        } catch (err) {
          statusEl!.textContent = 'Network error. Please try again.';
          (statusEl as HTMLElement).style.color = '#dc2626';
        }
      });
    });
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bind();
  } else {
    document.addEventListener('DOMContentLoaded', bind);
  }
})();
</script>`;

    if (!html.includes('contact-leads-handler')) {
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${contactScript}</body>`);
      } else {
        html = `${html}${contactScript}`;
      }
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error serving subdomain site:', error);
    return res.status(500).send('Error serving site');
  }
}
