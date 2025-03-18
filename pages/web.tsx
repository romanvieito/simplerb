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
  const [previewViewport, setPreviewViewport] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  const getViewportWidth = () => {
    switch (previewViewport) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
    }
  };

  const handlePreviewLoad = () => {
    setPreviewLoading(false);
  };

  const refreshPreview = () => {
    setPreviewLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const downloadPreview = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedSite], { type: "text/html" });
    element.href = URL.createObjectURL(file);
    element.download = `${textName.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    mixpanel.track("Download Web Preview", {
      textName: textName,
      textDescription: textDescription,
      viewport: previewViewport
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedSite);
    toast.success("Code copied to clipboard!");
    mixpanel.track("Copy Web Code", {
      textName: textName,
      textDescription: textDescription
    });
  };

  const PreviewToolbar = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      justifyContent: 'space-between',
      zIndex: 1000,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => setOpenWebSite(false)}
          className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="text-lg font-medium text-gray-900">{textName}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Viewport Controls */}
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            onClick={() => setPreviewViewport('mobile')}
            className={`p-2 rounded ${previewViewport === 'mobile' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
            title="Mobile view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setPreviewViewport('tablet')}
            className={`p-2 rounded ${previewViewport === 'tablet' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
            title="Tablet view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm4 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setPreviewViewport('desktop')}
            className={`p-2 rounded ${previewViewport === 'desktop' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
            title="Desktop view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Action Buttons */}
        <button
          onClick={refreshPreview}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Refresh preview"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={copyCode}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Copy code"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
            <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
        </button>
        <button
          onClick={downloadPreview}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Download HTML"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );

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
                  onClick={downloadPreview}
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
          onClose={() => setOpenWebSite(false)}
          TransitionComponent={Transition}
        >
          <PreviewToolbar />
          <div style={{
            marginTop: '60px',
            height: 'calc(100vh - 60px)',
            backgroundColor: '#f3f4f6',
            display: 'flex',
            justifyContent: 'center',
            padding: '2rem',
            overflow: 'auto'
          }}>
            <div style={{
              width: getViewportWidth(),
              height: '100%',
              backgroundColor: 'white',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              overflow: 'hidden',
              transition: 'width 0.3s ease'
            }}>
              {previewLoading && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1
                }}>
                  <LoadingDots color="black" style="large" />
                </div>
              )}
              <iframe
                ref={iframeRef}
                srcDoc={generatedSite}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  opacity: previewLoading ? 0.5 : 1,
                  transition: 'opacity 0.3s ease'
                }}
                onLoad={handlePreviewLoad}
                title="Website Preview"
              />
            </div>
          </div>
        </Dialog>       
        </div>        
      </main>
    </div>
  );
};

export default WebPage;
