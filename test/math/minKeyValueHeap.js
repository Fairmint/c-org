// Original source: https://github.com/Dev43/heap-solidity/blob/master/test/heap.js

const MinKeyValueHeapMock = artifacts.require("./MinKeyValueHeapMock.sol");
const { constants } = require("../helpers");

contract("MinKeyValueHeap", accounts => {
  let heap;

  beforeEach(async () => {
    heap = await MinKeyValueHeapMock.new();
  });

  it("should create a valid heap by calling insert", async () => {
    const testData = [6, 5, 4, 2, 1, 3, 34];
    for (let i = 0; i < testData.length; i++) {
      await heap.insert(testData[i], 1 + i);
    }

    const heapKeys = await heap.getHeapKeys();
    const answerKeys = [0, 1, 2, 3, 6, 4, 5, 34];
    assertEqual(answerKeys, heapKeys);

    const heapValues = await heap.getHeapValues();
    const answerValues = [0, 5, 4, 6, 1, 3, 2, 7];
    assertEqual(answerValues, heapValues);
  });

  it.only("should removeMin from a valid heap ", async () => {
    const testData = [34, 26, 33, 15, 24, 5, 4, 12, 1, 23, 21, 2];
    for (let i = 0; i < testData.length; i++) {
      await heap.insert(testData[i], 1 + i);
    }

    let heapKeys = await heap.getHeapKeys();
    let answer = [0, 1, 4, 2, 12, 21, 5, 15, 34, 24, 26, 23, 33];
    assertEqual(answer, heapKeys);
    await removeMin(heap, 1);
    await removeMin(heap, 2);
    await removeMin(heap, 4);
    await removeMin(heap, 5);
    await removeMin(heap, 12);
    await removeMin(heap, 15);
    await removeMin(heap, 21);
    await removeMin(heap, 23);
    await removeMin(heap, 24);
    await removeMin(heap, 26);
    await removeMin(heap, 33);
    assert.equal(await heap.isEmpty(), false);
    await removeMin(heap, 34);
    assert.equal(await heap.isEmpty(), true);
  });
});

async function removeMin(heap, root) {
  console.log(await heap.getHeapKeys());
  // Simulate
  let min = (await heap.getMin()).key;
  await heap.removeMin.call();
  // Ensure we get the root back
  assert.equal(min.toString(), root + "", "did not get the root back");
  // Actually do it
  await heap.removeMin();
}

function assertEqual(answer, finalMinKeyValueHeap) {
  for (let i = 0; i < finalMinKeyValueHeap.length; i++) {
    assert.equal(
      finalMinKeyValueHeap[i].toString(),
      "" + answer[i],
      "heap elements are not equal " +
        answer[i] +
        " " +
        finalMinKeyValueHeap[i] +
        " " +
        i
    );
  }
}
