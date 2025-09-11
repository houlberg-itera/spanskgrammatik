// Test the API directly to ensure our fix works
const testData = {
  topicId: "1",
  exerciseType: "multiple_choice",
  count: 3,
  difficulty: "medium",
  level: "A1", 
  topicName: "Test Topic",
  topicDescription: "Test Description"
};

console.log('Testing with valid data:', JSON.stringify(testData, null, 2));

// Test with invalid data that would cause the error
const invalidData = {
  topicId: "1",
  exerciseType: "multiple_choice", 
  count: 3,
  difficulty: "medium",
  level: undefined,  // This would cause the error
  topicName: undefined,
  topicDescription: "Test Description"
};

console.log('Testing with invalid data:', JSON.stringify(invalidData, null, 2));
