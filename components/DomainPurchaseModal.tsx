// components/DomainPurchaseModal.tsx
import React, { useContext } from 'react';
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
  alpha,
  Grid
} from '@mui/material';
import { Toaster, toast } from "react-hot-toast";
import LoadingButton from '@mui/lab/LoadingButton';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CloseIcon from '@mui/icons-material/Close';
import { useForm, Controller } from 'react-hook-form';
import mixpanel from "../utils/mixpanel-config";
import SBRContext from "../context/SBRContext";

interface DomainPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  domain: string;
  onSuccess: () => void;
}

interface FormInputs {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    background: theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.9)
      : alpha(theme.palette.background.paper, 0.95),
    backdropFilter: 'blur(10px)',
    maxWidth: 600,
  },
  '& .MuiDialogTitle-root': {
    padding: theme.spacing(3),
    background: theme.palette.mode === 'dark'
      ? alpha('#4caf50', 0.1)
      : alpha('#e8f5e8', 0.3),
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
      border: `1px solid ${alpha('#4caf50', 0.2)}`,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#4caf50',
      borderWidth: '1px'
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#4caf50',
      borderWidth: '0px'
    },
    '&.Mui-error .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.error.main,
      borderWidth: '1px'
    }
  },
  '& .MuiInputLabel-root': {
    '&.Mui-focused': {
      color: '#4caf50'
    }
  }
}));

