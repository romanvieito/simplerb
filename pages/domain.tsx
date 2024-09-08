import React, { useRef, useState, useEffect, useContext } from "react";
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { NextPage } from "next";
import Image from "next/image";
import { Toaster, toast } from "react-hot-toast";
import DropDown from "../components/DropDown";
import LoadingDots from "../components/LoadingDots";
import { Tooltip } from "@mui/material";
import {
  COUNT_DOMAINS_TO_SEARCH_NOT_ADMIN,
  COUNT_DOMAINS_TO_SEARCH_YES_ADMIN,
  DomainInfo,
  VibeType,
  ptemp,
  ptop,
  default_extensions,
} from "../utils/Definitions";
import {
  getBio,
  getVibe,
  getDomainFounded,
  saveBioVite,
  saveDomainFounded,
  getVpTabIndex,
  getVpContains,
  getVpStartsWith,
  getVpEndsWith,
  getVpSimilarToThisDomainName,
  getVpExtLeft,
  getVpExtChecked,
  getVpFilterExtLeft,
  getVpTransform,
  getVpMinlength,
  getVpMaxlength,
  saveVpTabIndex,
  saveVpKeywords,
  saveVpExtensions,
  saveVpCharacters,
} from "../utils/LocalStorage";
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";
import { useClerk, SignedIn, useUser } from "@clerk/nextjs";
import { stringGenerateCountDomain } from "../utils/StringGenerateCountDomain";
import TableDomain from "../components/TableDomain";
import mixpanel from "../utils/mixpanel-config";
import {
  convertTextRateToJson,
  addRateToDomainInfo,
  saveInDataBaseDomainRate,
} from "../utils/TextRate";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import TextField from "@mui/material/TextField";
import ClearIcon from "@mui/icons-material/Clear";
import DownloadIcon from "@mui/icons-material/Download";
import Button from "@mui/material/Button";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import List from "@mui/material/List";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import LoadingButton from "@mui/lab/LoadingButton";
import Modal from "@mui/material/Modal";

import SBRContext from "../context/SBRContext";
import { SignedOut } from "@clerk/nextjs";

function vp_not(a: string[], b: string[]) {
  return a.filter((value) => b.indexOf(value) === -1);
}

function vp_intersection(a: string[], b: string[]) {
  return a.filter((value) => b.indexOf(value) !== -1);
}

