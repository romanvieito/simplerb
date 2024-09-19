import React, { useState, useContext, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import Footer from "../components/Footer";
import { Toaster, toast } from "react-hot-toast";
import Header from "../components/Header";
import {
  Box,
  Switch,
  FormControlLabel,
  FormHelperText,
  FormGroup,
  FormControl,
  FormLabel,
  Tooltip,
} from "@mui/material";
import mixpanel from "../utils/mixpanel-config";
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";
import {
  ptemp,
  ptop,
} from "../utils/Definitions";
import Image from "next/image";
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import CPricing from "../components/CPricing";
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  bgcolor: 'background.paper',
  border: '1px #000',
  boxShadow: 24,
  p: 2,
  maxHeight: '90vh', // Establece la altura máxima del contenedor
  overflow: 'auto'   // Activa el desplazamiento automático  
};

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

  const [openPricing, setOpenPricing] = React.useState(false);
  const [openWebSite, setOpenWebSite] = React.useState(false);

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { dataUser, subsTplan } = context;

  const generateWeb = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Designer Agent
      const designerPrompt = `As a web designer, create a visually appealing layout for a landing page with the following description: ${textDescription}. Focus on the structure, color scheme, and overall visual elements. Provide a high-level HTML structure with placeholder content. Just return the code, nothing else.`;

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
      const finalWebsite = developerResult.data.content[0].text;

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

  // const showPricing = () => {
  //   setOpenPricing(true);
  // } 

  const closePricing = () => {
    setOpenPricing(false);
  }  

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
      generatedSite: generatedSite
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
          <div className="flex mb-1 items-center space-x-3">
            <Image
              src="/1-black.png"
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
        <br/>        
        <div>
          <Modal
            open={openPricing}
            onClose={closePricing}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box sx={style}>
              <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                <CPricing />
              </Typography>
            </Box>
          </Modal>
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
