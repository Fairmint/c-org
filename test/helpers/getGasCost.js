const BigNumber = require("bignumber.js");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getRequest(tx) {
  if (tx.request) return tx.request;

  const request = await this.web3.eth.getTransaction(
    tx.tx || tx.hash || tx.transactionHash || tx
  );
  return (tx.request = request);
}

async function getReceipt(tx) {
  if (tx.receipt) return tx.receipt;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const receipt = await this.web3.eth.getTransactionReceipt(
      tx.tx || tx.hash || tx.transactionHash || tx
    );
    if (receipt) return (tx.receipt = receipt);
    await sleep(2000);
  }
}

module.exports = async function getGasCost(tx) {
  await getRequest(tx);
  await getReceipt(tx);
  return new BigNumber(tx.request.gasPrice).times(tx.receipt.gasUsed);
};
