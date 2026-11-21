/**
 * Disease-to-Price mapping utility.
 * Provides realistic estimated treatment price ranges (INR) per disease/condition.
 * These are used when no actual Pricing record exists for a hospital.
 */

const diseasePricingMap = {
  // Cardiology
  'heart':        { min: 5000,   max: 150000, avg: 25000,  label: 'Heart Treatment' },
  'dil':          { min: 5000,   max: 150000, avg: 25000,  label: 'Heart Treatment' },
  'cardiac':      { min: 5000,   max: 150000, avg: 25000,  label: 'Cardiac Care' },
  'chest pain':   { min: 1500,   max: 25000,  avg: 5000,   label: 'Chest Pain Evaluation' },
  'heart attack': { min: 50000,  max: 500000, avg: 150000, label: 'Heart Attack Treatment' },
  'blood pressure': { min: 300,  max: 3000,   avg: 800,    label: 'BP Consultation' },
  'bp':           { min: 300,    max: 3000,   avg: 800,    label: 'BP Consultation' },

  // Neurology
  'brain':     { min: 5000,  max: 200000, avg: 30000,  label: 'Brain Treatment' },
  'dimag':     { min: 5000,  max: 200000, avg: 30000,  label: 'Brain Treatment' },
  'stroke':    { min: 30000, max: 400000, avg: 100000, label: 'Stroke Treatment' },
  'paralysis': { min: 10000, max: 200000, avg: 50000,  label: 'Paralysis Treatment' },
  'headache':  { min: 300,   max: 5000,   avg: 1000,   label: 'Headache Consultation' },

  // Orthopedics
  'bone':       { min: 3000,  max: 80000,  avg: 20000, label: 'Bone Treatment' },
  'haddi':      { min: 3000,  max: 80000,  avg: 20000, label: 'Bone Treatment' },
  'fracture':   { min: 5000,  max: 80000,  avg: 25000, label: 'Fracture Treatment' },
  'joint pain': { min: 1000,  max: 15000,  avg: 3000,  label: 'Joint Pain Treatment' },
  'arthritis':  { min: 1500,  max: 25000,  avg: 5000,  label: 'Arthritis Treatment' },
  'back pain':  { min: 1000,  max: 20000,  avg: 3000,  label: 'Back Pain Treatment' },

  // Pediatrics
  'child':  { min: 500,  max: 10000, avg: 2000, label: 'Child Care' },
  'bacha':  { min: 500,  max: 10000, avg: 2000, label: 'Child Care' },
  'baby':   { min: 500,  max: 10000, avg: 2000, label: 'Baby Care' },
  'kids':   { min: 500,  max: 10000, avg: 2000, label: 'Child Care' },
  'infant': { min: 500,  max: 15000, avg: 3000, label: 'Infant Care' },

  // Maternity
  'pregnancy':    { min: 15000, max: 100000, avg: 35000, label: 'Pregnancy Care' },
  'delivery':     { min: 15000, max: 120000, avg: 40000, label: 'Delivery' },
  'delivery case': { min: 15000, max: 120000, avg: 40000, label: 'Delivery' },
  'women health': { min: 500,   max: 10000,  avg: 2000,  label: 'Women Health Consultation' },

  // Oncology
  'cancer': { min: 50000,  max: 1000000, avg: 200000, label: 'Cancer Treatment' },
  'tumor':  { min: 30000,  max: 500000,  avg: 100000, label: 'Tumor Treatment' },
  'chemo':  { min: 20000,  max: 200000,  avg: 80000,  label: 'Chemotherapy' },

  // ENT
  'ear':       { min: 500,  max: 15000, avg: 3000, label: 'Ear Treatment' },
  'nose':      { min: 500,  max: 15000, avg: 3000, label: 'Nose Treatment' },
  'throat':    { min: 500,  max: 15000, avg: 3000, label: 'Throat Treatment' },
  'kaan':      { min: 500,  max: 15000, avg: 3000, label: 'Ear Treatment' },
  'naak':      { min: 500,  max: 15000, avg: 3000, label: 'Nose Treatment' },
  'gala':      { min: 500,  max: 15000, avg: 3000, label: 'Throat Treatment' },

  // Dental
  'dental':    { min: 500,  max: 30000, avg: 5000,  label: 'Dental Treatment' },
  'teeth':     { min: 500,  max: 30000, avg: 5000,  label: 'Dental Treatment' },
  'daant':     { min: 500,  max: 30000, avg: 5000,  label: 'Dental Treatment' },
  'toothache': { min: 300,  max: 5000,  avg: 1500,  label: 'Toothache Treatment' },

  // General / OPD
  'fever':        { min: 300,  max: 2000,  avg: 500,  label: 'Fever Consultation' },
  'bukhaar':      { min: 300,  max: 2000,  avg: 500,  label: 'Fever Consultation' },
  'cough':        { min: 300,  max: 2000,  avg: 500,  label: 'Cough Treatment' },
  'sardi':        { min: 300,  max: 2000,  avg: 500,  label: 'Cold Treatment' },
  'cold':         { min: 300,  max: 2000,  avg: 500,  label: 'Cold Treatment' },
  'stomach pain': { min: 500,  max: 5000,  avg: 1500, label: 'Stomach Treatment' },
  'pet dard':     { min: 500,  max: 5000,  avg: 1500, label: 'Stomach Treatment' },

  // Emergency
  'accident':  { min: 5000,  max: 200000, avg: 50000, label: 'Accident Treatment' },
  'emergency': { min: 3000,  max: 100000, avg: 20000, label: 'Emergency Care' },

  // Diagnostics
  'mri':        { min: 5000,  max: 15000, avg: 8000,  label: 'MRI Scan' },
  'ct scan':    { min: 3000,  max: 10000, avg: 5000,  label: 'CT Scan' },
  'xray':       { min: 300,   max: 2000,  avg: 800,   label: 'X-Ray' },
  'x-ray':      { min: 300,   max: 2000,  avg: 800,   label: 'X-Ray' },
  'ultrasound': { min: 800,   max: 3000,  avg: 1500,  label: 'Ultrasound' },
  'blood test': { min: 300,   max: 3000,  avg: 800,   label: 'Blood Test' },

  // Eye
  'eye':         { min: 500,   max: 50000,  avg: 10000, label: 'Eye Treatment' },
  'aankh':       { min: 500,   max: 50000,  avg: 10000, label: 'Eye Treatment' },
  'cataract':    { min: 15000, max: 60000,  avg: 25000, label: 'Cataract Surgery' },
  'lasik':       { min: 20000, max: 80000,  avg: 40000, label: 'LASIK Surgery' },

  // Skin
  'skin':      { min: 500,  max: 15000, avg: 3000, label: 'Skin Treatment' },
  'dermatology': { min: 500, max: 15000, avg: 3000, label: 'Dermatology' },

  // Kidney / Urology
  'kidney':   { min: 5000,   max: 300000, avg: 50000,  label: 'Kidney Treatment' },
  'dialysis': { min: 2000,   max: 5000,   avg: 3000,   label: 'Dialysis (per session)' },
  'urology':  { min: 3000,   max: 100000, avg: 20000,  label: 'Urology Treatment' },

  // Diabetes
  'diabetes':  { min: 500,  max: 5000, avg: 1500, label: 'Diabetes Consultation' },
  'sugar':     { min: 500,  max: 5000, avg: 1500, label: 'Diabetes Consultation' },
  'madhumeh':  { min: 500,  max: 5000, avg: 1500, label: 'Diabetes Consultation' },
};

/**
 * Get estimated price for a disease/condition.
 * @param {string} disease - Disease or condition name
 * @returns {{ min: number, max: number, avg: number, label: string } | null}
 */
export const getEstimatedPriceForDisease = (disease) => {
  if (!disease) return null;

  const normalized = disease.toLowerCase().trim();

  // Direct match
  if (diseasePricingMap[normalized]) {
    return { ...diseasePricingMap[normalized] };
  }

  // Partial match — pick the first match
  for (const [key, value] of Object.entries(diseasePricingMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { ...value };
    }
  }

  // Fallback: generic consultation price
  return { min: 300, max: 5000, avg: 1000, label: `${disease} Consultation` };
};

export default diseasePricingMap;
