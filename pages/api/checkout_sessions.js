const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {

      const tipo = req.body.tipo; // Extraer el valor del input hidden llamado "tipo"
    
      // Dependiendo del valor de tipo, puedes ajustar el Price ID u otros parámetros
      let priceId;
      if (tipo === 'STARTED') {
        priceId = 'price_1PP5Q2HDPeQP87xvdnTlFNBa'; 
      } else {
        priceId = 'price_1PP5SMHDPeQP87xvVRmt2sNI'; 
      }

      // Create Checkout Sessions from body params.
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
            // price: 'price_1P2KE7HDPeQP87xvgoZyJXMg', //prod
            // price: 'price_1P5CFgHDPeQP87xvABrts4EM', //dev
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/?success=true`,
        cancel_url: `${req.headers.origin}/?canceled=true`,
        automatic_tax: {enabled: true},
      });
      res.redirect(303, session.url);
    } catch (err) {
      res.status(err.statusCode || 500).json(err.message);
    }
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}