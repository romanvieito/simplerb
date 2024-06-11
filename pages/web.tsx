import React, { useState } from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";

import { Tooltip } from "@mui/material";
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Switch from '@mui/material/Switch';
import TextareaAutosize from '@mui/material/TextareaAutosize';

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

  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Website Generator (coming soon)
        </h1>
        <FormControl component="fieldset" variant="standard">
          <FormLabel component="legend"></FormLabel>
          <FormGroup>
          <FormControlLabel
              control={
                <Switch checked={options.aboutme} onChange={handleChange} name="aboutme" />
              }
              label="About Me"
            />
            {
              options.aboutme && 
              <>
                <div className="flex mt-3 items-center space-x-3">
                  <p className="text-left font-medium">
                    Enter Your aaaaaaaaaaaaaa{" "}
                    <Tooltip
                      title={
                        <div>
                          <p>
                          bbbbbbbbbbbbbb                        
                          </p>
                        </div>
                      }
                    >
                      <span className="info-icon cursor-pointer">&#x24D8;</span>
                    </Tooltip>
                  </p>
                </div>
                <textarea
                  value={textAboutMe}
                  onChange={(e) => setTextAboutMe(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                  placeholder={"e.g., cccccccccccccc"}
                />              
              </>
            }            
            <FormControlLabel
              control={
                <Switch checked={options.portfolio} onChange={handleChange} name="portfolio" />
              }
              label="Portfolio"
            />
            {
              options.portfolio && 
              <>
                <div className="flex mt-3 items-center space-x-3">
                  <p className="text-left font-medium">
                    Enter Your aaaaaaaaaaaaaa{" "}
                    <Tooltip
                      title={
                        <div>
                          <p>
                          bbbbbbbbbbbbbb                        
                          </p>
                        </div>
                      }
                    >
                      <span className="info-icon cursor-pointer">&#x24D8;</span>
                    </Tooltip>
                  </p>
                </div>
                <textarea
                  value={textPortFolio}
                  onChange={(e) => setTextPortFolio(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                  placeholder={"e.g., cccccccccccccc"}
                />              
              </>
            }            
            <FormControlLabel
              control={
                <Switch checked={options.contact} onChange={handleChange} name="contact" />
              }
              label="Contact"
            />
            {
              options.contact && 
              <>
                <div className="flex mt-3 items-center space-x-3">
                  <p className="text-left font-medium">
                    Enter Your aaaaaaaaaaaaaa{" "}
                    <Tooltip
                      title={
                        <div>
                          <p>
                          bbbbbbbbbbbbbb                        
                          </p>
                        </div>
                      }
                    >
                      <span className="info-icon cursor-pointer">&#x24D8;</span>
                    </Tooltip>
                  </p>
                </div>
                <textarea
                  value={textContact}
                  onChange={(e) => setTextContact(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                  placeholder={"e.g., cccccccccccccc"}
                />              
              </>
            }            
            <FormControlLabel
              control={
                <Switch checked={options.blog} onChange={handleChange} name="blog" />
              }
              label="Blog"
            />
            {
              options.blog && 
              <>
                <div className="flex mt-3 items-center space-x-3">
                  <p className="text-left font-medium">
                    Enter Your aaaaaaaaaaaaaa{" "}
                    <Tooltip
                      title={
                        <div>
                          <p>
                          bbbbbbbbbbbbbb                        
                          </p>
                        </div>
                      }
                    >
                      <span className="info-icon cursor-pointer">&#x24D8;</span>
                    </Tooltip>
                  </p>
                </div>
                <textarea
                  value={textBlog}
                  onChange={(e) => setTextBlog(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black my-5"
                  placeholder={"e.g., cccccccccccccc"}
                />              
              </>
            }            
          </FormGroup>
          <FormHelperText></FormHelperText>
        </FormControl>
      </main>
      <Footer/>      
    </div>
  );
};

export default WebPage;