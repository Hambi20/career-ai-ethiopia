// Stub module for z-ai-web-dev-sdk — used when the real SDK is not available (e.g., Vercel)
const stub = { create };

export async function create() {
  return {
    chat: {
      completions: {
        create: async () => ({ choices: [{ message: { content: 'AI SDK not available in this environment.' } }] }),
        createVision: async () => ({ choices: [{ message: { content: 'Vision SDK not available.' } }] }),
      },
    },
  };
}

export default stub;
