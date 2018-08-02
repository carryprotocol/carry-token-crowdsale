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
    multipleContracts,
} = require("./utils");

const now = +new Date() / 1000 >> 0;
const minute = 60;
const hour = 60 * minute;
const day = 24 * hour;
const week = 7 * day;

multipleContracts({
    "CarryPublicTokenCrowdsale (not opened yet)": (fundWallet, token) => [
        // Use similar arguments to the publicSale (though not necessarily).
        // See also presale constant on
        // migrations/3_deploy_public_sale_contracts.js file.
        fundWallet,  // wallet
        token.address,  // token contract
        65000,  // rate
        web3.toWei(5000410, "finney"),  // cap
        now + 180 * day,  // tokenDeliveryDue
        [0, now + 2 * week],  // whitelistGrades
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        // individual mas caps
        // 2 weeks later         3 weeks later            closing: a month later
        [now + 2 * week,         now + 3 * week,          now + 31 * day],
        [web3.toWei(5, "ether"), web3.toWei(10, "ether"), 0],
    ],
    "CarryPublicTokenCrowdsale (opened; phase 1)": (fundWallet, token) => [
        // Use similar arguments to the publicSale (though not necessarily).
        // See also presale constant on
        // migrations/3_deploy_public_sale_contracts.js file.
        fundWallet,  // wallet
        token.address,  // token contract
        65000,  // rate
        web3.toWei(5000410, "finney"),  // cap
        now + 180 * day,  // tokenDeliveryDue
        [  // whitelistGrades
            0,
            now - week,
            now + week,
        ],
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        // individual mas caps
        // a week ago            a week later             closing: 2 weeks later
        [now - week,             now + week,              now + 2 * week],
        [web3.toWei(5, "ether"), web3.toWei(10, "ether"), 0],
    ],
    "CarryPublicTokenCrowdsale (opened; phase 2)": (fundWallet, token) => [
        // Use similar arguments to the publicSale (though not necessarily).
        // See also presale constant on
        // migrations/3_deploy_public_sale_contracts.js file.
        fundWallet,  // wallet
        token.address,  // token contract
        65000,  // rate
        web3.toWei(5000410, "finney"),  // cap
        now + 180 * day,  // tokenDeliveryDue
        [  // whitelistGrades
            0,
            now - 2 * week,
            now - week,
        ],
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        // individual mas caps
        // 2 weeks ago           a week ago               closing: 2 weeks later
        [now - 2 * week,         now - week,              now + 2 * week],
        [web3.toWei(5, "ether"), web3.toWei(10, "ether"), 0],
    ],
    "CarryPublicTokenCrowdsale (already closed; not withdrawable)":
    (fundWallet, token) => [
        // Use similar arguments to the publicSale (though not necessarily).
        // See also presale constant on
        // migrations/3_deploy_public_sale_contracts.js file.
        fundWallet,  // wallet
        token.address,  // token contract
        65000,  // rate
        web3.toWei(5000410, "finney"),  // cap
        now + 180 * day,  // tokenDeliveryDue
        [0, now - 31 * day],  // whitelistGrades
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        // individual mas caps
        // a month ago           2 weeks ago              closing: a week ago
        [now - 31 * day,         now - 2 * week,          now - week],
        [web3.toWei(5, "ether"), web3.toWei(10, "ether"), 0],
    ],
    "CarryPublicTokenCrowdsale (already closed; delivery due reached)":
    (fundWallet, token) => [
        // Use similar arguments to the publicSale (though not necessarily).
        // See also presale constant on
        // migrations/3_deploy_public_sale_contracts.js file.
        fundWallet,  // wallet
        token.address,  // token contract
        65000,  // rate
        web3.toWei(5000410, "finney"),  // cap
        now - 3 * day,  // tokenDeliveryDue
        [0, now - 31 * day],  // whitelistGrades
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        // individual mas caps
        // a month ago           2 weeks ago              closing: a week ago
        [now - 31 * day,         now - 2 * week,          now - week],
        [web3.toWei(5, "ether"), web3.toWei(10, "ether"), 0],
    ],
}, ({
    testName,
    getAccount,
    getToken,
    createFund,
    fundOwner,
    fundWallet,
    getFund,
    withoutBalanceChangeIt,
}) => {
    const phase1 = testName.indexOf("(opened; phase 1)") >= 0;
    const phase2 = testName.indexOf("(opened; phase 2)") >= 0;
    const opened = phase1 || phase2;
    const deliveryDueReached =
        testName.indexOf("(already closed; delivery due reached)") >= 0;

    it("disallows to add to whitelist from other than owner", async () => {
        const contributor = getAccount();
        const notOwner = getAccount();
        await assertFail(
            getFund().addAddressesToWhitelist([contributor], 1, {
                from: notOwner,
            })
        );
    });

    it("disallows to add an address to an invalid grade", async () => {
        const contributor = getAccount();
        await assertFail(
            getFund().addAddressesToWhitelist([contributor], 3, {
                from: fundOwner,
            })
        );
    });

    withoutBalanceChangeIt(
        "should not receive ETH from address not whitelisted",
        async (contributor) => {
            const fund = getFund();
            await assertFail(
                fund.sendTransaction({
                    value: web3.toWei(1, "ether"),
                    from: contributor,
                }),
                "Transfer should be failed"
            );
        }
    );

    if (phase1) {
        withoutBalanceChangeIt(
            "should not receive ETH from address belonging to a currently " +
            "not opened grade",
            async (contributor) => {
                await getFund().addAddressesToWhitelist(
                    [contributor],
                    2,  // A grade which is not opened
                    {from: fundOwner}
                );
            },
            async (contributor) => {
                await assertFail(
                    getFund().sendTransaction({
                        value: web3.toWei(1, "ether"),
                        from: contributor,
                    }),
                    "Transfer should be failed"
                );
            }
        );
    }

    if (!opened) {
        it(
            "should not receive ethers if it's not opened yet or already closed",
            async () => {
                const contributor = getAccount();
                const fund = getFund();
                await fund.addAddressesToWhitelist([contributor], 1, {
                    from: fundOwner
                });
                await assertFail(
                    fund.sendTransaction({
                        value: web3.toWei(100, "finney"),
                        from: contributor,
                    })
                );
            }
        );
    }

    withoutBalanceChangeIt(
        "should not receive less than individualMinPurchaseWei",
        async (contributor) => {
            await getFund().addAddressesToWhitelist([contributor], 1, {
                from: fundOwner
            });
            return await getFund().individualMinPurchaseWei();
        },
        async (contributor, individualMinPurchaseWei) => {
            await assertFail(
                getFund().sendTransaction({
                    value: individualMinPurchaseWei.minus(1),
                    from: contributor,
                }),
                "Transfer should be failed"
            );
        }
    );

    if (opened) {
        const individualMaxCapWei =
            new web3.BigNumber(web3.toWei(phase1 ? 5 : 10, "ether"));

        withoutBalanceChangeIt(
            "should not receive more than individual max cap per contributor",
            async (contributor) => {
                await getFund().addAddressesToWhitelist([contributor], 1, {
                    from: fundOwner
                });
            },
            async (contributor) => {
                await assertFail(
                    getFund().sendTransaction({
                        value: individualMaxCapWei.plus(1),
                        from: contributor,
                    }),
                    "Transfer should be failed"
                );
            }
        );

        withoutBalanceChangeIt(
            "should not receive more than total individual max cap " +
            "per contributor",
            async (contributor) => {
                const fund = getFund();
                await fund.addAddressesToWhitelist([contributor], 1, {
                    from: fundOwner
                });
                const amount = web3.toWei(1, "ether");
                await fund.sendTransaction({
                    value: amount,
                    from: contributor,
                });
                return individualMaxCapWei.minus(amount);
            },
            async (contributor, remainingAllowedPurchase) => {
                await assertFail(
                    getFund().sendTransaction({
                        value: remainingAllowedPurchase.plus(1),
                        from: contributor,
                    }),
                    "Transfer should be failed"
                );
            }
        );

        const purchaseTokenSuccessfully = async function () {
            const contributor = getAccount();
            const fund = getFund();
            await fund.addAddressesToWhitelist([contributor], 1, {
                from: fundOwner
            });
            await fund.sendTransaction({
                value: web3.toWei(100, "finney"),
                from: contributor,
            });
            await fund.sendTransaction({
                value: individualMaxCapWei.minus(web3.toWei(100, "finney")),
                from: contributor,
            });
            return contributor;
        };

        it(
            "should receive if all conditions are satisfied",
            purchaseTokenSuccessfully
        );

        it("does not immediately deliver tokens", async () => {
            const contributor = await purchaseTokenSuccessfully();
            assertEq(
                0,
                await getToken().balanceOf(contributor),
                "Tokens should not be delivered immediately"
            );
        });

        if (!deliveryDueReached) {
            it("disallows to withdraw tokens by default", async () => {
                const contributor = await purchaseTokenSuccessfully();
                assertFail(
                    getFund().withdrawTokens({ from: contributor }),
                    "Withdrawal should be disallowed"
                );
            });
        }

        it("can be withdrawable by setWithdrawable()", async () => {
            const contributor = await purchaseTokenSuccessfully();
            const fund = getFund();
            const rate = await fund.rate();
            await fund.setWithdrawable(true, { from: fundOwner });
            await fund.withdrawTokens({ from: contributor });
            assertEq(
                rate.mul(individualMaxCapWei),
                await getToken().balanceOf(contributor),
                "Tokens should be delivered"
            );
        });

        if (deliveryDueReached) {
            it("can be withdrwable if delivery due reached", async () => {
                const contributor = await purchaseTokenSuccessfully();
                const fund = getFund();
                const rate = await fund.rate();
                await fund.withdrawTokens({ from: contributor });
                assertEq(
                    rate.mul(individualMaxCapWei),
                    await getToken().balanceOf(contributor),
                    "Tokens should be delivered"
                );
            });
        }
    }

    it("should not receive ethers if it is paused", async () => {
        const contributor = getAccount();
        const fund = getFund();
        await fund.addAddressesToWhitelist([contributor], 1, {from: fundOwner});
        await fund.pause({from: fundOwner});
        await assertFail(
            fund.sendTransaction({
                value: web3.toWei(100, "finney"),
                from: contributor,
            })
        );
        if (opened) {
            await fund.unpause({from: fundOwner});
            await fund.sendTransaction({
                value: web3.toWei(100, "finney"),
                from: contributor,
            });
        }
    });

    it("rejects TXes paying more than 40 gwei for gas price", async () => {
        const maxGasPrice = new web3.BigNumber(web3.toWei(40, "gwei"));
        const contributor = getAccount();
        const fund = getFund();
        await fund.addAddressesToWhitelist([contributor], 1, {from: fundOwner});
        await assertFail(
            fund.sendTransaction({
                value: web3.toWei(100, "finney"),
                from: contributor,
                gasPrice: maxGasPrice.plus(1),
            }),
            "The TX paying more than 40 gwei for gas price should fail."
        );
    });

    if (opened) {
        // fixture
        const setUpPurchasedState = async function (value) {
            const fund = await createFund();
            const beneficiary = getAccount();
            await fund.addAddressesToWhitelist([beneficiary], 1, {
                from: fundOwner,
            });
            await fund.sendTransaction({
                value,
                from: beneficiary,
            });
            return {
                fund,
                beneficiary,
            };
        };

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
                    fund.receiveRefund({from: beneficiary}),
                    "Withdrawal should be failed due to the lack of deposit"
                );
            }
        );

        // fixture
        const setUpRefundDepositedState = async function (purchased, refunded) {
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
        };

        it(
            "allows the beneficiary to receive the refunded deposit",
            async function () {
                const {
                    fund,
                    beneficiary,
                } = await setUpRefundDepositedState(
                    web3.toWei(500, "finney"),
                    web3.toWei(500, "finney"),
                );
                let previousContribution;
                previousContribution = await fund.contributions(
                    beneficiary
                );
                const previousEther = web3.eth.getBalance(beneficiary);
                const result = await fund.receiveRefund(beneficiary, {
                    from: beneficiary
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
                // We need to calculate the gas fee used for making
                // a transaction.
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
                assertEq(
                    previousContribution.minus(
                        web3.toWei(500, "finney")
                    ),
                    await fund.contributions(beneficiary),
                    "Individual contribution should be subtracted"
                );
            }
        );

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
                const result = await fund.receiveRefund(anotherAddress, {
                    from: beneficiary
                });
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
    }
});
