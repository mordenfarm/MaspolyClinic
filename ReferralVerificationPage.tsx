import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './lib/firebase';
import { ClinicalRecord, ReferralLetter, SickNote } from './types';

interface ReferralVerificationPageProps {
  referralId?: string;
  documentType?: 'referral' | 'sickNote' | 'clinicalRecord';
  documentId?: string;
}

type VerifiedDocument =
  | { type: 'referral'; id: string; data: ReferralLetter }
  | { type: 'sickNote'; id: string; data: SickNote }
  | { type: 'clinicalRecord'; id: string; data: ClinicalRecord };

const documentConfig = {
  referral: {
    collection: 'referrals',
    loading: 'Checking referral record...',
    notFoundTitle: 'Referral Not Found',
    notFoundMessage: 'This QR code does not match an active referral letter in the Masvingo Polytechnic clinic registry.'
  },
  sickNote: {
    collection: 'sick_notes',
    loading: 'Checking medical excuse record...',
    notFoundTitle: 'Medical Excuse Not Found',
    notFoundMessage: 'This QR code does not match an active medical excuse certificate in the Masvingo Polytechnic clinic registry.'
  },
  clinicalRecord: {
    collection: 'clinical_records',
    loading: 'Checking clinical record...',
    notFoundTitle: 'Clinical Record Not Found',
    notFoundMessage: 'This QR code does not match an active clinical record in the Masvingo Polytechnic clinic registry.'
  }
};

const formatDate = (value: any) => {
  if (!value) return 'Verified';
  if (value.toDate) return value.toDate().toLocaleDateString('en-GB');
  return new Date(value).toLocaleDateString('en-GB');
};

const ReferralVerificationPage: React.FC<ReferralVerificationPageProps> = ({ referralId, documentType, documentId }) => {
  const resolvedType = documentType || 'referral';
  const resolvedId = documentId || referralId || '';
  const config = documentConfig[resolvedType];
  const [document, setDocument] = useState<VerifiedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const title = useMemo(() => {
    if (resolvedType === 'sickNote') return 'Medical Excuse Verification';
    if (resolvedType === 'clinicalRecord') return 'Clinical Record Verification';
    return 'Referral Verification';
  }, [resolvedType]);

  useEffect(() => {
    const loadDocument = async () => {
      if (!resolvedId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, config.collection, resolvedId));
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        setDocument({ type: resolvedType, id: snap.id, data: { id: snap.id, ...snap.data() } as any });
      } catch (error) {
        console.error(error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [config.collection, resolvedId, resolvedType]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-white shadow-2xl border-t-8 border-mPolyBlue p-8 lg:p-12">
        <header className="flex flex-col sm:flex-row sm:items-center gap-6 border-b border-neutral-100 pb-8 mb-8">
          <img
            src="https://i.ibb.co/B5GMcb9z/Gemini-Generated-Image-mmtbiymmtbiymmtb-removebg-preview.png"
            className="w-24"
            alt="Masvingo Polytechnic Logo"
            crossOrigin="anonymous"
          />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-mPolyGreen">{title}</p>
            <h1 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-mPolyBlue mt-2">Masvingo Polytechnic</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-1">Health Services Division</p>
          </div>
        </header>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-mPolyBlue border-t-mPolyYellow animate-spin mx-auto mb-6"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{config.loading}</p>
          </div>
        ) : notFound || !document ? (
          <div className="bg-red-50 border-l-8 border-red-600 p-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Not Verified</p>
            <h2 className="text-3xl font-black uppercase text-red-600 mt-2">{config.notFoundTitle}</h2>
            <p className="text-sm font-bold text-neutral-500 mt-4 leading-relaxed">
              {config.notFoundMessage}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-mPolyGreen/10 border-l-8 border-mPolyGreen p-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-mPolyGreen">Verified Electronic Document</p>
              <h2 className="text-3xl font-black uppercase text-mPolyBlue mt-2">This document is valid</h2>
              <p className="text-sm font-bold text-neutral-500 mt-4 leading-relaxed">
                This document was issued by Masvingo Polytechnic Health Services and matches an active clinic registry record.
              </p>
            </div>

            {document.type === 'referral' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Info label="Student Name" value={document.data.studentName} highlight />
                <Info label="Student Number" value={document.data.studentId} />
                <Info label="Diagnosis" value={document.data.diagnosis} highlight />
                <Info label="Recommended Specialist" value={document.data.recommendedSpecialist} />
              </div>
            )}

            {document.type === 'sickNote' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Info label="Student Name" value={document.data.studentName} highlight />
                <Info label="Student Number" value={document.data.studentId} />
                <Info label="Certificate Number" value={document.data.certificateId} highlight />
                <Info label="Approved By" value={document.data.approvedBy} />
                <Info label="Medical Leave Starts" value={new Date(document.data.startDate).toLocaleDateString('en-GB')} />
                <Info label="Medical Leave Ends" value={new Date(document.data.endDate).toLocaleDateString('en-GB')} />
              </div>
            )}

            {document.type === 'clinicalRecord' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Info label="Student Number" value={document.data.studentId} highlight />
                <Info label="Visit Date" value={formatDate(document.data.date)} />
                <Info label="Diagnosis" value={document.data.diagnosis} highlight />
                <Info label="Attending Officer" value={document.data.staffName} />
                <Info label="Disposition" value={document.data.disposition} />
                <Info label="Treatment" value={document.data.treatment} />
              </div>
            )}

            <div className="pt-8 border-t border-neutral-100 flex flex-col sm:flex-row justify-between gap-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
              <span>Reference: {document.id}</span>
              <span>Issued: {formatDate((document.data as any).createdAt || (document.data as any).dateIssued || (document.data as any).date)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Info: React.FC<{ label: string; value?: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="bg-slate-50 p-5 border border-neutral-100">
    <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">{label}</p>
    <p className={`text-lg font-black uppercase mt-1 ${highlight ? 'text-mPolyBlue' : 'text-neutral-900'}`}>{value || 'N/A'}</p>
  </div>
);

export default ReferralVerificationPage;
