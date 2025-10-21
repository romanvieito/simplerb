import React, { useState, useContext } from "react";
import EmailModal from "./EmailModal";
import mixpanel from "../utils/mixpanel-config";
import { useClerk, useUser } from "@clerk/nextjs";
import Snackbar from "@mui/joy/Snackbar";
import SBRContext from "../context/SBRContext";
import { Box } from "@mui/material";
import { motion } from "framer-motion";
import { Check } from "@mui/icons-material";

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
      "Generate only free domains",
      "1-Click Website creator",
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
      "Ads generator",
      "Keyword research",
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold tracking-tight">
          A perfect fit for{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
              creators and small businesses
            </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {pricingPlans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`relative rounded-2xl bg-gradient-to-b from-gray-900 to-black border border-gray-800 p-8 ${
              plan.isPopular ? "ring-2 ring-blue-500" : ""
            }`}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-gray-400">{plan.description}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold text-white">
                  ${plan.discountedPrice ?? plan.originalPrice}
                </span>
                {plan.discountedPrice && (
                  <span className="ml-2 text-gray-400 line-through">
                    ${plan.originalPrice}
                  </span>
                )}
                <span className="ml-2 text-gray-400">/month</span>
              </div>
              {plan.discountedPrice && (
                <span className="text-blue-400 text-sm font-medium">
                  50% OFF today!
                </span>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center text-gray-300">
                  <Check className="h-5 w-5 text-blue-500 mr-3" />
                  {feature}
                </li>
              ))}
            </ul>

            {subsTplan === plan.id ? (
              <div className="text-center py-4">
                <span className="text-green-400 font-medium">Your Current Plan</span>
              </div>
            ) : (
              <form action="/api/checkout_sessions" method="POST" className="mt-8">
                <input type="hidden" name="tipo" value={plan.id} />
                <button
                  type="submit"
                  onClick={(e) => handlePaidSubscriptionClick(e, plan.id)}
                  className={`w-full py-3 px-6 rounded-full font-medium transition-all duration-200 ${
                    plan.isPopular
                      ? "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-transparent border-2 border-gray-700 hover:border-blue-500 text-white"
                  }`}
                >
                  {plan.ctaText}
                </button>
              </form>
            )}
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
