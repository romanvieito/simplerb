import React, { useState } from "react";
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

const Home = () => {
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

  const handleChange = (event: { target: { name: any; checked: any; }; }) => {
    setOptions({
      ...options,
      [event.target.name]: event.target.checked,
    });
  };

  const generateWeb = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    // Hardcoded HTML for demo purposes
    const hardcodedHTML = `
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
          }}
        >
          <Box mr={1} sx={{ flexDirection: "column", order: 1, flexGrow: 1 }}>
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
              <button
                className="bg-black rounded-md text-white font-medium px-4 py-2 mt-2 hover:bg-black/80"
                onClick={generateWeb}
              >
                Create your web &rarr;
              </button>
            </Box>
          </Box>
          <Box sx={{ order: 2,
             color: (theme) => (theme.palette.mode === 'dark' ? 'grey.300' : 'grey.800'),
             border: '1px solid',
             borderColor: (theme) =>
               theme.palette.mode === 'dark' ? 'grey.800' : 'grey.300',
             borderRadius: 2,
             flexGrow: 3
           }}>
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
