import React, { useState, useContext } from "react";
import EmailModal from "./EmailModal";
import styles from "../components/CardsPricing.module.css";
import mixpanel from "../utils/mixpanel-config";
import { useClerk, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import Snackbar from "@mui/joy/Snackbar";
import SBRContext from "../context/SBRContext";
import { Box } from "@mui/material";

export default function CPricing() {
  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { dataUser, subsTplan, setSubsTplan, setSubsCancel } = context;

  const { isLoaded, user } = useUser();
  const [modalOpenLetsTalk, setModalOpenLetsTalk] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);
  const [openDanger, setOpenDanger] = useState(false);
  const [message, setMessage] = useState("");
  const { openSignIn } = useClerk();

  const handleSubscriptionFreeClick = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!isLoaded || !user) {
      openSignIn();
    } else {
      try {
        const substplan = "FREE";
        const subscancel = false;

        const data = {
          substplan,
          subscancel,
        };

        const resp = await fetch(
          `/api/user-subscription?email=${dataUser.email}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }
        );

        if (!resp.ok) {
          setMessage(
            "Network response was not ok. Failed to set users subscription"
          );
          setOpenDanger(true);
        } else {
          setMessage("FREE subscription success");
          setOpenSuccess(true);
          setSubsTplan("FREE");
          setSubsCancel(false);
          mixpanel.track("Subscription", {
            plan_subscription: "FREE",
          });
        }
      } catch (error) {
        console.error("Subscription with error: ", error);
        mixpanel.track("Subscription with error", {
          plan_subscription: "FREE",
          error: error,
        });
      }
    }
  };

  // Handler function to track the event when the button is clicked
  const handleSubsStarterCreatorClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    // Prevent the form from submitting traditionally
    event.preventDefault();

    // The Google Ads event snippet
    window.gtag &&
      window.gtag("event", "conversion", {
        send_to: "16510475658/ZCyECJS9tqYZEIq758A9", // Your conversion ID and conversion label
      });

    // Safely access the form and submit it
    const form = event.currentTarget.form;

    if (form) {
      const formData = new FormData(form); // Crea un objeto FormData con los datos del formulario
      const tipo = formData.get("tipo");
      mixpanel.track("Subscription", {
        plan_subscription: tipo?.toString(),
      });
      form.submit();
    } else {
      // Handle the case where for some reason the form isn't available
      console.error("Form not found");
    }
  };

  const letsTalk = () => {
    mixpanel.track("Lets Talk Click", {});
    setModalOpenLetsTalk(true);
  };

  const handleCloseModalLetsTalk = () => {
    setModalOpenLetsTalk(false);
  };

  return (
    <div style={{ marginTop: -10 }}>
      <div className={styles.pricingTitle}>
        <h2 className="font-medium" style={{ fontSize: 30 }}>
          A perfect fit for creators and businesses owners
        </h2>
      </div>

      <div className={styles.wrapperCard}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <h3>Free</h3>
            <h4>
              For individuals who want to generate their own domains.
            </h4>
          </div>
          <div className={styles.cardPrice}>
            <h2>
              <sup>$</sup>0<small>forever</small>
            </h2>
          </div>
          <div className={styles.cardDescription}>
            <ul>
              <li className={styles.ok}>
                Generate domains
              </li>
              <li className={styles.ok}>Click to check domain availability</li>
            </ul>
          </div>
        </div>

        <div className={`${styles.card} ${styles.popular}`}>
          <div className={styles.cardRibbon}>
            <span>most popular</span>
          </div>
          <div className={styles.cardTitle}>
            <h3>Starter</h3>
            <span className={styles.off}>50% OFF today!</span>
            <h4>For hobbyists bringing ideas to life with AI by their side.</h4>
          </div>
          <div className={styles.cardPrice}>
            <h2>
              <sup>$</sup>
              <span className={styles.discountPrice}>10</span>
              <span className={styles.ml2}>
                <sup>$</sup>5<small>/month</small>
              </span>
            </h2>
          </div>
          <div className={styles.cardDescription}>
            <ul>
              <li>Everything in free, plus</li>
              <li className={styles.ok}>
                Generate only available domains
              </li>
              <li className={styles.ok}>Website creator</li>
              <li className={styles.ok}>Get customers with quick ads</li>
              <li className={styles.ok}>Support (Email)</li>
            </ul>
          </div>
          {subsTplan !== "STARTER" ? (
            <>
              {
                /*!isLoaded || !user ? (
                        <div className={styles.cardAction}>
                            <button type="button" onClick={() => openSignIn()}>
                            Get starter
                            </button>
                        </div>
                        ) : */ <div className={styles.cardAction}>
                  <form action="/api/checkout_sessions" method="POST">
                    <input type="hidden" name="tipo" value="STARTER" />
                    <button
                      type="submit"
                      onClick={handleSubsStarterCreatorClick}
                    >
                      Get starter
                    </button>
                  </form>
                </div>
              }
            </>
          ) : (
            <>
              <div className={styles.cardTitle}>
                <h3>Your Plan!</h3>
              </div>
            </>
          )}
        </div>

        <Box className={styles.card}>
          <div className={styles.cardTitle}>
            <h3>Creator</h3>
            <span className={styles.off}>50% OFF today!</span>
            <h4>
              For passionate creators building the apps they want to see in the
              world.
            </h4>
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
              <li className={styles.ok}>Unlock the best AI model</li>
              <li className={styles.ok}>Priority support (Phone)</li>
            </ul>
          </div>
          {subsTplan !== "CREATOR" ? (
            <>
              {
                /*!isLoaded || !user ? (
                        <div className={styles.cardAction}>
                            <button type="button" onClick={() => openSignIn()}>
                            Get creator
                            </button>
                        </div>
                        ) : */ <div className={styles.cardAction}>
                  <form action="/api/checkout_sessions" method="POST">
                    <input type="hidden" name="tipo" value="CREATOR" />
                    <button
                      type="submit"
                      onClick={handleSubsStarterCreatorClick}
                    >
                      Get creator
                    </button>
                  </form>
                </div>
              }
            </>
          ) : (
            <>
              <div className={styles.cardTitle}>
                <h3>Your Plan!</h3>
              </div>
            </>
          )}
        </Box>
      </div>

      {/* <Box className="flex">
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                    <p>Need more?</p>
                    <h3 className="mt-3">Custom Plans</h3>
                    <h4 className="mt-3">
                        For custom requirements and tailored services, contact us for
                        dedicated support and precise control over your needs.
                    </h4>
                    </div>
                    <div className={styles.cardAction} style={{ display: "flex", justifyContent: "center", width: "100%", marginTop:"30px" }}>
                    <button type="button" onClick={() => letsTalk()} style={{ width:"300px"}}>
                        Let's talk
                    </button>
                    <EmailModal open={modalOpenLetsTalk} onClose={handleCloseModalLetsTalk} subjectType='custom requirements' />
                    </div>
                    <div className={styles.cardDescription}>
                    <ul>
                        <li className={styles.ok}>Custom Website Support</li>
                        <li className={styles.ok}>Custom Google Ads Support</li>
                        <li className={styles.ok}>Api Access (coming soon)</li>
                    </ul>
                    </div>
                </div>
            </Box> */}

      <Snackbar
        autoHideDuration={3000}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        open={openSuccess}
        variant="soft"
        color="success"
        onClose={() => setOpenSuccess(false)}
      >
        {message}
      </Snackbar>
      <Snackbar
        autoHideDuration={2500}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        open={openDanger}
        variant="soft"
        color="danger"
        onClose={() => setOpenDanger(false)}
      >
        {message}
      </Snackbar>
    </div>
  );
}
