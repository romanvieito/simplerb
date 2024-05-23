import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import DropDown from "../components/DropDown";
import Footer from "../components/Footer";
import Header from "../components/Header";
import LoadingDots from "../components/LoadingDots";
import { Tooltip } from "@mui/material";
import { 
  COUNT_DOMAINS_TO_SEARCH_NOT_ADMIN, 
  COUNT_DOMAINS_TO_SEARCH_YES_ADMIN,
  DomainInfo, VibeType, ptemp, ptop } from "../utils/Definitions";

import {
  getBio,
  getVibe,
  getDomainFounded,
  saveBioVite,
  saveDomainFounded,
  resetSearch
} from "../utils/LocalStorage";

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

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import TextField from '@mui/material/TextField';
import ClearIcon from '@mui/icons-material/Clear';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';

type Domain = string;

function vp_not(a: string[], b: string[]) {
  return a.filter((value) => b.indexOf(value) === -1);
}

function vp_intersection(a: string[], b: string[]) {
  return a.filter((value) => b.indexOf(value) !== -1);
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
  const [domainfounded, setDomainFounded] = useState<DomainInfo[]>([]);

  // Get the user from clerk
  const { isLoaded, user, isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  // About Tab Vite Professional
  //-----------------------------------------------------------------------------------------
  const [vpTabIndex, setVpTabIndex] = useState('1');
  const handleVpTabIndexChange = (event: any, newValue: string) => {
    setVpTabIndex(newValue);
  };

  // Keywords  
  const [vpContains, setVpContains] = useState("");
  const [vpStartsWith, setVpStartsWith] = useState("");
  const [vpEndsWith, setVpEndsWith] = useState("");
  const [vpSimilarToThisDomainName, setVpSimilarToThisDomainName] = useState("");  
  const handleClearKeyWords = () => {
    setVpContains("");
    setVpStartsWith("");
    setVpEndsWith("");
    setVpSimilarToThisDomainName("");
  };

  // Extensions  
  const [vpExtLeft, setVpExtLeft] = useState<string[]>([]);
  const [vpExtRight, setVpExtRight] = useState<string[]>([]);
  const [vpExtChecked, setVpExtChecked] = useState<string[]>([]);
  const [vpFilterExtRight, setVpFilterExtRight] = useState('');  
  const [vpTldsDomains, setVpTldsDomains] = useState<string[]>([]);  
  const vpExtLeftChecked = vp_intersection(vpExtChecked, vpExtLeft);
  const vpExtRightChecked = vp_intersection(vpExtChecked, vpExtRight);
  const handleToggle = (value: string) => () => {
    const currentIndex = vpExtChecked.indexOf(value);
    const newChecked = [...vpExtChecked];
    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setVpExtChecked(newChecked);
  };
  const handleVpExtCheckedRight = () => {
    setVpExtRight(vpExtRight.concat(vpExtLeftChecked));
    setVpExtLeft(vp_not(vpExtLeft, vpExtLeftChecked));
    setVpExtChecked(vp_not(vpExtChecked, vpExtLeftChecked));
  };
  const handleVpExtCheckedLeft = () => {
    setVpExtLeft(vpExtLeft.concat(vpExtRightChecked));
    setVpExtRight(vp_not(vpExtRight, vpExtRightChecked));
    setVpExtChecked(vp_not(vpExtChecked, vpExtRightChecked));
  };
  const handleVpExtAllRight = () => {
    setVpExtRight(vpExtRight.concat(vpExtLeft));
    setVpExtLeft([]);
  };
  const handleVpExtAllLeft = () => {
    setVpExtLeft(vpExtLeft.concat(vpExtRight));
    setVpExtRight([]);
  };
  const customList = (items: string[]) => (
    <Paper sx={{ width: 200, height: 230, overflow: 'auto' }}>
      <List dense component="div" role="list">
        {items.map((value: string) => {
          const labelId = `transfer-list-item-${value}-label`;
          return (
            <ListItemButton
              key={value}
              role="listitem"
              onClick={handleToggle(value)}
            >
              <ListItemIcon>
                <Checkbox
                  checked={vpExtChecked.indexOf(value) !== -1}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{
                    'aria-labelledby': labelId,
                  }}
                />
              </ListItemIcon>
              <ListItemText id={labelId} primary={value} />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
  const vpFilteredExtRight = vpExtRight.filter(item => item.toLowerCase().includes(vpFilterExtRight.toLowerCase()));  
  const fetchTldsDomains = async () => {
    let tldsDomains = [];
    try {
      const response = await fetch("/api/get-tlds-godaddy", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      for(const elem of data){
        tldsDomains.push(elem.name);
      }
      setVpTldsDomains(tldsDomains);
      setVpExtRight(tldsDomains);
    } catch (error) {
      console.error("Failed to fetch tlds domains:", error);
    } finally {
    }
  };
  const handleClearExtensions = () => {
    setVpExtLeft([]);
    setVpExtRight([...vpTldsDomains])
    setVpExtChecked([]);
    setVpFilterExtRight("");    
  };    

  // Characters
  const [vpTransform, setVpTransform] = useState({
    vpHiremecom: false,
    vpFlickercom: false,
    vpToolcom: false,
  });
  const [vpMinlength, setVpMinlength] = useState(0);
  const [vpMaxlength, setVpMaxlength] = useState(0);    
  const handleVpTransformChange = (event: any) => {
    setVpTransform({
      ...vpTransform,
      [event.target.name]: event.target.checked,
    });
  };
  const { vpHiremecom, vpFlickercom, vpToolcom } = vpTransform;    
  const handleClearCharacters = () => {
    setVpTransform({
      vpHiremecom: false,
      vpFlickercom: false,
      vpToolcom: false,
    });
    setVpMinlength(0);
    setVpMaxlength(0);
  };  
  //-----------------------------------------------------------------------------------------
  
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
      
      // here loading localstorage
      setBio(() => {
        const bioFromStorage = getBio();
        return bioFromStorage ?? "";
      });      
      setVibe(() => {
        const vibeFromStorage = getVibe();
        return vibeFromStorage ?? 'Professional'
      });
      setDomainFounded(() => {
        const dfFromStorage = getDomainFounded();
        return dfFromStorage ?? []
      });
      // Call vite professional aditionals
      fetchTldsDomains();
    } else {
      setBio("");
      setVibe("Professional");
      // Call vite professional aditionals
    }
  }, [user]);

  useEffect(() => {
    if (!isSignedIn && isSignedIn!==undefined) {
      resetSearch();
    }
  }, [isSignedIn]);

  const scrollToBios = () => {
    if (bioRef.current !== null) {
      bioRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const countDomainToPrompt = admin ? 
    stringGenerateCountDomain(COUNT_DOMAINS_TO_SEARCH_YES_ADMIN) : 
    stringGenerateCountDomain(COUNT_DOMAINS_TO_SEARCH_NOT_ADMIN);

  const countShowDomain = admin ? 
    COUNT_DOMAINS_TO_SEARCH_YES_ADMIN : 
    COUNT_DOMAINS_TO_SEARCH_NOT_ADMIN;

  // debugger;
  // console.log({ generatedBios });
  // console.log({ numberDomainsCreated });

  const searchDomain = async () => {

    let tempGeneratedDomains = "";
    let domainNames: DomainInfo[] = [];

    setGeneratedBios("");

    try {
      const prompt = `
        Role: You are Seth Godin, tasked with creating domain names. ${
          bio ? `Client's input: ` + bio : ""
        }.
        Objective: Your mission is to develop ${countDomainToPrompt} that meet the following criteria for an effective and marketable online presence:
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
      ${bio ? `Keep in mind the client's focus on ` + bio : ""}.`;

      // console.log({ prompt });

      const response = await fetch(isGPT ? "/api/openai" : "/api/mistral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          ptemp,
          ptop
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

      const tempDomainNamesText = tempGeneratedDomains
        .split("\n") // Split the string by newline to create an array
        .map((domain) => domain.replace(/^\d+\.\s*/, ""))
        .filter((domain) => domain);

      tempDomainNamesText.map((domain)=>{ 
        domainNames.push({
          domain, 
          available: undefined,
          favorite: undefined
        })
      });  

    } catch (error: any) {
      throw new Error(error);
    }

    return domainNames;
  }

  const generateDom = async (e: any) => {
    e.preventDefault();    

    setDomainFounded([]);

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

      let resultDomainFounded = await searchDomain();

      // This code runs after the try and catch blocks, regardless of the outcome

      // aqui iba lo tomar los dominios encontrados

      // Mixpanel tracking for button click
      mixpanel.track("Domains Generated", {
        // You can add properties to the event as needed
        user_prompt: bio,
        vibe: vibe,
        credits: credits,
        domains_generated: resultDomainFounded,
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

      saveBioVite(bio, vibe);

      if(resultDomainFounded) {
        //if(admin) {
          resultDomainFounded = await getDomainNamesWithRate(resultDomainFounded);
          setDomainFounded(resultDomainFounded);
        //}
        //else {
        //  setDomainFounded(resultDomainFounded);
        //}      
        saveDomainFounded(resultDomainFounded);
      }      

      setLoading(false); // Always stop the loading indicator when done

      setNumberDomainsCreated(numberDomainsCreated + 3);
      scrollToBios();

    } catch (error) {

      setLoading(false);
      
      // Log the error or display an error message to the user
      console.error("An error occurred:", error);
      toast.error(
        "An error occurred while processing your request. Please try again."
      );
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

  const getDomainNamesWithRate = async (foundedomain: DomainInfo[]) => {
    
    if (foundedomain.length === 0) return foundedomain;
    
    let resultDomainsRate = [...foundedomain];
    
    const domainListText = foundedomain
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
          ptemp,
          ptop          
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
        resultDomainsRate = addRateToDomainInfo(resultDomainsRate, jsonRate)        
      } catch (error) {
        console.log('Error: ', error);
      }
    }    
  
    return resultDomainsRate;
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
            {
            vibe === 'Professional' ?
            <>
            <Box sx={{ width: '100%', typography: 'body1' }}>
              <TabContext value={vpTabIndex}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <TabList onChange={handleVpTabIndexChange} aria-label="Options for vite professional">
                    <Tab label="Keywords" value="1" />
                    <Tab label="Extensions" value="2" />
                    <Tab label="Characters" value="3" />
                  </TabList>
                </Box>
                <TabPanel value="1">
                  <Box
                    sx={{
                      maxWidth: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                    >
                    <Button size="small" startIcon={<ClearIcon />} id="clear-keywords" onClick={handleClearKeyWords}>
                      Clear Filter
                    </Button>                      
                    <Box mb={2} sx={{ width: '100%' }}>
                      <TextField 
                        fullWidth 
                        label="Contains" 
                        id="vpContains" 
                        variant="standard"
                        value={vpContains}
                        onChange={(e) => setVpContains(e.target.value)}                        
                      />
                    </Box>
                    <Box mb={2} sx={{ width: '100%' }}>
                      <TextField 
                        fullWidth 
                        label="Starts with" 
                        id="vpStartsWith" 
                        variant="standard" 
                        value={vpStartsWith}
                        onChange={(e) => setVpStartsWith(e.target.value)}                        
                      />
                    </Box>
                    <Box mb={2} sx={{ width: '100%' }}>
                      <TextField 
                        fullWidth 
                        label="Ends with" 
                        id="vpEndsWith" 
                        variant="standard"
                        value={vpEndsWith}
                        onChange={(e) => setVpEndsWith(e.target.value)}
                      />
                    </Box>
                    <Box mb={2} sx={{ width: '100%' }}>
                      <TextField 
                        fullWidth 
                        label="Similar to this domain name" 
                        id="vpSimilarToThisDomainName" 
                        variant="standard" 
                        value={vpSimilarToThisDomainName}
                        onChange={(e) => setVpSimilarToThisDomainName(e.target.value)}                        
                      />
                    </Box>
                  </Box>                  
                </TabPanel>
                <TabPanel value="2">            
                  <Box
                    sx={{
                      maxWidth: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                    >
                    <Button size="small" startIcon={<ClearIcon />} id="clear-extensions" onClick={handleClearExtensions}>
                      Clear Filter
                    </Button>
                  </Box>               
                  <Grid container spacing={2} justifyContent="center" alignItems="center">
                    <Grid>
                      <Grid item sx={{ height: '70px', display: 'flex', alignItems: 'flex-end' }}>                       
                        Selected
                      </Grid>
                      <Grid item sx={{ height: '250px' }}>
                        {customList(vpExtLeft)}
                      </Grid>
                    </Grid>
                    <Grid item>
                      <Grid container direction="column" alignItems="center">
                        <Button
                          sx={{ my: 0.5 }}
                          variant="outlined"
                          size="small"
                          onClick={handleVpExtAllRight}
                          disabled={vpExtLeft.length === 0}
                          aria-label="move all right"
                        >
                          ≫
                        </Button>
                        <Button
                          sx={{ my: 0.5 }}
                          variant="outlined"
                          size="small"
                          onClick={handleVpExtCheckedRight}
                          disabled={vpExtLeftChecked.length === 0}
                          aria-label="move selected right"
                        >
                          &gt;
                        </Button>
                        <Button
                          sx={{ my: 0.5 }}
                          variant="outlined"
                          size="small"
                          onClick={handleVpExtCheckedLeft}
                          disabled={vpExtRightChecked.length === 0}
                          aria-label="move selected left"
                        >
                          &lt;
                        </Button>
                        <Button
                          sx={{ my: 0.5 }}
                          variant="outlined"
                          size="small"
                          onClick={handleVpExtAllLeft}
                          disabled={vpExtRight.length === 0}
                          aria-label="move all left"
                        >
                          ≪
                        </Button>
                      </Grid>
                    </Grid>
                    <Grid item>
                      <Grid>
                        <Grid item sx={{ height: '50px' }}> 
                          <TextField
                            id="ext-search"
                            label="Filter to select..."
                            variant="standard"
                            value={vpFilterExtRight}
                            onChange={(e) => setVpFilterExtRight(e.target.value)}
                            sx={{ width: 200, height: 50, marginBottom: 1 }}
                          />                                             
                        </Grid>
                        <Grid item sx={{ height: '250px' }}>                        
                          {customList(vpFilteredExtRight)}
                        </Grid>
                      </Grid>                                        
                    </Grid>                  
                  </Grid>                  
                </TabPanel>
                <TabPanel value="3">
                  <Box
                    sx={{
                      maxWidth: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                    >
                    <Button size="small" startIcon={<ClearIcon />} id="clear-characters" onClick={handleClearCharacters}>
                      Clear Filter
                    </Button>
                  </Box>                  
                  <Box sx={{ display: 'flex' }}>
                    <FormControl sx={{ m: 2 }} component="fieldset" variant="standard">
                      <FormLabel component="legend" style={{ textAlign: 'left' }}>Transform{" "}
                        <Tooltip
                          title={
                            <div>
                              <p>
                                Include results that transform your keywords.
                              </p>				  
                              <p>
                                {" "}
                                <b>Domain Hacks</b>: hireme.com &rarr; hire.me
                              </p>
                              <p>
                                <b>Drop Last Vowel</b>: flicker.com &rarr; flickr.com
                              </p>
                              <p>
                                <b>Pluralize Nouns</b>: tool.com &rarr; tools.com
                              </p>
                            </div>
                          }
                        >
                          <span className="info-icon cursor-pointer">&#x24D8;</span>
                        </Tooltip>
                      </FormLabel>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox checked={vpHiremecom} onChange={handleVpTransformChange} name="vpHiremecom" />
                          }
                          label="Use Domain Hacks"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox checked={vpFlickercom} onChange={handleVpTransformChange} name="vpFlickercom" />
                          }
                          label="Drop Last Vowel"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox checked={vpToolcom} onChange={handleVpTransformChange} name="vpToolcom" />
                          }
                          label="Pluralize Nouns"
                        />
                      </FormGroup>
                    </FormControl>
                  </Box>
                  <Box
                    component="form"
                    sx={{
                      '& .MuiTextField-root': { m: 1, width: '25ch' },
                    }}
                    noValidate
                    autoComplete="off"
                  >
                    <div>
                      <TextField
                        id="vpMinlength"
                        label="Min length"
                        type="number"
                        variant="standard"
                        InputLabelProps={{
                          shrink: true,
                        }}
                        value={vpMinlength}
                        onChange={(e) => setVpMinlength(parseInt(e.target.value, 10))}
                      />
                      <TextField
                        id="vpMaxlength"
                        label="Max length"
                        type="number"
                        variant="standard"
                        InputLabelProps={{
                          shrink: true,
                        }}
                        value={vpMaxlength}
                        onChange={(e) => setVpMaxlength(parseInt(e.target.value, 10))}
                      />
                    </div>
                  </Box>                  
                </TabPanel>
              </TabContext>
            </Box>            
            </>:<></>
            }            
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
            {/*generatedBios && */domainfounded.length > 0 && (
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
                  <TableDomain rows={domainfounded.slice(0, countShowDomain)} admin={admin} email={user.emailAddresses[0].emailAddress} functionDomainFounded={setDomainFounded} cred={credits} functionCred={setCredits}/>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <Footer isauth={isSignedIn} userauth={user}/>
    </div>
  );
};

export default Home;
