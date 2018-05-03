/* eslint-disable no-console */

function assertEq(expected, actual, message) {
    assert.isTrue(
        expected.eq(actual),
        message + "\n      expected: " + expected.toString() +
        "\n      actual:   " + actual.toString() +
        "\n      delta:    " + expected.minus(actual).toString() + "\n      "
    );
}

async function assertFail(promise, message) {
    let failed = false;
    try {
        await promise;
    } catch (e) {
        console.log("An expected error has caught: " + e.toString());
        failed = true;
    }
    assert.isTrue(failed, message);
}

module.exports = {
    assertEq: assertEq,
    assertFail: assertFail,
};
