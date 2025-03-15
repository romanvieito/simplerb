import React, { useState, useContext } from "react";
import EmailModal from "./EmailModal";
import styles from "./CardsPricing.module.css";
import mixpanel from "../utils/mixpanel-config";
import { useClerk, useUser } from "@clerk/nextjs";
import Snackbar from "@mui/joy/Snackbar";
import SBRContext from "../context/SBRContext";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number | null;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: "FREE",
    name: "Free",
    description: "For individuals who want to generate their own domains.",
    originalPrice: 0,
    discountedPrice: null,
    features: [
      "Generate domains",
      "See domain availability",
      "Best effort support"
    ],
    ctaText: "Get started"
  },
  {
    id: "STARTER",
    name: "Starter",
    description: "For hobbyists bringing ideas to life with AI by their side.",
    originalPrice: 10,
    discountedPrice: 5,
    features: [
      "Everything in free, plus",
      "Generate only available domains",
      "Get customers with quick ads",
      "Priority support"
    ],
    isPopular: true,
    ctaText: "Get starter"
  },
  {
    id: "CREATOR",
    name: "Creator",
    description: "For passionate creators building the apps they want to see in the world.",
    originalPrice: 22,
    discountedPrice: 11,
    features: [
      "Everything in starter, plus",
      "Website builder",
      "Email marketing",
      "Priority support"
    ],
    ctaText: "Get creator"
  }
];

interface ToastState {
  open: boolean;
  message: string;
  severity: "success" | "danger";
}

export default function CPricing() {
  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { dataUser, subsTplan, setSubsTplan, setSubsCancel } = context;

  const { isLoaded, user } = useUser();
  const [modalOpenLetsTalk, setModalOpenLetsTalk] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    severity: "success"
  });
  const { openSignIn } = useClerk();

  const handleSubscriptionFreeClick = async (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!isLoaded || !user) {
      openSignIn();
      return;
    }

    setIsLoading("FREE");
    try {
      const data = {
        substplan: "FREE",
        subscancel: false
      };

      const resp = await fetch(
        `/api/user-subscription?email=${dataUser.email}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(data)
        }
      );

      if (!resp.ok) {
        throw new Error("Failed to set user subscription");
      }

      setToast({
        open: true,
        message: "FREE subscription activated successfully",
        severity: "success"
      });
      setSubsTplan("FREE");
      setSubsCancel(false);
      mixpanel.track("Subscription", {
        plan_subscription: "FREE"
      });
    } catch (error) {
      console.error("Subscription error:", error);
      setToast({
        open: true,
        message: "Failed to activate subscription. Please try again.",
        severity: "danger"
      });
      mixpanel.track("Subscription error", {
        plan_subscription: "FREE",
        error: error
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handlePaidSubscriptionClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    planId: string
  ) => {
    event.preventDefault();

    // Track Google Ads conversion
    window.gtag?.("event", "conversion", {
      send_to: "16510475658/ZCyECJS9tqYZEIq758A9"
    });

    const form = event.currentTarget.form;
    if (form) {
      mixpanel.track("Subscription", {
        plan_subscription: planId
      });
      form.submit();
    }
  };

  const renderPriceDisplay = (plan: PricingPlan) => {
    return (
      <div className={styles.cardPrice}>
        <h2>
          <sup>$</sup>
          {plan.discountedPrice !== null && (
            <span className={styles.discountPrice}>{plan.originalPrice}</span>
          )}
          <span className={styles.ml2}>
            <sup>$</sup>
            {plan.discountedPrice ?? plan.originalPrice}
            <small>{plan.originalPrice === 0 ? "forever" : "/month"}</small>
          </span>
        </h2>
      </div>
    );
  };

  const renderPlanFeatures = (features: string[]) => (
    <div className={styles.cardDescription}>
      <ul>
        {features.map((feature, index) => (
          <li key={index} className={styles.ok}>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );

  const renderSubscriptionButton = (plan: PricingPlan) => {
    if (subsTplan === plan.id) {
      return (
        <div className={styles.cardTitle}>
          <h3>Your Current Plan</h3>
        </div>
      );
    }

    if (plan.id === "FREE") {
      return (
        <div className={styles.cardAction}>
          <button
            type="button"
            onClick={handleSubscriptionFreeClick}
            disabled={isLoading === "FREE"}
            aria-busy={isLoading === "FREE"}
          >
            {isLoading === "FREE" ? "Activating..." : plan.ctaText}
          </button>
        </div>
      );
    }

    return (
      <div className={styles.cardAction}>
        <form action="/api/checkout_sessions" method="POST">
          <input type="hidden" name="tipo" value={plan.id} />
          <button
            type="submit"
            onClick={(e) => handlePaidSubscriptionClick(e, plan.id)}
          >
            {plan.ctaText}
          </button>
        </form>
      </div>
    );
  };

  return (
    <div style={{ marginTop: -10 }}>
      <div className={styles.pricingTitle}>
        <h2 className="font-medium" style={{ fontSize: 30 }}>
          A perfect fit for creators
        </h2>
      </div>

      <div className={styles.wrapperCard}>
        {pricingPlans.map((plan) => (
          <motion.div
            key={plan.id}
            className={`${styles.card} ${plan.isPopular ? styles.popular : ""}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {plan.isPopular && (
              <div className={styles.cardRibbon}>
                <span>most popular</span>
              </div>
            )}
            <div className={styles.cardTitle}>
              <h3>{plan.name}</h3>
              {plan.discountedPrice && (
                <span className={styles.off}>50% OFF today!</span>
              )}
              <h4>{plan.description}</h4>
            </div>
            {renderPriceDisplay(plan)}
            {renderPlanFeatures(plan.features)}
            {renderSubscriptionButton(plan)}
          </motion.div>
        ))}
      </div>

      <Snackbar
        autoHideDuration={3000}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center"
        }}
        open={toast.open}
        variant="soft"
        color={toast.severity}
        onClose={() => setToast({ ...toast, open: false })}
      >
        {toast.message}
      </Snackbar>

      <EmailModal
        open={modalOpenLetsTalk}
        onClose={() => setModalOpenLetsTalk(false)}
        subjectType="custom requirements"
      />
    </div>
  );
}
