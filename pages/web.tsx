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
import SBRContext from "../context/SBRContext";
import LoadingDots from "../components/LoadingDots";

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [textAboutMe, setTextAboutMe] = useState("");
  const [textPortFolio, setTextPortFolio] = useState("");
  const [textContact, setTextContact] = useState("");
  const [textBlog, setTextBlog] = useState("");

  const [options, setOptions] = useState({
    aboutme: true,
    portfolio: false,
    contact: false,
    blog: false,
  });

  const [generatedSite, setGeneratedSite] = useState("");

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { dataUser } = context;

  const handleChange = (event: { target: { name: any; checked: any; }; }) => {
    setOptions({
      ...options,
      [event.target.name]: event.target.checked,
    });
  };

  const generateWeb = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    let hardcodedHTML = '';
    //-------------------------------------------------------------------------------------------------
    const prompt = `Claude:
    I am ${dataUser.name}
    Objective:
    Your mission is to create a personal webpage for me, all in a single file.
    Details:    
    - Content and Structure: Sections on the webpage: ${textAboutMe ? 'AboutMe' : ''} ${textPortFolio ? 'Portfolio' : ''} ${textContact ? 'Contact' : ''} ${textBlog ? 'Blog' : ''}
    - Content Details: 
    ${textAboutMe ? `This is the content of the "About Me" section: ${textAboutMe}` : ''}
    ${textPortFolio ? `This is the content of the "Portfolio" section: ${textPortFolio}` : ''}
    ${textContact ? `This is the content of the "Contact" section: ${textContact}` : ''}
    ${textBlog ? `This is the content of the "Blog" section: ${textBlog}` : ''}.
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

    //console.log('View anthropic:', result.data.content[0].text);    

    if(result) hardcodedHTML = result.data.content[0].text;

    /*
    //console.log('prompt', prompt);
    const isGPT = true;
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
      let dataWebSite = "";
      const onParseGPT = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          try {
            const text = JSON.parse(data).text ?? "";
            dataWebSite += text;
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
            dataWebSite += text;
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

      try {
        hardcodedHTML = dataWebSite;
        //console.log('dataWebsite', dataWebSite);        
      } catch (error) {
        console.log("Error: ", error);
      }      
    }
    */        
    //-------------------------------------------------------------------------------------------------

    // Hardcoded HTML for demo purposes
    /*const hardcodedHTML = `
      <html>
      <head><title>Generated Site</title></head>
      <body>
        <header><h1>Welcome to My Website</h1></header>
        ${
          options.aboutme
            ? `<section><h2>About Me</h2><p>${textAboutMe}</p></section>`
            : ""
        }
        ${
          options.portfolio
            ? `<section><h2>Portfolio</h2><p>${textPortFolio}</p></section>`
            : ""
        }
        ${
          options.contact
            ? `<section><h2>Contact</h2><p>${textContact}</p></section>`
            : ""
        }
        ${
          options.blog
            ? `<section><h2>Blog</h2><p>${textBlog}</p></section>`
            : ""
        }
        <footer><p>Footer content here</p></footer>
      </body>
      </html>
    `;
    */

    setGeneratedSite(hardcodedHTML);

    mixpanel.track("Web Generated", {
      textAboutMe: textAboutMe,
      textPortFolio: textPortFolio,
      textContact: textContact,
      textBlog: textBlog,
      options: {
        'aboutme': options.aboutme,
        'portfolio': options.portfolio,
        'contact': options.contact,
        'blog': options.blog,
      }
    });
  };

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

      <Header />
      <main className="flex flex-1 w-full flex-col px-4">
        <h1 className="sm:text-3xl mb-3 text-2xl text-center items-center font-bold text-slate-900">
          Website Generator
        </h1>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <Box
            sx={{
              flexDirection: "column",
              order: { xs: 1, sm: 1 },
              flexGrow: 1,
            }}
          >
            <Box>
              <FormControl component="fieldset" variant="standard">
                <FormLabel component="legend"></FormLabel>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={options.aboutme}
                        onChange={handleChange}
                        name="aboutme"
                      />
                    }
                    label="About Me"
                  />
                  {options.aboutme && (
                    <>
                      <div className="flex mt-3 items-center space-x-3">
                        <p className="text-left font-medium">
                          Enter content or key points for 'About Me' section{" "}
                          <Tooltip
                            title={
                              <div>
                                <p>
                                  e.g., I'm a passionate entrepreneur with a
                                  focus on innovative health solutions.
                                </p>
                              </div>
                            }
                          >
                            <span className="info-icon cursor-pointer">
                              &#x24D8;
                            </span>
                          </Tooltip>
                        </p>
                      </div>
                      <textarea
                        value={textAboutMe}
                        onChange={(e) => setTextAboutMe(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                        placeholder={
                          "e.g., I'm a passionate entrepreneur with a focus on innovative health solutions."
                        }
                      />
                    </>
                  )}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={options.portfolio}
                        onChange={handleChange}
                        name="portfolio"
                      />
                    }
                    label="Portfolio"
                  />
                  {options.portfolio && (
                    <>
                      <div className="flex mt-3 items-center space-x-3">
                        <p className="text-left font-medium">
                          Enter Your Portfolio{" "}
                          <Tooltip
                            title={
                              <div>
                                <p>
                                  Enter a description of some of your work
                                  examples
                                </p>
                              </div>
                            }
                          >
                            <span className="info-icon cursor-pointer">
                              &#x24D8;
                            </span>
                          </Tooltip>
                        </p>
                      </div>
                      <textarea
                        value={textPortFolio}
                        onChange={(e) => setTextPortFolio(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                        placeholder={
                          "e.g., A description of some work examples"
                        }
                      />
                    </>
                  )}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={options.contact}
                        onChange={handleChange}
                        name="contact"
                      />
                    }
                    label="Contact"
                  />
                  {options.contact && (
                    <>
                      <div className="flex mt-3 items-center space-x-3">
                        <p className="text-left font-medium">
                          Enter Your Contact Information{" "}
                          <Tooltip
                            title={
                              <div>
                                <p>
                                  Enter your Business Address, Phone Number,
                                  etc.
                                </p>
                              </div>
                            }
                          >
                            <span className="info-icon cursor-pointer">
                              &#x24D8;
                            </span>
                          </Tooltip>
                        </p>
                      </div>
                      <textarea
                        value={textContact}
                        onChange={(e) => setTextContact(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                        placeholder={"e.g., Business Address and Phone Number"}
                      />
                    </>
                  )}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={options.blog}
                        onChange={handleChange}
                        name="blog"
                      />
                    }
                    label="Blog"
                  />
                  {options.blog && (
                    <>
                      <div className="flex mt-3 items-center space-x-3">
                        <p className="text-left font-medium">
                          Enter An Idea For A Blog Post{" "}
                          <Tooltip
                            title={
                              <div>
                                <p>Enter details to create your blog post</p>
                              </div>
                            }
                          >
                            <span className="info-icon cursor-pointer">
                              &#x24D8;
                            </span>
                          </Tooltip>
                        </p>
                      </div>
                      <textarea
                        value={textBlog}
                        onChange={(e) => setTextBlog(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                        placeholder={"e.g., Create blog post about teamwork"}
                      />
                    </>
                  )}
                </FormGroup>
                <FormHelperText></FormHelperText>
              </FormControl>
            </Box>
            <Box>
            {!loading &&           
              <button
                className="bg-black rounded-md text-white font-medium px-4 py-2 mt-2 hover:bg-black/80"
                onClick={generateWeb}
              >
                Create your web &rarr;
              </button>         
            }
            {loading && (
              <button
                className="bg-black rounded-md text-white font-medium px-4 py-2 mt-2 hover:bg-black/80"
                disabled
              >
                <LoadingDots color="white" style="large" />
              </button>
            )}
            </Box>
          </Box>
          <Box
            sx={{
              order: { xs: 2, sm: 2 },
              color: (theme) =>
                theme.palette.mode === "dark" ? "grey.300" : "grey.800",
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "grey.800" : "grey.300",
              borderRadius: 2,
              flexGrow: 3,
              mb: { xs: 2, sm: 0 },
            }}
          >
            {generatedSite && (
              <div>
                <h2>Generated Website Preview</h2>
                <div dangerouslySetInnerHTML={{ __html: generatedSite }} />
                <button
                  className="bg-gray-400 rounded-md text-white font-medium px-4 py-2 mt-2 hover:bg-gray-500"
                  onClick={downloadCode}
                >
                  Download Code
                </button>
              </div>
            )}
          </Box>
        </Box>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
