const config = {
    // AWS API Gateway endpoint for login
    API_ENDPOINTS: {
        LOGIN: 'https://fyimr127r0.execute-api.us-east-1.amazonaws.com/dev/auth/login',
        GRADE: 'https://fyimr127r0.execute-api.us-east-1.amazonaws.com/dev/grade'
    },  
    
    // API Headers
    API_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'http://localhost:3000'
    }
};

export default config; 