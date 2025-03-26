import { styled } from '@mui/material/styles';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Typography from '@mui/material/Typography';
import { motion } from 'framer-motion';

export default function CFAQ() {
    const CustomAccordion = styled(Accordion)(({ theme }) => ({
        background: 'transparent',
        boxShadow: 'none',
        '&:before': {
            display: 'none',
        },
        '&.MuiAccordion-root:before': {
            display: 'none',
        },
        '& .MuiAccordionSummary-root': {
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '1rem 0',
            '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
        },
        '& .MuiAccordionDetails-root': {
            borderTop: 'none',
            padding: '1rem 0',
        },
        '& .MuiSvgIcon-root': {
            color: '#ef4444',
        },
    }));

    const faqItems = [
        {
            question: "What is SimplerB?",
            answer: "SimplerB is an AI-powered tool designed to help you kickstart your business effortlessly. It generates your domain, website, and Google Ads, so you can focus on growing your business. Additionally, it includes features like a business name generator, brand name generator, and company name generator to help you establish a strong brand identity."
        },
        {
            question: "How do I get started with SimplerB?",
            answer: "Getting started with SimplerB is easy. Sign up on our website, choose a plan that fits your needs, and begin leveraging our AI features to generate your domain, website, and Google Ads. You can also use our AI business name generator, company name generator, and brand generator to create a unique identity for your business."
        },
        {
            question: "At which point in time can I cancel my subscription?",
            answer: "You can cancel your subscription at any time. At the next billing cycle, we will not resume your subscription, and you will be downgraded to the Free tier."
        },
        {
            question: "What is the billing interval?",
            answer: "We bill you on a monthly basis starting from the day you subscribed. You can cancel your subscription at any time."
        },
        {
            question: "Is there a free trial available?",
            answer: "Even better...we do have a Free plan that you can use forever. This allows you to explore SimplerB's AI features and see how they can benefit your business without any commitment."
        },
        {
            question: "Can I switch plans later on?",
            answer: "Absolutely. You can upgrade or downgrade your plan at any time from your account settings. The change will take effect in the next billing cycle."
        },
        {
            question: "What types of businesses benefit from using SimplerB?",
            answer: "SimplerB is designed to help small businesses across various industries, including retail, service-based businesses, and startups, streamline their operations and improve efficiency with AI. Our tools, such as the business name generator, brand name generator, and company name generator, are particularly beneficial for new businesses looking to establish a strong brand presence."
        },
        {
            question: "How does SimplerB help in automating tasks?",
            answer: "Digital is more important than ever, so SimplerB's AI help to automate critical startup tasks so you can focus on other strategic activities that grow your business."
        },
        {
            question: "What kind of customer support does SimplerB offer?",
            answer: "Our customer support team is available 24/7 via email. We also provide a comprehensive knowledge base and tutorial videos to help you get the most out of SimplerB. Additionally, we are open to scheduling video meetings to provide personalized assistance and ensure you have all the support you need."
        },
        {
            question: "Is my data secure with SimplerB?",
            answer: "We take data security seriously. SimplerB uses industry-standard encryption and security protocols to ensure that your data is safe and secure."
        },
        {
            question: "What happens to my data if I cancel my subscription?",
            answer: "If you cancel your subscription, your data will remain available in read-only mode for 30 days. After this period, your data will be permanently deleted from our servers."
        },
        {
            question: "How can SimplerB help me grow my business?",
            answer: "SimplerB helps you grow your business by using AI to automate the creation of your domain, website, and Google Ads, providing insightful analytics (coming soon), and streamlining your operations, so you can focus on strategic growth activities and customer satisfaction."
        }
    ];

    return (
        <div className="max-w-3xl mx-auto">
            {faqItems.map((item, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                    <CustomAccordion>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls={`panel${index}-content`}
                            id={`panel${index}-header`}
                        >
                            <Typography className="text-lg font-medium text-white">
                                {item.question}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography className="text-gray-300 leading-relaxed">
                                {item.answer}
                            </Typography>
                        </AccordionDetails>
                    </CustomAccordion>
                </motion.div>
            ))}
        </div>
    );
}