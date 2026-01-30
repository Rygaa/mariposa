// Load environment variables first
require("dotenv").config({ path: __dirname + "/.env" });

// Import and run the compiled backend
require("./dist/index.js");
