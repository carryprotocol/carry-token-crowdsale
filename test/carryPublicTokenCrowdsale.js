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
const { assertEq, assertFail, multipleContracts } = require("./utils");

const currentTimestamp = +new Date() / 1000 >> 0;
const minute = 60;
const hour = 60 * minute;
const day = 24 * hour;

multipleContracts({
    "CarryPublicTokenCrowdsale (not opened yet)": (fundWallet, token) => [
        // Use similar arguments to the publicSale (though not necessarily).
        // See also presale constant on
        // migrations/3_deploy_public_sale_contracts.js file.
        fundWallet,  // wallet
        token.address,  // token contract
        65000,  // rate
        web3.toWei(5000410, "finney"),  // cap
        [0, currentTimestamp + 14 * day],  // whitelistGrades
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        [  // individualMaxCaps
            currentTimestamp + 14 * day,  // 2 weeks later
            web3.toWei(5, "ether"),
            currentTimestamp + 21 * day,  // 3 weeks later
            web3.toWei(10, "ether"),
            currentTimestamp + 31 * day,  // closingTime: a month later
            0,
        ],
    ],
    "CarryPublicTokenCrowdsale (opened; phase 1)": (fundWallet, token) => [
        // Use similar arguments to the publicSale (though not necessarily).
        // See also presale constant on
        // migrations/3_deploy_public_sale_contracts.js file.
        fundWallet,  // wallet
        token.address,  // token contract
        65000,  // rate
        web3.toWei(5000410, "finney"),  // cap
        [  // whitelistGrades
            0,
            currentTimestamp - 7 * day,
            currentTimestamp + 7 * day,
        ],
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        [  // individualMaxCaps
            currentTimestamp - 7 * day,  // a week ago
            web3.toWei(5, "ether"),
            currentTimestamp + 7 * day,  // a week later
            web3.toWei(10, "ether"),
            currentTimestamp + 14 * day,  // closingTime: 2 weeks later
            0,
        ],
    ],
    "CarryPublicTokenCrowdsale (opened; phase 2)": (fundWallet, token) => [
        // Use similar arguments to the publicSale (though not necessarily).
        // See also presale constant on
        // migrations/3_deploy_public_sale_contracts.js file.
        fundWallet,  // wallet
        token.address,  // token contract
        65000,  // rate
        web3.toWei(5000410, "finney"),  // cap
        [  // whitelistGrades
            0,
            currentTimestamp - 14 * day,
            currentTimestamp - 7 * day,
        ],
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        [  // individualMaxCaps
            currentTimestamp - 14 * day,  // 2 weeks ago
            web3.toWei(5, "ether"),
            currentTimestamp - 7 * day,  // a week ago
            web3.toWei(10, "ether"),
            currentTimestamp + 14 * day,  // closingTime: 2 weeks later
            0,
        ],
    ],
    "CarryPublicTokenCrowdsale (already closed)": (fundWallet, token) => [
        // Use similar arguments to the publicSale (though not necessarily).
        // See also presale constant on
        // migrations/3_deploy_public_sale_contracts.js file.
        fundWallet,  // wallet
        token.address,  // token contract
        65000,  // rate
        web3.toWei(5000410, "finney"),  // cap
        [0, currentTimestamp - 31 * day],  // whitelistGrades
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        [
            currentTimestamp - 31 * day,  // a month ago
            web3.toWei(5, "ether"),
            currentTimestamp - 14 * day,  // 2 weeks ago
            web3.toWei(10, "ether"),
            currentTimestamp - 7 * day,  // closingTime: a week ago
            0,
        ],
    ],
}, ({
    testName,
    getAccount,
    getToken,
    fundOwner,
    getFund,
    withoutBalanceChangeIt,
}) => {
    const phase1 = testName.indexOf("(opened; phase 1)") >= 0;
    const phase2 = testName.indexOf("(opened; phase 2)") >= 0;
    const opened = phase1 || phase2;

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

        it("disallows to withdraw tokens by default", async () => {
            const contributor = await purchaseTokenSuccessfully();
            assertFail(
                getFund().withdrawTokens({ from: contributor }),
                "Withdrawal should be disallowed"
            );
        });

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
});
