import React, { useState } from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Image from "next/image";
import { Box, Button, Tooltip } from "@mui/material";
import styles from "../components/CardsPricing.module.css";
import styles_faq from "../components/Faq.module.css";
import { useContext } from "react";
import EmailModal from "../components/EmailModal";
import SBRContext from "../context/SBRContext";
import { useClerk, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import Snackbar from '@mui/joy/Snackbar';
import type { NextPage } from "next";
import mixpanel from "../utils/mixpanel-config";

import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { styled } from '@mui/material/styles';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const Home: NextPage = () => {

  const pages = [{
    name: 'Domain', 
    link: '/domain'
  }, {
    name: 'Website Generator', 
    link: '/web'
  }, {
    name: 'Ads Generator', 
    link: '/ads'
  }];

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

  const { openSignIn } = useClerk();
  const [openSuccess, setOpenSuccess] = useState(false);
  const [openDanger, setOpenDanger] = useState(false);
  const [message, setMessage] = useState('');

  const [modalOpenLetsTalk, setModalOpenLetsTalk] = useState(false);

  const { isLoaded, user } = useUser();

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error('SBRContext must be used within a SBRProvider');
  }
  const { dataUser, subsTplan, setSubsTplan, setSubsCancel } = context;

  const handleSubscriptionFreeClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isLoaded || !user) {
      openSignIn();
    } else {
      try {      
        const substplan = 'FREE';
        const subscancel = false;
  
        const data = {
          substplan,
          subscancel
        };
  
        const resp = await fetch(`/api/user-subscription?email=${dataUser.email}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
    
        if (!resp.ok) {
          setMessage("Network response was not ok. Failed to set users subscription");
          setOpenDanger(true);
        } else {
          setMessage("FREE subscription success");
          setOpenSuccess(true);
          setSubsTplan('FREE');
          setSubsCancel(false);
          mixpanel.track("Subscription", {
            plan_subscription: 'FREE',
          });
        }
      } catch (error) {
        console.error("Subscription with error: ", error);
        mixpanel.track("Subscription with error", {
          plan_subscription: 'FREE',
          error: error
        });
      }
    }
  }

  const letsTalk = () => {
    mixpanel.track("Lets Talk Click", {
    });
    setModalOpenLetsTalk(true);
  };

  const handleCloseModalLetsTalk = () => {
    setModalOpenLetsTalk(false);
  };

  // Handler function to track the event when the button is clicked
  const handleSubsStarterCreatorClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent the form from submitting traditionally
    event.preventDefault();
  
    // The Google Ads event snippet
    window.gtag && window.gtag('event', 'conversion', {
      'send_to': '16510475658/ZCyECJS9tqYZEIq758A9', // Your conversion ID and conversion label
    });

    // Safely access the form and submit it
    const form = event.currentTarget.form;

    if (form) {
      const formData = new FormData(form); // Crea un objeto FormData con los datos del formulario
      const tipo = formData.get('tipo');
      mixpanel.track("Subscription", {
        plan_subscription: tipo?.toString(),
      });
      form.submit();
    } else {
      // Handle the case where for some reason the form isn't available
      console.error("Form not found");
    }
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Generate your business with AI
        </h1>

        <h2 className="mt-3" style={{ color: "rgba(0, 0, 0, 0.6)" }}>
          Kickstart your business with AI: Get your domain, website, and Google
          Ads, all done for you effortlessly!
        </h2>

        <Box className="flex mt-7 flex-wrap justify-center">
          <Box
            className="m-2"
            sx={{
              width: {
                xs: "100%",
                sm: "calc(50% - 16px)",
                md: "calc(33% - 16px)",
              },
            }}
          >
            <Card sx={{ minWidth: 275 }}>
              <CardContent>
                {/* <Typography
                sx={{ fontSize: 14 }}
                color="text.secondary"
                gutterBottom
              >
                Simple, memorable, and impactful
              </Typography> */}
                <Typography variant="h5" component="div">
                  Domain Generator
                </Typography>
                {/* <Typography sx={{ mb: 1.5 }} color="text.secondary">
              Simple, memorable, and impactful
              </Typography> */}
                <Typography className="pt-4" variant="body2">
                  Create the best domain possible
                  <br />
                  {'"Simple, memorable, and impactful."'}
                </Typography>
              </CardContent>
              <CardActions className="justify-center">
                <Button size="small" key={pages[0].name} href={pages[0].link}>
                  Create Domain
                </Button>
              </CardActions>
            </Card>
          </Box>
          <Box
            className="m-2"
            sx={{
              width: {
                xs: "100%",
                sm: "calc(50% - 16px)",
                md: "calc(33% - 16px)",
              },
            }}
          >
            <Card sx={{ minWidth: 275 }}>
              <CardContent>
                {/* <Typography
                sx={{ fontSize: 14 }}
                color="text.secondary"
                gutterBottom
              >
                Simple, memorable, and impactful
              </Typography> */}
                <Typography variant="h5" component="div">
                  Website Generator
                </Typography>
                {/* <Typography sx={{ mb: 1.5 }} color="text.secondary">
              Simple, memorable, and impactful
              </Typography> */}
                <Typography className="pt-4" variant="body2">
                  Create a website for your business
                  <br />
                  {'"Digital is more important than ever."'}
                </Typography>
              </CardContent>
              <CardActions className="justify-center">
                <Button size="small" key={pages[1].name} href={pages[1].link}>
                  Create Website
                </Button>
              </CardActions>
            </Card>
          </Box>
          <Box
            className="m-2"
            sx={{
              width: {
                xs: "100%",
                sm: "calc(50% - 16px)",
                md: "calc(33% - 16px)",
              },
            }}
          >
            <Card sx={{ minWidth: 275 }}>
              <CardContent>
                {/* <Typography
                sx={{ fontSize: 14 }}
                color="text.secondary"
                gutterBottom
              >
                Simple, memorable, and impactful
              </Typography> */}
                <Typography variant="h5" component="div">
                  Google Ads Generator
                </Typography>
                {/* <Typography sx={{ mb: 1.5 }} color="text.secondary">
              Simple, memorable, and impactful
              </Typography> */}
                <Typography className="pt-4" variant="body2">
                  Let people know about your business
                  <br />
                  {'"Unleash your business potential."'}
                </Typography>
              </CardContent>
              <CardActions className="justify-center">
                <Button size="small" key={pages[2].name} href={pages[2].link}>
                  Create Ads
                </Button>
              </CardActions>
            </Card>
          </Box>
        </Box>

        {/* <div className="max-w-xl w-full">
          <div className="flex mt-10 items-center space-x-3">
            <Image
              src="/1-black.png"
              width={30}
              height={30}
              alt="1 icon"
              className="mb-5 sm:mb-0"
            />
            <p className="text-left font-medium">
              Let's Start Generating Your Business Domain{" "}
              <Tooltip
                title={
                  <div>
                    <p>
                      Type the main focus of your business or hobby. This helps
                      us suggest a domain that's just right for you
                    </p>
                  </div>
                }
              >
                <span className="info-icon cursor-pointer">&#x24D8;</span>
              </Tooltip>
            </p>
          </div>
          <textarea
            value=""
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder={
              "Enter Your Business or Hobby. E.g., Boutique Coffee Shop, Personal Fitness"
            }
          />
        </div> */}

        <SignedOut>
          <div className="mt-8">
            <a
              onClick={() => openSignIn()}
              className="bg-black cursor-pointer rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
            >
              Sign in / up
            </a>
          </div>
        </SignedOut>

        {/* <div className={styles.pricingTitle}>
          <h2 className="font-medium mb-10">
            Or You Can Generate Your Website and/or Google Ads
          </h2>
        </div> */}

        <div className={styles.pricingTitle}>
          <h2 className="mt-12 font-medium" style={{ fontSize: 30 }}>
            A perfect fit for creators and businesses owners
          </h2>
        </div>

        <div className={styles.wrapperCard}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <h3>Free</h3>
              <h4>
                For individuals who want to try out the most advanced AI domain
                generator.
              </h4>
            </div>
            <div className={styles.cardPrice}>
              <h2>
                <sup>$</sup>0<small>forever</small>
              </h2>
            </div>
            <div className={styles.cardDescription}>
              <ul>
                <li className={styles.ok}>Unlimited domains names</li>
                <li className={styles.ok}>
                  Click to check domain availability
                </li>
                <li className={styles.ok}>See domain rating</li>
              </ul>
            </div>
            {subsTplan !== "FREE" ? (
              <>
                <div className={styles.cardAction}>
                  <button type="button" onClick={handleSubscriptionFreeClick}>
                    Get free
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.cardTitle}>
                  <h3>subscribed</h3>
                </div>
              </>
            )}
          </div>

          <div className={`${styles.card} ${styles.popular}`}>
            <div className={styles.cardRibbon}>
              <span>most popular</span>
            </div>
            <div className={styles.cardTitle}>
              <h3>Starter</h3>
              <span className={styles.off}>First month 80% off</span>
              <h4>
                For hobbyists bringing ideas to life with AI by their side.
              </h4>
            </div>
            <div className={styles.cardPrice}>
              <h2>
                <sup>$</sup>
                <span className={styles.discountPrice}>5</span>
                <span className={styles.ml2}>
                  <sup>$</sup>1<small>/month</small>
                </span>
              </h2>
            </div>
            <div className={styles.cardDescription}>
              <ul>
                <li>Everything in free, plus</li>
                <li className={styles.ok}>
                  Generate only available domain names
                </li>
                <li className={styles.ok}>Website generator</li>
                <li className={styles.ok}>Support (Chat and Email)</li>
                <li className={styles.ok}>Premium features*</li>
              </ul>
            </div>
            {subsTplan !== "STARTER" ? (
              <>
                {/*!isLoaded || !user ? (
                  <div className={styles.cardAction}>
                    <button type="button" onClick={() => openSignIn()}>
                      Get starter
                    </button>
                  </div>
                ) : */(
                  <div className={styles.cardAction}>
                    <form action="/api/checkout_sessions" method="POST">
                      <input type="hidden" name="tipo" value={subsTplan} />
                      <button
                        type="submit"
                        onClick={handleSubsStarterCreatorClick}
                      >
                        Get starter
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={styles.cardTitle}>
                  <h3>subscribed</h3>
                </div>
              </>
            )}
          </div>

          <Box className={styles.card}>
            <div className={styles.cardTitle}>
              <h3>Creator</h3>
              <span className={styles.off}>First month 50% off</span>
              <h4>
                For passionate creators building the apps they want to see in
                the world.
              </h4>
            </div>
            <div className={styles.cardPrice}>
              <h2>
                <sup>$</sup>
                <span className={styles.discountPrice}>22</span>
                <span className={styles.ml2}>
                  <sup>$</sup>
                  11
                  <small>/month</small>
                </span>
              </h2>
            </div>
            <div className={styles.cardDescription}>
              <ul>
                <li>Everything in starter, plus</li>
                <li className={styles.ok}>
                  Generate domains and websites with the latest AI model
                </li>
                <li className={styles.ok}>Priority support (Chat and Email)</li>
                <li className={styles.ok}>Premium features*</li>
              </ul>
            </div>
            {subsTplan !== "CREATOR" ? (
              <>
                {/*!isLoaded || !user ? (
                  <div className={styles.cardAction}>
                    <button type="button" onClick={() => openSignIn()}>
                      Get creator
                    </button>
                  </div>
                ) : */(
                  <div className={styles.cardAction}>
                    <form action="/api/checkout_sessions" method="POST">
                      <input type="hidden" name="tipo" value={subsTplan} />
                      <button
                        type="submit"
                        onClick={handleSubsStarterCreatorClick}
                      >
                        Get creator
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={styles.cardTitle}>
                  <h3>subscribed</h3>
                </div>
              </>
            )}
          </Box>
        </div>

        <Box className="flex">
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <p>Need more?</p>
              <h3 className="mt-3">Custom Plans</h3>
              <h4 className="mt-3">
                For custom requirements and tailored services, contact us for
                dedicated support and precise control over your needs.
              </h4>
            </div>
            <div className={styles.cardAction} style={{ display: "flex", justifyContent: "center", width: "100%", marginTop:"30px" }}>
              <button type="button" onClick={() => letsTalk()} style={{ width:"300px"}}>
                Let's talk
              </button>
              <EmailModal open={modalOpenLetsTalk} onClose={handleCloseModalLetsTalk} subjectType='custom requirements' />
            </div>
            <div className={styles.cardDescription}>
              <ul>
                <li className={styles.ok}>Custom Website Support</li>
                <li className={styles.ok}>Custom Google Ads Support</li>
                <li className={styles.ok}>Api Access (coming soon)</li>
              </ul>
            </div>
          </div>
        </Box>

    <div>
      <h2 className="mt-12 font-medium" style={{ fontSize: 30 }}>
      Frequently Asked Questions
      </h2>

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

        <Snackbar
          autoHideDuration={3000}
          anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          open={openSuccess}
          variant="soft"
          color="success"
          onClose={() => setOpenSuccess(false)}
        >
          {message}
        </Snackbar>
        <Snackbar
          autoHideDuration={2500}
          anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          open={openDanger}
          variant="soft"
          color="danger"
          onClose={() => setOpenDanger(false)}
        >
          {message}
        </Snackbar>
      </main>
      <Footer />
    </div>
  );
};

export default Home;