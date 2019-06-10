module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: 'airbnb-base',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    artifacts: 'readonly',
    contract: 'readonly',
    it: 'readonly',
    assert: 'readonly',
    before: 'readonly',
    describe: 'readonly',
    web3: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
  },
};
