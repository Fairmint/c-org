const HelloVyper = artifacts.require("HelloVyper");
const HelloSolidity = artifacts.require("HelloSolidity");

contract("HelloWorld", () => {
	let helloVyper, helloSolidity;

	before(async () => {
		helloVyper = await HelloVyper.new();
		helloSolidity = await HelloSolidity.new();
	});

	it("data should return 42 by default", async () => {
		const dataVyper = await helloVyper.data();
		const dataSolidity = await helloSolidity.data();

		assert.equal(dataVyper, 42);
		assert.equal(dataSolidity, 42);
	});

	it("dataPlus works as expected", async () => {
		const dataVyper = await helloVyper.dataPlus(8);
		const dataSolidity = await helloSolidity.dataPlus(8);

		assert.equal(dataVyper, 50);
		assert.equal(dataSolidity, 50);
	});

	describe("can change value", () => {
		before(async () => {
			await helloVyper.setData(999);
			await helloSolidity.setData(999);
		});

		it("should return the updated value", async () => {
			const dataVyper = await helloVyper.data();
			const dataSolidity = await helloSolidity.data();
	
			assert.equal(dataVyper, 999);
			assert.equal(dataSolidity, 999);
		});
	});
});
