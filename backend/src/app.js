import express from "express"
import cors from "cors"

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN
}))

app.use(express.json({limit: "16kb"}))

//to store static files like pdf,jpeg etc to local server
app.use(express.static("public"))


//routes import
import analyzeRoute from "./routes/analyze.routes.js"

//routes declaration - In simple Node files we used to write app.get along with its functioning in one file , but here as we have separated/divided or working between different files-we'll use middle to get route.

//---> now why this is done in future if we want to add more functionalities to this app then that would be easy to handle and clean!

app.use("/userInput",analyzeRoute)
export {app} 

//http://localhost:3000/userInput/analyze