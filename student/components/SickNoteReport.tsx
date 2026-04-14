import React, { useState } from 'react';
import { SickNote } from '../../types';
import { Button } from '../../components/Button';

interface SickNoteReportProps {
  note: SickNote;
  onClose: () => void;
}

const SickNoteReport: React.FC<SickNoteReportProps> = ({ note, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    
    try {
      // Use html2pdf library for better PDF generation
      const element = document.getElementById('sicknote-content');
      if (!element) {
        throw new Error('Sick note content not found');
      }

      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Medical_Certificate_${note.certificateId}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try using the print option.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-white z-[1000] overflow-y-auto no-scrollbar print:static print:h-auto">
      {/* Loading Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-mPolyBlue/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-mPolyBlue border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-mPolyBlue mb-1">Generating Medical Certificate</p>
              <p className="text-sm text-neutral-500">Please wait while we create your document...</p>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 bg-slate-50 border-b border-neutral-200 px-6 py-4 flex justify-between items-center z-[1100] print:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-white border border-neutral-200 flex items-center justify-center text-mPolyBlue hover:bg-mPolyBlue hover:text-white transition-all"
            disabled={isGenerating}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Medical Certificate • ID: {note.certificateId}</span>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handlePrint} 
            className="bg-white border-2"
            disabled={isGenerating}
          >
            <i className="fa-solid fa-print mr-2"></i> Print
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownload} 
            className="bg-white border-2"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-2"></i> Generating...
              </>
            ) : (
              <>
                <i className="fa-solid fa-download mr-2"></i> Download PDF
              </>
            )}
          </Button>
          <Button 
            variant="primary" 
            onClick={onClose} 
            className="bg-mPolyBlue"
            disabled={isGenerating}
          >
            Close View
          </Button>
        </div>
      </div>

      <div id="sicknote-content" className="max-w-4xl mx-auto p-12 lg:p-24 print:p-0">
        <div className="border-[12px] border-mPolyBlue p-10 lg:p-16 relative">
          {/* Watermark Crest */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <img 
              src="https://i.ibb.co/B5GMcb9z/Gemini-Generated-Image-mmtbiymmtbiymmtb-removebg-preview.png" 
              className="w-[500px]" 
              alt="Watermark"
              crossOrigin="anonymous"
            />
          </div>

          <div className="relative z-10">
            <header className="flex flex-col items-center text-center border-b-2 border-slate-100 pb-10 mb-10">
              <img 
                src="https://i.ibb.co/B5GMcb9z/Gemini-Generated-Image-mmtbiymmtbiymmtb-removebg-preview.png" 
                className="w-32 mb-6" 
                alt="Logo"
                crossOrigin="anonymous"
              />
              <h1 className="text-4xl font-black uppercase text-mPolyBlue tracking-tighter leading-none">Masvingo Polytechnic</h1>
              <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-neutral-400 mt-2">Health Services Division</h2>
            </header>

            <div className="text-center space-y-4 mb-16">
               <h3 className="text-2xl font-black uppercase tracking-widest border-y-2 border-slate-900 py-3 inline-block px-10">Medical Excuse Certificate</h3>
               <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Certificate Number: {note.certificateId}</p>
            </div>

            <div className="space-y-8 text-lg font-medium leading-relaxed text-neutral-800">
               <p>This is to formally certify that <span className="font-black text-mPolyBlue underline decoration-mPolyYellow decoration-4 underline-offset-4">{note.studentName}</span>, Registration Number <span className="font-bold">{note.studentId}</span>, was attended to at the Masvingo Polytechnic Health Unit.</p>
               
               <p>Based on clinical evaluation, the student has been granted medical leave from <span className="font-black text-mPolyBlue">{new Date(note.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span> to <span className="font-black text-mPolyBlue">{new Date(note.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span> inclusive.</p>
               
               <p className="italic bg-slate-50 p-6 border-l-4 border-mPolyBlue">Diagnostic Remark: "{note.reason}"</p>

               <p>The student is expected to resume institutional academic duties on <span className="font-black underline">{new Date(new Date(note.endDate).getTime() + 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>.</p>
            </div>

            <div className="mt-24 grid grid-cols-2 gap-20">
               <div>
                  <div className="h-px bg-neutral-900 w-full mb-4"></div>
                  <p className="text-xs font-black uppercase text-mPolyBlue">{note.approvedBy}</p>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Medical Officer in Charge</p>
               </div>
               <div className="text-right">
                  <p className="text-xs font-black uppercase text-neutral-400 mb-2">Verification Digital Stamp</p>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=CERT-${note.certificateId}`} 
                    className="w-20 ml-auto border p-1" 
                    alt="QR Code"
                    crossOrigin="anonymous"
                  />
               </div>
            </div>

            <footer className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center">
               <p className="text-[9px] font-black uppercase tracking-widest text-neutral-300">Issued On: {note.dateIssued?.toDate?.()?.toLocaleDateString() || 'Recently'}</p>
               <p className="text-[9px] font-black uppercase tracking-widest text-neutral-300">Official Electronic Record</p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SickNoteReport;