/* eslint-disable no-console */

function multipleContracts(contracts, callback) {
    for (const [testName, initArgs] of Object.entries(contracts)) {
        const CarryToken = artifacts.require("CarryToken");
        const [contractName] = testName.trim().split(/\s+/);
        const Contract = artifacts.require(contractName);

        Contract.defaults({
            gasPrice: 40000000000,  // 40 gwei
        });

        contract(testName, async function (accounts) {
            const reservedAccounts = 1;
            let accountIndex = reservedAccounts;
            const getAccount = () => {
                const account = accounts[accountIndex++];
                if (accountIndex >= accounts.length) {
                    accountIndex = reservedAccounts;
                }
                return account;
            };

            const fundWallet = accounts[0];
            const fundOwner = accounts[0];
            let fund = null;
            let token = null;

            const createFund = async (returnToken = false) => {
                token = await CarryToken.deployed();
                fund = await Contract.new(...initArgs(fundWallet, token));
                await token.mint(
                    fund.address,
                    new web3.BigNumber(
                        web3.toWei(5000410, "finney")
                    ).mul(74750),
                    {from: fundOwner}
                );
                if (returnToken) {
                    return [fund, token];
                }
                return fund;
            };

            before(async function () {
                try {
                    fund = await Contract.deployed();
                } catch (e) {
                    [fund, token] = await createFund(true);
                }
                if (token == null) {
                    token = new CarryToken(await fund.token());
                }
            });

            function withoutBalanceChangeIt (label, fA, fB) {
                it(label, async () => {
                    const pre = fB ? fA : async () => null;
                    const test = fB ? fB : fA;
                    const contributor = getAccount();

                    // pre() runs before "previous" balances are captured.
                    const state = await pre(contributor);

                    const prevContributorBalance =
                        web3.eth.getBalance(contributor);
                    const prevFundWalletBalance =
                        web3.eth.getBalance(fundWallet);
                    await test(contributor, state);
                    assert(
                        prevContributorBalance.sub(
                            web3.eth.getBalance(contributor)
                        ).lt(web3.toWei(5, "finney")),
                        "Amount must not be taken from the contributor [" +
                        contributor + "] (except of gas fee)"
                    );
                    assertEq(
                        prevFundWalletBalance,
                        web3.eth.getBalance(fundWallet),
                        "Amount must not be sent to the fund [" +
                        fundWallet + "]"
                    );
                });
            }

            callback({
                testName,
                contractName,
                accounts,
                getAccount,
                fundWallet,
                fundOwner,
                getFund: () => fund,
                getToken: () => token,
                createFund,
                withoutBalanceChangeIt,
            });
        });
    }
}

function assertEq(expected, actual, message) {
    expected = new web3.BigNumber(expected);
    assert.isTrue(
        expected.eq(actual),
        message +
        "\n      expected: " + expected.toString() +
        "\n      actual:   " + actual.toString() +
        "\n      delta:    " + expected.minus(actual).toString() +
        "\n      "
    );
}

function assertNotEq(expected, actual, message) {
    expected = new web3.BigNumber(expected);
    assert.isFalse(
        expected.eq(actual),
        message +
        "\nexpected not to be: " + expected.toString() +
        "\n      actual:       " + actual.toString() +
        "\n      delta:        " + expected.minus(actual).toString() +
        "\n      "
    );
}

function assertEvents(expectedEvents, result) {
    assert.deepEqual(
        expectedEvents,
        result.logs.map(log => ({ $event: log.event, ...log.args }))
    );
}

async function assertFail(promise, message) {
    let failed = false;
    let tx;
    try {
        tx = await promise;
    } catch (e) {
        failed = true;
        tx = null;
    }
    const txid = tx && tx.tx;
    if (!failed) {
        console.error("assertFail() fails; txid: " + txid);
    }
    assert.isTrue(failed, message + "\ntxid: " + txid);
}

module.exports = {
    multipleContracts,
    assertEq,
    assertNotEq,
    assertFail,
    assertEvents,
};
