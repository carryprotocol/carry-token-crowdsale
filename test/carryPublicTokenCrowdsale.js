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
const { assertFail, multipleContracts } = require("./utils");

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
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        [
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
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        [
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
        web3.toWei(99, "finney"),  // individualMinPurchaseWei
        [
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
}, ({ testName, getAccount, fundOwner, getFund, withoutBalanceChangeIt  }) => {
    const phase1 = testName.indexOf("(opened; phase 1)") >= 0;
    const phase2 = testName.indexOf("(opened; phase 2)") >= 0;
    const opened = phase1 || phase2;

    if (!opened) {
        it(
            "should not receive ethers if it's not opened yet or already closed",
            async () => {
                const contributor = getAccount();
                const fund = getFund();
                // TODO: We may need to add contributor to whitelist here
                await assertFail(
                    fund.sendTransaction({
                        value: web3.toWei(5, "finney"),
                        from: contributor,
                    })
                );
            }
        );
    }

    withoutBalanceChangeIt(
        "should not receive less than individualMinPurchaseWei",
        async () => {
            // TODO: We may need to add contributor to whitelist here
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
            async () => {
                // TODO: We may need to add contributor to whitelist here
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
                // TODO: We may need to add contributor to whitelist here
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

        it("should receive if all conditions are satisfied", async () => {
            const contributor = getAccount();
            const fund = getFund();
            // TODO: We may need to add contributor to whitelist here
            await fund.sendTransaction({
                value: web3.toWei(100, "finney"),
                from: contributor,
            });
            await fund.sendTransaction({
                value: individualMaxCapWei.minus(web3.toWei(100, "finney")),
                from: contributor,
            });
        });
    }

    it("should not receive ethers if it is paused", async () => {
        const contributor = getAccount();
        const fund = getFund();
        // TODO: We may need to add contributor to whitelist here
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
        // TODO: We may need to add contributor to whitelist here
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
