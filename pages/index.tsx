import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import DropDown, { VibeType } from "../components/DropDown";
import Footer from "../components/Footer";
import Header from "../components/Header";
import LoadingDots from "../components/LoadingDots";
import { Tooltip } from "@mui/material";
import { 
  COUNT_DOMAINS_TO_SEARCH_NOT_ADMIN, 
  COUNT_DOMAINS_TO_SEARCH_YES_ADMIN, 
  COUNT_ITERATIONS_SEARCH_DOMAINS, 
  COUNT_SHOW_DOMAINS_AVAILABILITY, 
  DomainInfo } from "../utils/Definitions";

import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";
import { useClerk, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
// import Toggle from '../components/Toggle';

import { stringGenerateCountDomain } from "../utils/StringGenerateCountDomain";
import TableDomain from "../components/TableDomain";

import mixpanel from "../utils/mixpanel-config";
import { convertTextRateToJson, addRateToDomainInfo } from "../utils/TextRate";

type Domain = string;

const trackingDomainAvailables = (data: any, bio: any, vibe: any, credits: any) => {
    //TODO llevarse este code pa una fuction externa, tracking domain availables
    const domainAvailability = data.map((d: DomainInfo) => [
      d.domain,
      d.available,
    ]);

    // Mixpanel tracking for button click
    mixpanel.track("Domain Availability", {
      // You can add properties to the event as needed
      user_prompt: bio,
      vibe: vibe,
      credits: credits,
      domainData: JSON.stringify(domainAvailability),
    });
    //Hasta aqui el TODO      
}

const Home: NextPage = () => {
  const [loading, setLoading] = useState(false);
  const [bio, setBio] = useState("");
  const [vibe, setVibe] = useState<VibeType>("Professional");
  const [generatedBios, setGeneratedBios] = useState<String>("");
  const [numberDomainsCreated, setNumberDomainsCreated] = useState<number>(0); //Solo cuenta domains creados en el cliente en esta "session"
  const [isGPT, setIsGPT] = useState(true);

  const [credits, setCredits] = useState<any>(null);
  const [admin, setAdmin] = useState<boolean>(false);

  const bioRef = useRef<null | HTMLDivElement>(null);

  //States to validate disponibilidad del domain name
  // const [domains, setDomains] = useState('');
  const [availability, setAvailability] = useState<DomainInfo[]>([]);

  const [countSearch, setCountSearch] = useState<number>(3);

  // Get the user from clerk
  const { isLoaded, user } = useUser();
  const { openSignIn } = useClerk();

  // Function to fetch user credits by email
  const fetchCredits = async (email: string) => {
    try {
      let userData = undefined;
      while(true) {
        const response = await fetch(`/api/getUser?email=${email}`);
        if (!response.ok) {
          throw new Error(
            "Network response was not ok. Failed to get user email"
          );
        }
        userData = await response.json();
        if (userData.user.rows.length > 0) break;
      }
      setCredits(userData.user.rows[0].credits);
      setAdmin(userData.user.rows[0].admin);
    } catch (error) {
      console.error("Failed to fetch user credits:", error);
    } finally {
    }
  };

  // useEffect to fetch credits when user object becomes available
  useEffect(() => {
    if (isLoaded && user) {
      fetchCredits(user.emailAddresses[0].emailAddress || "");
      // Set this to a unique identifier for the user performing the event.
      mixpanel.identify(user.emailAddresses[0].emailAddress);
    } else {
      setBio("");
      setVibe("Professional");
    }
  }, [user]);

  const scrollToBios = () => {
    if (bioRef.current !== null) {
      bioRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const checkAvailability = async (tempGeneratedDomains: Domain[]) => {
    
    if(credits === 0) return;

    setLoading(true);
    setAvailability([]);
    
    try {
      const response = await fetch("/api/check-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domains: tempGeneratedDomains }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

      trackingDomainAvailables(data, bio, vibe, credits);  

      // Check if there are any available domains, and show a toast if there are none
      const availableDomains = data.filter((d: DomainInfo) => d.available);

      if(admin) {
        const availableDomainsWithRate = await getDomainNamesWithRate(availableDomains);
        setAvailability(availableDomainsWithRate);
      }
      else 
        setAvailability(data);

      if (availableDomains.length === 0) {
        toast(
          (t) => (
            <div>
              No available domains found. Please <b>provide more details</b> or{" "}
              <b>try different keywords</b> for better results.
            </div>
          ),
          {
            icon: "💡",
            duration: 10000,
          }
        );
      }
    
      return availableDomains.length;

    } catch (error) {
      console.error("Failed to fetch domains availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const countDomain = admin ? 
    stringGenerateCountDomain(COUNT_DOMAINS_TO_SEARCH_YES_ADMIN) : 
    stringGenerateCountDomain(COUNT_DOMAINS_TO_SEARCH_NOT_ADMIN);

  // debugger;
  // console.log({ generatedBios });
  // console.log({ numberDomainsCreated });

  const searchDomain = async () => {

    let exclude = ""; 
    let tempGeneratedDomains = "";
    let countDomainAvailability = 0;

    try {
      do {
        // const prompt = `${countDomain}, that adhere to the following criteria for an effective and marketable online presence:
        // Brevity: The domain names should be concise, aiming to keep the length as short as possible.
        // Simplicity: Each domain name must be easy to spell and pronounce. This ensures the name is memorable and facilitates brand recall.
        // Top-Level Domain: All suggested domain names should use the .com extension to maintain universal recognition and accessibility.
        // Good Examples:
        // Starbucks.com: Simple, memorable, and concise.
        // Nike.com: Extremely short and iconic.
        // Apple.com: Easy to spell and pronounce.
        // JetBlue.com: Descriptive and easy to remember.
        // Ambient.com: Simple and evocative.
        // Amazon.com: Short, memorable, and now synonymous with online shopping.
        // Examples to Avoid:
        // Axelon.com: Sounds like a common English word but isn't, which might lead to confusion.
        // Altus.com: Another pseudo-English word that lacks immediate brandability.
        // Prius.com: Can be challenging to pronounce for non-native speakers, potentially hindering global brand recall.
        // Please craft domain names that align with these standards, focusing on creating an engaging and memorable online identity ${bio ? `and prioritize this info: ` + bio : 'random'}.
        //  ${
        //   vibe === "Friendly"
        //     ? "The domains should feel relaxed and welcoming, suitable for personal blogs, small businesses, or customer-oriented services that emphasize a community feel."
        //     : vibe === "Professional"
        //     ? "The domains should convey credibility and professionalism, ideal for consulting firms or any business where trust is paramount."
        //     : vibe === "Creative"
        //     ? "The domains should be unique and memorable, inspiring creativity, ideal for design studios, tech innovators, or any business that prides itself on thinking outside the box."
        //     : vibe === "Sophisticated"
        //     ? "The domains should embody sophistication and elegance, perfect for luxury brands, exclusive clubs, or high-end service industries."
        //     : ""
        //  }
        // ${exclude}`;

        const prompt = `
          Role: You are Seth Godin, tasked with creating domain names. ${
            bio ? `Client's input: ` + bio : ""
          }.
          Objective: Your mission is to develop ${countDomain} that meet the following criteria for an effective and marketable online presence:
          1. Memorable: Craft domain names that maximize brand recall and leave a lasting impression.
          2. Brevity: Keep the domain names concise, aiming for short lengths.
          3. Simplicity: Ensure each domain name is easy to spell and pronounce.
          4. TLD: Craft memorable web addresses exploring diverse and inventive combinations of domain names and TLDs, such as .com, .net, .io, .co, .ai, .app, .me, .biz, .club, and .cc.

          Good Examples:
          - Starbucks.com: Simple, memorable, and concise.
          - Apple.com: Easy to spell and pronounce.
          - JetBlue.com: Descriptive and easy to remember.
          - Ambient.com: Simple and evocative.
          - Amazon.com: Short, memorable, and now synonymous with online shopping.

          Examples to Avoid:
          - Axelon.com: Sounds like a common English word but isn't, leading to potential confusion.
          - Altus.com: Lacks immediate brandability.
          - Prius.com: Pronunciation challenges may hinder global brand recall.

          Please craft domain names that ${
            vibe === "Friendly"
              ? "feel relaxed and welcoming, suitable for personal blogs, small businesses, or customer-oriented services that emphasize a community feel."
              : vibe === "Professional"
              ? "convey credibility and professionalism, ideal for consulting firms or any business where trust is paramount."
              : vibe === "Creative"
              ? "are unique, inspiring creativity, ideal for design studios, tech innovators, or any business that prides itself on thinking outside the box."
              : vibe === "Sophisticated"
              ? "embody sophistication and elegance, perfect for luxury brands, exclusive clubs, or high-end service industries."
              : ""
          }
        ${bio ? `Keep in mind the client's focus on ` + bio : ""}.
        ${exclude}`;

        // console.log({ prompt });

        tempGeneratedDomains = "";
        countDomainAvailability = 0;
        setGeneratedBios("");

        const response = await fetch(isGPT ? "/api/openai" : "/api/mistral", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
          }),
        });

        if (!response.ok) {
          throw new Error(response.statusText);
        }

        // This data is a ReadableStream
        const data = response.body;
        if (!data) {
          return;
        }

        const onParseGPT = (event: ParsedEvent | ReconnectInterval) => {
          if (event.type === "event") {
            const data = event.data;
            try {
              const text = JSON.parse(data).text ?? "";
              tempGeneratedDomains += text; // Update the temporary variable
              setGeneratedBios((prev) => prev + text);
            } catch (e) {
              console.error(e);
            }
          }
        };

        const onParseMistral = (event: ParsedEvent | ReconnectInterval) => {
          if (event.type === "event") {
            const data = event.data;
            try {
              const text = JSON.parse(data).choices[0].text ?? "";
              setGeneratedBios((prev) => prev + text);
            } catch (e) {
              console.error(e);
            }
          }
        };

        const onParse = isGPT ? onParseGPT : onParseMistral;

        // https://web.dev/streams/#the-getreader-and-read-methods
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

        // const domainNamesText = "domain1.com\ndomain2.net\ndomain3.org";
        const domainNamesText = tempGeneratedDomains
          .split("\n") // Split the string by newline to create an array
          .map((domain) => domain.replace(/^\d+\.\s*/, ""))
          .filter((domain) => domain);

        countDomainAvailability = await checkAvailability(domainNamesText);

        if (countDomainAvailability > 0) {
          break;
        } else {
          if (!admin) break;
          else if (countSearch > COUNT_ITERATIONS_SEARCH_DOMAINS)
            exclude += ", ";
          else exclude = "Exclude: ";
          exclude += domainNamesText.join(", ");
          setCountSearch((prevCount: number) => prevCount - 1);
        }
      }
      while(countSearch > COUNT_ITERATIONS_SEARCH_DOMAINS);
    } catch (error: any) {
      throw new Error(error);
    }

    return {
      'textdomain': tempGeneratedDomains,
      'countdomainavailability': countDomainAvailability
    }    
  }

  const generateDom = async (e: any) => {
    e.preventDefault();    

    // Mixpanel tracking for button click
    mixpanel.track("Find Domain Click", {
      // You can add properties to the event as needed
      user_prompt: bio,
      vibe: vibe,
      credits: credits,
    });

    // Check if credits are 0
    if (credits <= 0) {
      toast(
        "You have no more credits left. Please buy credits to generate more domain names.",
        {
          icon: "⚠️",
          style: {
            border: "1px solid #FF4500",
            padding: "16px",
            color: "#FF4500",
          },
        }
      );
      return; // Stop further execution
    }
    
    setLoading(true);

    try {

      const result = await searchDomain();

      // This code runs after the try and catch blocks, regardless of the outcome
      setLoading(false); // Always stop the loading indicator when done

      // aqui iba lo tomar los dominios encontrados

      // Mixpanel tracking for button click
      mixpanel.track("Domains Generated", {
        // You can add properties to the event as needed
        user_prompt: bio,
        vibe: vibe,
        credits: credits,
        domains_generated: result?.textdomain,
      });

      // In case the user signs out while on the page.
      if (!isLoaded || !user) {
        return null;
      }
      const email = user.emailAddresses[0].emailAddress;
      //Veamos si user tiene credits y decrementar
      const userData = await getUserByEmail(email);

      if (!userData || userData.rows[0].credits <= 0) {
        return;
      }
      
      const shouldDeductCredits = !admin || (result?.countdomainavailability ?? 0) > 0;
      
      if (shouldDeductCredits) {
        setCredits((prevCredits: number) => prevCredits - 1);
        await setUserByEmail(credits - 1, email);
      }      

      setNumberDomainsCreated(numberDomainsCreated + 3);
      scrollToBios();

    } catch (error) {
      // Log the error or display an error message to the user
      console.error("An error occurred:", error);
      toast.error(
        "An error occurred while processing your request. Please try again."
      );
    } finally {

    }
  };

  const getUserByEmail = async (email: string) => {
    try {
      const response = await fetch(`/api/getUser?email=${email}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const userData = await response.json();
      return userData.user;
    } catch (error) {
      console.error("Error fetching user:", error);
      // Handle errors as needed
    }
  };

  const setUserByEmail = async (credits: number, email: string) => {
    try {
      const payload = {
        credits,
        // other fields to update...
      };

      const response = await fetch(`/api/editUser?email=${email}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          "Network response was not ok. Failed to set user by email"
        );
      }

      const updatedUserData = await response.json();
      // Do something with the response, such as returning it or setting state.
      return updatedUserData;
    } catch (error) {
      console.error("Error fetching user:", error);
      // Handle errors as needed
    }
  };

  const getDomainNamesWithRate = async (availableDomains: DomainInfo[]) => {
    
    if (availableDomains.length === 0) return availableDomains;
    
    let resultAvailableDomains = [...availableDomains];
    
    const domainListText = availableDomains
      .map((item, index) => `${index + 1}. ${item.domain}`)
      .join('\n');
  
    const prompt = `Rate the following domain names based on three key criteria: Memorability, Simplicity, and Brevity. Each category should be scored on a scale from 0 to 10, where 0 indicates very poor and 10 means excellent. It also provides a average score. I don't need a summary at the end. If result is one domain, add domain.
      Domain Names to Rate:
      ${domainListText}`;
 
    const response = await fetch(isGPT ? "/api/openai" : "/api/mistral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
    });
  
    if (!response.ok) {
      throw new Error(response.statusText);
    }
  
    // This data is a ReadableStream
    const dataResponse = response.body;
    if (dataResponse) {
      let dataRate = ""
      const onParseGPT = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          try {
            const text = JSON.parse(data).text ?? "";
            dataRate += text;
          } catch (e) {
            console.error(e);
          }
        }
      };

      const onParseMistral = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          try {
            const text = JSON.parse(data).choices[0].text ?? "";
            dataRate += text;
          } catch (e) {
            console.error(e);
          }
        }
      };

      const onParse = isGPT ? onParseGPT : onParseMistral;

      // https://web.dev/streams/#the-getreader-and-read-methods
      const reader = dataResponse.getReader();
      const decoder = new TextDecoder();
      const parser = createParser(onParse);
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        parser.feed(chunkValue);
      }      

      let jsonRate = null;
      try {
        jsonRate = convertTextRateToJson(dataRate);
        resultAvailableDomains = addRateToDomainInfo(resultAvailableDomains, jsonRate)
      } catch (error) {
        console.log('Error: ', error);
      }
    }    
  
    return resultAvailableDomains.slice(0, COUNT_SHOW_DOMAINS_AVAILABILITY);
  }

  // Handler function to track the event when the button is clicked
  const handleBuyCreditsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent the form from submitting traditionally
    event.preventDefault();
    mixpanel.track("Availability Btn Go Premium Click", {
      credits: credits,
    });
    
      // The Google Ads event snippet
      window.gtag && window.gtag('event', 'conversion', {
        'send_to': '16510475658/ZCyECJS9tqYZEIq758A9', // Your conversion ID and conversion label
    });

    // Safely access the form and submit it
    const form = event.currentTarget.form;
    if (form) {
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

      <Header credits={credits} />
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Pinpoint your next domain using AI
        </h1>
        {/* <b>{numberDomainsCreated}</b> domains names generated */}
        {/* <div className="mt-7">
          <Toggle isGPT={isGPT} setIsGPT={setIsGPT} />
        </div> */}
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
              Enter Your Business or Hobby{" "}
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
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
            placeholder={"e.g., Boutique Coffee Shop, Personal Fitness"}
          />
          <div className="flex mb-5 items-center space-x-3">
            <Image src="/2-black.png" width={30} height={30} alt="1 icon" />
            <p className="text-left font-medium">
              Choose Your Brand's Vibe.{" "}
              <Tooltip
                title={
                  <div>
                    <p>
                      {" "}
                      <b>Professional</b> - Polished and formal.
                    </p>
                    <p>
                      <b>Friendly</b> - Ideal for blogs and
                      small businesses.
                    </p>
                    <p>
                      <b>Creative</b> - Unique and memorable, for business
                      thinking outside the box.
                    </p>
                    <p>
                      <b>Sophisticated</b> - High-end, for luxury
                      brands and exclusive clubs.
                    </p>
                  </div>
                }
              >
                <span className="info-icon cursor-pointer">&#x24D8;</span>
              </Tooltip>
            </p>
          </div>
          <div className="block">
            <DropDown vibe={vibe} setVibe={(newVibe) => setVibe(newVibe)} />
          </div>

          {!loading && (
            <div>
              <SignedOut>
                <div className="bg-black cursor-pointer rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 mb-4 hover:bg-black/80 w-full">
                  <a
                    className="block w-full h-full"
                    onClick={() => openSignIn()}
                  >
                    Sign in / up
                  </a>
                </div>
              </SignedOut>
              <SignedIn>
                {credits !== null ? (
                  <>
                    <button
                      className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
                      onClick={(e) => generateDom(e)}
                    >
                      Find your domain &rarr;
                    </button>
                  </>
                ) : (
                  <>
                    <span className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full">
                      Waiting to load credits
                    </span>
                  </>
                )}
              </SignedIn>
            </div>
          )}
          {loading && (
            <button
              className="bg-black rounded-xl text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              disabled
            >
              <LoadingDots color="white" style="large" />
            </button>
          )}
        </div>
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{ duration: 2000 }}
        />
        <hr className="h-px bg-gray-700 border-1 dark:bg-gray-700" />
        {!loading && user && (
          <div className="space-y-10 my-10">
            {generatedBios && availability.length > 0 && (
              <>
                <div>
                  <h2
                    className="sm:text-4xl text-3xl font-bold text-slate-900 mx-auto"
                    ref={bioRef}
                  >
                    Domain suggestions:
                  </h2>
                </div>
                <div>
                  <TableDomain rows={availability} admin={admin} />
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Home;
