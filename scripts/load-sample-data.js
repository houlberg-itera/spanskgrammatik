// Simple script to load sample data
async function loadSampleData() {
    try {
        console.log('Starting sample data load...');
        
        const response = await fetch('http://localhost:3000/api/load-sample-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        const result = await response.json();
        console.log('Load result:', result);
        
        // Check final state
        const checkResponse = await fetch('http://localhost:3000/api/load-sample-data');
        const checkResult = await checkResponse.json();
        console.log('Final state:', checkResult);
        
        return result;
        
    } catch (error) {
        console.error('Error loading sample data:', error);
        throw error;
    }
}

// Execute
loadSampleData();
