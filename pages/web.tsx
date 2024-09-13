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
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const prompt = `Claude: Your task is to create a one-page website based on the given specifications, delivered as an HTML file with embedded JavaScript and CSS. The website should incorporate a variety of engaging and interactive design features, such as drop-down menus, dynamic text and content, clickable buttons, and more. Ensure that the design is visually appealing, responsive, and user-friendly. The HTML, CSS, and JavaScript code should be well-structured, efficiently organized, and properly commented for readability and maintainability.
    Create a one-page website for an online business website called ${textName} with the features and sections you believe match the client's business description. Just return the code, nothing else.
    Client's business description: ${textDescription}`;

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

    //console.log('View anthropic:', result.data.content[0].text);    

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select an image file.");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const sendInformationToBackend = async () => {
    if (!textDescription.trim()) {
      alert("Please enter a description.");
      return;
    }

    setIsUploading(true);

    // Get the domain from the URL query parameter
    const domain = typeof window !== 'undefined' ? new URL(window.location.href).searchParams.get('domain') || '' : '';

    try {
      const response = await fetch('/api/save-web-information', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          description: textDescription,
          image: uploadedImage,
          domain: domain
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save information');
      }

      const data = await response.json();
      console.log('Information saved successfully:', data);
      // toast.success('Information saved successfully! We will start generating your website.');
      
      toast(
        "Success! We’ve saved your details and are now creating your website. Keep an eye on your email for further updates.",
        {
          icon: "🚀",
          style: {
            border: "1px solid #000",
            padding: "16px",
            color: "#000",
          },
        }
      );
    } catch (error) {
      console.error('Error saving information:', error);
      alert('Failed to save information. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Website Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4">
        <div className="flex justify-center items-center w-full max-w-xl">
          <Link href="/domain" className="text-black hover:text-gray-700 mr-auto">
            ← Back
          </Link>
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{ duration: 5000 }}
          />
          <h1 className="sm:text-2xl text-1xl  max-w-[708px] font-bold text-slate-900">
            Website Generator
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
          
          {/* Image upload section */}
          <div className="flex mb-5 items-center space-x-3">
            <Image
              src="/2-black.png"
              width={30}
              height={30}
              alt="1 icon"
              className="mb-0"
            />
            <p className="text-left font-medium">Upload an image (optional)</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            className="bg-gray-200 rounded-md text-black font-medium px-4 py-2 mb-4 hover:bg-gray-300"
            onClick={triggerFileInput}
          >
            {uploadedImage ? "Change image" : "Choose image"}
          </button>
          
          {uploadedImage && (
            <div className="mb-4">
              <Image src={uploadedImage} alt="Uploaded image" width={200} height={200} objectFit="contain" />
            </div>
          )}
          
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
             onClick={sendInformationToBackend}
             disabled={isUploading}
           >
             {isUploading ? "Saving..." : "Send Information"}
           </button>         
            }
            {/* {loading && (
              <button
                className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
                disabled
              >
                <LoadingDots color="white" style="large" />
              </button>
            )} */}
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
    </div>
  );
};

export default WebPage;
