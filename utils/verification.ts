type VerificationDocumentType = 'referral' | 'sickNote' | 'clinicalRecord';

const verificationParams: Record<VerificationDocumentType, string> = {
  referral: 'verifyReferral',
  sickNote: 'verifySickNote',
  clinicalRecord: 'verifyRecord'
};

export const buildVerificationUrl = (type: VerificationDocumentType, id?: string) => {
  const encodedId = encodeURIComponent(id || '');
  const param = verificationParams[type];

  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/?${param}=${encodedId}`;
  }

  return `https://maspoly-clinic.netlify.app/?${param}=${encodedId}`;
};