const DomainPurchaseModal: React.FC<DomainPurchaseModalProps> = ({
  open,
  onClose,
  domain,
  onSuccess
}) => {
  const theme = useTheme();
  const [loading, setLoading] = React.useState(false);
  const [checkingAvailability, setCheckingAvailability] = React.useState(false);
  const [domainAvailable, setDomainAvailable] = React.useState<boolean | null>(null);
  const [availabilityChecked, setAvailabilityChecked] = React.useState(false);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormInputs>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    }
  });

  const context = useContext(SBRContext);
  if (!context) {
    throw new Error("SBRContext must be used within a SBRProvider");
  }
  const { dataUser } = context;

  // Check domain availability when modal opens
  React.useEffect(() => {
    if (open && domain) {
      checkDomainAvailability();
    }
  }, [open, domain]);

  // Pre-fill with user data if available
  React.useEffect(() => {
    if (open && dataUser?.email) {
      reset({
        email: dataUser.email,
        firstName: dataUser.name?.split(' ')[0] || '',
        lastName: dataUser.name?.split(' ').slice(1).join(' ') || '',
      });
    }
  }, [open, dataUser, reset]);

  const checkDomainAvailability = async () => {
    if (!domain) return;

    setCheckingAvailability(true);
    setAvailabilityChecked(false);
    setDomainAvailable(null);

    try {
      const response = await fetch(`/api/check-availability-godaddy?domain=${encodeURIComponent(domain)}`);
      const result = await response.json();

      if (response.ok) {
        setDomainAvailable(result.available);
        setAvailabilityChecked(true);
      } else {
        console.error('Failed to check domain availability:', result.error);
        setDomainAvailable(false);
        setAvailabilityChecked(true);
      }
    } catch (error) {
      console.error('Error checking domain availability:', error);
      setDomainAvailable(false);
      setAvailabilityChecked(true);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const onSubmit = async (data: FormInputs) => {
    try {
      setLoading(true);

      // Double-check domain availability before proceeding
      if (!domainAvailable) {
        throw new Error('Domain is not available for registration');
      }

      const registrationData = {
        domain,
        contactInfo: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          address: {
            address1: data.address1,
            city: data.city,
            state: data.state,
            postalCode: data.postalCode,
            country: data.country
          }
        }
      };

      const response = await fetch('/api/register-domain-godaddy', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Domain registration failed');
      }

      mixpanel.track("Domain Purchased", {
        domain: domain,
        userId: dataUser?.id || "anonymous",
        total: result.total
      });

      toast.success(
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          fontWeight: 500
        }}>
          <Typography variant="body1">🎉 Domain purchased successfully!</Typography>
          <Typography variant="body2" color="text.secondary">
            {domain} is now yours
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

      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Domain registration failed';

      mixpanel.track("Domain Purchase Failed", {
        domain: domain,
        userId: dataUser?.id || "anonymous",
        error: errorMessage
      });

      toast.error(
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1
        }}>
          <Typography variant="body1" color="error">
            Purchase failed:
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
        aria-labelledby="domain-purchase-modal-title"
        TransitionProps={{
          timeout: 300
        }}
      >
        <DialogTitle id="domain-purchase-modal-title">
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ShoppingCartIcon sx={{ color: '#4caf50' }} />
              <Box>
                <Typography variant="h5" component="h2" sx={{
                  fontWeight: 600,
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
                    : 'linear-gradient(45deg, #2e7d32, #4caf50)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent'
                }}>
                  Purchase {domain}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="h6" sx={{
                    color: '#4caf50',
                    fontWeight: 600,
                    fontSize: '1.1rem'
                  }}>
                    $12.99 USD / year
                  </Typography>
                  {checkingAvailability ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      Checking availability...
                    </Typography>
                  ) : availabilityChecked && domainAvailable !== null ? (
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: domainAvailable ? '#4caf50' : '#f44336',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      {domainAvailable ? '● Available' : '● Unavailable'}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            </Box>
            <Button
              onClick={onClose}
              disabled={loading}
              sx={{
                minWidth: 'auto',
                p: 1,
                color: 'text.secondary',
                '&:hover': {
                  color: '#4caf50',
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Complete your information to register this domain. Registration includes 1 year of ownership.
            </Typography>

            {/* Domain Availability Message */}
            {availabilityChecked && domainAvailable === false && (
              <Box sx={{
                p: 2,
                mb: 3,
                borderRadius: 2,
                background: alpha('#f44336', 0.1),
                border: `1px solid ${alpha('#f44336', 0.3)}`
              }}>
                <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 500 }}>
                  ❌ This domain is not available for registration. Please try a different domain name.
                </Typography>
              </Box>
            )}

            {/* Pricing Summary */}
            <Box sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              background: theme.palette.mode === 'dark'
                ? alpha('#4caf50', 0.1)
                : alpha('#e8f5e8', 0.5),
              border: `1px solid ${alpha('#4caf50', 0.3)}`
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#2e7d32', fontWeight: 600 }}>
                Order Summary
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body1">
                  Domain Registration ({domain})
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  $12.99 USD
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  1 Year Registration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Free Setup
                </Typography>
              </Box>

              <Box sx={{
                borderTop: `1px solid ${alpha('#4caf50', 0.3)}`,
                pt: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Total
                </Typography>
                <Typography variant="h6" sx={{
                  fontWeight: 700,
                  color: '#2e7d32'
                }}>
                  $12.99 USD
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="firstName"
                  control={control}
                  rules={{ required: false }}
                  render={({ field }) => (
                    <StyledTextField
                      {...field}
                      label="First Name"
                      fullWidth
                      error={!!errors.firstName}
                      helperText={errors.firstName?.message}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="lastName"
                  control={control}
                  rules={{ required: false }}
                  render={({ field }) => (
                    <StyledTextField
                      {...field}
                      label="Last Name"
                      fullWidth
                      error={!!errors.lastName}
                      helperText={errors.lastName?.message}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    required: false,
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Invalid email address'
                    }
                  }}
                  render={({ field }) => (
                    <StyledTextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="phone"
                  control={control}
                  rules={{ required: false }}
                  render={({ field }) => (
                    <StyledTextField
                      {...field}
                      label="Phone"
                      fullWidth
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="address1"
                  control={control}
                  rules={{ required: false }}
                  render={({ field }) => (
                    <StyledTextField
                      {...field}
                      label="Address"
                      fullWidth
                      error={!!errors.address1}
                      helperText={errors.address1?.message}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="city"
                  control={control}
                  rules={{ required: false }}
                  render={({ field }) => (
                    <StyledTextField
                      {...field}
                      label="City"
                      fullWidth
                      error={!!errors.city}
                      helperText={errors.city?.message}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="state"
                  control={control}
                  rules={{ required: false }}
                  render={({ field }) => (
                    <StyledTextField
                      {...field}
                      label="State"
                      fullWidth
                      error={!!errors.state}
                      helperText={errors.state?.message}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Controller
                  name="postalCode"
                  control={control}
                  rules={{ required: false }}
                  render={({ field }) => (
                    <StyledTextField
                      {...field}
                      label="Postal Code"
                      fullWidth
                      error={!!errors.postalCode}
                      helperText={errors.postalCode?.message}
                      disabled={loading}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="country"
                  control={control}
                  rules={{ required: false }}
                  render={({ field }) => (
                    <StyledTextField
                      {...field}
                      label="Country"
                      fullWidth
                      error={!!errors.country}
                      helperText={errors.country?.message}
                      disabled={loading}
                      defaultValue="US"
                    />
                  )}
                />
              </Grid>
            </Grid>
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
                borderColor: alpha('#4caf50', 0.5),
                color: '#4caf50',
                '&:hover': {
                  borderColor: '#4caf50',
                  background: alpha('#4caf50', 0.04)
                }
              }}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              endIcon={<ShoppingCartIcon />}
              loading={loading}
              loadingPosition="end"
              variant="contained"
              disabled={loading || checkingAvailability || domainAvailable === false}
              aria-label="Purchase domain"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(45deg, #4caf50, #66bb6a)'
                  : 'linear-gradient(45deg, #2e7d32, #4caf50)',
                '&:hover': {
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(45deg, #66bb6a, #4caf50)'
                    : 'linear-gradient(45deg, #1b5e20, #2e7d32)',
                }
              }}
            >
              <span>Purchase Domain</span>
            </LoadingButton>
          </DialogActions>
        </form>
      </StyledDialog>
    </>
  );
};

export default DomainPurchaseModal;
