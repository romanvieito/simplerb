import { styled } from '@mui/material/styles';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Typography from '@mui/material/Typography';

export default function CFAQ() {

    const CustomAccordion = styled(Accordion)(({ theme }) => ({
        boxShadow: 'none',
        '&:before': {
          display: 'none',
        },
        '&.MuiAccordion-root:before': {
          display: 'none',
        },
        '& .MuiAccordionSummary-root': {
          borderBottom: 'none',
        },
        '& .MuiAccordionDetails-root': {
          borderTop: 'none',
        },
    }));

    return (
        <div>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel2a-content"
              id="panel2a-header"
            >
              <Typography>What is SimplerB?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              SimplerB is an AI-powered tool designed to help you kickstart your business effortlessly. It generates your domain, website, and Google Ads, so you can focus on growing your business.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel3a-content"
              id="panel3a-header"
            >
              <Typography>How do I get started with SimplerB?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              Getting started with SimplerB is easy. Sign up on our website, choose a plan that fits your needs, and begin leveraging our AI features to generate your domain, website, and Google Ads.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel4a-content"
              id="panel4a-header"
            >
              <Typography>At which point in time can I cancel my subscription?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              You can cancel your subscription at any time. At the next billing cycle, we will not resume your subscription, and you will be downgraded to the Free tier.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel5a-content"
              id="panel5a-header"
            >
              <Typography>What is the billing interval?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              We bill you on a monthly basis starting from the day you subscribed. You can cancel your subscription at any time.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel6a-content"
              id="panel6a-header"
            >
              <Typography>Is there a free trial available?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              Even better...we do have a Free plan that you can use forever. This allows you to explore SimplerB’s AI features and see how they can benefit your business without any commitment.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel7a-content"
              id="panel7a-header"
            >
              <Typography>Can I switch plans later on?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              Absolutely. You can upgrade or downgrade your plan at any time from your account settings. The change will take effect in the next billing cycle.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel8a-content"
              id="panel8a-header"
            >
              <Typography>What types of businesses benefit from using SimplerB?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              SimplerB is designed to help small businesses across various industries, including retail, service-based businesses, and startups, streamline their operations and improve efficiency with AI.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel9a-content"
              id="panel9a-header"
            >
              <Typography>How does SimplerB help in automating tasks?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              Digital is more important than ever, so SimplerB’s AI generates your domain, website, and Google Ads, automating these critical startup tasks so you can focus on other strategic activities that grow your business.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel10a-content"
              id="panel10a-header"
            >
              <Typography>What kind of customer support does SimplerB offer?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              Our customer support team is available 24/7 via email. We also provide a comprehensive knowledge base and tutorial videos to help you get the most out of SimplerB. Additionally, we are open to scheduling video meetings to provide personalized assistance and ensure you have all the support you need.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel11a-content"
              id="panel11a-header"
            >
              <Typography>Is my data secure with SimplerB?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              We take data security seriously. SimplerB uses industry-standard encryption and security protocols to ensure that your data is safe and secure.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel12a-content"
              id="panel12a-header"
            >
              <Typography>What happens to my data if I cancel my subscription?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              If you cancel your subscription, your data will remain available in read-only mode for 30 days. After this period, your data will be permanently deleted from our servers.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="panel13a-content"
              id="panel13a-header"
            >
              <Typography>How can SimplerB help me grow my business?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography align="left" sx={{ fontSize: '0.875rem' }}>
              SimplerB helps you grow your business by using AI to automate the creation of your domain, website, and Google Ads, providing insightful analytics (coming soon), and streamlining your operations, so you can focus on strategic growth activities and customer satisfaction.
              </Typography>
            </AccordionDetails>
          </CustomAccordion>

        </div>
    );
}