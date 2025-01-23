const testData = {
	singleTest: {
		input: "What is the capital of France?",
		expectedOutput: "The capital of France is Paris.",
		configuration: {
			modelId: "google/gemini-2.0-flash-exp:free",
			temperature: 0.7,
			maxTokens: 100,
		},
	},

	batchTests: [
		{
			input: "Write a JavaScript function to sort an array",
			expectedOutput: "function sortArray(arr) {\n  return arr.sort((a, b) => a - b);\n}",
			configuration: {
				modelId: "google/gemini-2.0-flash-exp:free",
				temperature: 0.7,
				maxTokens: 200,
			},
		},
		{
			input: "Explain what is REST API",
			expectedOutput:
				"REST (Representational State Transfer) is an architectural style for designing networked applications. It uses HTTP requests to GET, PUT, POST and DELETE data.",
			configuration: {
				modelId: "google/gemini-2.0-flash-exp:free",
				temperature: 0.7,
				maxTokens: 300,
			},
		},
		{
			input: "What is the difference between let and var in JavaScript?",
			expectedOutput:
				"let has block scope while var has function scope. let doesn't allow redeclaration and doesn't get hoisted like var.",
			configuration: {
				modelId: "google/gemini-2.0-flash-exp:free",
				temperature: 0.7,
				maxTokens: 200,
			},
		},
	],

	categories: {
		programming: [
			{
				input: "Write a function to check if a string is palindrome",
				expectedOutput: "function isPalindrome(str) {\n  return str === str.split('').reverse().join('');\n}",
				configuration: { modelId: "google/gemini-2.0-flash-exp:free", temperature: 0.7 },
			},
		],
		knowledge: [
			{
				input: "What is photosynthesis?",
				expectedOutput:
					"Photosynthesis is the process by which plants convert light energy into chemical energy to produce glucose from carbon dioxide and water.",
				configuration: { modelId: "google/gemini-2.0-flash-exp:free", temperature: 0.7 },
			},
		],
	},
};

module.exports = testData;
