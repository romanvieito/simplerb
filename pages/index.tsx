import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { Box, Button, Tooltip } from "@mui/material";
import { useClerk, SignedOut } from "@clerk/nextjs";
import type { NextPage } from "next";

import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

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

  const { openSignIn } = useClerk();

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
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
        <br/>

      </main>
      <Footer />
    </div>
  );
};

export default Home;