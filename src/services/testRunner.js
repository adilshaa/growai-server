const aiHandler = require("../aiHandler");
const metricService = require("./metricService");
const config = require("../../new.json");
// const g4fConfig = require('./g4fConfig');

// Store results in closure
let results = [];
const testConfig = config.aiModelEvaluationSystem.testingConfiguration;

const runTest = async (testCase) => {
	try {
		let response;

		if (testCase.configuration.useG4F) {
			// Use G4F if specified
			const g4fAvailable = await g4fConfig.isAvailable();
			if (!g4fAvailable) {
				throw new Error("G4F service is not available");
			}

			response = await axios.post(g4fConfig.getConfig().apiEndpoint, {
				model: testCase.configuration.modelId,
				messages: [{ role: "user", content: testCase.input }],
				web_search: false,
			});

			response = response.data.data.content;
		} else {
			// Use existing OpenRouter implementation
			let response_format = { process: "string " };
			response = await aiHandler.processText(testCase.input, response_format);
			response = response.process;
		}

		const startTime = Date.now();
		const executionTime = Date.now() - startTime;

		const metrics = {
			accuracy: await metricService.evaluateAccuracy(response, testCase.expectedOutput),
			// quality: await metricService.evaluateQuality(response, testCase.expectedOutput)
		};

		const result = {
			testCase,
			response,
			metrics,
			executionTime,
			timestamp: new Date().toISOString(),
		};

		results.push(result);
		return result;
	} catch (error) {
		console.error("Test execution failed:", error);
		throw error;
	}
};

const runBatch = async (testCases) => {
	const batchResults = [];
	const batchSize = testConfig.batchSize;

	for (let i = 0; i < testCases.length; i += batchSize) {
		const batch = testCases.slice(i, i + batchSize);
		const results = await Promise.all(batch.map((test) => runTest(test)));
		batchResults.push(...results);
	}

	return batchResults;
};

const getResults = () => results;

const clearResults = () => {
	results = [];
};

// Export the same interface as before
module.exports = {
	runTest,
	runBatch,
	getResults,
	clearResults,
};
