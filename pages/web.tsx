import React, { useState, useContext } from "react";
import Head from "next/head";
import Footer from "../components/Footer";
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
    
    let hardcodedHTML = '';
    //-------------------------------------------------------------------------------------------------
    /*const prompt = `Your task is to create a one-page website based on the given specifications, delivered as an HTML file with embedded JavaScript and CSS. The website should incorporate a variety of engaging and interactive design features, such as drop-down menus, dynamic text and content, clickable buttons, and more. Ensure that the design is visually appealing, responsive, and user-friendly. The HTML, CSS, and JavaScript code should be well-structured, efficiently organized, and properly commented for readability and maintainability.
    Create a one-page website for an online business website called ${textName} with the features and sections you believe match the client's business description. Just return the code, nothing else.
    Client's business description: ${textDescription}.`;*/

    const prompt = `Claude:
    I am ${dataUser.name}
    Objective:
    Your mission is to create a personal webpage for me, all in a single file.
    Details:    
    - The title is: ${textName}
    - Content Details: This is the content of the "Description" section: ${textDescription}
    Just return the code in format html, nothing else.`;    

    setLoading(true);

    const response = await fetch("/api/anthropic", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt
      }),
    });

    if (!response.ok) {
      setLoading(false);
      throw new Error(response.statusText);
    }

    const result = await response.json();

    setLoading(false);

    console.log('View anthropic:', result.data.content[0].text);    

    if(result) hardcodedHTML = result.data.content[0].text;

    setGeneratedSite(hardcodedHTML);

    setOpenWebSite(true);

    mixpanel.track("Web Generated", {
      textName: textName,
      textDescription: textDescription,
    });
  };

  const showPricing = () => {
    setOpenPricing(true);
  } 

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
        <title>Website Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Website Generator
        </h1>
        <div className="max-w-xl w-full">
          <div className="flex mt-10 items-center space-x-3">
            <Image
              src="/1-black.png"
              width={30}
              height={30}
              alt="1 icon"
              className="mb-5 sm:mb-0"
            />
            <p className="text-left font-medium">
              Enter Your Business Name{" "}
            </p>
          </div>
          <textarea
            value={textName}
            onChange={(e) => setTextName(e.target.value)}
            rows={1}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder={"e.g., SimplerB"}
          />
          <div className="flex mb-5 items-center space-x-3">
            <Image src="/2-black.png" width={30} height={30} alt="1 icon" />
            <p className="text-left font-medium">
            Enter Your Business Description{" "}
            </p>
          </div>
          <textarea
            value={textDescription}
            onChange={(e) => setTextDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-1"
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
              className="bg-black rounded-md text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={(e)=>generateWeb(e)}
            >
              Create website
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
          <AppBar sx={{ position: 'relative', backgroundColor: 'black' }}>
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
                  Generated Website Preview
                </Typography>
              </Box>
              <Button autoFocus color="inherit" onClick={downloadCode}>
                Download Code
              </Button>
            </Toolbar>
          </AppBar>
          <Box component="section" sx={{ p: 2, border: '1px dashed grey' }}>
            <div dangerouslySetInnerHTML={{ __html: generatedSite }} />
          </Box>          
        </Dialog>       
        </div>        
      </main>
      <Footer />
    </div>
  );
};

export default WebPage;
