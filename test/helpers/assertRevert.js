module.exports = async (promise, expect_error="revert") => {
  try {
    await promise;
  } catch (error) {
    const revertFound = error.message.search(expect_error) >= 0;
    assert(revertFound, `Expected ${expect_error}", got ${error} instead`);
    return;
  }

  assert.fail('Expected revert not received');
};
