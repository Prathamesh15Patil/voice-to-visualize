import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { parseCSV } from "../utils/csvParser.js";
import { executeAnalytics } from "../services/analytics.service.js";
import { formatChartData } from "../services/chart.service.js";
import { geminiProcessing } from "../services/geminiProcessing.service.js";

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

  //
  const numericColumns = parsedData.headers.filter((h) =>
    parsedData.rows.some((r) => !isNaN(Number(r[h]))),
  );

  const nonNumericColumns = parsedData.headers.filter(
    (h) => !numericColumns.includes(h),
  );

  console.log("numericColumns : ", numericColumns);
  console.log("nonNumericColumns : ", nonNumericColumns);

  const rawGeminiOutput = await geminiProcessing({
    command,
    // columns: parsedData.headers,
    numericColumns,
    nonNumericColumns
  });

  // 3️⃣ Clean + Parse Gemini output
  let intent;
  try {
    const cleanedOutput = rawGeminiOutput
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    intent = JSON.parse(cleanedOutput);
  } catch {
    throw new ApiError(400, "Could not understand command");
  }

  // Auto-correct intent for wide CSV totals
  if (
    intent.operation === "group_and_sum" &&
    intent.metric === null &&
    nonNumericColumns.length === 1 &&
    numericColumns.length > 1
  ) {
    intent.operation = "row_sum";
    intent.groupBy = nonNumericColumns[0];
  }

  // 4️⃣ Enforce CLOSED CONTRACT (no guessing)
  const ALLOWED_OPERATIONS = ["group_and_sum", "top_n", "row_sum"];
  const ALLOWED_CHARTS = ["bar", "line", "pie"];

  if (!intent.operation || !ALLOWED_OPERATIONS.includes(intent.operation)) {
    throw new ApiError(400, "Unsupported operation");
  }

  // metric is required ONLY for group_and_sum / top_n
  if (
    (intent.operation === "group_and_sum" || intent.operation === "top_n") &&
    !intent.metric
  ) {
    throw new ApiError(400, "Metric is required for this operation");
  }

  if (!intent.groupBy) {
    throw new ApiError(400, "groupBy is required");
  }

  const limit =
    Number.isInteger(intent.limit) && intent.limit > 0 ? intent.limit : 5;

  const config = {
    operation: intent.operation,
    groupBy: intent.groupBy,
    metric: intent.metric,
    limit,
  };

  // 5️⃣ Execute analytics deterministically
  // const analyticsResult = executeAnalytics(parsedData.rows, config);

  let analyticsResult;

  if (intent.operation === "top_n") {
    // top_n is a modifier → requires aggregation first
    const aggregated = executeAnalytics(parsedData.rows, {
      operation: "group_and_sum",
      groupBy: intent.groupBy,
      metric: intent.metric,
    });

    analyticsResult = aggregated
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  } else if (intent.operation === "row_sum") {
    // row_sum → sum ALL numeric columns per row
    analyticsResult = parsedData.rows.map((row) => {
      let total = 0;

      for (const key in row) {
        if (key !== intent.groupBy) {
          const value = Number(row[key]);
          if (!isNaN(value)) total += value;
        }
      }

      return {
        label: row[intent.groupBy],
        value: total,
      };
    });
  } else {
    // group_and_sum or any future primary op
    analyticsResult = executeAnalytics(parsedData.rows, config);
  }

  const chartData = formatChartData(analyticsResult);

  const chartType = ALLOWED_CHARTS.includes(intent.chart)
    ? intent.chart
    : "bar";

  // 6️⃣ Final response
  return res.status(200).json({
    message: "Analytics computed successfully",
    chartData,
    columns: parsedData.headers,
    chart: chartType,
  });
});

export { analysis };
