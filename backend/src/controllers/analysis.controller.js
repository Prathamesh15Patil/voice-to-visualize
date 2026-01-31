import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { parseCSV } from "../utils/csvParser.js";
import { groupAndSum, getTopN } from "../services/analytics.service.js";
import { formatChartData } from "../services/chart.service.js";

const analysis = asyncHandler(async (req, res) => {
  //get user data from frontend
  //validation - not empty
  //check for csv file
  //return res

  const { command } = req.body; //later we also need to verify whether the command given is legit, related file uploaded!
  console.log("command : ", command);

  if (!command || command.trim() === "") {
    throw new ApiError(400, "Operation command is required!");
  }

  const userFile = req.file;

  if (!userFile) {
    throw new ApiError(400, "CSV(Excel) file is required!");
  }

  if (userFile.mimetype !== "text/csv") {
    throw new ApiError(400, "Only CSV(Excel) files are allowed!");
  }

  console.log("File received:", userFile.originalname);

  const parsedData = await parseCSV(userFile.buffer);

  console.log("Headers:", parsedData.headers);
  console.log("Sample Row:", parsedData.rows[0]);

  const groupedData = groupAndSum(parsedData.rows, "product", "sales");

  const topProducts = getTopN(groupedData, 5);
  const chartData = formatChartData(topProducts);

  return res.status(200).json({
    message: "Analytics computed successfully",
    result: topProducts,
    chartData
  });
});

export { analysis };
