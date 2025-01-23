const { marked } = require("marked");
const hljs = require("highlight.js");

const extractor = {
	extractCodeBlocks(text) {
		const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
		const blocks = [];
		let match;

		while ((match = codeBlockRegex.exec(text)) !== null) {
			blocks.push({
				language: match[1] || "plaintext",
				code: match[2].trim(),
				type: "code",
			});
		}
		return blocks;
	},

	extractMarkdown(text) {
		const tokens = marked.lexer(text);
		return tokens.map((token) => ({
			type: token.type,
			content: token.text || token.raw,
			...(token.lang && { language: token.lang }),
		}));
	},

	extractHTML(text) {
		const htmlRegex = /<[^>]+>/g;
		const htmlTags = text.match(htmlRegex) || [];
		return htmlTags.map((tag) => ({
			type: "html",
			content: tag,
			tag: tag.match(/<\/?([a-z0-9]+)/i)?.[1],
		}));
	},

	detectLanguage(code) {
		try {
			const result = hljs.highlightAuto(code);
			return result.language;
		} catch {
			return "plaintext";
		}
	},

	formatStructuredResponse(response) {
		try {
			// Handle non-string responses
			if (!response) return { error: "Empty response" };
			if (typeof response !== "string") return response;

			// Try to parse JSON, if fails return formatted text
			let parsed;
			try {
				parsed = JSON.parse(response);
			} catch (e) {
				return this.extractMixedContent(response);
			}

			if (parsed.transcript_analysis) {
				return {
					analysis: parsed.transcript_analysis,
					format: {
						codeBlocks: this.extractCodeBlocks(parsed.transcript_analysis.text),
						keyPoints: parsed.transcript_analysis.key_points,
						metadata: {
							sentiment: parsed.transcript_analysis.sentiment,
							tone: parsed.transcript_analysis.tone,
							language: parsed.transcript_analysis.language,
							purpose: parsed.transcript_analysis.purpose,
						},
					},
				};
			}
			return parsed;
		} catch (e) {
			console.error("Error formatting response:", e);
			return { error: "Invalid response format", raw: response };
		}
	},

	extractMixedContent(text) {
		// Extract potential JSON from text
		const jsonPattern = /```json\s*([\s\S]*?)\s*```/g;
		const jsonMatches = [...text.matchAll(jsonPattern)];

		const jsons = jsonMatches
			.map((match) => {
				try {
					return JSON.parse(match[1].trim());
				} catch (e) {
					return null;
				}
			})
			.filter(Boolean);

		// Extract text content
		const textContent = text
			.replace(jsonPattern, "")
			.replace(/```[\s\S]*?```/g, "")
			.trim();

		// Extract plan or steps
		const planPattern = /(?:Here's a plan:|Steps?:)\s*((?:\d+\.\s*[^.\n]+[.\n]?\s*)+)/i;
		const planMatch = text.match(planPattern);
		const steps = planMatch
			? planMatch[1]
					.split(/\d+\.\s*/)
					.filter(Boolean)
					.map((step) => step.trim())
			: [];

		return {
			json: jsons[0] || null,
			text: textContent,
			steps,
			codeBlocks: this.extractCodeBlocks(text),
			markdown: this.extractMarkdown(text),
		};
	},

	extractJsonFromString(text) {
		try {
			// Remove markdown code block markers if present
			const cleanText = text.replace(/```json\n|\n```/g, "");

			// Try to parse the cleaned text
			const parsed = JSON.parse(cleanText);
			return {
				success: true,
				data: parsed,
			};
		} catch (error) {
			// If direct parse fails, try to find JSON within the text
			try {
				const jsonMatch = text.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					const jsonStr = jsonMatch[0];
					const parsed = JSON.parse(jsonStr);
					return {
						success: true,
						data: parsed,
					};
				}
			} catch (e) {
				console.error("JSON extraction failed:", e);
			}

			return {
				success: false,
				error: "Invalid JSON format",
				originalText: text,
			};
		}
	},

	formatResponse(response) {
		if (typeof response === "string") {
			const extracted = this.extractJsonFromString(response);

			if (extracted.success) {
				return extracted.data;
			}
			return this.extractMixedContent(response);
		}
		return response;
	},

	extract(text) {
		const extracted = this.extractJsonFromString(text);
		if (extracted.success) {
			return {
				structured: extracted.data,
				analysis: null,
			};
		}

		// Fall back to existing mixed content extraction
		return {
			codeBlocks: this.extractCodeBlocks(text),
			markdown: this.extractMarkdown(text),
			html: this.extractHTML(text),
			plainText: text.replace(/```[\s\S]*?```/g, "").trim(),
			structured: this.formatStructuredResponse(text),
		};
	},
};

module.exports = extractor;
