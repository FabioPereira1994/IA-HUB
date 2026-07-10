require('dotenv').config();

function obrigatoria(nome) {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${nome}`);
  }
  return valor;
}

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: obrigatoria('DATABASE_URL'),
  JWT_SECRET: obrigatoria('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Sprint 2 — WhatsApp (Evolution API), embeddings (OpenAI) e orquestração (n8n)
  OPENAI_API_KEY: obrigatoria('OPENAI_API_KEY'),
  EVOLUTION_API_URL: obrigatoria('EVOLUTION_API_URL'),
  EVOLUTION_WEBHOOK_SECRET: process.env.EVOLUTION_WEBHOOK_SECRET || '',
  N8N_WEBHOOK_URL: obrigatoria('N8N_WEBHOOK_URL'),
  N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET || '',
};
