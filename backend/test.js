import dotenv from "dotenv"
import { GoogleGenAI } from "@google/genai";

dotenv.config({ path: './.env' })

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

async function test() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "List 5 countries starting with letter A",
  });
  console.log(response.text);
}

test();