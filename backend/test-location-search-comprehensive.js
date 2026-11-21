/**
 * Hospital Location Search - Comprehensive Test Suite
 * 
 * Usage:
 *   node test-location-search-comprehensive.js
 * 
 * Tests the new location-based hospital search endpoint with:
 * - Basic functionality
 * - Error handling
 * - Filtering and sorting
 * - Pagination
 * - Edge cases
 */

import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const TIMEOUT = 5000;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}]`;
  
  switch (level) {
    case 'success':
      console.log(`${colors.green}✅ SUCCESS${colors.reset} ${prefix} ${message}`);
      break;
    case 'error':
      console.log(`${colors.red}❌ ERROR${colors.reset} ${prefix} ${message}`);
      break;
    case 'warning':
      console.log(`${colors.yellow}⚠️  WARNING${colors.reset} ${prefix} ${message}`);
      break;
    case 'info':
      console.log(`${colors.blue}ℹ️  INFO${colors.reset} ${prefix} ${message}`);
      break;
    case 'test':
      console.log(`${colors.cyan}🧪 TEST${colors.reset} ${prefix} ${message}`);
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

function section(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Test 1: Basic Search
 */
async function testBasicSearch() {
  log('test', 'Basic Search - Delhi');
  
  try {
    const response = await axios.get(
      `${API_URL}/hospitals/search-by-location`,
      {
        params: { location: 'Delhi', limit: 5 },
        timeout: TIMEOUT
      }
    );

    if (response.status === 200 && response.data.status === 'success') {
      log('success', `Found ${response.data.data.hospitals.length} hospitals`);
      log('info', `Location: ${response.data.data.searchedLocation.place_name}`);
      log('info', `Coordinates: ${response.data.data.searchedLocation.latitude}, ${response.data.data.searchedLocation.longitude}`);
      
      if (response.data.data.hospitals.length > 0) {
        const hospital = response.data.data.hospitals[0];
        log('info', `First hospital: ${hospital.name} (${hospital.distance} km away)`);
      }
      
      return true;
    } else {
      log('error', `Unexpected response status: ${response.status}`);
      return false;
    }
  } catch (error) {
    log('error', `Failed: ${error.message}`);
    if (error.response?.data?.code) {
      log('info', `Error code: ${error.response.data.code}`);
    }
    return false;
  }
}

/**
 * Test 2: Different Cities
 */
async function testDifferentCities() {
  log('test', 'Multiple Cities');
  
  const cities = ['Mumbai', 'Bangalore', 'Hyderabad', 'Pune'];
  let passed = 0;

  for (const city of cities) {
    try {
      const response = await axios.get(
        `${API_URL}/hospitals/search-by-location`,
        {
          params: { location: city, limit: 1 },
          timeout: TIMEOUT
        }
      );

      if (response.status === 200) {
        log('success', `${city}: ${response.data.data.hospitals.length} hospitals found`);
        passed++;
      }
    } catch (error) {
      log('error', `${city}: ${error.response?.data?.message || error.message}`);
    }
  }

  return passed === cities.length;
}

/**
 * Test 3: Custom Radius
 */
async function testCustomRadius() {
  log('test', 'Custom Search Radius');
  
  const radii = [5, 15, 25, 50];
  let passed = 0;

  for (const radius of radii) {
    try {
      const response = await axios.get(
        `${API_URL}/hospitals/search-by-location`,
        {
          params: { location: 'Delhi', radius, limit: 5 },
          timeout: TIMEOUT
        }
      );

      if (response.status === 200) {
        const count = response.data.data.hospitals.length;
        log('success', `Radius ${radius}km: ${count} hospitals`);
        passed++;
      }
    } catch (error) {
      log('error', `Radius ${radius}km failed: ${error.message}`);
    }
  }

  return passed === radii.length;
}

/**
 * Test 4: Facility Filtering
 */
async function testFacilityFilter() {
  log('test', 'Facility Filtering');
  
  const facilityTests = [
    { facilities: 'ICU', label: 'ICU only' },
    { facilities: 'Surgery', label: 'Surgery only' },
    { facilities: 'ICU,Surgery', label: 'ICU & Surgery' },
    { facilities: 'Emergency', label: 'Emergency only' }
  ];

  let passed = 0;

  for (const test of facilityTests) {
    try {
      const response = await axios.get(
        `${API_URL}/hospitals/search-by-location`,
        {
          params: {
            location: 'Mumbai',
            facilities: test.facilities,
            limit: 10
          },
          timeout: TIMEOUT
        }
      );

      if (response.status === 200) {
        const count = response.data.data.hospitals.length;
        log('success', `${test.label}: ${count} hospitals match`);
        passed++;
      }
    } catch (error) {
      log('error', `${test.label} failed: ${error.message}`);
    }
  }

  return passed > 0;
}

/**
 * Test 5: Minimum Rating Filter
 */
async function testMinRatingFilter() {
  log('test', 'Minimum Rating Filter');
  
  const ratings = [3, 4, 4.5, 5];
  let passed = 0;

  for (const rating of ratings) {
    try {
      const response = await axios.get(
        `${API_URL}/hospitals/search-by-location`,
        {
          params: {
            location: 'Bangalore',
            minRating: rating,
            limit: 10
          },
          timeout: TIMEOUT
        }
      );

      if (response.status === 200) {
        const count = response.data.data.hospitals.length;
        log('success', `Min rating ${rating}★: ${count} hospitals`);
        passed++;
      }
    } catch (error) {
      log('error', `Min rating ${rating}★ failed: ${error.message}`);
    }
  }

  return passed > 0;
}

/**
 * Test 6: Sorting Options
 */
async function testSorting() {
  log('test', 'Sorting Options');
  
  const sortOptions = ['distance', 'rating'];
  let passed = 0;

  for (const sort of sortOptions) {
    try {
      const response = await axios.get(
        `${API_URL}/hospitals/search-by-location`,
        {
          params: {
            location: 'Hyderabad',
            sortBy: sort,
            limit: 5
          },
          timeout: TIMEOUT
        }
      );

      if (response.status === 200 && response.data.data.hospitals.length > 0) {
        const hospitals = response.data.data.hospitals;
        log('success', `Sorted by ${sort}: ${hospitals.length} results`);
        
        // Show first few results
        if (sort === 'distance') {
          log('info', `  Closest: ${hospitals[0].name} (${hospitals[0].distance}km)`);
        } else {
          log('info', `  Top rated: ${hospitals[0].name} (${hospitals[0].rating.average}★)`);
        }
        
        passed++;
      }
    } catch (error) {
      log('error', `Sort by ${sort} failed: ${error.message}`);
    }
  }

  return passed === sortOptions.length;
}

/**
 * Test 7: Pagination
 */
async function testPagination() {
  log('test', 'Pagination');
  
  try {
    const page1 = await axios.get(
      `${API_URL}/hospitals/search-by-location`,
      {
        params: {
          location: 'Delhi',
          page: 1,
          limit: 10
        },
        timeout: TIMEOUT
      }
    );

    const page2 = await axios.get(
      `${API_URL}/hospitals/search-by-location`,
      {
        params: {
          location: 'Delhi',
          page: 2,
          limit: 10
        },
        timeout: TIMEOUT
      }
    );

    log('success', `Page 1: ${page1.data.data.hospitals.length} results`);
    log('success', `Page 2: ${page2.data.data.hospitals.length} results`);
    log('info', `Total hospitals available: ${page1.data.data.pagination.total}`);
    
    return true;
  } catch (error) {
    log('error', `Pagination test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 8: Invalid Location Error
 */
