const results = { passed: 0, failed: 0, errors: [] };

function expect(testName, actualValue, expectedValue) {
  const passed = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
  if (passed) {
    results.passed++;
    console.info(`[PASS] ${testName}`);
  } else {
    results.failed++;
    const message = `[FAIL] ${testName} — expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`;
    results.errors.push(message);
    console.error(message);
  }
}

function summarizeResults() {
  console.info(`\n─── TEST RESULTS ───────────────────────`);
  console.info(`Passed: ${results.passed}`);
  console.info(`Failed: ${results.failed}`);
  if (results.errors.length > 0) {
    console.error('Failures:');
    results.errors.forEach((error) => console.error(error));
  }
}

export { expect, summarizeResults };
