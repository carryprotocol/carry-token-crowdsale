/* eslint-disable no-console */

function multipleContracts(contracts, callback) {
    for (const contractName of contracts) {
        const CarryToken = artifacts.require("CarryToken");
        const Contract = artifacts.require(contractName);

        contract(contractName, async function (accounts) {
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
            let fund;

            before(async function () {
                try {
                    fund = await Contract.deployed();
                } catch (e) {
                    let carryToken = await CarryToken.deployed();
                    fund = await Contract.new(
                        // Use the same arguments to the presale.  See also
                        // presale constant on migrations/2_deploy_contracts.js
                        // file.
                        fundWallet,  // wallet
                        carryToken.address,  // token
                        74750,  // rate
                        web3.toWei(5000410, "finney"),  // cap
                        web3.toWei(99, "finney"),  // individualMinPurchaseWei
                        web3.toWei(50, "ether"),  // individualMaxCapWei
                    );
                    await carryToken.mint(
                        fund.address,
                        new web3.BigNumber(
                            web3.toWei(5000410, "finney")
                        ).mul(74750),
                        {from: fundOwner}
                    );
                }
            });

            callback({
                accounts,
                getAccount,
                fundWallet,
                fundOwner,
                getFund: () => fund,
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
    multipleContracts,
    assertEq,
    assertNotEq,
    assertFail,
};
