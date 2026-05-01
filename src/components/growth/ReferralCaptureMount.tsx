import { useReferralCapture } from '@/hooks/useReferralCapture';

/** Tiny mount-point component so the capture hook runs once inside AuthProvider. */
export function ReferralCaptureMount() {
  useReferralCapture();
  return null;
}
