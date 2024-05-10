import React, { useEffect, useState } from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Toaster, toast } from "react-hot-toast";

interface EmailModalProps {
  open: boolean;
  onClose: () => void;
  userauth: any
}

//const mailService = new MailService(process.env.SENDGRID_API_KEY ?? '');

const EmailModal: React.FC<EmailModalProps> = ({ open, onClose, userauth }) => {
  const [textemail, setTextEmail] = useState<string>('');
  
  useEffect(() => {
    if (open) {
      setTextEmail('');
    }
  }, [open]);

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTextEmail(event.target.value);
  };

  const handleSendEmail = async () => {
    if(textemail === '') {
      toast(
        (t) => (
          <div>
            <span>Please write us something</span>
          </div>
        ),
        {
          icon: "🔴",
          duration: 2500,
        }
      );      
      return;
    }
    const username = userauth.fullName;
    const useremail = userauth.emailAddresses[0].emailAddress;
    const subject = `Feedback`;
    const content = textemail;
    const data = {
      username,
      useremail,
      subject,
      content
    };
    const response = await fetch('/api/mail-mailtrap', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      toast(
        (t) => (
          <div>
            <span>Failed to send email</span>
          </div>
        ),
        {
          icon: "🔴",
          duration: 5000,
        }
      );
      return;         
    }

    const result = await response.json();

    toast(
      (t) => (
        <div>
          <span>{
            result.data ? 
            <>
              <p>Mail send successfully</p>
              <p>Thank you so much</p>
            </> : 
            <p>Fail send email</p>}
          </span>
        </div>
      ),
      {
        icon: result.data ? "🟢" : "🔴",
        duration: 5000,
      }
    );

    onClose();
  };

  return (
    <Dialog 
        open={open} 
        onClose={onClose}
        fullWidth={true}
        maxWidth="md"            
    >
      <DialogTitle>Your feedback</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="email"
          label="Tell us ..."
          type="email"
          fullWidth
          variant="standard"
          value={textemail}
          onChange={handleEmailChange}
          multiline
          rows={4}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSendEmail}>Send</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailModal;
