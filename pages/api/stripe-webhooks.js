import Stripe from 'stripe';
import { buffer } from 'micro';
import Cors from 'micro-cors';
import { sql } from '@vercel/postgres';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe requires the raw body to construct the event.
export const config = {
  api: {
    bodyParser: false,
  },
};

console.log("aaa")
const cors = Cors({
  allowMethods: ['POST', 'HEAD'],
});

const webhookHandler = async (req, res) => {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    const signature = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        buf.toString(),
        signature,
        webhookSecret
      );
    } catch (err) {
      // On error, log and return the error message.
      console.log(`❌ Error message: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Successfully constructed event.
    console.log('✅ Success:', event.id);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent status: ${paymentIntent.status}`);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log(
          `❌ Payment failed: ${paymentIntent.last_payment_error?.message}`
        );
        break;
      }
      case 'charge.succeeded': {
        const charge = event.data.object;
        console.log(`Charge id: ${charge.id}`);
        break;
      }
      case 'balance.available': {
        const charge = event.data.object;
        console.log(`Charge id: ${charge.id}`);
        break;
      }
      case 'cash_balance.funds_available': {
        const charge = event.data.object;
        console.log(`Charge id: ${charge.id}`);
        break;
      }
      case 'customer.created': {
        const charge = event.data.object;
        console.log(`Charge id: ${charge.id}`);
        break;
      }
      case 'customer.deleted': {
        const charge = event.data.object;
        console.log(`Charge id: ${charge.id}`);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(session);
        // Here you might want to retrieve additional information if needed,
        // for example, user's email or ID associated with the session
        const userEmail = session.customer_details.email; // Assuming you have email
        
        const userCreditsToAdd = 30; // Implement this based on your logic
        // const userCreditsToAdd = calculateCreditsFromAmount(session.amount_total); // Implement this based on your logic

        try {
          // Update user's credits in the database
          await sql`UPDATE users SET admin=true, credits = credits + ${userCreditsToAdd} WHERE email = ${userEmail}`;
          console.log(`Credits updated for user: ${userEmail}`);
        } catch (error) {
          console.error('Failed to update credits:', error);
          // Handle error appropriately
        }
        break;
      }
      case 'customer.updated': {
        const charge = event.data.object;
        console.log(`Charge id: ${charge.id}`);
        break;
      }
      default: {
        console.warn(`Unhandled event type: ${event.type}`);
        break;
      }
    }


    // Helper function to calculate credits to add based on payment amount
    function calculateCreditsFromAmount(amount) {
      // Define how you calculate credits from the amount paid
      // For example, if 1 credit is worth $1, and amount is in cents:
      return amount / 100;
    }

    // Return a response to acknowledge receipt of the event.
    res.json({ received: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
};

export default cors(webhookHandler);