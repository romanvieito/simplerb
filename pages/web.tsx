import React, { useState, useContext, useRef } from "react";
import Head from "next/head";
import { Toaster, toast } from "react-hot-toast";
import Header from "../components/Header";
import {
  Box,
  Tooltip,
} from "@mui/material";
import mixpanel from "../utils/mixpanel-config";
import Image from "next/image";
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Slide from '@mui/material/Slide';
import { TransitionProps } from '@mui/material/transitions';
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/20/solid";
import DiamondIcon from '@mui/icons-material/Diamond';
import { useRouter } from 'next/router';
import DOMPurify from 'dompurify';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Add type for subscription plan
type SubscriptionPlan = 'CREATOR' | 'STARTER' | 'FREE';

const WebPage = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const [loading, setLoading] = useState(false);
  const [textName, setTextName] = useState("");
  const [textDescription, setTextDescription] = useState("");
  const [generatedSite, setGeneratedSite] = useState("");
  const [openWebSite, setOpenWebSite] = React.useState(false);

  const getImageFromPexels = async (query: string) => {
    try {
      const response = await fetch(`/api/pexels?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch image from Pexels');
      }
      const data = await response.json();
      if (data.photos && data.photos.length > 0) {
        const photo = data.photos[0];
        return {
          url: photo.src.large,
          alt: photo.alt,
          photographer: photo.photographer,
          photographer_url: photo.photographer_url,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching image from Pexels:', error);
      return null;
    }
  };

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { subsTplan } = context as { subsTplan: SubscriptionPlan };

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
        mixpanel.track("Free user try Create Website", {
          textName: textName,
          textDescription: textDescription,
        });
        setLoading(false);
        return;
      }

      // Designer Agent
      const designerPrompt = `As a web designer, analyze the following website requirements and provide a design direction:
      Website Name: ${textName}
      Description: ${textDescription}

      Your tasks:
      1. Pick ONE specific reference website that would work well for this type of content
      2. Define the layout sections needed (e.g., hero, features, about, contact)
      3. Select a color palette (primary, secondary, accent colors)
      4. List exactly 4 specific images we need for this layout (1 hero image, 3 feature images)
      
      Return your response in this exact JSON format:
      {
        "reference_website": "name and URL of the reference website",
        "design_style": "brief description of the chosen design style",
        "layout_sections": ["array of section names in order"],
        "colors": {
          "primary": "hex color",
          "secondary": "hex color",
          "accent": "hex color",
          "text": "hex color",
          "background": "hex color"
        },
        "typography": {
          "headings": "font family name",
          "body": "font family name"
        },
        "images": [
          {
            "type": "hero",
            "search_query": "specific search query for Pexels",
            "description": "what this image should show",
            "alt_text": "SEO-friendly alt text"
          },
          {
            "type": "feature1",
            "search_query": "specific search query for Pexels",
            "description": "what this image should show",
            "alt_text": "SEO-friendly alt text"
          },
          {
            "type": "feature2",
            "search_query": "specific search query for Pexels",
            "description": "what this image should show",
            "alt_text": "SEO-friendly alt text"
          },
          {
            "type": "feature3",
            "search_query": "specific search query for Pexels",
            "description": "what this image should show",
            "alt_text": "SEO-friendly alt text"
          }
        ]
      }

      Return ONLY the JSON, nothing else.`;

      const designerResponse = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: designerPrompt }),
      });

      if (!designerResponse.ok) {
        throw new Error(`Designer API error: ${designerResponse.statusText}`);
      }

      const designerResult = await designerResponse.json();
      
      if (!designerResult?.data?.content?.[0]?.text) {
        throw new Error("Invalid designer response structure");
      }

      // Parse the designer's JSON response
      const designPlan = JSON.parse(designerResult.data.content[0].text);

      interface DesignImage {
        type: string;
        search_query: string;
        description: string;
        alt_text: string;
      }

      // Fetch all images based on the designer's specifications
      const images = await Promise.all(
        designPlan.images.map(async (image: DesignImage) => {
          const pexelsResult = await getImageFromPexels(image.search_query);
          return {
            ...image,
            pexels: pexelsResult
          };
        })
      );

      // Developer Agent
      const developerPrompt = `As a web developer, create a modern, responsive website based on this design direction:

      Reference Website: ${designPlan.reference_website}
      Design Style: ${designPlan.design_style}
      Layout Sections: ${designPlan.layout_sections.join(', ')}
      
      Colors:
      ${Object.entries(designPlan.colors).map(([key, value]) => `${key}: ${value}`).join('\n')}
      
      Typography:
      Headings: ${designPlan.typography.headings}
      Body: ${designPlan.typography.body}

      Images:
      ${images.map(img => `${img.type}: 
        URL: ${img.pexels?.url || 'https://via.placeholder.com/1920x1080'}
        Alt: ${img.alt_text}
        Description: ${img.description}`).join('\n')}

      Requirements:
      1. Follow the reference website's general layout structure

      Return a complete HTML document with embedded CSS and JavaScript.
      Just return the code, nothing else.`;

      const developerResponse = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: developerPrompt }),
      });

      if (!developerResponse.ok) {
        throw new Error(`Developer API error: ${developerResponse.statusText}`);
      }

      const developerResult = await developerResponse.json();
      
      if (!developerResult?.data?.content?.[0]?.text) {
        throw new Error("Invalid developer response structure");
      }

      let finalWebsite = developerResult.data.content[0].text;

      // Add image attribution footer with enhanced styling
      const attributionHtml = `
        <footer style="margin-top: 2rem; padding: 2rem; background: ${designPlan.colors.background}; color: ${designPlan.colors.text}; font-family: ${designPlan.typography.body}; text-align: center;">
          <div style="max-width: 1200px; margin: 0 auto;">
            <p style="margin-bottom: 1rem;">Images provided by <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" style="color: ${designPlan.colors.accent};">Pexels</a></p>
            ${images.map(img => 
              img.pexels ? `<p style="margin: 0.5rem 0;"><strong>${img.type}</strong> image by <a href="${img.pexels.photographer_url}" target="_blank" rel="noopener noreferrer" style="color: ${designPlan.colors.accent};">${img.pexels.photographer}</a></p>` : ''
            ).join('\n')}
            <p style="margin-top: 1rem;">Design inspired by: <a href="${designPlan.reference_website}" target="_blank" rel="noopener noreferrer" style="color: ${designPlan.colors.accent};">${designPlan.reference_website}</a></p>
          </div>
        </footer>
      `;

      // Add attribution to final website
      finalWebsite = finalWebsite.includes('</body>') 
        ? finalWebsite.replace('</body>', `${attributionHtml}</body>`)
        : `${finalWebsite}${attributionHtml}`;

      // Sanitize the HTML before setting it
      const sanitizedWebsite = DOMPurify.sanitize(finalWebsite);
      setGeneratedSite(sanitizedWebsite);
      setOpenWebSite(true);

      mixpanel.track("Web Generated", {
        textName: textName,
        textDescription: textDescription,
        referenceWebsite: designPlan.reference_website
      });
    } catch (error) {
      console.error("Error generating website:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate website. Please try again.");
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
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>
        <div className="flex justify-center items-center w-full max-w-xl">
          {generatedSite && (
            <>
              <Tooltip title={openWebSite ? "Hide Preview" : "Show Preview"} arrow placement="left">
                <Button
                  variant="contained"
                  color="primary"
                  style={{
                    position: "fixed",
                    bottom: 20,
                    right: 20,
                    borderRadius: "50%",
                    width: 60,
                    height: 60,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    zIndex: 9999,
                  }}
                  onClick={() => setOpenWebSite(!openWebSite)}
                >
                  {openWebSite ? <EyeIcon /> : <EyeSlashIcon />}
                </Button>
              </Tooltip>
              
              <Tooltip title="Download Code" arrow placement="left">
                <Button
                  variant="contained"
                  style={{
                    position: "fixed",
                    backgroundColor: "black",
                    bottom: 90,
                    right: 20,
                    borderRadius: "50%",
                    width: 60,
                    height: 60,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    zIndex: 9999,
                  }}
                  onClick={downloadCode}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </Button>
              </Tooltip>
            </>
          )}
          
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
            <DiamondIcon className="mr-2" />

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
