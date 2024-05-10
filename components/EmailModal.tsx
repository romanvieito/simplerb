import React, { useEffect, useState } from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import MailService from '../utils/MailService';

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

    const nameTo = userauth.fullName;
    const emailTo = userauth.emailAddresses[0].emailAddress;
    const subject = `Feedback of simbrerB by ${userauth.fullName} ${userauth.emailAddresses[0].emailAddress}`;
    const content = textemail;

    const data = {
      nameTo,
      emailTo,
      subject,
      content
    };

    const response = await fetch('/api/mail-sendgrid', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.log(
        "Network response was not ok. Failed to set users domain favorite"
      );
    }

    const result = await response.json();

    console.log(result);

    try {      
      /*await mailService.sendEmail(
        'romanvieito@gmail.com',
        userauth.emailAddresses[0].emailAddress,
        'Feedback of simprebr',
        textemail,
        '<strong>Este es el contenido en HTML del correo.</strong>'
      );*/
    } catch (error) {
      console.error('No se pudo enviar el correo:', error);
      return;
    }
    onClose();
  };

  return (
    <Dialog 
        open={open} 
        onClose={onClose}
        fullWidth={true}
        maxWidth="md"            
    >
      <DialogTitle>Feedback</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id="email"
          label=""
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
