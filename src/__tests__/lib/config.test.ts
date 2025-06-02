import { jest, describe, it, expect } from '@jest/globals';
import {
  RAGConfig,
  highQualityConfig,
  balancedConfig,
  fastConfig,
  defaultRAGConfig,
  antiHallucinationTips
} from '../../lib/config.js';

describe('config.ts', () => {
  describe('RAGConfig interface validation', () => {
    const validateRAGConfig = (config: RAGConfig, configName: string) => {
      it(`${configName} should have valid embeddings configuration`, () => {
        expect(config.embeddings).toBeDefined();
        expect(['text-embedding-3-large', 'text-embedding-3-small']).toContain(config.embeddings.model);
        expect(config.embeddings.dimensions).toBeGreaterThan(0);
        expect(config.embeddings.batchSize).toBeGreaterThan(0);
      });

      it(`${configName} should have valid chunking configuration`, () => {
        expect(config.chunking).toBeDefined();
        expect(['standard', 'semantic']).toContain(config.chunking.strategy);
        expect(config.chunking.chunkSize).toBeGreaterThan(0);
        expect(config.chunking.chunkOverlap).toBeGreaterThanOrEqual(0);
        expect(config.chunking.chunkOverlap).toBeLessThan(config.chunking.chunkSize);
        expect(config.chunking.minChunkSize).toBeGreaterThan(0);
      });

      it(`${configName} should have valid retrieval configuration`, () => {
        expect(config.retrieval).toBeDefined();
        expect(typeof config.retrieval.useAdvanced).toBe('boolean');
        expect(config.retrieval.k).toBeGreaterThan(0);
        expect(config.retrieval.scoreThreshold).toBeGreaterThanOrEqual(0);
        expect(config.retrieval.scoreThreshold).toBeLessThanOrEqual(1);
        expect(['similarity', 'mmr']).toContain(config.retrieval.searchType);
        expect(config.retrieval.mmrLambda).toBeGreaterThanOrEqual(0);
        expect(config.retrieval.mmrLambda).toBeLessThanOrEqual(1);
      });

      it(`${configName} should have valid model configuration`, () => {
        expect(config.model).toBeDefined();
        expect(config.model.name).toBeDefined();
        expect(typeof config.model.name).toBe('string');
        expect(config.model.temperature).toBeGreaterThanOrEqual(0);
        expect(config.model.temperature).toBeLessThanOrEqual(2);
        expect(config.model.maxTokens).toBeGreaterThan(0);
        expect(config.model.topP).toBeGreaterThan(0);
        expect(config.model.topP).toBeLessThanOrEqual(1);
      });
    };

    describe('highQualityConfig', () => {
      validateRAGConfig(highQualityConfig, 'highQualityConfig');

      it('should prioritize quality over speed', () => {
        expect(highQualityConfig.embeddings.model).toBe('text-embedding-3-large');
        expect(highQualityConfig.embeddings.dimensions).toBe(3072);
        expect(highQualityConfig.chunking.strategy).toBe('semantic');
        expect(highQualityConfig.retrieval.useAdvanced).toBe(true);
        expect(highQualityConfig.model.temperature).toBe(0.0); // Maximum determinism
        expect(highQualityConfig.retrieval.scoreThreshold).toBeGreaterThanOrEqual(0.7); // High threshold
      });

      it('should have conservative parameters for anti-hallucination', () => {
        expect(highQualityConfig.model.temperature).toBe(0.0);
        expect(highQualityConfig.model.topP).toBe(0.5);
        expect(highQualityConfig.model.maxTokens).toBeLessThanOrEqual(1000);
        expect(highQualityConfig.retrieval.scoreThreshold).toBeGreaterThanOrEqual(0.7);
      });
    });

    describe('balancedConfig', () => {
      validateRAGConfig(balancedConfig, 'balancedConfig');

      it('should balance quality and performance', () => {
        expect(balancedConfig.embeddings.model).toBe('text-embedding-3-small');
        expect(balancedConfig.embeddings.dimensions).toBe(1536);
        expect(balancedConfig.chunking.strategy).toBe('standard');
        expect(balancedConfig.retrieval.useAdvanced).toBe(true);
        expect(balancedConfig.model.temperature).toBe(0.1);
        expect(balancedConfig.retrieval.scoreThreshold).toBe(0.6);
      });

      it('should have reasonable chunk sizes', () => {
        expect(balancedConfig.chunking.chunkSize).toBe(800);
        expect(balancedConfig.chunking.chunkOverlap).toBe(150);
        expect(balancedConfig.chunking.minChunkSize).toBe(50);
      });
    });

    describe('fastConfig', () => {
      validateRAGConfig(fastConfig, 'fastConfig');

      it('should prioritize speed over quality', () => {
        expect(fastConfig.embeddings.model).toBe('text-embedding-3-small');
        expect(fastConfig.chunking.strategy).toBe('standard');
        expect(fastConfig.retrieval.useAdvanced).toBe(false);
        expect(fastConfig.model.name).toBe('gpt-3.5-turbo');
        expect(fastConfig.retrieval.searchType).toBe('similarity');
      });

      it('should have larger chunk sizes for faster processing', () => {
        expect(fastConfig.chunking.chunkSize).toBe(1000);
        expect(fastConfig.chunking.chunkOverlap).toBe(200);
        expect(fastConfig.retrieval.k).toBeLessThanOrEqual(5);
      });

      it('should have less strict score threshold', () => {
        expect(fastConfig.retrieval.scoreThreshold).toBe(0.5);
      });
    });
  });

  describe('defaultRAGConfig', () => {
    it('should reference balancedConfig', () => {
      expect(defaultRAGConfig).toBe(balancedConfig);
    });
  });

  describe('antiHallucinationTips', () => {
    it('should provide helpful prompts', () => {
      expect(antiHallucinationTips.prompts).toBeDefined();
      expect(Array.isArray(antiHallucinationTips.prompts)).toBe(true);
      expect(antiHallucinationTips.prompts.length).toBeGreaterThan(0);
      
      antiHallucinationTips.prompts.forEach(prompt => {
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });
    });

    it('should include key anti-hallucination prompt elements', () => {
      const promptsText = antiHallucinationTips.prompts.join(' ').toLowerCase();
      expect(promptsText).toContain('contexto');
      expect(promptsText).toContain('información');
      expect(promptsText).toContain('suposiciones');
    });

    it('should have valid model settings', () => {
      expect(antiHallucinationTips.modelSettings).toBeDefined();
      expect(typeof antiHallucinationTips.modelSettings.lowTemperature).toBe('boolean');
      expect(typeof antiHallucinationTips.modelSettings.highTopP).toBe('boolean');
      expect(typeof antiHallucinationTips.modelSettings.maxTokensLimit).toBe('boolean');
      
      // These should be set to prevent hallucinations
      expect(antiHallucinationTips.modelSettings.lowTemperature).toBe(true);
      expect(antiHallucinationTips.modelSettings.highTopP).toBe(false);
      expect(antiHallucinationTips.modelSettings.maxTokensLimit).toBe(true);
    });

    it('should have valid retrieval settings', () => {
      expect(antiHallucinationTips.retrievalSettings).toBeDefined();
      expect(typeof antiHallucinationTips.retrievalSettings.highScoreThreshold).toBe('boolean');
      expect(typeof antiHallucinationTips.retrievalSettings.moderateK).toBe('boolean');
      expect(typeof antiHallucinationTips.retrievalSettings.useMMR).toBe('boolean');
      
      // These should be set to improve retrieval quality
      expect(antiHallucinationTips.retrievalSettings.highScoreThreshold).toBe(true);
      expect(antiHallucinationTips.retrievalSettings.moderateK).toBe(true);
      expect(antiHallucinationTips.retrievalSettings.useMMR).toBe(true);
    });
  });

  describe('Configuration comparison', () => {
    it('should have quality hierarchy: fast < balanced < highQuality', () => {
      // Model quality
      expect(['gpt-3.5-turbo', 'gpt-4', 'gpt-3.5-turbo']).toContain(fastConfig.model.name);
      expect(['gpt-4', 'gpt-3.5-turbo']).toContain(balancedConfig.model.name);
      expect(['gpt-4', 'gpt-3.5-turbo']).toContain(highQualityConfig.model.name);
      
      // Temperature (lower is better for accuracy)
      expect(highQualityConfig.model.temperature).toBeLessThanOrEqual(balancedConfig.model.temperature);
      expect(balancedConfig.model.temperature).toBeLessThanOrEqual(fastConfig.model.temperature);
      
      // Score thresholds (higher is better for accuracy)
      expect(highQualityConfig.retrieval.scoreThreshold).toBeGreaterThanOrEqual(balancedConfig.retrieval.scoreThreshold);
      expect(balancedConfig.retrieval.scoreThreshold).toBeGreaterThanOrEqual(fastConfig.retrieval.scoreThreshold);
    });

    it('should have speed hierarchy: highQuality < balanced < fast', () => {
      // Embedding model speed (small is faster)
      expect(fastConfig.embeddings.model).toBe('text-embedding-3-small');
      expect(balancedConfig.embeddings.model).toBe('text-embedding-3-small');
      expect(highQualityConfig.embeddings.model).toBe('text-embedding-3-large');
      
      // Batch size (larger is faster)
      expect(fastConfig.embeddings.batchSize).toBeGreaterThanOrEqual(balancedConfig.embeddings.batchSize);
      expect(balancedConfig.embeddings.batchSize).toBeGreaterThanOrEqual(highQualityConfig.embeddings.batchSize);
      
      // Chunk size (larger chunks = fewer chunks = faster)
      expect(fastConfig.chunking.chunkSize).toBeGreaterThanOrEqual(balancedConfig.chunking.chunkSize);
      expect(balancedConfig.chunking.chunkSize).toBeGreaterThanOrEqual(highQualityConfig.chunking.chunkSize);
    });
  });

  describe('Anti-hallucination features', () => {
    it('should have progressively stricter anti-hallucination measures', () => {
      const configs = [fastConfig, balancedConfig, highQualityConfig];
      
      // Temperature should decrease (more deterministic)
      for (let i = 0; i < configs.length - 1; i++) {
        expect(configs[i + 1].model.temperature).toBeLessThanOrEqual(configs[i].model.temperature);
      }
      
      // Score threshold should increase (more selective)
      for (let i = 0; i < configs.length - 1; i++) {
        expect(configs[i + 1].retrieval.scoreThreshold).toBeGreaterThanOrEqual(configs[i].retrieval.scoreThreshold);
      }
    });

    it('should use advanced retrieval in quality-focused configs', () => {
      expect(highQualityConfig.retrieval.useAdvanced).toBe(true);
      expect(balancedConfig.retrieval.useAdvanced).toBe(true);
      expect(fastConfig.retrieval.useAdvanced).toBe(false);
    });

    it('should prefer MMR in quality-focused configs for diversity', () => {
      expect(highQualityConfig.retrieval.searchType).toBe('mmr');
      expect(balancedConfig.retrieval.searchType).toBe('mmr');
      expect(fastConfig.retrieval.searchType).toBe('similarity');
    });
  });

  describe('Realistic parameter validation', () => {
    it('should have sensible chunk overlap ratios', () => {
      [highQualityConfig, balancedConfig, fastConfig].forEach(config => {
        const overlapRatio = config.chunking.chunkOverlap / config.chunking.chunkSize;
        expect(overlapRatio).toBeGreaterThan(0);
        expect(overlapRatio).toBeLessThan(0.5); // Overlap should be less than 50%
      });
    });

    it('should have reasonable retrieval k values', () => {
      [highQualityConfig, balancedConfig, fastConfig].forEach(config => {
        expect(config.retrieval.k).toBeGreaterThanOrEqual(3); // At least some context
        expect(config.retrieval.k).toBeLessThanOrEqual(15); // Not too much context
      });
    });

    it('should have appropriate embedding dimensions for models', () => {
      [highQualityConfig, balancedConfig, fastConfig].forEach(config => {
        if (config.embeddings.model === 'text-embedding-3-large') {
          expect(config.embeddings.dimensions).toBe(3072);
        } else if (config.embeddings.model === 'text-embedding-3-small') {
          expect(config.embeddings.dimensions).toBe(1536);
        }
      });
    });
  });
}); 