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

  console.log("BODY RAW:", req.body);
  console.log("FILE:", req.file);
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
    nonNumericColumns,
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

  // // Auto-upgrade top_n for wide CSVs (row_sum first)
  // if (
  //   intent.operation === "top_n" &&
  //   !intent.metric &&
  //   nonNumericColumns.length === 1 &&
  //   numericColumns.length > 1
  // ) {
  //   intent.operation = "row_sum";
  //   intent.groupBy = nonNumericColumns[0];
  //   intent._applyTopN = true; // internal flag
  // }

  // // Auto-correct intent for wide CSV totals
  // if (
  //   intent.operation === "group_and_sum" &&
  //   intent.metric === null &&
  //   nonNumericColumns.length === 1 &&
  //   numericColumns.length > 1
  // ) {
  //   intent.operation = "row_sum";
  //   intent.groupBy = nonNumericColumns[0];
  // }

  // 🔁 Normalize intent for wide CSVs
  // if (nonNumericColumns.length === 1 && numericColumns.length > 1) {
  //   // Case 1: total demand per entity
  //   if (intent.operation === "group_and_sum" && !intent.metric) {
  //     intent.operation = "row_sum";
  //     intent.groupBy = nonNumericColumns[0];
  //   }

  //   // Case 2: top N demand per entity
  //   if (intent.operation === "top_n") {
  //     intent.operation = "row_sum";
  //     intent.groupBy = nonNumericColumns[0];
  //     intent._applyTopN = true;
  //   }
  // }

  console.log("FINAL INTENT:", intent);

  // 🔁 Normalize intent
  if (nonNumericColumns.length === 1 && numericColumns.length > 1) {
    // Top-N on wide CSV
    if (intent.operation === "top_n") {
      intent.operation = "row_sum";
      intent.groupBy = nonNumericColumns[0];
      intent._applyTopN = true;
    }

    // Total per entity
    if (intent.operation === "group_and_sum" && !intent.metric) {
      intent.operation = "row_sum";
      intent.groupBy = nonNumericColumns[0];
    }
  }

  // Fallback: auto-fill groupBy for row_sum
  if (
    intent.operation === "row_sum" &&
    (!intent.groupBy || intent.groupBy.length === 0) &&
    nonNumericColumns.length === 1
  ) {
    intent.groupBy = nonNumericColumns[0];
  }

  // Fix wrong column names from Gemini
  if (intent.groupBy && !parsedData.headers.includes(intent.groupBy)) {
    const match = parsedData.headers.find(
      (h) => h.toLowerCase() === intent.groupBy.toLowerCase(),
    );

    if (match) {
      intent.groupBy = match;
    }
  }

  if (intent.columns) {
    for (const col of intent.columns) {
      if (!parsedData.headers.includes(col)) {
        throw new ApiError(400, `Invalid column: ${col}`);
      }
    }
  }

  // 4️⃣ Enforce CLOSED CONTRACT (no guessing)
  const allowedOperations = [
    "group_and_sum",
    "row_sum",
    "top_n",
    "time_series",
  ];
  const allowedCharts = ["bar", "line", "pie"];

  // if (!intent.operation || !ALLOWED_OPERATIONS.includes(intent.operation)) {
  //   throw new ApiError(400, "Unsupported operation");
  // }

  // // metric is required ONLY for group_and_sum
  // if (intent.operation === "group_and_sum" && !intent.metric) {
  //   throw new ApiError(400, "Metric is required for this operation");
  // }

  if (!allowedOperations.includes(intent.operation)) {
    throw new ApiError(400, "Unsupported operation");
  }

  if (intent.operation === "group_and_sum" && !intent.metric) {
    throw new ApiError(400, "Metric is required for this operation");
  }

  // Normalize groupBy properly
  if (typeof intent.groupBy === "string") {
    intent.groupBy = intent.groupBy.trim();
  }

  // ✅ Validate selected columns from Gemini
  if (intent.columns) {
    for (const col of intent.columns) {
      if (!parsedData.headers.includes(col)) {
        throw new ApiError(400, `Invalid column: ${col}`);
      }
    }
  }
  // Validate value for time_series
  if (intent.operation === "time_series" && intent.value) {
    const exists = parsedData.rows.some(
      (r) => r[intent.groupBy] === intent.value,
    );

    if (!exists) {
      throw new ApiError(400, `Value not found: ${intent.value}`);
    }
  }

  // Validate groupBy
  if (!["time_series"].includes(intent.operation) && !intent.groupBy) {
    throw new ApiError(400, "groupBy is required");
  }

  const limit =
    Number.isInteger(intent.limit) && intent.limit > 0 ? intent.limit : 5;

  const config = {
    operation: intent.operation,
    groupBy: intent.groupBy,
    metric: intent.metric, // only for group_and_sum
    columns: intent.columns || numericColumns,
    limit,
  };

  // 5️⃣ Execute analytics deterministically
  // const analyticsResult = executeAnalytics(parsedData.rows, config);

  let analyticsResult;

  // if (intent.operation === "top_n" && intent.metric) {
  //   // top_n is a modifier → requires aggregation first
  //   const aggregated = executeAnalytics(parsedData.rows, {
  //     operation: "group_and_sum",
  //     groupBy: intent.groupBy,
  //     metric: intent.metric,
  //   });

  //   analyticsResult = aggregated
  //     .sort((a, b) => b.value - a.value)
  //     .slice(0, limit);
  // }

  // ---------- TIME SERIES ----------
  if (intent.operation === "time_series") {
    const timeCols = intent.columns || numericColumns;

    let row = null;

    // Case 1: User specified entity (China, India, etc.)
    if (intent.groupBy && intent.value) {
      row = parsedData.rows.find((r) => {
        const cell = r[intent.groupBy];
        const target = intent.value;

        if (!cell || !target) return false;

        return (
          String(cell).trim().toLowerCase() ===
          String(target).trim().toLowerCase()
        );
      });

      if (!row) {
        throw new ApiError(
          400,
          `No data found for ${intent.value} in ${intent.groupBy}`,
        );
      }
    }

    // Case 2: No entity → fallback (first row)
    else {
      row = parsedData.rows[0];
    }

    analyticsResult = timeCols.map((col) => ({
      label: col,
      value: Number(row[col]) || 0,
    }));

    intent.chart = "line";
  }

  // ---------- ROW SUM ----------
  else if (intent.operation === "row_sum") {
    analyticsResult = parsedData.rows.map((row) => {
      let total = 0;

      const colsToUse = intent.columns || numericColumns;

      for (const col of colsToUse) {
        const v = Number(row[col]);
        if (!isNaN(v)) total += v;
      }

      return {
        label: row[intent.groupBy],
        value: total,
      };
    });

    // Apply top N if needed-->changed this block to below
    // Apply top-N whenever limit is present
    if (Number.isInteger(limit)) {
      analyticsResult = analyticsResult
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    }
  }

  // ---------- GROUP + SUM ----------
  else {
    analyticsResult = executeAnalytics(parsedData.rows, config);

    // Apply top-N if requested
    if (intent.operation === "group_and_sum" && Number.isInteger(limit)) {
      analyticsResult = analyticsResult
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    }
  }

  const chartData = formatChartData(analyticsResult);

  const chartType = allowedCharts.includes(intent.chart) ? intent.chart : "bar";

  // 6️⃣ Final response
  return res.status(200).json({
    message: "Analytics computed successfully",
    chartData,
    columns: parsedData.headers,
    chart: chartType,
  });
});

export { analysis };
