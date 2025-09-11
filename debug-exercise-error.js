// Debug script to reproduce the exercise generation error
const DIFFICULTY_GUIDELINES = {
  A1: {
    easy: 'Grundlæggende ordforråd og simple strukturer. Enkle sætninger med "ser" og "estar".',
    medium: 'Almindelige hverdagsudtryk og grundlæggende grammatiske mønstre.',
    hard: 'Introduktion til mere komplekse strukturer, men stadig inden for A1-niveau.'
  },
  A2: {
    easy: 'Almindelige situationer og kendte emner. Simple fortid og fremtid.',
    medium: 'Komplekse situationer, uregelmæssige verbum, komparativer.',
    hard: 'Avancerede A2-strukturer der forbereder til B1-niveau.'
  },
  B1: {
    easy: 'Almindelige komplekse strukturer, subjunktiv i enkle tilfælde.',
    medium: 'Avanceret grammatik, forskellige subjunktiv-anvendelser.',
    hard: 'Komplekse strukturer der kræver dyb forståelse af spansk grammatik.'
  }
};

// Test different scenarios that might cause the error
console.log('Testing DIFFICULTY_GUIDELINES access...');

// Test valid cases
console.log('A1.medium:', DIFFICULTY_GUIDELINES.A1.medium);
console.log('A2.medium:', DIFFICULTY_GUIDELINES.A2.medium);
console.log('B1.medium:', DIFFICULTY_GUIDELINES.B1.medium);

// Test potentially problematic cases
const testCases = [
  { level: 'A1', difficulty: 'medium' },
  { level: 'A2', difficulty: 'medium' },
  { level: 'B1', difficulty: 'medium' },
  { level: undefined, difficulty: 'medium' },
  { level: 'A1', difficulty: undefined },
  { level: 'a1', difficulty: 'medium' }, // lowercase
  { level: 'A1', difficulty: 'Medium' }, // wrong case
];

testCases.forEach(({ level, difficulty }) => {
  try {
    console.log(`Testing level: "${level}", difficulty: "${difficulty}"`);
    const result = DIFFICULTY_GUIDELINES[level]?.[difficulty];
    console.log(`Result: ${result || 'undefined'}`);
    
    if (!result) {
      console.log(`❌ ERROR: Cannot read properties of undefined (reading '${difficulty}')`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
  console.log('---');
});
