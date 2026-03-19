import { styled } from '@mui/material/styles';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Typography from '@mui/material/Typography';
import { motion } from 'framer-motion';

export default function CFAQ() {
  const CustomAccordion = styled(Accordion)(() => ({
    background: 'transparent',
    boxShadow: 'none',
    '&:before': {
      display: 'none',
    },
    '&.MuiAccordion-root:before': {
      display: 'none',
    },
    '& .MuiAccordionSummary-root': {
      borderBottom: '1px solid rgba(41, 37, 36, 0.12)',
      padding: '1rem 0',
      '&:hover': {
        backgroundColor: 'rgba(41, 37, 36, 0.03)',
      },
    },
    '& .MuiAccordionDetails-root': {
      borderTop: 'none',
      padding: '0 0 1.25rem 0',
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
        'SimplerB plans work, writes code and content, launches assets, promotes projects, and keeps iterating based on performance signals. The goal is continuous execution, not one-off assistance.',
    },
    {
      question: 'Is this just another AI copilot?',
      answer:
        'No. The positioning here is more ambitious: SimplerB is meant to operate like an autonomous layer for execution. Instead of only helping on command, it is designed to keep moving projects forward continuously.',
    },
    {
      question: 'Who is it for?',
      answer:
        'Founders, operators, and small teams who want to move faster without hiring a full stack of specialists for every new idea.',
    },
    {
      question: 'How does SimplerB improve over time?',
      answer:
        'It adapts to data, looks at outcomes, and uses those signals to refine what it builds, how it markets, and what it does next.',
    },
    {
      question: 'Can I still control what it does?',
      answer:
        'Yes. Autonomy does not mean losing control. You set the direction, priorities, and constraints. SimplerB handles execution inside that frame.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {faqItems.map((item, index) => (
        <motion.div
          key={item.question}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: index * 0.06 }}
        >
          <CustomAccordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`panel${index}-content`}
              id={`panel${index}-header`}
            >
              <Typography className="text-lg font-semibold text-stone-900">
                {item.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography className="text-lg leading-8 text-stone-700">
                {item.answer}
              </Typography>
            </AccordionDetails>
          </CustomAccordion>
        </motion.div>
      ))}
    </div>
  );
}
