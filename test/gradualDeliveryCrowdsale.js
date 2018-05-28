// The Carry token and the tokensale contracts
// Copyright (C) 2018 Carry Protocol
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
const {
    assertEq,
    assertEvents,
    assertFail,
    assertNotEq,
    multipleContracts,
} = require("./utils");

multipleContracts(
    {
        "SampleGradualDeliveryCrowdsale": (fundWallet, token) => [
            74750,  // rate
            fundWallet,  // wallet
            token.address,  // token contract
        ],
        "CarryTokenPresale": (fundWallet, token) => [
            // Use the same arguments to the presale (though not necessarily).
            // See also presale constant on migrations/2_deploy_contracts.js
            // file.
            fundWallet,  // wallet
            token.address,  // token contract
            74750,  // rate
            web3.toWei(5000410, "finney"),  // cap
            web3.toWei(99, "finney"),  // individualMinPurchaseWei
            web3.toWei(50, "ether"),  // individualMaxCapWei
        ],
    },
    async ({
        contractName,
        getAccount,
        fundOwner,
        fundWallet,
        getFund,
        getToken,
        createFund,
    }) => {
        async function addToWhitelist(...contributors) {
            if (contractName === "CarryTokenPresale") {
                const fund = getFund();
                await fund.addManyToWhitelist(
                    contributors,
                    {from: fundOwner}
                );
            }
        }

        it(
            "should not withdraw tokens immediately after purchase",
            async function () {
                const contributor = getAccount();
                const fund = getFund();
                const token = getToken();
                const prevBalance = await token.balanceOf(contributor);
                await addToWhitelist(contributor);
                await fund.sendTransaction({
                    value: web3.toWei(100, "finney"),
                    from: contributor,
                });
                const nextBalance = await token.balanceOf(contributor);
                assertEq(
                    prevBalance,
                    nextBalance,
                    "Token must not be withdrawn imediately after purchase"
                );
            }
        );

        it("disallows withdrawal by other than the owner", async function () {
            const nonOwner = getAccount();
            const fund = getFund();
            await assertFail(
                fund.deliverTokensInRatio(1, 2, { from: nonOwner }),
                "Withdrawal should be failed due to the lack of permission"
            );
        });

        it("delivers tokens in the specified ratio", async function () {
            const contributors = [getAccount(), getAccount(), getAccount()];
            const fund = await createFund();
            const token = getToken();
            await addToWhitelist(...contributors);
            const etherAmounts = [
                web3.toWei(100, "finney"),
                web3.toWei(500, "finney"),
                0,
            ];
            assert.equal(etherAmounts.length, contributors.length);
            for (let i = 0; i < etherAmounts.length; i++) {
                if (etherAmounts[i] < 1) {
                    continue;
                }
                await fund.sendTransaction({
                    value: etherAmounts[i],
                    from: contributors[i],
                });
            }
            const intermediateBalances =
                await Promise.all(contributors.map(c => token.balanceOf(c)));
            for (const intermediateBalance of intermediateBalances) {
                assertEq(
                    0, intermediateBalance,
                    "Token must not be withdrawn imediately after purchase"
                );
            }
            const result = await fund.deliverTokensInRatio(1, 2, {
                from: fundOwner
            });
            const rate = await fund.rate();
            assertEvents(
                contributors.map((address, i) => ({
                    $event: "TokenDelivered",
                    beneficiary: address,
                    tokenAmount: rate.mul(etherAmounts[i]).div(2),
                })).filter(({ tokenAmount }) => tokenAmount.gt(0)),
                result
            );
            const finalBalances =
                await Promise.all(contributors.map(c => token.balanceOf(c)));
            assertNotEq(0, finalBalances[0], "No token was transferred");
            assertNotEq(0, finalBalances[1], "No token was transferred");
            for (let i = 0; i < finalBalances.length; i++) {
                assertEq(
                    finalBalances[i],
                    rate.mul(etherAmounts[i]).div(2),
                    "Only half of tokens should be transferred"
                );
            }
        });

        it("can deliver tokens from & to a particular offset", async () => {
            const contributors = [
                getAccount(), getAccount(), getAccount(),
                getAccount(), getAccount(), getAccount(),
            ];
            const fund = await createFund();
            // Since Truffle doesn't provide true clean-room fixture but
            // it is stateful, we need to create a new token sale contract.
            const token = getToken();
            const initialBalances =
                await Promise.all(contributors.map(c => token.balanceOf(c)));
            await addToWhitelist(...contributors);
            for (let i = 0; i < contributors.length; i++) {
                await fund.sendTransaction({
                    value: web3.toWei((i + 1) * 100, "finney"),
                    from: contributors[i],
                });
            }
            const from = 2, to = 5;
            const result = await fund.deliverTokensInRatioFromTo(
                1, 2, from, to,
                {from: fundOwner}
            );
            const rate = await fund.rate();
            assertEvents(
                contributors.map((address, i) => ({
                    $event: "TokenDelivered",
                    beneficiary: address,
                    tokenAmount: rate.mul(web3.toWei((i + 1) * 50, "finney")),
                })).slice(from, to),
                result
            );
            const finalBalances =
                await Promise.all(contributors.map(c => token.balanceOf(c)));
            for (let i = 0; i < contributors.length; i++) {
                if (from <= i && i < to) {
                    assertEq(
                        rate.mul(web3.toWei(50, "finney")).mul(i + 1),
                        finalBalances[i].minus(initialBalances[i]),
                        "Half of tokens should be transferred [" + i + "]"
                    );
                } else {
                    assertEq(
                        finalBalances[i],
                        initialBalances[i],
                        "No tokens should be transferred [" + i + "]"
                    );
                }
            }
        });

        // fixture
        async function setUpPurchasedState(value) {
            const fund = await createFund();
            const beneficiary = getAccount();
            await addToWhitelist(beneficiary);
            await fund.sendTransaction({
                value,
                from: beneficiary,
            });
            return {
                fund,
                beneficiary,
            };
        }

        it(
            "disallows to be requested to refund by other than the fund " +
            "owner or the fund wallet",
            async function () {
                const {
                    fund,
                    beneficiary,
                } = await setUpPurchasedState(web3.toWei(500, "finney"));
                const previousWeiRaised = await fund.weiRaised();
                await assertFail(
                    fund.depositRefund(beneficiary, {
                        value: web3.toWei(500, "finney"),
                        from: beneficiary,
                    }),
                    "Refund should be failed due to the lack of permission"
                );
                assertEq(
                    previousWeiRaised,
                    await fund.weiRaised(),
                    "The refund should not affect to weiRaised amount."
                );
                const thirdPerson = getAccount();
                await assertFail(
                    fund.depositRefund(beneficiary, {
                        value: web3.toWei(500, "finney"),
                        from: thirdPerson,
                    }),
                    "Refund should be failed due to the lack of permission"
                );
                assertEq(
                    previousWeiRaised,
                    await fund.weiRaised(),
                    "The refund should not affect to weiRaised amount."
                );
            }
        );

        for (const [label, executor] of Object.entries({
            owner: fundOwner,
            wallet: fundWallet,
        })) {
            it(
                "allows the fund " + label + " to request to refund a purchase",
                async function () {
                    const {
                        fund,
                        beneficiary,
                    } = await setUpPurchasedState(web3.toWei(500, "finney"));
                    const previousWeiRaised = await fund.weiRaised();
                    await fund.depositRefund(beneficiary, {
                        value: web3.toWei(300, "finney"),
                        from: executor,
                    });
                    const rate = await fund.rate();
                    assertEq(
                        rate.mul(web3.toWei(200, "finney")),
                        await fund.balances(beneficiary),
                        "A beneficiary's balance has to be consumed."
                    );
                    assertEq(
                        web3.toWei(300, "finney"),
                        await fund.refundedDeposits(beneficiary),
                        "A beneficiary's refunded deposit has to be filled."
                    );
                    assertEq(
                        previousWeiRaised.minus(web3.toWei(300, "finney")),
                        await fund.weiRaised(),
                        "The refund should affect to weiRaised amount."
                    );
                }
            );

            it("disallows to refund more than purchased", async function () {
                const {
                    fund,
                    beneficiary,
                } = await setUpPurchasedState(web3.toWei(500, "finney"));
                await assertFail(
                    fund.depositRefund(beneficiary, {
                        value: web3.toWei(501, "finney"),
                        from: executor,
                    }),
                    "Refund should be failed due to the insufficient balance."
                );
                const rate = await fund.rate();
                assertEq(
                    rate.mul(web3.toWei(500, "finney")),
                    await fund.balances(beneficiary),
                    "The balance should not change"
                );
            });
        }

        it(
            "disallows to receive the refund if there is no refunded deposit",
            async function () {
                const {
                    fund,
                    beneficiary,
                } = await setUpPurchasedState(web3.toWei(500, "finney"));
                await assertFail(
                    fund.receiveRefund(beneficiary, {
                        from: beneficiary
                    }),
                    "Withdrawal should be failed due to the lack of deposit"
                );
            }
        );

        // fixture
        async function setUpRefundDepositedState(purchased, refunded) {
            purchased = new web3.BigNumber(purchased);
            assert.isTrue(
                purchased.gte(refunded),
                "The purchased amount (" + purchased.toString() + ") has to " +
                "equal to or be greater than the amount to refund (" +
                refunded.toString() + ")"
            );
            const {
                fund,
                beneficiary,
            } = await setUpPurchasedState(purchased);
            const rate = await fund.rate();
            const result = await fund.depositRefund(beneficiary, {
                value: refunded,
                from: fundWallet,
            });
            assertEvents([
                {
                    $event: "RefundDeposited",
                    beneficiary: beneficiary,
                    tokenAmount: rate.mul(refunded),
                    weiAmount: new web3.BigNumber(refunded),
                }
            ], result);
            return {
                fund,
                beneficiary,
            };
        }

        it(
            "disallows to receive the refund by other than the fund owner " +
            "or the beneficiary",
            async function () {
                const {
                    fund,
                    beneficiary,
                } = await setUpRefundDepositedState(
                    web3.toWei(500, "finney"),
                    web3.toWei(500, "finney"),
                );
                const thirdPerson = getAccount();
                await assertFail(
                    fund.receiveRefund(beneficiary, { from: thirdPerson }),
                    "Withdrawal from the refunded deposit should be failed."
                );
            }
        );

        for (const [label, getExecutor] of Object.entries({
            "fund owner": () => fundOwner,
            beneficiary: (address) => address,
        })) {
            it(
                "allows the " + label + " to receive the refunded deposit",
                async function () {
                    const {
                        fund,
                        beneficiary,
                    } = await setUpRefundDepositedState(
                        web3.toWei(500, "finney"),
                        web3.toWei(500, "finney"),
                    );
                    const previousEther = web3.eth.getBalance(beneficiary);
                    const executor = getExecutor(beneficiary);
                    const result = await fund.receiveRefund(beneficiary, {
                        from: executor
                    });
                    assertEvents([
                        {
                            $event: "Refunded",
                            beneficiary: beneficiary,
                            receiver: beneficiary,
                            weiAmount: new web3.BigNumber(
                                web3.toWei(500, "finney")
                            ),
                        }
                    ], result);
                    assertEq(
                        0,
                        await fund.refundedDeposits(beneficiary),
                        "The refunded deposit should be empty."
                    );
                    if (executor == beneficiary) {
                        /* If an executor is the same to the beneficiary,
                        we need to calculate the gas fee used for making
                        a transaction. */
                        const currentEther = web3.eth.getBalance(beneficiary);
                        assert.isTrue(
                            currentEther.gt(
                                previousEther.plus(web3.toWei(490, "finney"))
                            ),
                            "The balance should be greater than 0.49 ETH: " +
                            currentEther.minus(previousEther).toString()
                        );
                        assert.isTrue(
                            currentEther.lte(
                                previousEther.plus(web3.toWei(500, "finney"))
                            ),
                            "The balance should be less than 0.501 ETH: " +
                            currentEther.minus(previousEther).toString()
                        );
                    } else {
                        assertEq(
                            previousEther.plus(web3.toWei(500, "finney")),
                            web3.eth.getBalance(beneficiary),
                            "The purchased ethers should be completely refunded"
                        );
                    }
                }
            );
        }

        it(
            "allows the beneficiary to receive the refunded deposit to " +
            "his another account (address)",
            async function () {
                const {
                    fund,
                    beneficiary,
                } = await setUpRefundDepositedState(
                    web3.toWei(500, "finney"),
                    web3.toWei(500, "finney"),
                );
                const anotherAddress = getAccount();
                const previousEther = web3.eth.getBalance(anotherAddress);
                const result = await fund.receiveRefundTo(
                    beneficiary, anotherAddress,
                    {from: beneficiary}
                );
                assertEvents([
                    {
                        $event: "Refunded",
                        beneficiary: beneficiary,
                        receiver: anotherAddress,
                        weiAmount: new web3.BigNumber(
                            web3.toWei(500, "finney")
                        ),
                    }
                ], result);
                assertEq(
                    0,
                    await fund.refundedDeposits(beneficiary),
                    "The refunded deposit should be empty."
                );
                assertEq(
                    previousEther.plus(web3.toWei(500, "finney")),
                    web3.eth.getBalance(anotherAddress),
                    "The purchased ethers should be completely refunded."
                );
            }
        );

        it("accumulate the deposit if refunded multiple times", async () => {
            const {
                fund,
                beneficiary,
            } = await setUpRefundDepositedState(
                web3.toWei(500, "finney"),
                web3.toWei(100, "finney"),
            );
            let deposit = await fund.refundedDeposits(beneficiary);
            assertEq(
                web3.toWei(100, "finney"),
                deposit,
                "The remain deposit should be 0.1 ETH"
            );
            const result = await fund.depositRefund(beneficiary, {
                value: web3.toWei(100, "finney"),
                from: fundOwner,
            });
            const rate = await fund.rate();
            assertEvents([
                {
                    $event: "RefundDeposited",
                    beneficiary: beneficiary,
                    tokenAmount: rate.mul(web3.toWei(100, "finney")),
                    weiAmount: new web3.BigNumber(web3.toWei(100, "finney")),
                }
            ], result);
            deposit = await fund.refundedDeposits(beneficiary);
            assertEq(
                web3.toWei(200, "finney"),
                deposit,
                "The remain deposit should be 0.2 ETH"
            );
        });

        it(
            "disallows any other than the beneficiary to receive the " +
            "refunded deposit to a specified address",
            async function () {
                const {
                    fund,
                    beneficiary,
                } = await setUpRefundDepositedState(
                    web3.toWei(500, "finney"),
                    web3.toWei(500, "finney"),
                );
                for (const address of [getAccount(), fundOwner, beneficiary]) {
                    for (const executor of [getAccount(), fundOwner]) {
                        await assertFail(
                            fund.receiveRefundTo(beneficiary, address, {
                                from: executor,
                            }),
                            "Withdrawal from the deposit should be failed."
                        );
                    }
                }
            }
        );
    }
);
