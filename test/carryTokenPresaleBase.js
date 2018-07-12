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

multipleContracts(
    {
        "CarryTokenPresaleBase": (fundWallet, token) => [
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
    async function ({ getAccount, fundWallet, fundOwner, getFund }) {
        function withoutBalanceChangeIt (label, fA, fB) {
            it(label, async () => {
                const pre = fB ? fA : async () => null;
                const test = fB ? fB : fA;
                const contributor = getAccount();

                // pre() runs before "previous" balances are captured.
                const state = await pre(contributor);

                const prevContributorBalance = web3.eth.getBalance(contributor);
                const prevFundWalletBalance = web3.eth.getBalance(fundWallet);
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
                    "Amount must not be sent to the fund [" + fundWallet + "]"
                );
            });
        }

        withoutBalanceChangeIt(
            "should not receive ETH from address not whitelisted",
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

        withoutBalanceChangeIt(
            "should not receive less than individualMinPurchaseWei",
            async (contributor) => {
                await getFund().addAddressToWhitelist(contributor, {
                    from: fundOwner,
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

        withoutBalanceChangeIt(
            "should not receive more than individualMaxCapWei per contributor",
            async (contributor) => {
                await getFund().addAddressToWhitelist(contributor, {
                    from: fundOwner,
                });
                return await getFund().individualMaxCapWei();
            },
            async (contributor, individualMaxCapWei) => {
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
            "should not receive more than total individualMaxCapWei " +
            "per contributor",
            async (contributor) => {
                const fund = getFund();
                await fund.addAddressToWhitelist(contributor, {
                    from: fundOwner,
                });
                const amount = web3.toWei(1, "ether");
                await fund.sendTransaction({
                    value: amount,
                    from: contributor,
                });
                const individualMaxCapWei = await fund.individualMaxCapWei();
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
            await fund.addAddressToWhitelist(contributor, {from: fundOwner});
            await fund.sendTransaction({
                value: web3.toWei(100, "finney"),
                from: contributor,
            });
        });

        it("should not receive ethers if it is paused", async () => {
            const contributor = getAccount();
            const fund = getFund();
            await fund.addAddressToWhitelist(contributor, {from: fundOwner});
            await fund.pause({from: fundOwner});
            await assertFail(
                fund.sendTransaction({
                    value: web3.toWei(100, "finney"),
                    from: contributor,
                })
            );
            await fund.unpause({from: fundOwner});
            await fund.sendTransaction({
                value: web3.toWei(100, "finney"),
                from: contributor,
            });
        });

        it("rejects TXes paying more than 40 gwei for gas price", async () => {
            const maxGasPrice = new web3.BigNumber(web3.toWei(40, "gwei"));
            const contributor = getAccount();
            const fund = getFund();
            await fund.addAddressToWhitelist(contributor, {from: fundOwner});
            await assertFail(
                fund.sendTransaction({
                    value: web3.toWei(100, "finney"),
                    from: contributor,
                    gasPrice: maxGasPrice.plus(1),
                }),
                "The TX paying more than 40 gwei for gas price should fail."
            );
        });
    }
);
