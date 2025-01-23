const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // Add this import
const routes = require("./routes");
const testRunner = require("./src/services/testRunner");
const reportingService = require("./src/services/reportingService");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:5000";

// Spawn Python process
let pythonProcess;

function startPythonService() {
	const pythonPath = path.join(__dirname, "app.py");
	pythonProcess = spawn("python", [pythonPath]);

	pythonProcess.stdout.on("data", (data) => {
		console.log("Python service output:", data.toString());
	});

	pythonProcess.stderr.on("data", (data) => {
		console.error("Python service error:", data.toString());
	});

	pythonProcess.on("close", (code) => {
		console.log(`Python service exited with code ${code}`);
		// Restart the service if it crashes
		setTimeout(startPythonService, 5000);
	});
}

// Start Python service when Node.js server starts
startPythonService();

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

// Add this near other route definitions
app.post("/api/v1/chat", async (req, res) => {
	if (!req.body || !req.body.message) {
		return res.status(400).json({
			success: false,
			error: "Message is required",
		});
	}

	try {
		const response = await fetch(`${PYTHON_SERVICE_URL}/api/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({
				message: req.body.message,
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		res.json(data);
	} catch (error) {
		console.error("Error communicating with Python service:", error);
		res.status(500).json({
			success: false,
			error: "Failed to communicate with GPT service",
			details: error.message,
		});
	}
});

// Cleanup on server shutdown
process.on("SIGINT", () => {
	if (pythonProcess) {
		pythonProcess.kill();
	}
	process.exit();
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	console.log("Available endpoints:");
	console.log("- POST /api/v1/test-model");
	console.log("- POST /api/v1/batch-test");
	console.log("- GET  /api/v1/metrics");
	console.log("- GET  /api/v1/run-sample-test");
	console.log("- GPT Service running on localhost:5000");
});

module.exports = app;
