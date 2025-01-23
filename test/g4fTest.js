const { G4FClient } = require("../src/services/g4fHandler");

async function testG4F() {
	const g4f = new G4FClient();

	try {
		const response = await g4f.createCompletion({
			model: "gpt-4",
			messages: [{ role: "user", content: "Hello" }],
			web_search: false,
		});

		console.log("Response:", response.choices[0].message.content);
	} catch (error) {
		console.error("Test failed:", error);
	}
}

testG4F();
