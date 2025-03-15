import React, { useEffect, useState, useContext } from 'react';
import { Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle, CircularProgress } from '@mui/material';
import { Toaster, toast } from "react-hot-toast";
import LoadingButton from '@mui/lab/LoadingButton';
import SendIcon from '@mui/icons-material/Send';
import { useForm, Controller } from 'react-hook-form';
import mixpanel from "../utils/mixpanel-config";
import { EmailModalProps } from "../utils/Definitions";
import SBRContext from "../context/SBRContext";

interface FormInputs {
  message: string;
}

const EmailModal: React.FC<EmailModalProps> = ({ open, onClose, subjectType }) => {
  const [loading, setLoading] = React.useState(false);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormInputs>({
    defaultValues: {
      message: ''
    }
  });

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { dataUser } = context;

  useEffect(() => {
    if (open) {
      reset();
    }
    // Cleanup function
    return () => {
      reset();
    };
  }, [open, reset]);

  const onSubmit = async (data: FormInputs) => {
    try {
      setLoading(true);
      const emailData = {
        username: dataUser.name,
        useremail: dataUser.email,
        subject: subjectType,
        content: data.message
      };

      const response = await fetch('/api/mail-mailtrap', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email');
      }

      mixpanel.track(`Send ${subjectType} by mail`, {
        status: 'success',
        message: 'Mail sent successfully'
      });

      toast.success(
        <div>
          <p>Mail sent successfully</p>
          <p>Thank you for your feedback!</p>
        </div>,
        { duration: 5000 }
      );

      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
      
      mixpanel.track(`Send ${subjectType} by mail`, {
        status: 'error',
        message: errorMessage
      });

      toast.error(
        <div>
          <span>Failed to send email: {errorMessage}</span>
        </div>,
        { duration: 5000 }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <Dialog 
        open={open} 
        onClose={loading ? undefined : onClose}
        fullWidth={true}
        maxWidth="md"
        aria-labelledby="email-modal-title"
      >
        <DialogTitle id="email-modal-title">Your {subjectType}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Controller
              name="message"
              control={control}
              rules={{
                required: 'Please write your message',
                minLength: {
                  value: 10,
                  message: 'Message should be at least 10 characters long'
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  autoFocus
                  margin="dense"
                  label="Tell us ..."
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={4}
                  error={!!errors.message}
                  helperText={errors.message?.message}
                  disabled={loading}
                  aria-describedby="message-error"
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={onClose} 
              variant="outlined" 
              disabled={loading}
              aria-label="Cancel"
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              endIcon={<SendIcon />}
              loading={loading}
              loadingPosition="end"
              variant="contained"
              color="primary"
              disabled={loading}
              aria-label="Send message"
            >
              <span>Send</span>
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

export default EmailModal;