const DomainPage: NextPage = () => {
  const [loading, setLoading] = useState(false);
  const [bio, setBio] = useState("");
  const [vibe, setVibe] = useState<VibeType>("Professional");
  const [generatedBios, setGeneratedBios] = useState<String>("");
  const [numberDomainsCreated, setNumberDomainsCreated] = useState<number>(0);
  const [isGPT, setIsGPT] = useState(true);

  //For Settings Modal
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const style = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "80%",
    bgcolor: "background.paper",
    border: "1px #000",
    boxShadow: 24,
    p: 2,
    maxHeight: "90vh", // Establece la altura máxima del contenedor
    overflow: "auto", // Activa el desplazamiento automático
  };

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { dataUser, credits, setCredits, admin, setAdmin, subsTplan } = context;

  const bioRef = useRef<null | HTMLDivElement>(null);

  const [domainfounded, setDomainFounded] = useState<DomainInfo[]>([]);

  const { isLoaded, user, isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  const [vpTabIndex, setVpTabIndex] = useState("1");
  const handleVpTabIndexChange = (event: any, newValue: string) => {
    setVpTabIndex(newValue);
  };

  const [vpContains, setVpContains] = useState("");
  const [vpStartsWith, setVpStartsWith] = useState("");
  const [vpEndsWith, setVpEndsWith] = useState("");
  const [vpSimilarToThisDomainName, setVpSimilarToThisDomainName] =
    useState("");
  const handleClearKeyWords = () => {
    setVpContains("");
    setVpStartsWith("");
    setVpEndsWith("");
    setVpSimilarToThisDomainName("");
    handleClearCharacters();
  };

  const [vpExtLeft, setVpExtLeft] = useState<string[]>([]);
  const [vpExtChecked, setVpExtChecked] = useState<string[]>([]);
  const [vpFilterExtLeft, setVpFilterExtLeft] = useState("");
  const [vpLoadingTldsDomains, setVpLoadingTldsDomains] = useState(false);
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

  const customList = (items: string[]) => (
    <Box
      sx={{
        width: "100%",
        bgcolor: "background.paper",
        height: 250,
        overflowY: "auto",
      }}
    >
      <List>
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
                    "aria-labelledby": labelId,
                  }}
                />
              </ListItemIcon>
              <ListItemText id={labelId} primary={value} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
  const vpFilteredExtLeft = vpExtLeft.filter((item) =>
    item.toLowerCase().includes(vpFilterExtLeft.toLowerCase())
  );
  const handleLoadMoreExtensions = async () => {
    try {
      let tldsDomains = [];
      setVpLoadingTldsDomains(true);
      const response = await fetch("/api/get-tlds-godaddy", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

      setVpLoadingTldsDomains(false);

      for (const elem of data) {
        tldsDomains.push(elem.name);
      }

      setVpExtLeft(vp_not(tldsDomains, default_extensions));
      setVpFilterExtLeft("");
    } catch (error) {
      setVpLoadingTldsDomains(false);
      console.error("Failed to fetch tlds domains:", error);
    } finally {
    }
  };
  const handleClearExtensions = () => {
    setVpExtLeft(default_extensions);
    setVpExtChecked([]);
    setVpFilterExtLeft("");
  };

  const [vpTransform, setVpTransform] = useState({
    vpHiremecom: false,
    vpFlickercom: false,
    vpToolcom: false,
  });
  const [vpMinlength, setVpMinlength] = useState<number>(0);
  const [vpMaxlength, setVpMaxlength] = useState<number>(0);
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

  useEffect(() => {
    if (isLoaded && user) {
      setBio(() => {
        const bioFromStorage = getBio();
        return bioFromStorage ?? "";
      });
      setVibe(() => {
        const vibeFromStorage = getVibe();
        return vibeFromStorage ?? "Professional";
      });
      setDomainFounded(() => {
        const dfFromStorage = getDomainFounded();
        return dfFromStorage ?? [];
      });
      setVpTabIndex(() => {
        const vpti = getVpTabIndex();
        return vpti ?? "1";
      });
      setVpContains(() => {
        const vpc = getVpContains();
        return vpc ?? "";
      });
      setVpStartsWith(() => {
        const vpst = getVpStartsWith();
        return vpst ?? "";
      });
      setVpEndsWith(() => {
        const vpe = getVpEndsWith();
        return vpe ?? "";
      });
      setVpSimilarToThisDomainName(() => {
        const vpsi = getVpSimilarToThisDomainName();
        return vpsi ?? "";
      });
      setVpExtLeft(() => {
        const vpextl = getVpExtLeft();
        return vpextl ?? default_extensions;
      });
      setVpExtChecked(() => {
        const vpextc = getVpExtChecked();
        return vpextc ?? [];
      });
      setVpFilterExtLeft(() => {
        const vpextf = getVpFilterExtLeft();
        return vpextf ?? "";
      });
      setVpTransform(() => {
        const vpt = getVpTransform();
        return (
          vpt ?? {
            vpHiremecom: false,
            vpFlickercom: false,
            vpToolcom: false,
          }
        );
      });
      setVpMinlength(() => {
        const vpmin = getVpMinlength();
        return vpmin ? parseInt(vpmin) : 0;
      });
      setVpMaxlength(() => {
        const vpmax = getVpMaxlength();
        return vpmax ? parseInt(vpmax) : 0;
      });
    } else {
      setBio("");
      setVibe("Professional");
      handleClearKeyWords();
      handleClearExtensions();
      handleClearCharacters();
    }
  }, [user]);

  useEffect(() => {
    if (!isSignedIn && isSignedIn !== undefined) {
      handleClearKeyWords();
      handleClearExtensions();
      handleClearCharacters();
    }
  }, [isSignedIn]);

  const scrollToBios = () => {
    if (bioRef.current !== null) {
      bioRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const countDomainToPrompt = admin
    ? stringGenerateCountDomain(COUNT_DOMAINS_TO_SEARCH_YES_ADMIN)
    : stringGenerateCountDomain(COUNT_DOMAINS_TO_SEARCH_NOT_ADMIN);

  const countShowDomain = admin
    ? COUNT_DOMAINS_TO_SEARCH_YES_ADMIN
    : COUNT_DOMAINS_TO_SEARCH_NOT_ADMIN;

  const searchDomain = async () => {
    let tempGeneratedDomains = "";
    let domainNames: DomainInfo[] = [];
    setGeneratedBios("");

    try {
      let prompt_extensions = "";
      if (vpExtChecked.length > 0)
        prompt_extensions = `Please use these extensions: ${vpExtChecked.join(
          ", "
        )}. `;
      let prompt_keywords = "";
      const conditions_keywords = [
        vpContains && `that contain ${vpContains}`,
        vpStartsWith && `that start with ${vpStartsWith}`,
        vpEndsWith && `that end with ${vpEndsWith}`,
        vpSimilarToThisDomainName && `similar to ${vpSimilarToThisDomainName}`,
      ].filter(Boolean);
      if (conditions_keywords.length > 1) {
        const lastCondition = conditions_keywords.pop();
        prompt_keywords = `Generate domain names ${conditions_keywords.join(
          ", "
        )} and ${lastCondition}. `;
      } else {
        prompt_keywords = `Generate domain names ${conditions_keywords[0]}. `;
      }

      let prompt_character = "";
      const conditions_character = [
        vpHiremecom && `use domain hacks like in hireme.com → hire.me`,
        vpFlickercom &&
          `drop last vowel of the domain name like in flicker.com → flickr.com`,
        vpToolcom && `pluralize nouns like in tool.com → tools.com`,
      ].filter(Boolean);
      if (conditions_character.length > 1) {
        const lastCondition = conditions_character.pop();
        prompt_character = `Try to ${conditions_character.join(
          ", "
        )} and ${lastCondition}. `;
      } else {
        prompt_character = `Try to ${conditions_character[0]}. `;
      }

      let prompt_minmax = "";
      const conditions_minmax = [
        vpMinlength && `min length: ${vpMinlength} characters`,
        vpMaxlength && `max length: ${vpMaxlength} characters`,
      ].filter(Boolean);
      switch (conditions_minmax.length) {
        case 2:
          const lastCondition = conditions_minmax.pop();
          prompt_minmax = `Character length does not include the domain extension (i.e. .com), make sure ${conditions_minmax[0]} and ${lastCondition}. `;
          break;
        case 1:
          prompt_minmax = `Character length does not include the domain extension (i.e. .com), make sure ${conditions_minmax[0]}. `;
          break;
      }

      const prompt = `
        Role: You are Seth Godin, tasked with creating domain names. ${
          bio ? `Client's input: ` + bio : ""
        }.
        Objective: Your mission is to develop ${countDomainToPrompt} that meet the following criteria for an effective and marketable online presence:
        1. Memorable: Craft domain names that maximize brand recall and leave a lasting impression.
        2. Brevity: Keep the domain names concise, aiming for short lengths.
        3. Simplicity: Ensure each domain name is easy to spell and pronounce.

        Good Examples:
        - Apple.com: Easy to spell and pronounce.
        - JetBlue.com: Descriptive and easy to remember.
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
      ${
        bio ||
        prompt_extensions ||
        prompt_keywords ||
        prompt_character ||
        prompt_minmax
          ? `Just return the domains, nothing else. Keep in mind client's focus on ` +
            (bio +
              prompt_extensions +
              prompt_keywords +
              prompt_minmax +
              prompt_character)
          : ""
      }.`;

      const response = await fetch(isGPT ? "/api/openai" : "/api/mistral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          ptemp,
          ptop,
        }),
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = response.body;
      if (!data) {
        return;
      }

      const onParseGPT = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          try {
            const text = JSON.parse(data).text ?? "";
            tempGeneratedDomains += text;
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
        .split("\n")
        .map((domain) => domain.replace(/^\d+\.\s*/, ""))
        .filter((domain) => domain);

      if (subsTplan === "CREATOR") {
        const tempDomainAvailability = await multipleCheckAvailability(
          tempDomainNamesText
        );
        tempDomainAvailability.map((domain) => {
          domainNames.push({
            domain: domain.domain,
            available: domain.available,
            favorite: undefined,
          });
        });
      } else {
        tempDomainNamesText.map((domain) => {
          domainNames.push({
            domain,
            available: undefined,
            favorite: undefined,
          });
        });
      }

      //---------------------------------------------------------------------
    } catch (error: any) {
      throw new Error(error);
    }

    return domainNames;
  };

  const generateDom = async (e: any) => {
    e.preventDefault();
    setDomainFounded([]);

    /*if (credits <= 0) {
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
      return;
    }*/

    setLoading(true);

    try {
      let resultDomainFounded = await searchDomain();
      mixpanel.track("Domains Generated", {
        user_prompt: bio,
        vibe: vibe,
        credits: credits,
        domains_generated: resultDomainFounded,
        extensions: vpExtChecked.join(","),
        keywords: {
          contains: vpContains,
          startswith: vpStartsWith,
          endswith: vpEndsWith,
          similartothisdomainname: vpSimilarToThisDomainName,
        },
        transform: {
          hiremecom: vpHiremecom,
          flickercom: vpFlickercom,
          toolcom: vpToolcom,
          minlength: vpMinlength,
          maxlength: vpMaxlength,
        },
      });

      /*if (!isLoaded || !user) {
        return null;
      }*/

      //const userData = await getUserByEmail(dataUser.email);

      /*if (!userData || userData.rows[0].credits <= 0) {
        return;
      }*/

      saveBioVite(bio, vibe);
      saveVpTabIndex(vpTabIndex);
      saveVpKeywords(
        vpContains,
        vpStartsWith,
        vpEndsWith,
        vpSimilarToThisDomainName
      );
      saveVpExtensions(vpExtLeft, vpExtChecked, vpFilterExtLeft);
      saveVpCharacters(vpTransform, vpMinlength, vpMaxlength);

      if (resultDomainFounded) {
        if (resultDomainFounded.length === 0) {
          console.log(resultDomainFounded);
          toast.error("Please try a different prompt");
        }

        resultDomainFounded = await getDomainNamesWithRate(
          resultDomainFounded,
          dataUser.id
        );
        setDomainFounded(resultDomainFounded);
        saveDomainFounded(resultDomainFounded);
      }

      setLoading(false);
      setNumberDomainsCreated(numberDomainsCreated + 3);
      scrollToBios();
    } catch (error) {
      setLoading(false);
      console.error("An error occurred:", error);
      toast.error(
        "An error occurred while processing your request. Please try again."
      );
    }
  };

  const getDomainNamesWithRate = async (
    foundedomain: DomainInfo[],
    user_id: string
  ) => {
    if (foundedomain.length === 0) return foundedomain;
    let resultDomainsRate = [...foundedomain];
    const domainListText = foundedomain
      .map((item, index) => `${index + 1}. ${item.domain}`)
      .join("\n");

    const prompt = `Rate the following domain names based on three key criteria: Memorability, Simplicity, and Brevity. Each category should be scored on a scale from 0 to 10, where 0 indicates very poor and 10 means excellent.
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
        ptop,
      }),
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const dataResponse = response.body;
    if (dataResponse) {
      let dataRate = "";
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
        resultDomainsRate = addRateToDomainInfo(resultDomainsRate, jsonRate);
        await saveInDataBaseDomainRate(resultDomainsRate, user_id);
      } catch (error) {
        console.log("Error: ", error);
      }
    }

    return resultDomainsRate;
  };

  const multipleCheckAvailability = async (domain: string[]) => {
    try {
      const response = await fetch("/api/check-availability-godaddy", {
        //"/api/check-availability-godaddy"
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domains: domain }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      let domainAvailability = [];
      for (const item of data) {
        if (item.available) {
          domainAvailability.push(item);
        }
      }

      mixpanel.track("Multiple checked availability successful", {
        // You can add properties to the event as needed
        domains: domainAvailability,
      });

      return domainAvailability;
    } catch (error: any) {
      mixpanel.track("Multiple checked availability with error", {
        // You can add properties to the event as needed
        domain: domain,
        error: error,
      });
      throw new Error(error);
    }
  };

  const handleBuyCreditsClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    mixpanel.track("Availability Btn Go Premium Click", {
      credits: credits,
    });

    window.gtag &&
      window.gtag("event", "conversion", {
        send_to: "16510475658/ZCyECJS9tqYZEIq758A9",
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

      <Header />
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-2 sm:mt-6">
        {/* <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Domain Generator
        </h1> */}
        <div className="flex flex-col max-w-xl w-full">
          <div className="flex mt-0 items-center space-x-3">
            <Image
              src="/1-black.png"
              width={30}
              height={30}
              alt="1 icon"
              className="mb-0"
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
                      <b>Friendly</b> - Ideal for blogs and small businesses.
                    </p>
                    <p>
                      <b>Creative</b> - Unique and memorable, for business
                      thinking outside the box.
                    </p>
                    <p>
                      <b>Sophisticated</b> - High-end, for luxury brands and
                      exclusive clubs.
                    </p>
                  </div>
                }
              >
                <span className="info-icon cursor-pointer">&#x24D8;</span>
              </Tooltip>
            </p>
          </div>
          {
            /*isSignedIn && */ <>
              <DropDown vibe={vibe} setVibe={(newVibe) => setVibe(newVibe)} />
              <Button
                className="self-end"
                size="small"
                variant="text"
                onClick={() => {
                  handleOpen();
                }}
                sx={{ marginTop: 3 }}
              >
                {false ? "" : "Advanced Settings"}
              </Button>
              <Box sx={{ width: "100%", typography: "body1" }}>
                <Modal
                  open={open}
                  onClose={handleClose}
                  aria-labelledby="simple-modal-title"
                  aria-describedby="simple-modal-description"
                >
                  <Box sx={style}>
                    <TabContext value={vpTabIndex}>
                      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                        <TabList
                          onChange={handleVpTabIndexChange}
                          aria-label="Advanced Options"
                        >
                          <Tab label="Extensions" value="3" />
                          <Tab label="Name" value="2" />
                        </TabList>
                      </Box>
                      <TabPanel value="3">
                        <Box
                          sx={{
                            maxWidth: "100%",
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "flex-end",
                          }}
                        >
                          <Button
                            sx={{ marginRight: 2 }}
                            size="small"
                            startIcon={<ClearIcon />}
                            id="clear-extensions"
                            onClick={handleClearExtensions}
                          >
                            Clear
                          </Button>
                        </Box>
                        {/* <TextField
                          fullWidth
                          id="ext-search"
                          label="Filter..."
                          variant="standard"
                          value={vpFilterExtLeft}
                          onChange={(e) => setVpFilterExtLeft(e.target.value)}
                          sx={{ height: 50, marginBottom: 1 }}
                        />
                        <Box
                          sx={{
                            maxWidth: "100%",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "left",
                          }}
                        >
                          Check to select
                        </Box> */}
                        {customList(vpFilteredExtLeft)}

                        {/* <LoadingButton
                            onClick={handleLoadMoreExtensions}
                            startIcon={<DownloadIcon />}
                            loading={vpLoadingTldsDomains}
                            loadingPosition="start"
                            size="small"
                          >
                            <span>More extensions</span>
                          </LoadingButton> */}
                      </TabPanel>
                      <TabPanel value="2">
                        <Box
                          sx={{
                            maxWidth: "100%",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <Button
                            sx={{ alignSelf: "flex-end" }}
                            size="small"
                            startIcon={<ClearIcon />}
                            id="clear-keywords"
                            onClick={handleClearKeyWords}
                          >
                            Clear
                          </Button>
                        
                          <Box sx={{ display: "flex" }}>
                            <FormGroup>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={vpHiremecom}
                                    onChange={handleVpTransformChange}
                                    name="vpHiremecom"
                                  />
                                }
                                label="Transform"
                              />
                            </FormGroup>
                            <Tooltip
                              title={
                                <div>
                                  <p>
                                    Try results that transform your keywords.
                                  </p>
                                  <p>
                                    {" "}
                                    <b>Domain Hacks</b>: hireme.com &rarr;
                                    hire.me
                                  </p>
                                  <p>
                                    <b>Drop Last Vowel</b>: flicker.com &rarr;
                                    flickr.com
                                  </p>
                                  <p>
                                    <b>Pluralize Nouns</b>: tool.com &rarr;
                                    tools.com
                                  </p>
                                </div>
                              }
                            >
                              <span className="info-icon cursor-pointer">
                                &#x24D8;
                              </span>
                            </Tooltip>
                          </Box>
                          <Box
                            component="form"
                            sx={{
                              "& .MuiTextField-root": { m: 1 },
                            }}
                            noValidate
                            autoComplete="off"
                          >
                            <div>
                              <TextField
                                id="vpMaxlength"
                                label="Max length"
                                type="number"
                                size="small"
                                variant="standard"
                                InputLabelProps={{
                                  shrink: true,
                                }}
                                value={vpMaxlength}
                                onChange={(e) =>
                                  setVpMaxlength(parseInt(e.target.value, 10))
                                }
                              />
                            </div>
                          </Box>
                          <Box
                            mb={2}
                            sx={{ textAlign: "left", marginTop: "20px" }}
                          >
                            <span className="text-sm">Contains</span>
                            <TextField
                              fullWidth
                              id="vpContains"
                              variant="standard"
                              value={vpContains}
                              onChange={(e) => setVpContains(e.target.value)}
                            />
                          </Box>
                          <Box
                            mb={2}
                            sx={{ textAlign: "left", marginTop: "5px" }}
                          >
                            <span className="text-sm">Similar to</span>
                            <TextField
                              fullWidth
                              id="vpSimilarToThisDomainName"
                              variant="standard"
                              value={vpSimilarToThisDomainName}
                              onChange={(e) =>
                                setVpSimilarToThisDomainName(e.target.value)
                              }
                            />
                          </Box>
                        </Box>
                      </TabPanel>
                    </TabContext>
                  </Box>
                </Modal>
              </Box>
            </>
          }
          <SignedOut>
            <button
              className="bg-black rounded-md text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
              onClick={() => openSignIn()}
            >
              Sign in / up
            </button>
          </SignedOut>
          <SignedIn>
            {!loading && (
              <button
                className="bg-black rounded-md text-white font-medium px-4 py-2 sm:mt-10 mt-8 hover:bg-black/80 w-full"
                onClick={(e) => generateDom(e)}
              >
                Create your domain &rarr;
              </button>
            )}
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
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{ duration: 2000 }}
        />
        <hr className="h-px bg-gray-700 border-1 dark:bg-gray-700" />
        {
          /*!loading && user && */ <div className="space-y-10 my-10">
            {domainfounded.length > 0 && (
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
                  <TableDomain
                    rows={domainfounded.slice(0, countShowDomain)}
                    admin={admin}
                    email={dataUser.email}
                    functionDomainFounded={setDomainFounded}
                    cred={credits}
                    functionCred={setCredits}
                  />
                </div>
              </>
            )}
          </div>
        }
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default DomainPage;
