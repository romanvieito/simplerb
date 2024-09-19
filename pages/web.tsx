import React, { useState, useContext, useRef } from "react";
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import Header from "../components/Header";
import {
  Box,
} from "@mui/material";
import mixpanel from "../utils/mixpanel-config";
import Image from "next/image";
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const WebPage = () => {
  const { openSignIn } = useClerk();
  const [loading, setLoading] = useState(false);
  const [textName, setTextName] = useState("");
  const [textDescription, setTextDescription] = useState("");
  const [generatedSite, setGeneratedSite] = useState("");
  const [openWebSite, setOpenWebSite] = React.useState(false);

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { subsTplan } = context;

  const generateWeb = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setLoading(true);

    try {

      if (subsTplan !== "CREATOR" && subsTplan !== "STARTER") {
        toast(
          "Premium plan required. Please become a member to generate websites.",
          {
            icon: "⏳",
            style: {
              border: "1px solid #FFA500",
              padding: "16px",
              color: "#FFA500",
            },  
            duration: 10000,
          }
        );
        setLoading(false);
        return;
      }
  
      // Designer Agent
      const designerPrompt = `As a web designer, create a visually appealing layout for a landing page with the following name: ${textName} and description: ${textDescription}. Focus on the structure, color scheme, and overall visual elements. Provide a high-level HTML structure with placeholder content. Just return the code, nothing else.`;

      const designerResponse = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: designerPrompt }),
      });

      if (!designerResponse.ok) throw new Error(designerResponse.statusText);
      const designerResult = await designerResponse.json();
      console.log("designerResult", designerResult);
      const designLayout = designerResult.data.content[0].text;

      // Developer Agent
      const developerPrompt = `As a web developer, enhance the following HTML structure with interactive elements and responsive design. Add appropriate CSS and JavaScript to make the page functional and engaging. Here's the initial layout: ${designLayout}. Just return the code, nothing else.`;

      const developerResponse = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: developerPrompt }),
      });

      if (!developerResponse.ok) throw new Error(developerResponse.statusText);
      const developerResult = await developerResponse.json();
      console.log("developerResult", developerResult);
      let finalWebsite = developerResult.data.content[0].text;

      // Reviewer Agent
      const reviewerPrompt = `As a web quality assurance specialist, review the following website code: ${finalWebsite}. Just focus in:
      	•	Replace placeholder resources with actual product images and data.
        •	Update the CTA button functionality and ensure the links point to real destinations.
        •	Test and optimize for responsiveness on all devices and screen sizes.
      Analyze the code for potential improvements and provide a short and concise summary of your critical findings and suggested enhancements.`;

      const reviewerResponse = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: reviewerPrompt }),
      });

      if (!reviewerResponse.ok) throw new Error(reviewerResponse.statusText);

      const reader = reviewerResponse.body?.getReader();
      let reviewerResult = '';
      while (true) {
        const { done, value } = await reader?.read() ?? { done: true, value: undefined };
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonData = JSON.parse(line.slice(6));
            reviewerResult += jsonData.text;
          }
        }
      }
      reviewerResult = reviewerResult.trim();
      console.log("reviewerResult", reviewerResult);

      // Developer Agent (Fixing Reviewer Feedback)
      const fixerPrompt = `As a web developer, please address the following QA feedback and improve the website code accordingly:

      ${reviewerResult}

      Here's the current website code:

      ${finalWebsite}

      Please provide the updated code that addresses these issues. Just return the improved code, nothing else.`;

      const fixerResponse = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fixerPrompt }),
      });

      if (!fixerResponse.ok) throw new Error(fixerResponse.statusText);
      const fixerResult = await fixerResponse.json();
      console.log("fixerResult", fixerResult);
      const improvedWebsite = fixerResult.data.content[0].text;

      // Add review summary to the generated site
      const reviewedWebsite = `
        ${finalWebsite}
        <!-- QA Review Summary -->
        <div style="margin-top: 20px; padding: 10px; background-color: #f0f0f0; border: 1px solid #ccc;">
          <h3>QA Review Summary:</h3>
          <pre>${reviewerResult}</pre>
        </div>
      `;

      // Update the final website with improvements
      finalWebsite = improvedWebsite;

      setGeneratedSite(reviewedWebsite);

      setGeneratedSite(finalWebsite);
      setOpenWebSite(true);

      mixpanel.track("Web Generated", {
        textName: textName,
        textDescription: textDescription,
      });
    } catch (error) {
      console.error("Error generating website:", error);
      toast.error("Failed to generate website. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeWebSite = () => {
    setOpenWebSite(false);
  }

  const downloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedSite], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = "generated_site.html";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();

    //TODO Code se corta, generatedSite es muy largo pa mixpanel
    mixpanel.track("Download Web Code Button Click", {
      textName: textName,
      textDescription: textDescription
    });
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Website Creator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4">
        <div className="flex justify-center items-center w-full max-w-xl">
   
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{ duration: 5000 }}
          />
          <h1 className="sm:text-2xl text-1xl  max-w-[708px] font-bold text-slate-900">
            Website Creator
          </h1>
          <div className="ml-auto w-8"></div> {/* This empty div balances the layout */}
        </div>

        <div className="max-w-xl w-full mt-10">
        <div className="flex mt-0 items-center space-x-3">
            <Image
              src="/1-black.png"
              width={30}
              height={30}
              alt="1 icon"
              className="mb-0"
            />
            <p className="text-left font-medium">
              Enter Your Website or Brand Name{" "}
            </p>
          </div>
          <input
            type="text"
            value={textName}
            onChange={(e) => setTextName(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder={"e.g., mywebsite.com"}
          />
          
          <div className="flex mb-1 items-center space-x-3">
            <Image
              src="/2-black.png"
              width={30}
              height={30}
              alt="1 icon"
              className="mb-0"
            />
            <p className="text-left font-medium">Enter Your Website Description</p>
          </div>
          <textarea
            value={textDescription}
            onChange={(e) => setTextDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder={"e.g., Boutique Coffee Shop, Personal Fitness"}
          />
          
         
          <SignedOut>  
            <button
              className="bg-black rounded-md text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={() => openSignIn()}
            >
              Sign in / up
            </button> 
          </SignedOut>
          <SignedIn>
          {!loading &&           
             <button
             className="bg-black text-white rounded-md font-medium px-4 py-2 mt-2 hover:bg-gray-800 w-full"
             onClick={generateWeb}
             disabled={loading}
           >
             {loading ? "Saving..." : "Create Website"}
           </button>         
            }
            {loading && (
              <button
                className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
                disabled
              >
                <LoadingDots color="white" style="large" />
              </button>
            )}
          </SignedIn>
        </div>

        <div>
        <Dialog
          fullScreen
          open={openWebSite}
          onClose={closeWebSite}
          TransitionComponent={Transition}
        >
          <AppBar sx={{ position: 'relative', backgroundColor: 'gray' }}>
            <Toolbar>
              <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={closeWebSite}
                  aria-label="close"
                >
                  <CloseIcon />
                </IconButton>
                <Typography sx={{ ml: 2 }} variant="h6" component="div">
                  Preview
                </Typography>
              </Box>
              <Button autoFocus color="inherit" onClick={downloadCode}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download Code
              </Button>
            </Toolbar>
          </AppBar>
          <Box component="section" sx={{ border: '1px dashed grey' }}>
            <div dangerouslySetInnerHTML={{ __html: generatedSite }} />
          </Box>          
        </Dialog>       
        </div>        
      </main>
    </div>
  );
};

export default WebPage;
