const aiHandler = require("../aiHandler");

class MetricService {
	async evaluateAccuracy(response, expected) {
		const scores = {
			relevance: await this._calculateRelevance(response, expected),
			coherence: await this._calculateCoherence(response),
			// contextAdherence: await this._calculateContextAdherence(response, expected),
			// instructionFollowing: await this._calculateInstructionFollowing(response, expected),
		};

		return {
			scores,
			overall: Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length,
		};
	}

	async evaluateQuality(response, expected) {
		const scores = {
			responseAccuracy: await this._calculateResponseAccuracy(response, expected),
			completionQuality: await this._evaluateCompletionQuality(response),
			semanticSimilarity: await this._calculateSemanticSimilarity(response, expected),
			factualCorrectness: await this._evaluateFactualCorrectness(response),
		};

		return {
			scores,
			overall: Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length,
		};
	}

	async _calculateRelevance(response, expected) {
		let response_format = {
			relavence: "number ",
		};
		const prompt = `Rate the relevance of this response (0-1):
            Response: ${response}
            Expected: ${expected}`;
		const result = await aiHandler.processText(prompt, response_format);
		return parseFloat(result.relavence);
	}

	async _calculateCoherence(response) {
		let response_format = {
			relavence: "number ",
		};
		const prompt = `Rate the coherence of this text (0-1): ${response}`;
		const result = await aiHandler.processText(prompt, response_format);
		return parseFloat(result.relavence);
	}

	// Add other private evaluation methods as needed
}

module.exports = new MetricService();
