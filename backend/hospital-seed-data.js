// 100% Validated Seed Data based on Hospital Model Enums
// Facilities Allowed: 'Emergency', 'ICU', 'OPD', 'Lab', 'Imaging', 'Surgery', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Maternity', 'Oncology', 'Psychiatry', 'Urology', 'ENT', 'Dental', 'Physiotherapy', 'Dialysis', 'MRI', 'CT-Scan', 'Ultrasound', 'X-Ray'

const hospitalSeedData = [
  // ===== CHANDIGARH (5 Hospitals) =====
  {
    "name": "PGIMER Chandigarh",
    "slug": "pgi-chandigarh",
    "email": "info@pgimer.edu.in",
    "phone": "1722747585",
    "address": { "street": "Sector 12", "city": "Chandigarh", "state": "Chandigarh", "zipCode": "160012", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7751, 30.7671] },
    "facilities": ["Emergency", "ICU", "Cardiology", "Orthopedics", "Maternity", "OPD", "Imaging"],
    "rating": { "average": 4.8, "totalReviews": 2500 }, "averageCost": 500, "isActive": true, "isVerified": true
  },
  {
    "name": "Government Medical College & Hospital (GMCH-32)",
    "slug": "gmch-32-chandigarh",
    "email": "contact@gmch.gov.in",
    "phone": "1722601023",
    "address": { "street": "Sector 32", "city": "Chandigarh", "state": "Chandigarh", "zipCode": "160030", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7681, 30.7061] },
    "facilities": ["Emergency", "ICU", "OPD", "Maternity", "Orthopedics", "Lab"],
    "rating": { "average": 4.2, "totalReviews": 1200 }, "averageCost": 300, "isActive": true, "isVerified": true
  },
  {
    "name": "Healing Hospital Chandigarh",
    "slug": "healing-hospital",
    "email": "info@healinghospital.com",
    "phone": "1725031111",
    "address": { "street": "SCO 18-19, Sector 34A", "city": "Chandigarh", "state": "Chandigarh", "zipCode": "160022", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7701, 30.7225] },
    "facilities": ["Emergency", "ICU", "Cardiology", "Maternity", "OPD"],
    "rating": { "average": 4.5, "totalReviews": 850 }, "averageCost": 2500, "isActive": true, "isVerified": true
  },
  {
    "name": "Mukat Hospital & Heart Institute",
    "slug": "mukat-hospital",
    "email": "info@mukathospital.com",
    "phone": "1724344444",
    "address": { "street": "Sector 34", "city": "Chandigarh", "state": "Chandigarh", "zipCode": "160034", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7715, 30.7210] },
    "facilities": ["Emergency", "Cardiology", "Surgery", "ICU"],
    "rating": { "average": 4.3, "totalReviews": 620 }, "averageCost": 3500, "isActive": true, "isVerified": true
  },
  {
    "name": "Cloudnine Hospital Chandigarh",
    "slug": "cloudnine-chandigarh",
    "email": "info@cloudnine.com",
    "phone": "1724000000",
    "address": { "street": "Industrial Area Phase 2", "city": "Chandigarh", "state": "Chandigarh", "zipCode": "160002", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7865, 30.7020] },
    "facilities": ["Maternity", "Pediatrics", "Emergency", "OPD"],
    "rating": { "average": 4.7, "totalReviews": 410 }, "averageCost": 8000, "isActive": true, "isVerified": true
  },

  // ===== MOHALI (5 Hospitals) =====
  {
    "name": "Fortis Hospital Mohali",
    "slug": "fortis-mohali",
    "email": "contact@fortis-mohali.com",
    "phone": "1724692222",
    "address": { "street": "Sector 62, Phase 8", "city": "Mohali", "state": "Punjab", "zipCode": "160062", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7328, 30.6787] },
    "facilities": ["Emergency", "ICU", "Cardiology", "Orthopedics", "Neurology"],
    "rating": { "average": 4.7, "totalReviews": 3500 }, "averageCost": 5000, "isActive": true, "isVerified": true
  },
  {
    "name": "Max Super Speciality Hospital Mohali",
    "slug": "max-mohali",
    "email": "info@maxhealth.mohali.com",
    "phone": "1725212000",
    "address": { "street": "Near Civil Hospital, Phase 6", "city": "Mohali", "state": "Punjab", "zipCode": "160055", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7001, 30.7258] },
    "facilities": ["Emergency", "Oncology", "Cardiology", "Maternity", "ICU"],
    "rating": { "average": 4.5, "totalReviews": 2800 }, "averageCost": 4500, "isActive": true, "isVerified": true
  },
  {
    "name": "Ivy Hospital Mohali",
    "slug": "ivy-mohali",
    "email": "info@ivyhospital.mohali.com",
    "phone": "1725044333",
    "address": { "street": "Sector 71", "city": "Mohali", "state": "Punjab", "zipCode": "160071", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7112, 30.7067] },
    "facilities": ["Emergency", "Orthopedics", "Cardiology", "OPD", "Lab"],
    "rating": { "average": 4.2, "totalReviews": 1500 }, "averageCost": 3000, "isActive": true, "isVerified": true
  },
  {
    "name": "Indus Hospital Mohali",
    "slug": "indus-mohali",
    "email": "contact@indushospital.mohali.in",
    "phone": "1724000300",
    "address": { "street": "Phase 1", "city": "Mohali", "state": "Punjab", "zipCode": "160055", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7180, 30.7200] },
    "facilities": ["OPD", "ICU", "Maternity", "Pediatrics"],
    "rating": { "average": 4.0, "totalReviews": 920 }, "averageCost": 2200, "isActive": true, "isVerified": true
  },
  {
    "name": "Mayo Healthcare",
    "slug": "mayo-mohali",
    "email": "info@mayohealthcare.mohali.com",
    "phone": "1725066666",
    "address": { "street": "Sector 69", "city": "Mohali", "state": "Punjab", "zipCode": "160062", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7225, 30.6860] },
    "facilities": ["Orthopedics", "OPD", "Cardiology", "Emergency"],
    "rating": { "average": 4.3, "totalReviews": 1100 }, "averageCost": 3800, "isActive": true, "isVerified": true
  },

  // ===== BANUR (5 Hospitals) =====
  {
    "name": "Gyan Sagar Medical College & Hospital",
    "slug": "gyan-sagar-banur",
    "email": "info@gyansagar.banur.com",
    "phone": "1762505000",
    "address": { "street": "Banur-Rajpura Highway", "city": "Banur", "state": "Punjab", "zipCode": "140601", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7161, 30.5750] },
    "facilities": ["OPD", "Emergency", "ICU", "Maternity", "Orthopedics"],
    "rating": { "average": 4.1, "totalReviews": 1800 }, "averageCost": 1500, "isActive": true, "isVerified": true
  },
  {
    "name": "Neelam Hospital Banur",
    "slug": "neelam-hospital-banur",
    "email": "info@neelamhospital.banur.com",
    "phone": "8765432101",
    "address": { "street": "Chandigarh-Patiala Highway", "city": "Banur", "state": "Punjab", "zipCode": "140601", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7150, 30.5800] },
    "facilities": ["OPD", "Maternity", "Emergency", "Imaging"],
    "rating": { "average": 4.3, "totalReviews": 450 }, "averageCost": 2000, "isActive": true, "isVerified": true
  },
  {
    "name": "Banur Multi Specialty Clinic",
    "slug": "banur-clinic",
    "email": "clinic@banur.com",
    "phone": "1722233445",
    "address": { "street": "Main Bazar", "city": "Banur", "state": "Punjab", "zipCode": "140601", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7100, 30.5700] },
    "facilities": ["OPD", "Lab", "Emergency"],
    "rating": { "average": 3.9, "totalReviews": 120 }, "averageCost": 800, "isActive": true, "isVerified": true
  },
  {
    "name": "Aggarwal Hospital",
    "slug": "aggarwal-banur",
    "email": "info@aggarwal.banur.com",
    "phone": "9876543211",
    "address": { "street": "Rajpura Road", "city": "Banur", "state": "Punjab", "zipCode": "140601", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7200, 30.5600] },
    "facilities": ["OPD", "Orthopedics", "Emergency"],
    "rating": { "average": 4.0, "totalReviews": 210 }, "averageCost": 1200, "isActive": true, "isVerified": true
  },
  {
    "name": "Jeevan Jyoti Hospital",
    "slug": "jeevan-jyoti-banur",
    "email": "info@jeevanjyoti.banur.com",
    "phone": "9876543212",
    "address": { "street": "Zirakpur Road", "city": "Banur", "state": "Punjab", "zipCode": "140601", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.7250, 30.5900] },
    "facilities": ["Maternity", "OPD", "Emergency"],
    "rating": { "average": 4.2, "totalReviews": 180 }, "averageCost": 1800, "isActive": true, "isVerified": true
  },

  // ===== RAJPURA (5 Hospitals) =====
  {
    "name": "AP Jain Civil Hospital Rajpura",
    "slug": "civil-hospital-rajpura",
    "email": "info@civil.rajpura.com",
    "phone": "9876543213",
    "address": { "street": "GT Road", "city": "Rajpura", "state": "Punjab", "zipCode": "140401", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.6020, 30.4842] },
    "facilities": ["Emergency", "OPD", "ICU", "Maternity"],
    "rating": { "average": 3.8, "totalReviews": 950 }, "averageCost": 200, "isActive": true, "isVerified": true
  },
  {
    "name": "Neelam Hospital Rajpura",
    "slug": "neelam-rajpura",
    "email": "info@neelam.rajpura.com",
    "phone": "9876543214",
    "address": { "street": "Near Railway Crossing", "city": "Rajpura", "state": "Punjab", "zipCode": "140401", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.5950, 30.4900] },
    "facilities": ["OPD", "Maternity", "Orthopedics", "Cardiology"],
    "rating": { "average": 4.4, "totalReviews": 560 }, "averageCost": 2500, "isActive": true, "isVerified": true
  },
  {
    "name": "Dharam Hospital",
    "slug": "dharam-rajpura",
    "email": "info@dharam.rajpura.com",
    "phone": "9876543215",
    "address": { "street": "Old Town", "city": "Rajpura", "state": "Punjab", "zipCode": "140401", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.6100, 30.4700] },
    "facilities": ["OPD", "Emergency", "Imaging"],
    "rating": { "average": 4.0, "totalReviews": 340 }, "averageCost": 1500, "isActive": true, "isVerified": true
  },
  {
    "name": "Prime Hospital Rajpura",
    "slug": "prime-rajpura",
    "email": "info@prime.rajpura.com",
    "phone": "9876543216",
    "address": { "street": "Calibre Market", "city": "Rajpura", "state": "Punjab", "zipCode": "140401", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.5880, 30.4820] },
    "facilities": ["OPD", "Surgery", "Emergency"],
    "rating": { "average": 4.2, "totalReviews": 210 }, "averageCost": 2800, "isActive": true, "isVerified": true
  },
  {
    "name": "Saini Hospital",
    "slug": "saini-rajpura",
    "email": "info@saini.rajpura.com",
    "phone": "9876543217",
    "address": { "street": "Patiala Road", "city": "Rajpura", "state": "Punjab", "zipCode": "140401", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.6050, 30.4600] },
    "facilities": ["OPD", "Orthopedics", "Emergency"],
    "rating": { "average": 4.1, "totalReviews": 150 }, "averageCost": 2000, "isActive": true, "isVerified": true
  },

  // ===== BIHAR / PATNA (5 Hospitals) =====
  {
    "name": "AIIMS Patna",
    "slug": "aiims-patna",
    "email": "info@aiims.patna.com",
    "phone": "9876543218",
    "address": { "street": "Phulwari Sharif", "city": "Patna", "state": "Bihar", "zipCode": "801507", "country": "India" },
    "location": { "type": "Point", "coordinates": [85.0416, 25.5683] },
    "facilities": ["Emergency", "ICU", "Cardiology", "Orthopedics", "Neurology", "Maternity"],
    "rating": { "average": 4.7, "totalReviews": 8500 }, "averageCost": 400, "isActive": true, "isVerified": true
  },
  {
    "name": "Paras HMRI Hospital",
    "slug": "paras-patna",
    "email": "info@paras.patna.com",
    "phone": "9876543219",
    "address": { "street": "Bailey Road", "city": "Patna", "state": "Bihar", "zipCode": "800014", "country": "India" },
    "location": { "type": "Point", "coordinates": [85.0880, 25.6120] },
    "facilities": ["Emergency", "Cardiology", "Oncology", "Orthopedics", "ICU"],
    "rating": { "average": 4.4, "totalReviews": 3200 }, "averageCost": 3500, "isActive": true, "isVerified": true
  },
  {
    "name": "Ruban Memorial Hospital",
    "slug": "ruban-patna",
    "email": "info@ruban.patna.com",
    "phone": "9876543220",
    "address": { "street": "Gandhi Maidan Road", "city": "Patna", "state": "Bihar", "zipCode": "800001", "country": "India" },
    "location": { "type": "Point", "coordinates": [85.1432, 25.6185] },
    "facilities": ["Emergency", "Urology", "OPD", "Cardiology", "ICU"],
    "rating": { "average": 4.2, "totalReviews": 2100 }, "averageCost": 2800, "isActive": true, "isVerified": true
  },
  {
    "name": "Ford Hospital & Research Centre",
    "slug": "ford-patna",
    "email": "info@ford.patna.com",
    "phone": "9876543221",
    "address": { "street": "Khemnichak", "city": "Patna", "state": "Bihar", "zipCode": "800027", "country": "India" },
    "location": { "type": "Point", "coordinates": [85.1650, 25.5780] },
    "facilities": ["OPD", "Surgery", "Maternity", "Pediatrics"],
    "rating": { "average": 4.3, "totalReviews": 1500 }, "averageCost": 2500, "isActive": true, "isVerified": true
  },
  {
    "name": "Patna Medical College (PMCH)",
    "slug": "pmch-patna",
    "email": "info@pmch.patna.com",
    "phone": "9876543222",
    "address": { "street": "Ashok Rajpath", "city": "Patna", "state": "Bihar", "zipCode": "800004", "country": "India" },
    "location": { "type": "Point", "coordinates": [85.1550, 25.6210] },
    "facilities": ["Emergency", "OPD", "Orthopedics", "Maternity", "ICU"],
    "rating": { "average": 3.9, "totalReviews": 5000 }, "averageCost": 300, "isActive": true, "isVerified": true
  },

  // ===== HARYANA / PANCHKULA (5 Hospitals) =====
  {
    "name": "Alchemist Hospital",
    "slug": "alchemist-panchkula",
    "email": "info@alchemist.panchkula.com",
    "phone": "9876543223",
    "address": { "street": "Sector 21", "city": "Panchkula", "state": "Haryana", "zipCode": "134112", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.8606, 30.6942] },
    "facilities": ["Emergency", "Cardiology", "Neurology", "ICU", "OPD"],
    "rating": { "average": 4.5, "totalReviews": 2100 }, "averageCost": 4200, "isActive": true, "isVerified": true
  },
  {
    "name": "Ojas Hospital",
    "slug": "ojas-panchkula",
    "email": "info@ojas.panchkula.com",
    "phone": "9876543224",
    "address": { "street": "Sector 26", "city": "Panchkula", "state": "Haryana", "zipCode": "134116", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.8900, 30.7000] },
    "facilities": ["Emergency", "Cardiology", "Surgery", "Orthopedics", "ICU"],
    "rating": { "average": 4.6, "totalReviews": 1800 }, "averageCost": 3800, "isActive": true, "isVerified": true
  },
  {
    "name": "Command Hospital WC",
    "slug": "command-panchkula",
    "email": "info@command.panchkula.com",
    "phone": "9876543225",
    "address": { "street": "Chandimandir Cantt", "city": "Panchkula", "state": "Haryana", "zipCode": "134107", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.9050, 30.7350] },
    "facilities": ["Emergency", "OPD", "Surgery", "ICU"],
    "rating": { "average": 4.9, "totalReviews": 1300 }, "averageCost": 100, "isActive": true, "isVerified": true
  },
  {
    "name": "Paras Bliss Hospital",
    "slug": "paras-bliss-panchkula",
    "email": "info@parasbliss.panchkula.com",
    "phone": "9876543226",
    "address": { "street": "MDC Sector 5", "city": "Panchkula", "state": "Haryana", "zipCode": "134109", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.8450, 30.7320] },
    "facilities": ["Maternity", "Pediatrics", "OPD"],
    "rating": { "average": 4.7, "totalReviews": 950 }, "averageCost": 7500, "isActive": true, "isVerified": true
  },
  {
    "name": "General Hospital Sector 6",
    "slug": "civil-panchkula",
    "email": "info@civil.panchkula.com",
    "phone": "9876543227",
    "address": { "street": "Sector 6", "city": "Panchkula", "state": "Haryana", "zipCode": "134109", "country": "India" },
    "location": { "type": "Point", "coordinates": [76.8550, 30.7100] },
    "facilities": ["Emergency", "OPD", "Maternity", "Orthopedics"],
    "rating": { "average": 4.0, "totalReviews": 1600 }, "averageCost": 300, "isActive": true, "isVerified": true
  },

  // ===== DELHI / SOUTH DELHI (5 Hospitals) =====
  {
    "name": "AIIMS New Delhi",
    "slug": "aiims-delhi",
    "email": "info@aiims.delhi.com",
    "phone": "9876543228",
    "address": { "street": "Ansari Nagar", "city": "New Delhi", "state": "Delhi", "zipCode": "110029", "country": "India" },
    "location": { "type": "Point", "coordinates": [77.2090, 28.5665] },
    "facilities": ["Emergency", "ICU", "Cardiology", "Neurology", "Orthopedics", "OPD", "Maternity"],
    "rating": { "average": 4.8, "totalReviews": 50000 }, "averageCost": 50, "isActive": true, "isVerified": true
  },
  {
    "name": "Max Healthcare Saket",
    "slug": "max-saket",
    "email": "info@max.saket.com",
    "phone": "9876543229",
    "address": { "street": "Press Enclave Road, Saket", "city": "South Delhi", "state": "Delhi", "zipCode": "110017", "country": "India" },
    "location": { "type": "Point", "coordinates": [77.2140, 28.5300] },
    "facilities": ["Emergency", "Cardiology", "Oncology", "Surgery", "Maternity"],
    "rating": { "average": 4.5, "totalReviews": 15000 }, "averageCost": 6000, "isActive": true, "isVerified": true
  },
  {
    "name": "Apollo Hospital Sarita Vihar",
    "slug": "apollo-delhi",
    "email": "info@apollo.delhi.com",
    "phone": "9876543230",
    "address": { "street": "Mathura Road", "city": "South Delhi", "state": "Delhi", "zipCode": "110076", "country": "India" },
    "location": { "type": "Point", "coordinates": [77.2880, 28.5350] },
    "facilities": ["Emergency", "Cardiology", "Surgery", "ICU", "Neurology"],
    "rating": { "average": 4.6, "totalReviews": 18000 }, "averageCost": 5500, "isActive": true, "isVerified": true
  },
  {
    "name": "Safdarjung Hospital",
    "slug": "safdarjung-delhi",
    "email": "info@safdarjung.delhi.com",
    "phone": "9876543231",
    "address": { "street": "Ring Road", "city": "New Delhi", "state": "Delhi", "zipCode": "110029", "country": "India" },
    "location": { "type": "Point", "coordinates": [77.2100, 28.5700] },
    "facilities": ["Emergency", "OPD", "Orthopedics", "Maternity"],
    "rating": { "average": 4.1, "totalReviews": 12000 }, "averageCost": 100, "isActive": true, "isVerified": true
  },
  {
    "name": "Fortis Escorts Heart Institute",
    "slug": "fortis-escorts-delhi",
    "email": "info@escorts.fortis.com",
    "phone": "9876543232",
    "address": { "street": "Okhla Road", "city": "South Delhi", "state": "Delhi", "zipCode": "110025", "country": "India" },
    "location": { "type": "Point", "coordinates": [77.2750, 28.5600] },
    "facilities": ["Cardiology", "Emergency", "ICU", "Surgery"],
    "rating": { "average": 4.7, "totalReviews": 8500 }, "averageCost": 7000, "isActive": true, "isVerified": true
  },

  // ===== MUMBAI (5 Hospitals) =====
  {
    "name": "Lilavati Hospital & Research Centre",
    "slug": "lilavati-mumbai",
    "email": "info@lilavati.mumbai.com",
    "phone": "9876543233",
    "address": { "street": "A-791, Bandra Reclamation", "city": "Mumbai", "state": "Maharashtra", "zipCode": "400050", "country": "India" },
    "location": { "type": "Point", "coordinates": [72.8250, 19.0515] },
    "facilities": ["Emergency", "ICU", "Cardiology", "Oncology", "Maternity"],
    "rating": { "average": 4.6, "totalReviews": 12000 }, "averageCost": 6500, "isActive": true, "isVerified": true
  },
  {
    "name": "KEM Hospital",
    "slug": "kem-mumbai",
    "email": "info@kem.mumbai.com",
    "phone": "9876543234",
    "address": { "street": "Parel", "city": "Mumbai", "state": "Maharashtra", "zipCode": "400012", "country": "India" },
    "location": { "type": "Point", "coordinates": [72.8420, 19.0020] },
    "facilities": ["Emergency", "OPD", "Surgery", "Maternity", "ICU"],
    "rating": { "average": 4.0, "totalReviews": 15000 }, "averageCost": 200, "isActive": true, "isVerified": true
  },
  {
    "name": "Nanavati Super Speciality Hospital",
    "slug": "nanavati-mumbai",
    "email": "info@nanavati.mumbai.com",
    "phone": "9876543235",
    "address": { "street": "S.V. Road, Vile Parle", "city": "Mumbai", "state": "Maharashtra", "zipCode": "400056", "country": "India" },
    "location": { "type": "Point", "coordinates": [72.8360, 19.1020] },
    "facilities": ["Emergency", "Cardiology", "Orthopedics", "OPD", "Oncology"],
    "rating": { "average": 4.4, "totalReviews": 9800 }, "averageCost": 5000, "isActive": true, "isVerified": true
  },
  {
    "name": "H. N. Reliance Foundation Hospital",
    "slug": "reliance-mumbai",
    "email": "info@reliance.mumbai.com",
    "phone": "9876543236",
    "address": { "street": "Prarthana Samaj", "city": "Mumbai", "state": "Maharashtra", "zipCode": "400004", "country": "India" },
    "location": { "type": "Point", "coordinates": [72.8190, 18.9600] },
    "facilities": ["Cardiology", "Neurology", "Emergency", "ICU", "Surgery"],
    "rating": { "average": 4.8, "totalReviews": 5600 }, "averageCost": 12000, "isActive": true, "isVerified": true
  },
  {
    "name": "Fortis Hospital Mulund",
    "slug": "fortis-mulund-mumbai",
    "email": "info@fortis.mulund.com",
    "phone": "9876543237",
    "address": { "street": "Mulund Goregaon Link Road", "city": "Mumbai", "state": "Maharashtra", "zipCode": "400078", "country": "India" },
    "location": { "type": "Point", "coordinates": [72.9400, 19.1750] },
    "facilities": ["Emergency", "Cardiology", "Maternity", "ICU"],
    "rating": { "average": 4.5, "totalReviews": 7200 }, "averageCost": 5800, "isActive": true, "isVerified": true
  }
];

export default hospitalSeedData;
