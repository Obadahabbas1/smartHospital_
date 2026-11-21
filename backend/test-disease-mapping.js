import { getFacilitiesForDisease } from './src/utils/diseaseMapping.js';

const diseases = ['heart', 'dil', 'haddi', 'fracture', 'bukhaar', 'cancer'];

diseases.forEach(d => {
  console.log(`Disease: ${d} -> Facilities: ${getFacilitiesForDisease(d).join(', ')}`);
});
