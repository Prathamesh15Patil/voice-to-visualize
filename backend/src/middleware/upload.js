// import multer from "multer"

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./public/temp")
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname)
//   }
// })

// export const upload = multer({ storage })



//we are using memory storage here !!
import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv") {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files allowed"), false);
    }
  },
});

export default upload;
