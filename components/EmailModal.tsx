import React, { useEffect, useContext } from 'react';
import { 
  Button, 
  TextField, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  Typography,
  Box,
  styled,
  useTheme,
  alpha
} from '@mui/material';
import { Toaster, toast } from "react-hot-toast";
import LoadingButton from '@mui/lab/LoadingButton';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { useForm, Controller } from 'react-hook-form';
import mixpanel from "../utils/mixpanel-config";
import { EmailModalProps } from "../utils/Definitions";
import SBRContext from "../context/SBRContext";

interface FormInputs {
  message: string;
}

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    background: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.background.paper, 0.9)
      : alpha(theme.palette.background.paper, 0.95),
    backdropFilter: 'blur(10px)',
  },
  '& .MuiDialogTitle-root': {
    padding: theme.spacing(3),
    background: theme.palette.mode === 'dark'
      ? alpha('#ef5350', 0.1)
      : alpha('#ffebee', 0.3),
  },
  '& .MuiDialogContent-root': {
    padding: theme.spacing(3),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(2, 3),
    background: theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.6)
      : alpha(theme.palette.background.paper, 0.8),
  }
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    transition: 'all 0.2s ease-in-out',
    '& .MuiOutlinedInput-notchedOutline': {
      border: `1px solid ${alpha('#ef5350', 0.2)}`,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#ef5350',
      borderWidth: '1px'
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#ef5350',
      borderWidth: '0px'
    },
    '&.Mui-error .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.error.main,
      borderWidth: '1px'
    }
  },
  '& .MuiInputLabel-root': {
    '&.Mui-focused': {
      color: '#ef5350'
    }
  }
}));

const EmailModal: React.FC<EmailModalProps> = ({ open, onClose, subjectType }) => {
  const theme = useTheme();
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
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          p: 1,
          fontWeight: 500
        }}>
          <Typography variant="body1">Message sent successfully!</Typography>
          <Typography variant="body2" color="text.secondary">
            Thank you for your feedback
          </Typography>
        </Box>,
        { 
          duration: 5000,
          style: {
            background: theme.palette.mode === 'dark' ? '#2D3748' : '#ffffff',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#1A202C',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }
        }
      );

      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
      
      mixpanel.track(`Send ${subjectType} by mail`, {
        status: 'error',
        message: errorMessage
      });

      toast.error(
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          p: 1
        }}>
          <Typography variant="body1" color="error">
            Failed to send email:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {errorMessage}
          </Typography>
        </Box>,
        { 
          duration: 5000,
          style: {
            background: theme.palette.mode === 'dark' ? '#2D3748' : '#ffffff',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#1A202C',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '8px',
            background: theme.palette.mode === 'dark' ? '#2D3748' : '#ffffff',
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#1A202C',
          },
        }}
      />
      <StyledDialog 
        open={open} 
        onClose={loading ? undefined : onClose}
        fullWidth
        maxWidth="md"
        aria-labelledby="email-modal-title"
        TransitionProps={{
          timeout: 300
        }}
      >
        <DialogTitle id="email-modal-title">
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between'
          }}>
            <Typography variant="h5" component="h2" sx={{ 
              fontWeight: 600,
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(45deg, #ef5350, #e57373)'
                : 'linear-gradient(45deg, #d32f2f, #ef5350)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent'
            }}>
              Your {subjectType}
            </Typography>
            <Button
              onClick={onClose}
              disabled={loading}
              sx={{ 
                minWidth: 'auto', 
                p: 1,
                color: 'text.secondary',
                '&:hover': {
                  color: '#ef5350',
                }
              }}
              aria-label="Close dialog"
            >
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>
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
                <StyledTextField
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              )}
            />
          </DialogContent>
          <DialogActions sx={{ 
            gap: 1,
            borderTop: 1,
            borderColor: 'divider'
          }}>
            <Button 
              onClick={onClose} 
              variant="outlined" 
              disabled={loading}
              aria-label="Cancel"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                borderColor: alpha('#ef5350', 0.5),
                color: '#ef5350',
                '&:hover': {
                  borderColor: '#ef5350',
                  background: alpha('#ef5350', 0.04)
                }
              }}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              endIcon={<SendIcon />}
              loading={loading}
              loadingPosition="end"
              variant="contained"
              disabled={loading}
              aria-label="Send message"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(45deg, #ef5350, #e57373)'
                  : 'linear-gradient(45deg, #d32f2f, #ef5350)',
                '&:hover': {
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(45deg, #e57373, #ef5350)'
                    : 'linear-gradient(45deg, #c62828, #d32f2f)',
                }
              }}
            >
              <span>Send</span>
            </LoadingButton>
          </DialogActions>
        </form>
      </StyledDialog>
    </>
  );
};

export default EmailModal;
