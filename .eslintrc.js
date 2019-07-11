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
    after: "readonly",
    before: "readonly",
    beforeEach: "readonly",
    afterEach: "readonly",
    describe: "readonly",
    web3: "readonly",
    context: "readonly"
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    "no-underscore-dangle": 0,
    "no-console": 0,
    "require-atomic-updates": 0,
    "no-unused-vars": 0
  }
};
