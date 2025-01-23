const testRunner = require("../src/services/testRunner");
const reportingService = require("../src/services/reportingService");
const testData = require("./testData");

async function runTests() {
	try {
		console.log("Running single test...");
		const singleResult = await testRunner.runTest(testData.singleTest);
		console.log("Single test result:", JSON.stringify(singleResult, null, 2));

		console.log("\nRunning batch tests...");
		const batchResults = await testRunner.runBatch(testData.batchTests);
		await reportingService.recordBatchResults(batchResults);

		console.log("Batch test results:", JSON.stringify(batchResults, null, 2));

		const metrics = await reportingService.getMetrics();
		console.log("\nTest Metrics:", JSON.stringify(metrics, null, 2));
	} catch (error) {
		console.error("Test execution failed:", error);
	}
}

// Run the tests
if (require.main === module) {
	runTests()
		.then(() => {
			console.log("Tests completed");
			process.exit(0);
		})
		.catch((err) => {
			console.error("Tests failed:", err);
			process.exit(1);
		});
}

module.exports = { runTests };
