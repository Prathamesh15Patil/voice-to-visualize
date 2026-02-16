import { useState, useEffect } from "react";
import { Chart as ChartJS } from "chart.js/auto";
import { Bar, Line } from "react-chartjs-2";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import CsvUploader from "./CsvUploader";
import toast from "react-hot-toast";

function App() {
  const [micOn, setMicOn] = useState(false);
  const [command, setCommand] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);

  const { transcript, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  /* Sync speech to input */
  useEffect(() => {
    if (transcript) {
      setCommand(transcript);
    }
  }, [transcript]);

  /* Mic control */
  useEffect(() => {
    if (micOn) {
      SpeechRecognition.startListening({
        continuous: true,
        language: "en-IN",
      });
    } else {
      SpeechRecognition.stopListening();
    }
  }, [micOn]);

  if (!browserSupportsSpeechRecognition) {
    return (
      <span className="p-4 block text-center">
        Browser doesn't support speech recognition.
      </span>
    );
  }

  /* Submit */
  const handleSubmit = async () => {
    if (!csvFile || !command.trim()) {
      toast.error("All fields are required!");
      return;
    }

    const formData = new FormData();
    formData.append("file", csvFile);
    formData.append("command", command);
    formData.append("micOn", micOn);

    try {
      setLoading(true);
      const BASE_URL = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${BASE_URL}/api/userInput/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Upload Failed!");
      }

      setChartData(data);
      toast.success("Data sent successfully!");
    } catch (error) {
      toast.error(error.message || "Server Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]" />

      {/* Header */}
      <div className="m-3 sm:m-5 text-center md:text-left">
        <h1 className="text-2xl sm:text-3xl md:text-4xl text-emerald-800 font-bold">
          Welcome to Voice_2_Visualize
        </h1>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col md:flex-row w-full min-h-screen md:min-h-0 px-3 sm:px-6 gap-6">

        {/* LEFT SIDE */}
        <div className="w-full md:w-[40%]">

          <div className="flex flex-col items-center w-full">

            {/* Form */}
            <form className="flex flex-col gap-5 w-full md:w-[85%] mt-4">

              {/* CSV Upload */}
              <CsvUploader setCsvFile={setCsvFile} />

              {/* Input + Mic */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">

                {/* Text Input */}
                <input
                  type="text"
                  placeholder="Enter command..."
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="w-full p-3 border-2 rounded-md bg-gray-100 focus:outline-none focus:border-emerald-600"
                />

                {/* Mic Button */}
                <button
                  type="button"
                  onClick={() => setMicOn((prev) => !prev)}
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200 ${micOn
                    ? "bg-gray-400 shadow-md"
                    : "bg-white hover:bg-gray-100"
                    }`}
                >
                  <img
                    src="/mike-icon.svg"
                    alt="Microphone"
                    className="w-6 h-6"
                  />
                </button>
              </div>
            </form>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-emerald-800 text-white rounded-md px-6 py-2 font-semibold mt-6 hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyse"}
            </button>

            {/* Notes */}
            <div className="mt-8 md:mt-16 bg-amber-200 p-4 rounded-md text-sm sm:text-base w-full md:w-[85%]">
              <p className="font-semibold mb-2">NOTE:</p>

              <p>
                Currently system supports only <b>top-n</b> and <b>trend</b>{" "}
                commands.
              </p>

              <p className="mt-2">
                Examples:
                <br />• Top 5 selling products
                <br />• Top 5 countries by least gold demand
                <br />• Gold trend of India in 2020
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full md:w-[60%] bg-fuchsia-100 flex flex-col items-center rounded-xl relative py-6">

          {/* Chart Container */}
          <div className="w-full md:w-[90%] p-3 sm:p-4 bg-white border rounded-2xl mt-4 md:mt-10 min-h-[250px] md:min-h-[350px]">

            {/* BAR */}
            {chartData?.chart === "bar" && (
              <div className="h-[280px] sm:h-[320px] md:h-[350px]">
                <Bar
                  data={{
                    labels: chartData.chartData.labels,
                    datasets: [
                      {
                        label:
                          chartData.chartData.datasets[0].label,
                        data:
                          chartData.chartData.datasets[0].data,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              </div>
            )}

            {/* LINE */}
            {chartData?.chart === "line" && (
              <div className="h-[280px] sm:h-[320px] md:h-[350px]">
                <Line
                  data={{
                    labels: chartData.chartData.labels,
                    datasets: [
                      {
                        label:
                          chartData.chartData.datasets[0].label,
                        data:
                          chartData.chartData.datasets[0].data,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              </div>
            )}

            {/* Fallback */}
            {!chartData && (
              <p className="text-gray-500 text-center mt-16">
                Upload CSV and enter command to see chart
              </p>
            )}
          </div>

          {/* Loader */}
          {loading && (
            <div className="absolute top-32 z-10">
              <img
                src="https://i.pinimg.com/originals/d2/b6/88/d2b688357b0c20cebde3745a3043108d.gif"
                alt="Loading"
              // className="w-32"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;