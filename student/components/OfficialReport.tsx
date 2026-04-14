import React, { useState } from 'react';
import { ClinicalRecord, Patient } from '../../types';
import { Button } from '../../components/Button';

interface OfficialReportProps {
  record: ClinicalRecord;
  student: Patient;
  onClose: () => void;
}

const OfficialReport: React.FC<OfficialReportProps> = ({ record, student, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    
    try {
      // Use html2pdf library for better PDF generation
      const element = document.getElementById('report-content');
      if (!element) {
        throw new Error('Report content not found');
      }

      // Dynamically import html2pdf
      const html2pdf = (await import('html2pdf.js')).default;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Health_Report_${student.studentNumber}_${new Date().toISOString().split('T')[0]}.pdf`,
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

  const getVisitDate = () => {
    if (!record.date) return 'N/A';
    if (record.date.toDate) return record.date.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    return new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
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
              <p className="text-lg font-bold text-mPolyBlue mb-1">Generating PDF Report</p>
              <p className="text-sm text-neutral-500">Please wait while we create your document...</p>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 bg-slate-50 border-b border-neutral-200 px-6 py-4 flex justify-between items-center z-[1100] print:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-white shadow-sm border border-neutral-200 flex items-center justify-center text-mPolyBlue hover:bg-mPolyBlue hover:text-white transition-all"
            disabled={isGenerating}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Electronic Health Record • ID: {(record.id || '').substring(0,8).toUpperCase()}</span>
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

      <div id="report-content" className="max-w-4xl mx-auto p-8 lg:p-16 print:p-0 print:shadow-none print:border-none">
        <div className="flex justify-between items-start border-b-8 border-mPolyBlue pb-10 mb-12">
          <div className="flex gap-8 items-center">
            <img 
              src="https://i.ibb.co/B5GMcb9z/Gemini-Generated-Image-mmtbiymmtbiymmtb-removebg-preview.png" 
              className="w-24 lg:w-32" 
              alt="School Logo" 
              crossOrigin="anonymous"
            />
            <div className="space-y-1">
              <h1 className="text-3xl lg:text-4xl font-bold text-mPolyBlue tracking-tight leading-none">Masvingo Polytechnic</h1>
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Official Institutional Health Unit</h2>
              <p className="text-xs font-medium text-neutral-400 mt-2 italic">Reference: MP/HOSP/{new Date().getFullYear()}/{(record.id || '').substring(0,5).toUpperCase()}</p>
            </div>
          </div>
          <div className="text-right">
             <div className="bg-mPolyBlue text-white px-4 py-1 text-[10px] font-bold uppercase mb-4 inline-block tracking-widest">Confidential</div>
             <p className="text-[10px] font-bold uppercase text-neutral-300">Generated On</p>
             <p className="text-sm font-bold">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12 bg-slate-50 p-10 border-l-[12px] border-mPolyYellow shadow-sm print:shadow-none print:bg-slate-50">
           <div className="space-y-6">
              <div><p className="text-xs font-bold text-neutral-400 mb-1 uppercase tracking-tighter">Student Full Name</p><p className="text-lg font-bold text-mPolyBlue">{student.name} {student.surname}</p></div>
              <div><p className="text-xs font-bold text-neutral-400 mb-1 uppercase tracking-tighter">Registration Number</p><p className="text-lg font-bold">{student.studentNumber}</p></div>
              <div><p className="text-xs font-bold text-neutral-400 mb-1 uppercase tracking-tighter">Biographical Info</p><p className="text-sm font-semibold">{student.gender} • Born: {student.dob}</p></div>
           </div>
           <div className="space-y-6">
              <div><p className="text-xs font-bold text-neutral-400 mb-1 uppercase tracking-tighter">Academic Department</p><p className="text-lg font-bold">{student.course}</p></div>
              <div><p className="text-xs font-bold text-neutral-400 mb-1 uppercase tracking-tighter">Study Level</p><p className="text-lg font-bold text-mPolyGreen">{student.level}</p></div>
              <div><p className="text-xs font-bold text-neutral-400 mb-1 uppercase tracking-tighter">Primary Contact</p><p className="text-sm font-semibold">{student.phone}</p></div>
           </div>
        </div>

        <h3 className="text-xl font-bold text-mPolyBlue mb-6 tracking-tight border-b border-neutral-100 pb-2 uppercase">Clinical Vitals Assessment</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
           <div className="bg-white border-2 border-slate-100 p-6 text-center space-y-2 group">
              <i className="fa-solid fa-temperature-three-quarters text-blue-500 text-xl"></i>
              <p className="text-[10px] font-bold text-neutral-300 uppercase">Temperature</p>
              <p className="text-xl font-bold text-mPolyBlue">{record.vitals?.temp}°C</p>
              <div className="w-full h-1 bg-neutral-100 mt-2"><div className="bg-blue-500 h-full" style={{width: `${(record.vitals?.temp / 42) * 100}%`}}></div></div>
           </div>
           <div className="bg-white border-2 border-slate-100 p-6 text-center space-y-2 group">
              <i className="fa-solid fa-heart-pulse text-red-500 text-xl"></i>
              <p className="text-[10px] font-bold text-neutral-300 uppercase">Heart Rate</p>
              <p className="text-xl font-bold text-mPolyBlue">{record.vitals?.hr} bpm</p>
              <div className="w-full h-1 bg-neutral-100 mt-2"><div className="bg-red-500 h-full" style={{width: `${(record.vitals?.hr / 200) * 100}%`}}></div></div>
           </div>
           <div className="bg-white border-2 border-slate-100 p-6 text-center space-y-2 group">
              <i className="fa-solid fa-droplet text-indigo-500 text-xl"></i>
              <p className="text-[10px] font-bold text-neutral-300 uppercase">Blood Pressure</p>
              <p className="text-xl font-bold text-mPolyBlue">{record.vitals?.bpSys}/{record.vitals?.bpDia}</p>
              <p className="text-[9px] font-medium text-neutral-400 uppercase">SYS/DIA mmHg</p>
           </div>
           <div className="bg-white border-2 border-slate-100 p-6 text-center space-y-2 group">
              <i className="fa-solid fa-gauge-high text-orange-500 text-xl"></i>
              <p className="text-[10px] font-bold text-neutral-300 uppercase">Pain Level</p>
              <p className="text-xl font-bold text-mPolyBlue">{record.painLevel}/10</p>
              <div className="w-full h-1 bg-neutral-100 mt-2"><div className="bg-orange-500 h-full" style={{width: `${(record.painLevel / 10) * 100}%`}}></div></div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
           <div className="space-y-8">
              <div>
                 <p className="text-xs font-bold text-neutral-400 mb-2 uppercase">Symptoms Documented</p>
                 <div className="flex flex-wrap gap-2">
                    {record.symptoms?.map(s => <span key={s} className="px-3 py-1 bg-slate-100 text-xs font-semibold border border-neutral-200">{s}</span>)}
                    {(!record.symptoms || record.symptoms.length === 0) && <span className="text-sm italic text-neutral-400">Not specified</span>}
                 </div>
              </div>
              <div>
                 <p className="text-xs font-bold text-neutral-400 mb-2 uppercase">Affected Area</p>
                 <p className="text-sm font-bold text-mPolyBlue uppercase">📍 {record.affectedArea.charAt(0).toUpperCase() + record.affectedArea.slice(1).replace('_', ' ')}</p>
              </div>
              <div>
                 <p className="text-xs font-bold text-neutral-400 mb-2 uppercase">Clinical Diagnosis</p>
                 <p className="text-lg font-bold text-red-600 uppercase tracking-tighter">{record.diagnosis}</p>
              </div>
           </div>

           <div className="space-y-8">
              <div>
                 <p className="text-xs font-bold text-neutral-400 mb-2 uppercase">Prescribed Medications</p>
                 <div className="space-y-2">
                    {record.medications?.map((m, i) => (
                       <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <p className="text-sm font-bold text-mPolyGreen">{m.name}</p>
                          <p className="text-xs font-medium text-neutral-400">× {m.units} units</p>
                       </div>
                    ))}
                    {(!record.medications || record.medications.length === 0) && <p className="text-sm text-neutral-300 italic">No medications prescribed.</p>}
                 </div>
              </div>
              <div className="bg-mPolyBlue p-6 text-white border-l-[8px] border-mPolyYellow">
                 <p className="text-xs font-bold text-white/40 mb-2 uppercase tracking-widest">Final Disposition</p>
                 <p className="text-lg font-bold uppercase">{record.disposition}</p>
                 {record.dispositionDate && <p className="text-xs font-semibold mt-2 text-mPolyYellow">Follow-up: {new Date(record.dispositionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
              </div>
           </div>
        </div>

        <div className="bg-slate-50 p-10 mb-16 border-2 border-neutral-100 print:bg-slate-50">
           <p className="text-xs font-bold text-neutral-300 mb-4 uppercase tracking-widest">Clinical Observations & Directives</p>
           <p className="text-sm font-semibold text-neutral-700 leading-relaxed italic">
             "{record.notes || record.treatment || 'Patient presented with clinical symptoms as recorded. Observation maintained within institutional guidelines. Treatment directives explained and student acknowledged.'}"
           </p>
        </div>

        <div className="grid grid-cols-2 gap-20 pt-12 border-t-2 border-neutral-100">
           <div>
              <p className="text-xs font-bold text-neutral-300 mb-6 uppercase tracking-widest">Attending Officer Signature</p>
              <div className="h-1 bg-neutral-200 w-full mb-2"></div>
              <p className="text-sm font-bold text-mPolyBlue uppercase">{record.staffName}</p>
              <p className="text-[10px] font-medium text-neutral-400 uppercase">Authorized Registered Physician</p>
           </div>
           <div className="text-right">
              <p className="text-xs font-bold text-neutral-300 mb-4 uppercase tracking-widest">Verification QR</p>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=VERIFIED-EHUB-${record.id}`} 
                className="w-20 ml-auto border-2 p-1 border-neutral-100"
                crossOrigin="anonymous"
              />
           </div>
        </div>

        <footer className="mt-32 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-neutral-200 uppercase tracking-widest">
           <span>MasPoly Health Unit • v3.0</span>
           <span>Institutional Electronic Certification</span>
        </footer>
      </div>
    </div>
  );
};

export default OfficialReport;