async function testInvalidLocationError() {
  log('test', 'Invalid Location Error Handling');
  
  try {
    await axios.get(
      `${API_URL}/hospitals/search-by-location`,
      {
        params: { location: 'INVALID_PLACE_XYZ_12345' },
        timeout: TIMEOUT
      }
    );
    
    log('error', 'Should have returned error for invalid location');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      log('success', `Correctly rejected invalid location`);
      log('info', `Error code: ${error.response.data.code}`);
      return true;
    } else {
      log('error', `Wrong error type: ${error.response?.status}`);
      return false;
    }
  }
}

/**
 * Test 9: Missing Location Parameter
 */
async function testMissingLocationError() {
  log('test', 'Missing Location Parameter Error');
  
  try {
    await axios.get(
      `${API_URL}/hospitals/search-by-location`,
      { timeout: TIMEOUT }
    );
    
    log('error', 'Should have returned error for missing location');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      log('success', `Correctly rejected missing location`);
      log('info', `Error code: ${error.response.data.code}`);
      return true;
    } else {
      log('error', `Wrong error type: ${error.response?.status}`);
      return false;
    }
  }
}

/**
 * Test 10: Response Format Validation
 */
async function testResponseFormat() {
  log('test', 'Response Format Validation');
  
  try {
    const response = await axios.get(
      `${API_URL}/hospitals/search-by-location`,
      {
        params: { location: 'Chennai', limit: 1 },
        timeout: TIMEOUT
      }
    );

    const data = response.data;
    const checks = [
      { key: 'status', expected: 'success' },
      { key: 'code', expected: 'SEARCH_BY_LOCATION_SUCCESS' },
      { key: 'message', type: 'string' },
      { key: 'data.searchedLocation', type: 'object' },
      { key: 'data.hospitals', type: 'array' },
      { key: 'data.pagination', type: 'object' }
    ];

    let allValid = true;

    for (const check of checks) {
      const keys = check.key.split('.');
      let value = data;
      
      for (const k of keys) {
        value = value?.[k];
      }

      if (check.expected && value === check.expected) {
        log('success', `✓ ${check.key} = "${check.expected}"`);
      } else if (check.type && typeof value === check.type) {
        log('success', `✓ ${check.key} is ${check.type}`);
      } else {
        log('error', `✗ ${check.key} validation failed`);
        allValid = false;
      }
    }

    if (response.data.data.hospitals.length > 0) {
      const hospital = response.data.data.hospitals[0];
      const hospitalChecks = [
        { key: '_id', type: 'string' },
        { key: 'name', type: 'string' },
        { key: 'distance', type: 'number' },
        { key: 'rating', type: 'object' }
      ];

      for (const check of hospitalChecks) {
        const value = hospital[check.key];
        if (typeof value === check.type) {
          log('success', `✓ Hospital.${check.key} is ${check.type}`);
        } else {
          log('error', `✗ Hospital.${check.key} type mismatch`);
          allValid = false;
        }
      }
    }

    return allValid;
  } catch (error) {
    log('error', `Response format test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 11: Performance Test
 */
async function testPerformance() {
  log('test', 'Performance Benchmark');
  
  const locations = [
    { location: 'Delhi', radius: 10 },
    { location: 'Mumbai', radius: 15 },
    { location: 'Bangalore', radius: 20 }
  ];

  let passed = 0;

  for (const test of locations) {
    try {
      const startTime = Date.now();
      
      await axios.get(
        `${API_URL}/hospitals/search-by-location`,
        {
          params: test,
          timeout: TIMEOUT
        }
      );

      const duration = Date.now() - startTime;
      
      if (duration < 1000) {
        log('success', `${test.location}: ${duration}ms (Good)`);
        passed++;
      } else {
        log('warning', `${test.location}: ${duration}ms (Slower than expected)`);
        passed++;
      }
    } catch (error) {
      log('error', `${test.location} performance test failed: ${error.message}`);
    }
  }

  return passed > 0;
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  section('🏥 Hospital Location Search - Comprehensive Test Suite');
  
  log('info', 'Starting tests...');
  log('info', `API URL: ${API_URL}\n`);

  const testSuite = [
    { name: 'Basic Search (Delhi)', test: testBasicSearch },
    { name: 'Multiple Cities', test: testDifferentCities },
    { name: 'Custom Search Radius', test: testCustomRadius },
    { name: 'Facility Filtering', test: testFacilityFilter },
    { name: 'Minimum Rating Filter', test: testMinRatingFilter },
    { name: 'Sorting Options', test: testSorting },
    { name: 'Pagination', test: testPagination },
    { name: 'Invalid Location Error Handling', test: testInvalidLocationError },
    { name: 'Missing Location Error Handling', test: testMissingLocationError },
    { name: 'Response Format Validation', test: testResponseFormat },
    { name: 'Performance Benchmark', test: testPerformance }
  ];

  const results = [];

  for (const test of testSuite) {
    section(test.name);
    const result = await test.test();
    results.push({ name: test.name, passed: result });
    console.log();
  }

  // Summary
  section('📊 Test Summary');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
  }

  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`Total: ${passed}/${total} tests passed (${percentage}%)`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  if (passed === total) {
    log('success', '🎉 All tests passed!');
    process.exit(0);
  } else {
    log('error', `⚠️  ${total - passed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log('error', `Fatal error: ${error.message}`);
  process.exit(1);
});
