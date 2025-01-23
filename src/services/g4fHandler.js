const axios = require("axios");

class G4FClient {
	constructor() {
		// You can configure your own G4F API endpoint
		this.baseURL = "http://localhost:1337/v1"; // Default G4F API endpoint
		this.client = axios.create({
			baseURL: this.baseURL,
			headers: {
				"Content-Type": "application/json",
			},
		});
	}

	async createCompletion(options = {}) {
		try {
			const response = await this.client.post("/chat/completions", {
				model: options.model || "gpt-4",
				messages: options.messages || [],
				web_search: options.webSearch || false,
				...options,
			});

			return response.data;
		} catch (error) {
			console.error("G4F API Error:", error.message);
			throw error;
		}
	}

	// Helper method to format messages
	formatMessages(content, role = "user") {
		return [
			{
				role,
				content,
			},
		];
	}
}

// Example usage
const g4f = new G4FClient();

// Simple usage example
async function example() {
	try {
		const response = await g4f.createCompletion({
			model: "gpt-4",
			messages: g4f.formatMessages("Hello"),
			web_search: false,
		});

		console.log(response.choices[0].message.content);
		return response;
	} catch (error) {
		console.error("Error:", error);
		throw error;
	}
}

module.exports = {
	G4FClient,
	example,
};
