import { styled } from '@mui/material/styles';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Typography from '@mui/material/Typography';
import { motion } from 'framer-motion';

export default function CFAQ() {
  const CustomAccordion = styled(Accordion)(() => ({
    background: '#ffffff',
    boxShadow: 'none',
    border: '1px solid rgba(41, 37, 36, 0.10)',
    borderRadius: '24px',
    overflow: 'hidden',
    marginBottom: '14px',
    '&:before': {
      display: 'none',
    },
    '&.MuiAccordion-root:before': {
      display: 'none',
    },
    '& .MuiAccordionSummary-root': {
      minHeight: 'unset',
      padding: '1.1rem 1.4rem',
      '&:hover': {
        backgroundColor: 'rgba(41, 37, 36, 0.02)',
      },
    },
    '& .MuiAccordionSummary-content': {
      margin: 0,
    },
    '& .MuiAccordionDetails-root': {
      borderTop: '1px solid rgba(41, 37, 36, 0.08)',
      padding: '1.15rem 1.4rem 1.35rem',
    },
    '& .MuiSvgIcon-root': {
      color: '#1f6f43',
    },
  }));

  const faqItems = [
    {
      question: 'What is SimplerB?',
      answer:
        'SimplerB is AI that runs your company while you sleep. It thinks, builds, and markets your projects autonomously so progress does not stop when you step away.',
    },
    {
      question: 'What does it actually do?',
      answer:
        'It plans work, writes code and content, launches assets, promotes projects, and keeps iterating based on performance signals. The goal is continuous execution, not one-off assistance.',
    },
    {
      question: 'Is this just another AI copilot?',
      answer:
        'No. The whole point is to move beyond an assistant that waits for instructions all day. SimplerB is meant to keep projects moving forward continuously.',
    },
    {
      question: 'Who is it for?',
      answer:
        'Founders, operators, and small teams who want to move faster without hiring a full stack of specialists for every new idea.',
    },
    {
      question: 'How does SimplerB improve over time?',
      answer:
        'It adapts to data, looks at outcomes, and uses those signals to refine what it builds, how it markets, and what it should do next.',
    },
    {
      question: 'Can I still control what it does?',
      answer:
        'Yes. You set the direction, priorities, and constraints. SimplerB handles execution inside that frame.',
    },
  ];

  return (
    <div className="max-w-4xl">
      {faqItems.map((item, index) => (
        <motion.div
          key={item.question}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: index * 0.04 }}
        >
          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`panel${index}-content`}
              id={`panel${index}-header`}
            >
              <Typography className="pr-4 text-xl font-black leading-8 text-stone-900">
                {item.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography className="max-w-3xl text-lg leading-8 text-stone-700">
                {item.answer}
              </Typography>
            </AccordionDetails>
          </CustomAccordion>
        </motion.div>
      ))}
    </div>
  );
}
