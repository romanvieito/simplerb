import React, { useEffect, useState, useContext } from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { Toaster, toast } from "react-hot-toast";
import LoadingButton from '@mui/lab/LoadingButton';
import SendIcon from '@mui/icons-material/Send';
import mixpanel from "../utils/mixpanel-config";
import { EmailModalProps } from "../utils/Definitions";
import SBRContext from "../context/SBRContext";

const EmailModal: React.FC<EmailModalProps> = ({ open, onClose, subjectType }) => {
  const [textemail, setTextEmail] = useState<string>('');
  const [loading, setLoading] = React.useState(false);

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { dataUser } = context;

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
    const username = dataUser.name;
    const useremail = dataUser.email;
    const subject = subjectType;
    const content = textemail;
    const data = {
      username,
      useremail,
      subject,
      content
    };
    setLoading(true);
    const response = await fetch('/api/mail-mailtrap', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    setLoading(false);  

    if (!response.ok) {
      mixpanel.track(`Send ${subjectType} by mail`, {
        message: "Response failed to send email",
      });
      toast(
        (t) => (
          <div>
            <span>Response failed to send email</span>
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

    mixpanel.track(`Send ${subjectType} by mail`, {
      message: result.data ? "Mail send successfully" : "Data failed to send email",
    });

    toast(
      (t) => (
        <div>
          <span>{
            result.data ? 
            <>
              <p>Mail send successfully</p>
              <p>Thank you so much</p>
            </> : 
            <p>Data Failed to send email</p>}
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
      <DialogTitle>Your {subjectType}</DialogTitle>
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
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <LoadingButton
          onClick={handleSendEmail}
          endIcon={<SendIcon />}
          loading={loading}
          loadingPosition="end"
          variant="outlined"
        >
          <span>Send</span>
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default EmailModal;
