import Papa from "papaparse";

export const parseCSV = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const csvString = fileBuffer.toString("utf-8");

    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length) {
          return reject(results.errors);
        }

        resolve({
          headers: results.meta.fields,
          rows: results.data
        });
      },
      error: (error) => reject(error),
    });
  });
};
