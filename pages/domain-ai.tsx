import React, { useState, useContext, useEffect } from "react";
import Head from "next/head";
import { toast } from "react-hot-toast";
import { DomainInfo, VibeType } from "../utils/Definitions";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";
import mixpanel from "../utils/mixpanel-config";
import { useRouter } from "next/router";
import { useClerk, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Button, Box } from "@mui/material";
import StarIcon from '@mui/icons-material/Star';
import DiamondIcon from '@mui/icons-material/Diamond';
import SBRContext from "../context/SBRContext";

const DomainPage: React.FC = () => {
  const router = useRouter();
  const { openSignIn } = useClerk();
  const { isLoaded, user, isSignedIn } = useUser();
  const [loading, setLoading] = useState(false);
  const [businessDescription, setBusinessDescription] = useState("");
  const [vibe, setVibe] = useState<VibeType>("Professional");
  const [generatedDomains, setGeneratedDomains] = useState<DomainInfo[]>([]);
  const [currentDomain, setCurrentDomain] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [filteredDomains, setFilteredDomains] = useState<DomainInfo[]>([]);

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error('SBRContext must be used within a SBRProvider');
  }
  const { 
    dataUser, 
    setDataUser,    
    credits, 
    setCredits, 
    admin, 
    setAdmin,
    subsTplan, 
    setSubsTplan, 
    subsCancel, 
    setSubsCancel    
   } = context;

  const isPremiumUser = subsTplan === "STARTER" || subsTplan === "CREATOR";

  const handleAvailableOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Track the change in the "Available only" checkbox
    mixpanel.track("Available Only Checkbox Changed", {
      checked: e.target.checked,
      isPremiumUser: isPremiumUser
    });
    if (isPremiumUser) {
      setAvailableOnly(e.target.checked);
    } else {
      toast.error("This feature is available only for premium members. Please upgrade your plan.");
    }
  };

  // Function to fetch user data by email
  const fetchUserData = async (email: string) => {
    try {
      const response = await fetch(`/api/getUser?email=${email}`);
      if (!response.ok) {
        const text = await response.text();
        console.error(`Response status: ${response.status}, text: ${text}`);
        throw new Error(`Network response was not ok. Status: ${response.status}`);
      }
      const userData = await response.json();
      if (userData.user) {
        setDataUser({
          id: userData.user.id,
          name: userData.user.name,
          email: userData.user.email
        });      
        setCredits(userData.user.credits);
        setAdmin(userData.user.admin);
        setSubsTplan(userData.user.subs_tplan);
        setSubsCancel(userData.user.subs_cancel);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  // Function to initialize page data
  const initPageData = async () => {
    if (isLoaded && user) {
      const email = user.emailAddresses[0].emailAddress;
      if (email) {
        try {
          await fetchUserData(email);
          mixpanel.identify(email);
        } catch (error) {
          console.error("Error initializing page data:", error);
          console.warn("Failed to load user data. Please try refreshing the page.");
        }
      } else {
        console.warn("User email not available");
      }
    } else if (isLoaded && !user) {
      // Reset user data when not signed in
      setSubsTplan(null);
      setSubsCancel(null);
      setCredits(null);
      setDataUser({
        id: '0',
        name: 'anonymous',
        email: 'anonymous@anonymous.com'
      });
      setAdmin(false);
    }
  };

  useEffect(() => {
    initPageData();
  }, [isSignedIn, user]);

  useEffect(() => {
    if (availableOnly && isPremiumUser) {
      checkAvailability();
    } else {
      setFilteredDomains(generatedDomains);
    }
  }, [generatedDomains, availableOnly, isPremiumUser]);

  const checkAvailability = async () => {
    try {
      // Assuming 'generatedDomains' is an array of your domain objects
      const domainsToCheck = generatedDomains.map((domainInfo) => domainInfo.domain);
  
      const response = await fetch('/api/check-availability-godaddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: domainsToCheck }),
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
  
      const availabilityResults = await response.json();
  
      // Map the availability results back to your generatedDomains
      const updatedDomains = generatedDomains.map((domainInfo) => {
        const availabilityInfo = availabilityResults.find(
          (result) => result.domain === domainInfo.domain
        );
        return {
          ...domainInfo,
          available: availabilityInfo ? availabilityInfo.available : undefined,
        };
      });
  
      // Update your state with the new domain information
      setGeneratedDomains(updatedDomains);
    } catch (error) {
      console.error('Error checking domain availability:', error);
    }
  };

  const generateDomains = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneratedDomains([]);

    try {
        const prompt = `
        Role: You are a domain name expert.
        Objective: Generate 5 memorable, brief, and simple domain names based on the following input:
        Client's input: ${businessDescription}
        Vibe: ${vibe}
        
        Return only the domain names, one per line.
      `;

      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ptemp: 0.7, ptop: 1 }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = response.body;
      if (!data) return;

      const reader = data.getReader();
      const decoder = new TextDecoder();
      const parser = createParser(onParse);
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        parser.feed(chunkValue);
      }

    } catch (error) {
      console.error("An error occurred:", error);
      toast.error("An error occurred while generating domains. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onParse = (event: ParsedEvent | ReconnectInterval) => {
    if (event.type === "event") {
      try {
        const text = JSON.parse(event.data).text ?? "";
        setCurrentDomain(prev => {
          const updatedDomain = prev + text;
          if (updatedDomain.includes("\n")) {
            const domains = updatedDomain.split("\n")
              .map(domain => domain.trim().replace(/^\d+\.\s*/, ""))
              .filter(domain => domain !== "");
            setGeneratedDomains(prev => [
              ...prev,
              ...domains.map(domain => ({ domain, available: undefined, favorite: false }))
            ]);
            return "";
          }
          return updatedDomain;
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleCheckAvailability = (domain: string) => {
    const cleanDomainName = domain.replace(/^\d+\.\s*/, "");
    const namecheapUrl = `https://www.namecheap.com/domains/registration/results/?domain=${cleanDomainName}`;
    window.open(namecheapUrl, "_blank");

    mixpanel.track("Check Domain Availability", {
      domain: cleanDomainName,
      source: "domain-ai-page",
    });

    toast.success(`Checking availability for ${cleanDomainName}`, {
      duration: 3000,
    });
  };

  const handleSubsStarterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    mixpanel.track("Become a Member Click", {
      plan_subscription: 'STARTER',
    });  
    window.gtag && window.gtag('event', 'conversion', {
      'send_to': '16510475658/ZCyECJS9tqYZEIq758A9',
    });

    const form = event.currentTarget.form;
    if (form) {
      form.submit();
    } else {
      console.error("Form not found");
    }
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Domain Generator
        </h1>

        <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 2, alignItems: 'center' }}>
          <SignedIn>
            <form action="/api/checkout_sessions" method="POST">
              <input type="hidden" name="tipo" value="STARTER" />
              <Button
                className="bg-black cursor-pointer hover:bg-black/80 rounded-xl"
                style={{ textTransform: "none" }}
                sx={{
                  padding: { xs: "3px", sm: 1 },
                  display: (isSignedIn && (subsTplan === "STARTER" || subsTplan === "CREATOR")) ? "none" : "block",
                }}
                type="submit"
                variant="contained"
                role="link"
                onClick={handleSubsStarterClick}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DiamondIcon sx={{ mr: 0.2, fontSize: '1rem' }} />
                  Become a Member
                </Box>
              </Button>
            </form>
            <UserButton userProfileUrl="/user" afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Button
              onClick={() => openSignIn()}
              className="bg-black cursor-pointer rounded-xl text-white font-medium px-4 py-2 hover:bg-black/80"
            >
              Sign in / up
            </Button>
          </SignedOut>
        </Box>

        <SignedIn>
          {/* Show this content when the user is signed in */}
          <form onSubmit={generateDomains} className="max-w-xl w-full">
            <div className="flex mt-10 items-center space-x-3">
              <p className="text-left font-medium">
                Describe your business or idea
              </p>
            </div>
            <textarea
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
              placeholder="e.g. Boutique Coffee Shop"
            />

            <div className="flex mb-5 items-center space-x-3">
              <p className="text-left font-medium">Select the vibe</p>
            </div>
            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value as VibeType)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
            >
              <option value="Professional">Professional</option>
              <option value="Friendly">Friendly</option>
              <option value="Creative">Creative</option>
              <option value="Sophisticated">Sophisticated</option>
            </select>

            <div className="flex items-center space-x-3 mt-5">
              <input
                type="checkbox"
                className={`${!isPremiumUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                checked={availableOnly}
                onChange={handleAvailableOnlyChange}
                disabled={!isPremiumUser}
              />
              <label className={`text-left font-medium ${!isPremiumUser ? 'text-gray-400' : ''}`}>
                Available only
              </label>
              <DiamondIcon sx={{ fontSize: '1rem', color: 'gold' }} />
            </div>

            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate domains"}
            </button>
          </form>

          <div className="space-y-8 mt-10">
            {generatedDomains.length > 0 && (
              <h2 className="sm:text-4xl text-3xl font-bold text-slate-900 mx-auto">
                Generated Domains:
              </h2>
            )}
            <ul className="space-y-4">
              {(availableOnly && isPremiumUser ? filteredDomains : generatedDomains).map((domain, index) => (
                <li key={index} className="text-xl flex items-center justify-between">
                  <span>{domain.domain}</span>
                  <button
                    onClick={() => handleCheckAvailability(domain.domain)}
                    className="bg-blue-600 rounded-xl text-white font-medium px-4 py-2 mx-2 hover:bg-gray-300 hover:text-black"
                  >
                    <span className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Check Availability
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </SignedIn>

        <SignedOut>
          {/* Show this content when the user is signed out */}
          <div className="mt-10">
            <h2 className="text-2xl font-bold mb-5">Sign in to generate domains</h2>
            <button
              onClick={() => openSignIn()}
              className="bg-black rounded-xl text-white font-medium px-4 py-2 hover:bg-black/80"
            >
              Sign in
            </button>
          </div>
        </SignedOut>
      </main>
    </div>
  );
};

export default DomainPage;