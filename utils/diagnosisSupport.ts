import { Vitals } from '../types';

type DiagnosisRule = {
  name: string;
  keywords: string[];
  areas?: string[];
  redFlags?: ((vitals: Vitals, painLevel: number) => boolean)[];
};

export type DiagnosisSuggestion = {
  name: string;
  confidence: number;
};

const highFever = (vitals: Vitals) => vitals.temp >= 38;
const lowFever = (vitals: Vitals) => vitals.temp >= 37.5;
const tachy = (vitals: Vitals) => vitals.hr >= 100;
const hypertension = (vitals: Vitals) => vitals.bpSys >= 140 || vitals.bpDia >= 90;
const severePain = (_: Vitals, painLevel: number) => painLevel >= 7;

export const diagnosisRules: DiagnosisRule[] = [
  { name: 'Malaria', keywords: ['fever', 'chills', 'headache', 'vomiting', 'sweating', 'body pain'], redFlags: [highFever] },
  { name: 'Upper respiratory tract infection', keywords: ['coughing', 'cough', 'sore throat', 'runny nose', 'fever'], areas: ['head', 'chest'], redFlags: [lowFever] },
  { name: 'Influenza-like illness', keywords: ['fever', 'coughing', 'headache', 'body pain', 'sore throat'], redFlags: [highFever] },
  { name: 'COVID-like viral infection', keywords: ['coughing', 'fever', 'shortness of breath', 'sore throat', 'fatigue'], areas: ['chest'] },
  { name: 'Acute bronchitis', keywords: ['coughing', 'wheezing', 'chest pain', 'fever'], areas: ['chest'] },
  { name: 'Pneumonia', keywords: ['coughing', 'shortness of breath', 'chest pain', 'fever'], areas: ['chest'], redFlags: [highFever, tachy] },
  { name: 'Asthma exacerbation', keywords: ['wheezing', 'shortness of breath', 'chest tightness', 'coughing'], areas: ['chest'] },
  { name: 'Allergic rhinitis', keywords: ['sneezing', 'runny nose', 'itchy eyes', 'congestion'], areas: ['head'] },
  { name: 'Sinusitis', keywords: ['headache', 'facial pain', 'nasal congestion', 'fever'], areas: ['head'] },
  { name: 'Tonsillitis', keywords: ['sore throat', 'fever', 'difficulty swallowing'], areas: ['head'] },
  { name: 'Otitis media', keywords: ['ear pain', 'fever', 'dizziness'], areas: ['head'] },
  { name: 'Migraine', keywords: ['headache', 'blurred vision', 'nausea', 'dizziness'], areas: ['head'], redFlags: [severePain] },
  { name: 'Tension headache', keywords: ['headache', 'neck pain', 'stress'], areas: ['head'] },
  { name: 'Hypertensive headache', keywords: ['headache', 'blurred vision', 'dizziness'], areas: ['head'], redFlags: [hypertension] },
  { name: 'Meningitis warning', keywords: ['neck stiffness', 'fever', 'headache', 'vomiting'], areas: ['head'], redFlags: [highFever] },
  { name: 'Conjunctivitis', keywords: ['red eye', 'itchy eye', 'discharge', 'blurred vision'], areas: ['head'] },
  { name: 'Gastroenteritis', keywords: ['diarrhea', 'vomiting', 'nausea', 'stomach cramps', 'fever'], areas: ['abdomen'] },
  { name: 'Food poisoning', keywords: ['vomiting', 'diarrhea', 'stomach cramps', 'nausea'], areas: ['abdomen'] },
  { name: 'Gastritis', keywords: ['stomach pain', 'nausea', 'vomiting', 'bloating'], areas: ['abdomen'] },
  { name: 'Peptic ulcer disease', keywords: ['burning pain', 'stomach cramps', 'nausea'], areas: ['abdomen'] },
  { name: 'Constipation', keywords: ['bloating', 'abdominal pain', 'hard stool'], areas: ['abdomen'] },
  { name: 'Irritable bowel syndrome', keywords: ['bloating', 'diarrhea', 'stomach cramps', 'constipation'], areas: ['abdomen'] },
  { name: 'Appendicitis warning', keywords: ['right lower pain', 'vomiting', 'fever', 'stomach cramps'], areas: ['abdomen'], redFlags: [highFever, severePain] },
  { name: 'Urinary tract infection', keywords: ['burning urine', 'frequent urination', 'lower abdominal pain', 'fever'], areas: ['abdomen'] },
  { name: 'Kidney infection warning', keywords: ['flank pain', 'fever', 'burning urine', 'vomiting'], areas: ['abdomen'], redFlags: [highFever] },
  { name: 'Dehydration', keywords: ['dizziness', 'vomiting', 'diarrhea', 'weakness'], redFlags: [tachy] },
  { name: 'Anaemia', keywords: ['dizziness', 'fatigue', 'palpitations', 'shortness of breath'], areas: ['chest', 'head'] },
  { name: 'Anxiety episode', keywords: ['palpitations', 'shortness of breath', 'chest pain', 'dizziness'], areas: ['chest'] },
  { name: 'Panic attack', keywords: ['palpitations', 'shortness of breath', 'chest pain', 'sweating', 'fear'], areas: ['chest'] },
  { name: 'Musculoskeletal chest pain', keywords: ['chest pain', 'tenderness', 'movement pain'], areas: ['chest'] },
  { name: 'Cardiac chest pain warning', keywords: ['chest pain', 'shortness of breath', 'sweating', 'left arm pain'], areas: ['chest', 'left_arm'], redFlags: [severePain] },
  { name: 'Palpitations under evaluation', keywords: ['palpitations', 'dizziness', 'chest pain'], areas: ['chest'], redFlags: [tachy] },
  { name: 'Soft tissue injury', keywords: ['swelling', 'pain', 'bruise', 'laceration'], areas: ['left_arm', 'right_arm', 'left_leg', 'right_leg'] },
  { name: 'Sprain or strain', keywords: ['pain', 'swelling', 'stiffness', 'movement pain'], areas: ['left_arm', 'right_arm', 'left_leg', 'right_leg', 'left_hand', 'right_hand'] },
  { name: 'Fracture warning', keywords: ['fracture', 'severe pain', 'swelling', 'deformity'], areas: ['left_arm', 'right_arm', 'left_leg', 'right_leg', 'left_hand', 'right_hand'], redFlags: [severePain] },
  { name: 'Cellulitis', keywords: ['swelling', 'redness', 'warmth', 'fever'], areas: ['left_arm', 'right_arm', 'left_leg', 'right_leg'], redFlags: [lowFever] },
  { name: 'Abscess', keywords: ['swelling', 'pain', 'pus', 'redness'], redFlags: [lowFever] },
  { name: 'Burn injury', keywords: ['burn', 'blister', 'pain'], areas: ['left_hand', 'right_hand', 'left_arm', 'right_arm'] },
  { name: 'Laceration', keywords: ['laceration', 'bleeding', 'cut'], areas: ['left_arm', 'right_arm', 'left_hand', 'right_hand'] },
  { name: 'Peripheral neuropathy', keywords: ['numbness', 'tingling', 'burning pain'], areas: ['left_arm', 'right_arm', 'left_leg', 'right_leg'] },
  { name: 'Sciatica', keywords: ['leg pain', 'numbness', 'back pain'], areas: ['left_leg', 'right_leg'] },
  { name: 'Deep vein thrombosis warning', keywords: ['leg swelling', 'leg pain', 'calf pain'], areas: ['left_leg', 'right_leg'] },
  { name: 'Dental caries', keywords: ['tooth pain', 'dental pain', 'sensitivity'], areas: ['head'] },
  { name: 'Dental abscess', keywords: ['tooth pain', 'swelling', 'fever'], areas: ['head'], redFlags: [lowFever] },
  { name: 'Gingivitis', keywords: ['gum bleeding', 'gum pain', 'bad breath'], areas: ['head'] },
  { name: 'Dysmenorrhea', keywords: ['period pain', 'lower abdominal pain', 'cramps'], areas: ['abdomen'] },
  { name: 'Vaginal candidiasis', keywords: ['itching', 'discharge', 'burning'], areas: ['abdomen'] },
  { name: 'Sexually transmitted infection', keywords: ['discharge', 'burning urine', 'genital sore', 'pelvic pain'], areas: ['abdomen'] },
  { name: 'Pelvic inflammatory disease warning', keywords: ['pelvic pain', 'fever', 'discharge'], areas: ['abdomen'], redFlags: [highFever] },
  { name: 'Pregnancy-related nausea', keywords: ['nausea', 'vomiting', 'missed period'], areas: ['abdomen'] },
  { name: 'Hypoglycaemia', keywords: ['dizziness', 'sweating', 'weakness', 'confusion'] },
  { name: 'Heat exhaustion', keywords: ['dizziness', 'sweating', 'weakness', 'headache'], redFlags: [tachy] },
  { name: 'Allergic reaction', keywords: ['rash', 'itching', 'swelling', 'wheezing'] },
  { name: 'Anaphylaxis warning', keywords: ['wheezing', 'swelling', 'shortness of breath', 'rash'], areas: ['chest'], redFlags: [tachy] },
  { name: 'Dermatitis', keywords: ['rash', 'itching', 'redness'] },
  { name: 'Scabies', keywords: ['itching', 'rash', 'night itching'] },
  { name: 'Fungal skin infection', keywords: ['itching', 'rash', 'scaly'] },
  { name: 'Acne vulgaris', keywords: ['acne', 'pimples', 'face rash'], areas: ['head'] },
  { name: 'Epistaxis', keywords: ['nose bleed', 'bleeding nose'], areas: ['head'] },
  { name: 'Vertigo', keywords: ['dizziness', 'spinning', 'nausea'], areas: ['head'] },
  { name: 'Motion sickness', keywords: ['nausea', 'vomiting', 'dizziness'] },
  { name: 'Medication side effect', keywords: ['nausea', 'dizziness', 'rash', 'vomiting'] },
  { name: 'Alcohol-related gastritis', keywords: ['vomiting', 'stomach pain', 'nausea', 'alcohol'], areas: ['abdomen'] },
  { name: 'Substance intoxication warning', keywords: ['confusion', 'vomiting', 'dizziness', 'agitation'] },
  { name: 'Depressive episode', keywords: ['sadness', 'hopeless', 'sleep problems', 'fatigue'] },
  { name: 'Suicide risk warning', keywords: ['suicidal', 'self harm', 'hopeless', 'overdose'] },
  { name: 'Acute stress reaction', keywords: ['stress', 'panic', 'palpitations', 'insomnia'] },
  { name: 'Insomnia', keywords: ['sleep problems', 'fatigue', 'headache'] },
  { name: 'Back strain', keywords: ['back pain', 'stiffness', 'movement pain'] },
  { name: 'Neck strain', keywords: ['neck pain', 'neck stiffness', 'headache'], areas: ['head'] },
  { name: 'Epileptic seizure follow-up', keywords: ['seizure', 'confusion', 'tongue bite'] },
  { name: 'Fainting episode', keywords: ['fainting', 'dizziness', 'weakness'] },
  { name: 'Tonsillar abscess warning', keywords: ['sore throat', 'difficulty swallowing', 'fever'], areas: ['head'], redFlags: [highFever] },
  { name: 'Laryngitis', keywords: ['hoarse voice', 'sore throat', 'coughing'], areas: ['head'] },
  { name: 'Oral ulcers', keywords: ['mouth sore', 'painful ulcer'], areas: ['head'] },
  { name: 'Chickenpox', keywords: ['rash', 'fever', 'blisters'] },
  { name: 'Measles warning', keywords: ['fever', 'rash', 'coughing', 'red eye'] },
  { name: 'Typhoid fever', keywords: ['fever', 'abdominal pain', 'diarrhea', 'headache'], areas: ['abdomen'], redFlags: [highFever] },
  { name: 'Schistosomiasis consideration', keywords: ['blood urine', 'abdominal pain', 'fatigue'], areas: ['abdomen'] },
  { name: 'Worm infestation', keywords: ['abdominal pain', 'bloating', 'weight loss'], areas: ['abdomen'] },
  { name: 'Hepatitis warning', keywords: ['jaundice', 'nausea', 'abdominal pain', 'fatigue'], areas: ['abdomen'] },
  { name: 'Renal colic warning', keywords: ['flank pain', 'severe pain', 'vomiting'], areas: ['abdomen'], redFlags: [severePain] },
  { name: 'Traumatic head injury warning', keywords: ['headache', 'vomiting', 'confusion', 'dizziness'], areas: ['head'] },
  { name: 'Eye strain', keywords: ['headache', 'blurred vision', 'eye pain'], areas: ['head'] },
  { name: 'Tinea pedis', keywords: ['foot itching', 'rash', 'scaly'], areas: ['left_leg', 'right_leg'] },
  { name: 'Ingrown toenail', keywords: ['toe pain', 'swelling', 'redness'], areas: ['left_leg', 'right_leg'] },
  { name: 'Plantar fasciitis', keywords: ['heel pain', 'foot pain'], areas: ['left_leg', 'right_leg'] },
  { name: 'Tendonitis', keywords: ['pain', 'stiffness', 'movement pain'], areas: ['left_arm', 'right_arm', 'left_leg', 'right_leg'] },
  { name: 'Carpal tunnel syndrome', keywords: ['numbness', 'tingling', 'hand pain'], areas: ['left_hand', 'right_hand'] },
  { name: 'Rib injury', keywords: ['chest pain', 'movement pain', 'trauma'], areas: ['chest'] },
  { name: 'Gastro-oesophageal reflux', keywords: ['burning chest', 'sour taste', 'nausea'], areas: ['chest', 'abdomen'] },
  { name: 'Acute tonsillopharyngitis', keywords: ['sore throat', 'fever', 'headache'], areas: ['head'] },
  { name: 'Viral exanthem', keywords: ['rash', 'fever', 'itching'] },
  { name: 'Impetigo', keywords: ['rash', 'blister', 'crust'] },
  { name: 'Wound infection', keywords: ['laceration', 'redness', 'pus', 'fever'], redFlags: [lowFever] },
  { name: 'Sepsis warning', keywords: ['fever', 'confusion', 'weakness', 'shortness of breath'], redFlags: [highFever, tachy] },
  { name: 'Clinical review required', keywords: ['pain', 'fever', 'dizziness', 'weakness'] }
];

export function getDiagnosisSuggestions(input: {
  selectedSymptoms: string[];
  freeText?: string;
  selectedArea: string;
  vitals: Vitals;
  painLevel: number;
}): DiagnosisSuggestion[] {
  const terms = `${input.selectedSymptoms.join(' ')} ${input.freeText || ''}`.toLowerCase();

  return diagnosisRules
    .map((rule) => {
      let score = 0;
      rule.keywords.forEach((keyword) => {
        if (terms.includes(keyword.toLowerCase())) score += 18;
      });
      if (rule.areas?.includes(input.selectedArea)) score += 12;
      rule.redFlags?.forEach((flag) => {
        if (flag(input.vitals, input.painLevel)) score += 10;
      });
      if (score === 0 && rule.name === 'Clinical review required') score = 25;
      return { name: rule.name, confidence: Math.min(96, Math.max(35, score)) };
    })
    .filter((item) => item.confidence >= 35)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
