const OpenAI = require("openai");
const axios = require("axios");
const fetch = require("node-fetch");
const { extract, extractJsonFromString } = require("./services/extractor");
const g4fService = require("./services/g4fHandler");
require("dotenv").config();

const aiHandler = {
	openai: new OpenAI({
		baseURL: "https://openrouter.ai/api/v1",
		apiKey: process.env.OPENROUTER_API_KEY,
		defaultHeaders: {
			"HTTP-Referer": "http://localhost:3000",
			"X-Title": "LocalAI",
			"Content-Type": "application/json",
		},
		fetch: fetch, // Add fetch implementation
	}),

	async processText(prompt, response_format, options = {}) {
		const messages = this.constructMessages(prompt, response_format, options);
		options.schema = response_format;
		return this.generateCompletionWithFetch(messages, options);
	},

	async processTextWithG4F(prompt, options = {}) {
		try {
			const messages = [{ role: "user", content: prompt }];
			const response = await g4fService.example(messages, {
				model: options.model || "gpt-4o",
				webSearch: options.webSearch || false,
			});

			if (!response.success) {
				throw new Error(response.error || "G4F request failed");
			}

			return response.data.content;
		} catch (error) {
			console.error("G4F processing error:", error);
			throw error;
		}
	},

	async processImage(prompt, imageUrl, options = {}) {
		try {
			if (!imageUrl || !prompt) {
				throw new Error("Both prompt and imageUrl are required");
			}

			// Include historical context if available
			const contextualPrompt = options.historicalInsights
				? `${prompt}\n\nHistorical Context:\n${JSON.stringify(options.historicalInsights, null, 2)}`
				: prompt;

			const messages = [
				{
					role: "system",
					content:
						"You are an AI assistant that analyzes websites with historical context awareness. Compare current analysis with historical patterns and highlight significant changes.",
				},
				{
					role: "user",
					content: [
						{ type: "text", text: contextualPrompt },
						{
							type: "image_url",
							image_url: { url: imageUrl },
						},
					],
				},
			];

			const response = await this.generateCompletionWithFetch(messages, {
				...options,
				model: process.env.MODEL_NAME,
			});

			return response;
		} catch (error) {
			console.error("Image processing error:", error);
			throw error;
		}
	},

	async processFunctionCall(prompt, response_format, functionName, args, options = {}) {
		const messages = this.constructMessages(prompt, options);
		return this.generateCompletionWithFetch(messages, functionName, args, options);
	},

	constructMessages(prompt, response_format, options = {}) {
		const baseMessages = [
			{
				role: "system",
				content: `You are an AI assistant that analyzes user prompts. 
                Always provide responses in valid JSON format following the schema structure. 

				`,
			},
		];

		if (options.imageUrl) {
			return [
				...baseMessages,
				{
					role: "user",
					content: [
						{ type: "text", text: prompt },
						{
							type: "image_url",
							image_url: {
								url: options.imageUrl,
							},
						},
					],
				},
			];
		}

		return [...baseMessages, { role: "user", content: prompt }];
	},

	convertBase64ToURL(base64String) {
		// For now, return a placeholder URL if it's base64
		// In production, you should upload this to a storage service
		if (base64String.startsWith("data:")) {
			throw new Error(
				"Direct base64 images are not supported. Please provide an image URL or implement image upload."
			);
		}
		return base64String;
	},

	async generateCompletion(messages, options = {}) {
		try {
			const modelConfig = {
				model: process.env.MODEL_NAME,
				messages,
				temperature: options.temperature || 0.7,
				max_tokens: options.maxTokens || 2000,
				response_format: { type: "json_object" },
				route: "fallback", // Add route configuration
				provider_list: options.providers || [
					// Configure provider list

					{
						provider: "openai",
						order: 1,
						weight: 1,
					},
					{
						provider: "together",
						order: 2,
						weight: 1,
					},
				],
			};

			const response = await this.openai.chat.completions.create(modelConfig);
			if (!response?.choices?.[0]?.message?.content) {
				throw new Error("Invalid response from API");
			}

			return response.choices[0].message.content;
		} catch (error) {
			console.error("OpenRouter API error:", error);
			throw new Error(`API request failed: ${error.message}`);
		}
	},

	async generateToolCompletion(messages, functionName, args, options = {}) {
		try {
			const completion = await this.openai.chat.completions.create({
				model: process.env.MODEL_NAME,
				messages,
				tools: [
					{
						type: "function",
						function: {
							name: functionName,
							parameters: args,
						},
					},
				],
				tool_choice: { type: "function", function: { name: functionName } },
			});
			return completion.choices[0]?.message;
		} catch (err) {
			console.error("Tool completion error:", err);
			throw err;
		}
	},

	// Alternative direct fetch implementation
	async generateCompletionWithFetch(messages, options = {}) {
		try {
			const payload = {
				message: messages,
				structured_outputs: true,
				config: {
					model: process.env.MODEL_NAME,
					temperature: options.temperature || 0.5,
					max_tokens: options.maxTokens || 500,
				},
			};

			// Add response format if provided
			if (options.schema) {
				payload.response_format = {
					type: "json_schema",
					json_schema: {
						name: options.schema.name || "response",
						strict: options.schema.strict !== false,
						schema: options.schema,
					},
				};
			}

			const response = await axios.post("http://localhost:5000/api/chat", payload);

			if (response.data.error) {
				throw new Error(response.data.error);
			}

			const content = response.data.choices[0].message.content;
			console.log("Content:", content);
			if (options.schema && !response.data.schema_validated) {
				throw new Error("Response failed schema validation");
			}

			return typeof content === "object" ? content : JSON.parse(content);
		} catch (error) {
			console.error("OpenRouter API error:", error.response?.data || error.message);
			throw new Error(error.response?.data?.error?.message || error.message);
		}
	},
};

module.exports = aiHandler;
