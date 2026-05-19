import React, { useEffect, useMemo, useState } from 'react';
import { ReferralLetter } from '../../types';
import { Button } from '../../components/Button';
import QRCode from 'qrcode';
import { buildVerificationUrl } from '../../utils/verification';

interface ReferralReportProps {
  referral: ReferralLetter;
  onClose: () => void;
}

const ReferralReport: React.FC<ReferralReportProps> = ({ referral, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const verificationUrl = useMemo(() => {
    return buildVerificationUrl('referral', referral.id);
  }, [referral.id]);

  useEffect(() => {
    if (!referral.id) return;
    QRCode.toDataURL(verificationUrl, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#163959', light: '#FFFFFF' }
    }).then(setQrDataUrl).catch((error: any) => {
      console.error('Failed to generate referral QR:', error);
    });
  }, [referral.id, verificationUrl]);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('referral-content');
      if (!element) throw new Error('Referral content not found');
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `Referral_${referral.studentId}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(element).save();
    } catch (error) {
      console.error(error);
      alert('Failed to generate referral PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[1000] overflow-y-auto no-scrollbar print:static">
      <div className="sticky top-0 bg-slate-50 border-b border-neutral-200 px-6 py-4 flex justify-between items-center z-[1100] print:hidden">
        <button onClick={onClose} className="w-10 h-10 bg-white border border-neutral-200 flex items-center justify-center text-mPolyBlue hover:bg-mPolyBlue hover:text-white transition-all">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()} className="bg-white border-2"><i className="fa-solid fa-print mr-2"></i> Print</Button>
          <Button variant="outline" onClick={handleDownload} disabled={isGenerating} className="bg-white border-2">
            {isGenerating ? 'Generating...' : <><i className="fa-solid fa-download mr-2"></i> Download PDF</>}
          </Button>
          <Button variant="primary" onClick={onClose} className="bg-mPolyBlue">Close View</Button>
        </div>
      </div>

      <div id="referral-content" className="max-w-4xl mx-auto p-12 lg:p-20">
        <header className="flex justify-between items-start border-b-8 border-mPolyBlue pb-10 mb-12">
          <div className="flex gap-8 items-center">
            <img src="https://i.ibb.co/B5GMcb9z/Gemini-Generated-Image-mmtbiymmtbiymmtb-removebg-preview.png" className="w-28" alt="School Logo" crossOrigin="anonymous" />
            <div>
              <h1 className="text-4xl font-black text-mPolyBlue uppercase tracking-tighter">Masvingo Polytechnic</h1>
              <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Health Services Division</p>
              <p className="text-xs font-bold text-neutral-400 mt-3">Reference: MP/REF/{new Date().getFullYear()}/{(referral.id || '').substring(0, 6).toUpperCase()}</p>
            </div>
          </div>
          <div className="text-right">
            {qrDataUrl ? (
              <img src={qrDataUrl} className="w-28 border p-1 bg-white" alt="Referral verification QR" />
            ) : (
              <div className="w-28 h-28 border p-2 bg-slate-50 flex items-center justify-center text-[8px] font-black uppercase text-neutral-400">QR loading</div>
            )}
            <p className="text-[8px] font-black uppercase text-neutral-400 mt-2">Scan to verify</p>
          </div>
        </header>

        <div className="mb-12">
          <p className="text-sm font-bold text-neutral-500 uppercase">To: {referral.recommendedSpecialist}</p>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-neutral-900 mt-4">Clinical Referral Letter</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase mt-2">Issued: {referral.createdAt?.toDate?.()?.toLocaleDateString('en-GB') || new Date().toLocaleDateString('en-GB')}</p>
        </div>

        <div className="space-y-8 text-base leading-relaxed text-neutral-800">
          <p>
            This letter formally refers <strong className="text-mPolyBlue">{referral.studentName}</strong>, registration number <strong>{referral.studentId}</strong>, for specialist medical evaluation.
          </p>
          <div className="bg-slate-50 border-l-8 border-mPolyYellow p-8">
            <p className="text-xs font-black uppercase text-neutral-400 mb-2">Clinic Diagnosis</p>
            <p className="text-2xl font-black text-mPolyBlue uppercase">{referral.diagnosis}</p>
          </div>
          <p>{referral.clinicalSummary}</p>
          <p>{referral.reason}</p>
          <p>
            The clinic requests further assessment, confirmation of diagnosis where necessary, and management recommendations from a suitably qualified professional.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-20 mt-24 pt-12 border-t-2 border-neutral-100">
          <div>
            <div className="h-px bg-neutral-900 w-full mb-4"></div>
            <p className="text-sm font-black uppercase text-mPolyBlue">{referral.doctorName}</p>
            <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest">Referring Medical Officer</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Verified Electronic Document</p>
            <p className="text-[9px] font-bold text-neutral-300 break-all mt-2">{verificationUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralReport;
