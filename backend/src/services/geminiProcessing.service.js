import { GoogleGenAI } from "@google/genai";

export const geminiProcessing = async ({
  command,
  // columns, could be usefull for future complex commands
  numericColumns,
  nonNumericColumns
}) => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const response = await ai.models.generateContent({
    model: "models/gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `
You are a data-analytics intent parser.

User command:
"${command}"

CSV schema:
- Categorical columns: ${nonNumericColumns.join(", ")}
- Numeric columns: ${numericColumns.join(", ")}

Rules:
- If the command asks for "total" across time and there are multiple numeric columns, use operation "row_sum".
- Use "group_and_sum" only when exactly ONE numeric metric column is involved.
- Use "top_n" only as a ranking modifier.

Return ONLY valid JSON.
No markdown. No explanation.

Schema:
{
  "operation": "group_and_sum | top_n | row_sum",
  "groupBy": string,
  "metric": string | null,
  "limit": number | null,
  "chart": "bar | line | pie"
}
`
          }
        ]
      }
    ]
  });

  return response.candidates[0].content.parts[0].text;
};
