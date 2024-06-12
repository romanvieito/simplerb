import React, { useState } from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";

import { Box, Switch, FormControlLabel, FormHelperText, FormGroup, FormControl, FormLabel, Tooltip } from "@mui/material";

const WebPage = () => {

  const [textAboutMe, setTextAboutMe] = useState("");
  const [textPortFolio, setTextPortFolio] = useState("");
  const [textContact, setTextContact] = useState("");
  const [textBlog, setTextBlog] = useState("");

  const [options, setOptions] = useState({
    aboutme: false,
    portfolio: false,
    contact: false,
    blog: false
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOptions({
      ...options,
      [event.target.name]: event.target.checked,
    });
  };

  const generateWeb = async (e: any) => {
    alert("Generate");
  };

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      <main className="flex flex-1 w-full flex-col px-4">
        <h1 className="sm:text-3xl text-2xl text-center items-center font-bold text-slate-900">
          Website Generator
        </h1>
        <Box
          sx={{
            display: "flex",
          }}
        >
          <Box sx={{ flexDirection: "column", order: 1 }}>
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
                          Enter And Idea For A Blog Post{" "}
                          <Tooltip
                            title={
                              <div>
                                <p>Enter details to create you a blog post</p>
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
                onClick={(e) => generateWeb(e)}
              >
                Create your web &rarr;
              </button>
            </Box>
          </Box>
          <Box sx={{ order: 2 }}></Box>
        </Box>
      </main>
      <Footer />
    </div>
  );
};

export default WebPage;