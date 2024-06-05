import React from 'react';
import Head from "next/head";
import Footer from "../components/Footer";
import Header from "../components/Header";
import styles from "../components/CardsPricing.module.css";

import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="flex max-w-5xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Domain Generator</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header/>
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-12 sm:mt-20">
        <h1 className="sm:text-6xl text-4xl max-w-[708px] font-bold text-slate-900">
          Index
        </h1>

        <div className={styles.pricingTitle}>
                <h2>Plans built for creators and businesses</h2>
            </div>

            <div className={styles.wrapperCard}>
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <h3>Free</h3>
                        <h4>For individuals who want to try out the most advanced AI domain generator.</h4>
                    </div>
                    <div className={styles.cardPrice}>
                        <h2>
                            <sup>$</sup>
                            0
                            <small>forever</small>
                        </h2>
                    </div>
                    <div className={styles.cardDescription}>
                        <ul>
                            <li className={styles.ok}>Unlimited domains names</li>
                            <li className={styles.ok}>Click to check domain availability</li>
                            <li className={styles.ok}>See domain rating</li>
                        </ul>
                    </div>
                    <div className={styles.cardAction}>
                        <button type="button">Get Free</button>
                    </div>
                </div>

                <div className={`${styles.card} ${styles.popular}`}>
                    <div className={styles.cardRibbon}>
                        <span>most popular</span>
                    </div>
                    <div className={styles.cardTitle}>
                        <h3>Starter</h3>
                        <span className={styles.off}>First month 80% off</span>
                        <h4>For hobbyists bringing ideas to life with AI by their side.</h4>
                    </div>
                    <div className={styles.cardPrice}>
                        <h2>
                            <sup>$</sup>
                            <span className={styles.discountPrice}>5</span>
                            <span className={styles.ml2}>
                                <sup>$</sup>
                                1
                                <small>/month</small>
                            </span>
                        </h2>
                    </div>
                    <div className={styles.cardDescription}>
                        <ul>
                            <li>Everything in free, plus</li>
                            <li className={styles.ok}>Generate only available domain names</li>
                            <li className={styles.ok}>Website generator</li>
                            <li className={styles.ok}>Support (Chat and Email)</li>
                            <li className={styles.ok}>Premium features*</li>
                        </ul>
                    </div>
                    <div className={styles.cardAction}>
                        <button type="button">Start today</button>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <h3>Creator</h3>
                        <span className={styles.off}>First month 80% off</span>
                        <h4>For passionate creators building the apps they want to see in the world.</h4>
                    </div>
                    <div className={styles.cardPrice}>
                        <h2>
                            <sup>$</sup>
                            <span className={styles.discountPrice}>22</span>
                            <span className={styles.ml2}>
                                <sup>$</sup>
                                11
                                <small>/month</small>
                            </span>
                        </h2>
                    </div>
                    <div className={styles.cardDescription}>
                        <ul>
                            <li>Everything in starter, plus</li>
                            <li className={styles.ok}>Generate domains and websites with the latest AI model</li>
                            <li className={styles.ok}>Priority support (Chat and Email)</li>
                            <li className={styles.ok}>Premium features*</li>
                        </ul>
                    </div>
                    <div className={styles.cardAction}>
                        <button type="button">Start today</button>
                    </div>
                </div>
            </div>

      </main>
      <Footer/>
    </div>
  );
};

export default Home;
