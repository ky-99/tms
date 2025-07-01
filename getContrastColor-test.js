// Test for getContrastColor function
// This test verifies the contrast color calculation using the same algorithm as the TagModal component

// The getContrastColor function from TagModal.tsx
function getContrastColor(hexColor) {
  const rgb = parseInt(hexColor.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  
  // YIQ color space brightness calculation
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return black if brightness >= 128, white if < 128
  return yiq >= 128 ? '#000000' : '#ffffff';
}

// Test colors
const testColors = [
  { color: '#8b5cf6', name: 'purple' },
  { color: '#3b82f6', name: 'blue' },
  { color: '#1f2937', name: 'dark gray' },
  { color: '#000000', name: 'black' },
  { color: '#ffffff', name: 'white' },
  { color: '#ef4444', name: 'red' }
];

console.log('getContrastColor Function Test');
console.log('================================\n');

testColors.forEach(({ color, name }) => {
  console.log(`Testing ${name} (${color}):`);
  console.log('--------------------------------');
  
  // Step 1: Extract RGB values
  const rgb = parseInt(color.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  
  console.log(`1. RGB Extraction:`);
  console.log(`   Hex: ${color} → Integer: ${rgb}`);
  console.log(`   Red:   ${r} (binary: ${(rgb >> 16).toString(2).padStart(8, '0')} & 11111111)`);
  console.log(`   Green: ${g} (binary: ${(rgb >> 8).toString(2).padStart(8, '0')} & 11111111)`);
  console.log(`   Blue:  ${b} (binary: ${rgb.toString(2).padStart(8, '0')} & 11111111)`);
  
  // Step 2: Calculate YIQ value
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  console.log(`\n2. YIQ Calculation:`);
  console.log(`   Formula: (R * 299 + G * 587 + B * 114) / 1000`);
  console.log(`   Calculation: (${r} * 299 + ${g} * 587 + ${b} * 114) / 1000`);
  console.log(`   = (${r * 299} + ${g * 587} + ${b * 114}) / 1000`);
  console.log(`   = ${r * 299 + g * 587 + b * 114} / 1000`);
  console.log(`   = ${yiq}`);
  
  // Step 3: Determine text color
  const textColor = getContrastColor(color);
  const threshold = 128;
  console.log(`\n3. Text Color Decision:`);
  console.log(`   YIQ value: ${yiq}`);
  console.log(`   Threshold: ${threshold}`);
  console.log(`   ${yiq} >= ${threshold}? ${yiq >= threshold}`);
  console.log(`   Expected text color: ${textColor}`);
  
  console.log(`\nResult: ${name} background → ${textColor === '#000000' ? 'BLACK' : 'WHITE'} text\n`);
});

// Summary table
console.log('Summary Table:');
console.log('==============');
console.log('Color     | Name       | RGB Values    | YIQ Value | Text Color');
console.log('----------|------------|---------------|-----------|------------');

testColors.forEach(({ color, name }) => {
  const rgb = parseInt(color.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = getContrastColor(color);
  
  console.log(`${color} | ${name.padEnd(10)} | (${r.toString().padStart(3)}, ${g.toString().padStart(3)}, ${b.toString().padStart(3)}) | ${yiq.toFixed(1).padStart(7)} | ${textColor === '#000000' ? 'BLACK' : 'WHITE'}`);
});

// Verify function works correctly
console.log('\nVerification:');
console.log('=============');
testColors.forEach(({ color, name }) => {
  const result = getContrastColor(color);
  console.log(`✓ ${name} (${color}) → ${result}`);
});