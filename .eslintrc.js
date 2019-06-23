module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true
  },
  extends: ["plugin:prettier/recommended", "eslint:recommended"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
    artifacts: "readonly",
    contract: "readonly",
    it: "readonly",
    assert: "readonly",
    before: "readonly",
    beforeEach: "readonly",
    describe: "readonly",
    web3: "readonly",
    context: "readonly"
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    "no-underscore-dangle": 0,
    "no-console": 0
  }
};
