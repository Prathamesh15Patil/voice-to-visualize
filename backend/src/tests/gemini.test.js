import dotenv from "dotenv";
dotenv.config();
import { geminiProcessing } from "../services/geminiProcessing.service.js";

(async () => {
  const response = await geminiProcessing({
    contents: "List 5 countries starting with letter A",
    // columns: []
  });

  console.log(response);
})();
