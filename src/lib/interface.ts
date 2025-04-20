import { createInterface } from 'readline';
import { RetrievalQAChain } from 'langchain/chains';

// Setup chat interface
export function startChatInterface(chain: RetrievalQAChain) {
  // Setup readline interface for user input
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  console.log('\nSystem ready to answer questions!');
  console.log('You can ask about the content of the documents in the docs/.');
  
  // Function to handle chat interaction
  const chat = () => {
    rl.question('\nWhat would you like to ask about the documents? (Type "exit" to quit)\n> ', async (question) => {
      if (question.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        rl.close();
        return;
      }
      
      try {
        console.log('Searching for answer...');
        const response = await chain._call({ query: question });
        
        console.log('\n--- Response ---');
        console.log(response.text);
        // console.log('🚀 ~ rl.question ~ response:', response);
        
        chat();
      } catch (error) {
        console.error('Error processing the query:', error);
        chat();
      }
    });
  };
  
  chat();
} 