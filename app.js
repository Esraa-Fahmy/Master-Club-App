const path = require('path');
const express = require("express");
const dotenv = require("dotenv");
const cors = require('cors');
const compression = require("compression");
const http = require("http");
dotenv.config({ path: "config.env" });
const dbConnection = require("./config/database");
const ApiError = require("./utils/apiError");
const globalError = require("./midlewares/errmiddleware");


dbConnection();

const app = express();


// Middleware
app.use(compression());

app.use(cors());


app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "uploads")));





// Mount Routes
app.use("/api/v1/auth", require("./routes/authRoute"));
app.use("/api/v1/user", require("./routes/userRoute"));






// Global Error Handler
app.use(globalError);


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});