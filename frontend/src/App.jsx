import { useState, useEffect } from 'react'
import { Chart as ChartJS } from "chart.js/auto"
import { Bar, Line } from "react-chartjs-2"
// import chartData from "./data.json"
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import CsvUploader from './CsvUploader'
import toast from "react-hot-toast"

function App() {
  const [micOn, setMicOn] = useState(false);
  const [command, setCommand] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [chartData, setChartData] = useState(null);

  const {
    transcript,
    listening,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setCommand(transcript);
    }
  }, [transcript]);


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
    return <span>Browser doesn't support speech recognition.</span>;
  }

  const handleSubmit = async () => {
    // validation
    if (!csvFile || !command.trim()) {
      toast.error("All fields are required!");
      return;
    }

    //Form Data
    const formData = new FormData();

    formData.append("file", csvFile);
    formData.append("command", command);
    formData.append("micOn", micOn);

    try {
      const res = await fetch("/api/userInput/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // console.log(data)
      setChartData(data);

      if (!res.ok) {
        throw new Error(data.message || "Upload Failed!");
      }

      toast.success("Data sent sucessfully!");

    } catch (error) {
      toast.error(error.message || "Server Error");
    }
  }

  return (
    <>
      <div class="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>

      <div className='m-5'>
        <h1 className='text-4xl text-emerald-800 font-bold'>Welcome to Voice_2_Visualize</h1>
      </div>

      <div className='flex w-screen h-[80vh]'>
        {/* left div */}
        <div className='left-side  w-[40vw]'>
          {/* bg-fuchsia-300 */}
          {/* user input section */}
          <div className='m-3 flex flex-col justify-between items-center'>
            <form action="" className='flex flex-col gap-7 w-[30vw] mt-10'>
              {/* <div className='border-2 rounded-md'>
                <input type="file" name="" id="" className='w-full h-full p-4 cursor-pointer' />
              </div> */}
              <div>
                <CsvUploader setCsvFile={setCsvFile} />
              </div>
              <div className=' flex gap-7'>
                <input
                  type="text"
                  placeholder="Enter command..."
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="w-full p-4 border-2 rounded-md bg-gray-100"
                />
                <div className='w-[10%] flex items-center justify-center'>
                  {/* Mic Button */}
                  <button
                    type="button"
                    onClick={() => setMicOn(prev => !prev)}
                    className={`
                        flex items-center justify-center
                        w-12 h-12 rounded-full border-2
                        transition-all duration-200 cursor-pointer
                        ${micOn
                        ? "bg-gray-400 shadow-gray-500"
                        : "bg-white"
                      }
                  `}
                  >
                    <img
                      src="/mike-icon.svg"
                      alt="Microphone"
                      className="w-6 h-6"
                    />
                  </button>
                </div>
              </div>
            </form>

            <button
              className='bg-emerald-800 text-white rounded-md px-4 py-2 font-semibold mt-6'
              onClick={handleSubmit}
            >Analyse</button>

            <div className='mt-25 bg-amber-200 p-3'>
              <p>NOTE : Currently system supports only top-n and trend commands</p>
              <p>For Example : <br /> "Top 5 selling products",<br />"Gold trend of India in 2020"</p>
            </div>
          </div>
        </div>

        {/* right div */}
        <div className='right-side bg-fuchsia-100 w-[57vw] flex flex-col items-center gap-4 rounded-xl'>
          {/* chart section */}
          {/* <h1>{chartData.message}</h1> */}
          <div className='w-[90%] p-4 bg-white border rounded-2xl mt-10'>
            {chartData?.chart === "bar" ? (
              <Bar
                data={{
                  labels: chartData.chartData.labels,
                  datasets: [
                    {
                      label: chartData.chartData.datasets[0].label,
                      data: chartData.chartData.datasets[0].data,
                    },
                  ],
                }}
              />

            ) : chartData?.chart === "line" ? (

              <Line
                data={{
                  labels: chartData.chartData.labels,
                  datasets: [
                    {
                      label: chartData.chartData.datasets[0].label,
                      data: chartData.chartData.datasets[0].data,
                    },
                  ],
                }}
              />

            ) : (

              <p className="text-gray-500 text-center">
                Unsupported chart type
              </p>
            )}
          </div>

        </div>

      </div>
    </>
  )
}

export default App
