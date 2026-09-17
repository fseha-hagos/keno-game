import { KycStatus, KycTier } from '@keno/shared-types';

export interface KycVerificationRequest {
  userId: string;
  tier: KycTier;
  idDocumentType?: string;
  metadata?: Record<string, any>;
}

export interface KycVerificationResult {
  verificationId: string;
  status: KycStatus;
  tier: KycTier;
  providerReference: string;
  details?: string;
}

export interface KycProvider {
  readonly providerName: string;
  createVerification(req: KycVerificationRequest): Promise<KycVerificationResult>;
  getVerificationStatus(verificationId: string): Promise<KycVerificationResult>;
  handleWebhook(payload: any, signature: string): Promise<KycVerificationResult>;
}
