import { GoogleGenAI } from "@google/genai";

export const geminiProcessing = async ({
  command,
  // columns, could be usefull for future complex commands
  numericColumns,
  nonNumericColumns,
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
You are a strict data-analytics intent parser.

Your job is to convert the user command into structured JSON.

User command:
"${command}"

CSV schema:
- Categorical columns: ${nonNumericColumns.join(", ")}
- Numeric columns: ${numericColumns.join(", ")}

Important:
This CSV has ONE categorical column and MANY numeric columns.
Each row represents one entity with multiple measurements.

--------------------------------
SUPPORTED OPERATIONS
--------------------------------

1. "group_and_sum"
→ Group by a categorical column and sum ONE numeric column

Use when user asks:
- "sum sales by product"
- "total revenue by region"

2. "row_sum"
→ Sum ALL numeric columns per row

Use when user asks:
- "total demand by country"
- "top countries"
- "highest overall values"

3. "time_series"
→ Plot numeric columns in order

Use when user asks:
- "trend"
- "over time"
- "quarterly"
- "yearly"
- "timeline"

--------------------------------
RULES
--------------------------------

1. If user asks for "top / highest / most / largest":
   → operation = "row_sum"
   → set "limit"

2. If user asks for totals across time:
   → operation = "row_sum"

3. If user asks for trend or timeline:
   → operation = "time_series"

4. For "row_sum" and "group_and_sum":
   → groupBy MUST be one of:
     ${nonNumericColumns.join(", ")}

5. For "time_series":
   → groupBy MUST be null

6. Never invent column names.
   Only use given columns.

--------------------------------
OUTPUT FORMAT
--------------------------------

Return ONLY valid JSON.
No markdown.
No comments.
No explanation.

Schema:

{
  "operation": "group_and_sum | row_sum | time_series",
  "groupBy": "string | null",
  "metric": "string | null",
  "limit": number | null,
  "chart": "bar | line | pie"
}
`,
          },
        ],
      },
    ],
  });

  return response.candidates[0].content.parts[0].text;
};
