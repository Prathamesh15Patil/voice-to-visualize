import { useRef, useState } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";

export default function CsvUploader({ setCsvFile }) {
    const fileRef = useRef(null);

    const [fileName, setFileName] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [previewData, setPreviewData] = useState([]);

    /*USER UPLOAD*/
    const onFileChange = (e) => {
        const selectedFile = e.target.files[0];

        if (!selectedFile) return;

        // Validation of File
        if (selectedFile.type !== "text/csv") {
            toast.error("Only CSV(Excel) files are allowed");
            fileRef.current.value = "";
            setCsvFile(null);
            return;
        }

        setFileName(selectedFile.name);
        setCsvFile(selectedFile);
    };

    /*USE SAMPLE*/
    const useSample = async () => {
        const res = await fetch("/sample.csv");
        const text = await res.text();

        const blob = new Blob([text], { type: "text/csv" });

        const file = new File([blob], "sample.csv", {
            type: "text/csv",
        });

        const dt = new DataTransfer();
        dt.items.add(file);

        fileRef.current.files = dt.files;

        setFileName("sample.csv");
        setCsvFile(file);
    };

    /*PREVIEW SAMPLE ONLY*/
    const previewSample = async () => {
        const res = await fetch("/sample.csv");
        const text = await res.text();

        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
                setPreviewData(result.data);
                setShowPreview(true);
            },
        });
    };

    return (
        <div >
            {/* File Input */}
            <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={onFileChange}
                className="p-4 border-2 rounded-md w-10/12 bg-gray-100 cursor-pointer"
            // className="block w-full text-sm text-gray-700
            //    file:mr-4 file:py-2 file:px-4
            //    file:rounded-md file:border-0
            //    file:bg-blue-50 file:text-blue-700
            //    hover:file:bg-blue-100"
            />

            {fileName && (
                <p className="mt-2 text-sm text-gray-600">
                    Selected: <span className="font-medium">{fileName}</span>
                </p>
            )}

            {/* Buttons */}
            <div className="mt-4 flex gap-3">

                <button
                    type="button"
                    onClick={useSample}
                    className="px-4 py-2 bg-emerald-800 text-white rounded-md
                     hover:bg-emerald-700 transition cursor-pointer"
                >
                    Use Sample
                </button>

                <button
                    type="button"
                    onClick={previewSample}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md
                     hover:bg-gray-700 transition cursor-pointer"
                >
                    Preview Sample
                </button>

            </div>

            {/* Modal */}
            {showPreview && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

                    <div className="bg-white rounded-lg shadow-lg
                          w-[90%] max-w-3xl p-6">

                        <h3 className="text-lg font-semibold mb-4">
                            Sample CSV Preview
                        </h3>

                        {/* Table Wrapper */}
                        <div className="max-h-[500px] overflow-auto border rounded">

                            <table className="min-w-full border-collapse text-sm">

                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        {previewData[0] &&
                                            Object.keys(previewData[0]).map((k) => (
                                                <th
                                                    key={k}
                                                    className="border px-3 py-2 text-left font-medium"
                                                >
                                                    {k}
                                                </th>
                                            ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {previewData.slice(0, 15).map((row, i) => (
                                        <tr
                                            key={i}
                                            className="odd:bg-white even:bg-gray-50"
                                        >
                                            {Object.values(row).map((v, j) => (
                                                <td
                                                    key={j}
                                                    className="border px-3 py-2"
                                                >
                                                    {v}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>

                            </table>
                        </div>

                        {/* Close Button */}
                        <div className="mt-4 text-right">
                            <button
                                type="button"
                                onClick={() => setShowPreview(false)}
                                className="px-4 py-2 bg-red-500 text-white rounded-md
                           hover:bg-red-600 transition"
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
