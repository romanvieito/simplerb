import React, { useState, useRef } from 'react';
import Head from "next/head";
import Image from "next/image";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useClerk, SignedIn, SignedOut } from "@clerk/nextjs";

const AdsPage = () => {
  const [adDescription, setAdDescription] = useState('');
  const [uploadedImage, setUploadedImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { openSignIn } = useClerk();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const sendInformationToBackend = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/save-ads-information', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: adDescription, image: uploadedImage }),
      });
      
      if (response.ok) {
        // Handle success (e.g., show a success message, redirect, etc.)
        console.log('Ad information saved successfully');
      } else {
        // Handle error
        console.error('Failed to save ad information');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Ad Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4">
        {/* <h1 className="max-w-[708px] font-bold text-slate-900">
          Generate Your Google Ads
        </h1> */}
        <div className="max-w-xl w-full">
          <div className="flex mb-5 items-center space-x-3">
            <Image src="/1-black.png" width={30} height={30} alt="1 icon" />
            <p className="text-left font-medium">
              Describe your ad campaign
            </p>
          </div>
          <textarea
            value={adDescription}
            onChange={(e) => setAdDescription(e.target.value)}
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder="e.g., Summer sale for outdoor furniture, 20% off all items"
          />

          <div className="flex mb-5 items-center space-x-3">
            <Image src="/2-black.png" width={30} height={30} alt="2 icon" />
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
            className="bg-gray-200 rounded-md text-black font-medium px-4 py-2 hover:bg-gray-300"
            onClick={triggerFileInput}
          >
            {uploadedImage ? "Change image" : "Choose image"}
          </button>
          
          {uploadedImage && (
            <div className="mt-4">
              <Image src={uploadedImage} alt="Uploaded image" width={200} height={200} objectFit="contain" />
            </div>
          )}

          <SignedOut>  
            <button
              className="bg-black rounded-md text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={() => openSignIn()}
            >
              Sign Up Now for Early Access
            </button> 
          </SignedOut>
          <SignedIn>        
            <button
              className="bg-black rounded-md text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={sendInformationToBackend}
              disabled={loading || isUploading}
            >
              {loading ? "Generating..." : "Generate Ad"}
            </button> 
          </SignedIn>                   
        </div>
      </main>
      {/* <Footer/>       */}
    </div>
  );
};

export default AdsPage;