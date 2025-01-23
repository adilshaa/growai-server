const express = require("express");
const cors = require("cors");
const routes = require("../routes");
const testRunner = require("./services/testRunner");
const reportingService = require("./services/reportingService");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(routes);

// Test data endpoint
app.get("/api/v1/run-sample-test", async (req, res) => {
	try {
		const sampleTests = [
			{
				input: "Write a function to calculate fibonacci sequence in JavaScript",
				expectedOutput:
					"function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}",
				configuration: {
					modelId: "google/gemini-2.0-flash-exp:free",
					temperature: 0.7,
					maxTokens: 500,
				},
			},
			{
				input: "Explain the concept of dependency injection",
				expectedOutput:
					"Dependency injection is a design pattern where dependencies are passed into an object instead of being created inside it.",
				configuration: {
					modelId: "google/gemini-2.0-flash-exp:free",
					temperature: 0.7,
					maxTokens: 500,
				},
			},
		];

		const results = await testRunner.runBatch(sampleTests);
		await reportingService.recordBatchResults(results);

		res.json({
			success: true,
			data: results,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log("Available endpoints:");
	console.log("- POST /api/v1/test-model");
	console.log("- POST /api/v1/batch-test");
	console.log("- GET  /api/v1/metrics");
	console.log("- GET  /api/v1/run-sample-test");
});

module.exports = app;
