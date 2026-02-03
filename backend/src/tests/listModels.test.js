import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function listModels() {
  const response = await ai.models.list();

  console.log("RAW RESPONSE:\n", response);

  console.log("\nAVAILABLE MODELS:\n");

  for (const model of response.models) {
    console.log({
      name: model.name,
      supportedMethods: model.supportedGenerationMethods,
    });
  }
}

listModels().catch(console.error);
