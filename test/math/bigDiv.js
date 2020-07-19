const BigNumber = require("bignumber.js");
const {constants} = require("hardlydifficult-eth");

const bigDivArtifact = artifacts.require("BigDivMock");

contract("math / bigDiv", () => {
  let contract;
  const maxValue = new BigNumber(2).pow(256).minus(1);

  before(async () => {
    contract = await bigDivArtifact.new();
  });

  it("2x1 does not overflow with sqrt max value", async () => {
    const sqrtMax = maxValue.sqrt().dp(0);
    await contract.bigDiv2x1(sqrtMax.toFixed(), 1, 1);
    await contract.bigDiv2x1(1, sqrtMax.toFixed(), 1);
    await contract.bigDiv2x1(1, 1, sqrtMax.toFixed());
    await contract.bigDiv2x1(sqrtMax.toFixed(), sqrtMax.minus(1).toFixed(), 1);
    await contract.bigDiv2x1(
      sqrtMax.toFixed(),
      sqrtMax.minus(1).toFixed(),
      sqrtMax.toFixed()
    );
  });

  it("2x1 does not overflow with half max value", async () => {
    await contract.bigDiv2x1RoundUp(maxValue.div(2).dp(0).toFixed(), 1, 1);
    await contract.bigDiv2x1RoundUp(1, maxValue.div(2).dp(0).toFixed(), 1);
    await contract.bigDiv2x1RoundUp(1, 1, maxValue.div(2).dp(0).toFixed());
    await contract.bigDiv2x1RoundUp(
      maxValue.div(2).dp(0).toFixed(),
      maxValue.div(2).dp(0).toFixed(),
      maxValue.div(2).dp(0).toFixed()
    );
  });

  it("2x1 does not overflow with max value", async () => {
    await contract.bigDiv2x1(maxValue.toFixed(), 1, 1);
    await contract.bigDiv2x1(1, maxValue.toFixed(), 1);
    await contract.bigDiv2x1(1, 1, maxValue.toFixed());
    await contract.bigDiv2x1(maxValue.toFixed(), 1, maxValue.toFixed());
  });

  it("2x2 does not overflow with sqrt max value", async () => {
    const sqrtMax = maxValue.sqrt().dp(0);
    await contract.bigDiv2x2(sqrtMax.toFixed(), 1, 1, 1);
    await contract.bigDiv2x2(1, sqrtMax.toFixed(), 1, 1);
    await contract.bigDiv2x2(1, 1, sqrtMax.toFixed(), 1);
    await contract.bigDiv2x2(1, 1, 1, sqrtMax.toFixed());
    await contract.bigDiv2x2(
      sqrtMax.toFixed(),
      sqrtMax.minus(1).toFixed(),
      1,
      1
    );
    await contract.bigDiv2x2(
      sqrtMax.toFixed(),
      sqrtMax.minus(1).toFixed(),
      sqrtMax.toFixed(),
      sqrtMax.minus(1).toFixed()
    );
  });

  it("2x2 does not overflow with half max value", async () => {
    await contract.bigDiv2x2(maxValue.div(2).dp(0).toFixed(), 1, 1, 1);
    await contract.bigDiv2x2(1, maxValue.div(2).dp(0).toFixed(), 1, 1);
    await contract.bigDiv2x2(1, 1, maxValue.div(2).dp(0).toFixed(), 1);
    await contract.bigDiv2x2(1, 1, 1, maxValue.div(2).dp(0).toFixed());
    await contract.bigDiv2x2(
      maxValue.div(2).dp(0).toFixed(),
      maxValue.div(2).dp(0).toFixed(),
      maxValue.div(2).dp(0).toFixed(),
      maxValue.div(2).dp(0).toFixed()
    );
  });

  it("2x2 does not overflow with max value", async () => {
    await contract.bigDiv2x2(maxValue.toFixed(), 1, 1, 1);
    await contract.bigDiv2x2(maxValue.toFixed(), 1, maxValue.toFixed(), 1);
    await contract.bigDiv2x2(
      maxValue.toFixed(),
      maxValue.toFixed(),
      maxValue.toFixed(),
      1
    );
    await contract.bigDiv2x2(
      maxValue.toFixed(),
      maxValue.toFixed(),
      1,
      maxValue.toFixed()
    );
    await contract.bigDiv2x2(1, maxValue.toFixed(), 1, 1);
    await contract.bigDiv2x2(1, 1, maxValue.toFixed(), 1);
    await contract.bigDiv2x2(1, 1, 1, maxValue.toFixed());
  });

  it("MythX detected possible overflow case 1", async () => {
    const result = await contract.bigDiv2x2(
      "0x0000000000000000000000000000000000000000000000000000000000000002",
      "0x0000000000000000000000000000000000000000000000000000000000001700",
      "0x0000003800000000000000000000000000000000000000000000000000000000",
      "0x0000fb0000000000000000000000000000000000000000000000000000000000"
    );
    assert.equal(result, 0);
  });

  it("MythX detected possible overflow case 2", async () => {
    const result = await contract.bigDiv2x2(
      "2",
      "5888",
      "1509757013360435828501352844873099317723680087662272058941802173956096",
      "1732338333044431510646123721431533388565228352014767025345793580173623296"
    );
    assert.equal(result, 0);
  });

  it("Round up max result does not overflow", async () => {
    const roundDownResult = await contract.bigDiv2x1(
      constants.MAX_UINT,
      "1",
      "1"
    );
    // Sanity check
    assert.equal(roundDownResult.toString(), constants.MAX_UINT);

    const roundUpResult = await contract.bigDiv2x1RoundUp(
      constants.MAX_UINT,
      "1",
      "1"
    );
    assert.equal(roundUpResult.toString(), constants.MAX_UINT);
  });

  it("2x2 returns the same results if not sorted", async () => {
    const sortedResult = await contract.bigDiv2x2(
      maxValue.toFixed(),
      "99",
      maxValue.toFixed(),
      "2"
    );
    const unsortedDenResult = await contract.bigDiv2x2(
      maxValue.toFixed(),
      "99",
      "2",
      maxValue.toFixed()
    );
    const unsortedNumResult = await contract.bigDiv2x2(
      "99",
      maxValue.toFixed(),
      maxValue.toFixed(),
      "2"
    );
    const unsortedResult = await contract.bigDiv2x2(
      "99",
      maxValue.toFixed(),
      "2",
      maxValue.toFixed()
    );
    assert.equal(sortedResult.toString(), unsortedDenResult.toString());
    assert.equal(sortedResult.toString(), unsortedNumResult.toString());
    assert.equal(sortedResult.toString(), unsortedResult.toString());
  });
});
