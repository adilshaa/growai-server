const express = require("express");
const router = express.Router();
const testRunner = require("./src/services/testRunner");
const reportingService = require("./src/services/reportingService");
const config = require("./new.json");

router.post("/api/v1/test-model", async (req, res) => {
	try {
		const { modelId, prompt, temperature, maxTokens, configuration } = req.body;
		const testCase = {
			input: prompt,
			expectedOutput: req.body.expectedOutput,
			configuration: {
				modelId: configuration.modelId,
				temperature: configuration.temperature,
				maxTokens: configuration.maxTokens,
			},
		};

		const result = await testRunner.runTest(testCase);
		await reportingService.recordResult(result);

		res.json({
			success: true,
			data: result,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

router.get("/api/v1/metrics", async (req, res) => {
	try {
		const metrics = await reportingService.getMetrics(req.query);
		res.json({
			success: true,
			data: metrics,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
});

router.post("/api/v1/batch-test", async (req, res) => {
	try {
		const { testCases } = req.body;
		const results = await testRunner.runBatch(testCases);
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

module.exports = router;
