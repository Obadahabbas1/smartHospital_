/**
 * Mapping of common disease names (English & Hindi) to hospital facilities/specialties.
 */
const diseaseMap = {
  // Cardiology
  'heart': ['Cardiology'],
  'dil': ['Cardiology'],
  'cardiac': ['Cardiology'],
  'chest pain': ['Cardiology', 'Emergency'],
  'heart attack': ['Cardiology', 'Emergency', 'ICU'],
  'blood pressure': ['Cardiology', 'OPD'],
  'bp': ['Cardiology', 'OPD'],

  // Neurology
  'brain': ['Neurology'],
  'dimag': ['Neurology'],
  'stroke': ['Neurology', 'Emergency', 'ICU'],
  'paralysis': ['Neurology', 'Physiotherapy'],
  'headache': ['Neurology', 'OPD'],

  // Orthopedics
  'bone': ['Orthopedics'],
  'haddi': ['Orthopedics'],
  'fracture': ['Orthopedics', 'Surgery', 'X-Ray'],
  'joint pain': ['Orthopedics', 'Physiotherapy'],
  'arthritis': ['Orthopedics', 'Physiotherapy'],
  'back pain': ['Orthopedics', 'Physiotherapy'],

  // Pediatrics
  'child': ['Pediatrics'],
  'bacha': ['Pediatrics'],
  'baby': ['Pediatrics'],
  'kids': ['Pediatrics'],
  'infant': ['Pediatrics'],

  // Maternity
  'pregnancy': ['Maternity', 'Ultrasound'],
  'delivery': ['Maternity', 'Surgery'],
  'delivery case': ['Maternity', 'Surgery'],
  'women health': ['Maternity', 'OPD'],

  // Oncology
  'cancer': ['Oncology'],
  'tumor': ['Oncology', 'Surgery', 'Imaging'],
  'chemo': ['Oncology'],

  // ENT
  'ear': ['ENT'],
  'nose': ['ENT'],
  'throat': ['ENT'],
  'kaan': ['ENT'],
  'naak': ['ENT'],
  'gala': ['ENT'],

  // Dental
  'dental': ['Dental'],
  'teeth': ['Dental'],
  'daant': ['Dental'],
  'toothache': ['Dental'],

  // General / OPD
  'fever': ['OPD'],
  'bukhaar': ['OPD'],
  'cough': ['OPD'],
  'sardi': ['OPD'],
  'cold': ['OPD'],
  'stomach pain': ['OPD', 'Ultrasound'],
  'pet dard': ['OPD'],

  // Emergency
  'accident': ['Emergency', 'Surgery', 'X-Ray'],
  'emergency': ['Emergency'],
  'icu': ['ICU'],

  // Diagnostic
  'mri': ['MRI', 'Imaging'],
  'ct scan': ['CT-Scan', 'Imaging'],
  'xray': ['X-Ray'],
  'ultrasound': ['Ultrasound'],
  'blood test': ['Lab'],
};

/**
 * Get facilities for a given disease name
 * @param {string} disease - Disease name
 * @returns {string[]} - Array of matching facilities
 */
export const getFacilitiesForDisease = (disease) => {
  if (!disease) return [];
  
  const normalized = disease.toLowerCase().trim();
  
  // Direct match
  if (diseaseMap[normalized]) {
    return diseaseMap[normalized];
  }

  // Partial match
  const matches = [];
  for (const [key, value] of Object.entries(diseaseMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      matches.push(...value);
    }
  }

  // Return unique matches
  return [...new Set(matches)];
};

export default diseaseMap;
