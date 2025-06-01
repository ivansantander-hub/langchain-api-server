// Configuration file for improved RAG system
export interface RAGConfig {
  embeddings: {
    model: 'text-embedding-3-large' | 'text-embedding-3-small';
    dimensions: number;
    batchSize: number;
  };
  chunking: {
    strategy: 'standard' | 'semantic';
    chunkSize: number;
    chunkOverlap: number;
    minChunkSize: number;
  };
  retrieval: {
    useAdvanced: boolean;
    k: number;
    scoreThreshold: number;
    searchType: 'similarity' | 'mmr';
    mmrLambda: number;
  };
  model: {
    name: string;
    temperature: number;
    maxTokens: number;
    topP: number;
  };
}

// High quality configuration (slower but better results)
export const highQualityConfig: RAGConfig = {
  embeddings: {
    model: 'text-embedding-3-large',
    dimensions: 3072,
    batchSize: 512,
  },
  chunking: {
    strategy: 'semantic',
    chunkSize: 600,
    chunkOverlap: 100,
    minChunkSize: 50,
  },
  retrieval: {
    useAdvanced: true,
    k: 6,
    scoreThreshold: 0.7,
    searchType: 'mmr',
    mmrLambda: 0.25,
  },
  model: {
    name: 'gpt-4-turbo',
    temperature: 0.0,
    maxTokens: 1000,
    topP: 0.5,
  },
};

// Balanced configuration (good performance and speed)
export const balancedConfig: RAGConfig = {
  embeddings: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 1024,
  },
  chunking: {
    strategy: 'standard',
    chunkSize: 800,
    chunkOverlap: 150,
    minChunkSize: 50,
  },
  retrieval: {
    useAdvanced: true,
    k: 8,
    scoreThreshold: 0.6,
    searchType: 'mmr',
    mmrLambda: 0.3,
  },
  model: {
    name: 'gpt-4-turbo',
    temperature: 0.1,
    maxTokens: 1500,
    topP: 0.8,
  },
};

// Fast configuration (quick responses)
export const fastConfig: RAGConfig = {
  embeddings: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 1024,
  },
  chunking: {
    strategy: 'standard',
    chunkSize: 1000,
    chunkOverlap: 200,
    minChunkSize: 30,
  },
  retrieval: {
    useAdvanced: false,
    k: 5,
    scoreThreshold: 0.5,
    searchType: 'similarity',
    mmrLambda: 0.5,
  },
  model: {
    name: 'gpt-3.5-turbo',
    temperature: 0.2,
    maxTokens: 1000,
    topP: 0.9,
  },
};

// Default configuration
export const defaultRAGConfig = balancedConfig;

// Anti-hallucination tips
export const antiHallucinationTips = {
  prompts: [
    "Responde SOLO basándote en el contexto proporcionado",
    "Si no tienes la información, di que no la tienes",
    "Cita la parte específica del contexto que usaste",
    "No hagas suposiciones ni agregues información externa"
  ],
  modelSettings: {
    lowTemperature: true, // 0.0 - 0.2
    highTopP: false, // 0.5 - 0.8
    maxTokensLimit: true, // 1000 - 1500
  },
  retrievalSettings: {
    highScoreThreshold: true, // >= 0.6
    moderateK: true, // 6-10 documents
    useMMR: true, // For diversity
  }
}; 