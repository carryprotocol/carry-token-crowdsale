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
        contractName, getAccount, fundOwner, getFund, getToken, createFund,
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
            const fund = getFund();
            const token = getToken();
            const initialBalances =
                await Promise.all(contributors.map(c => token.balanceOf(c)));
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
            for (let i = 0; i < initialBalances.length; i++) {
                assertEq(
                    initialBalances[i], intermediateBalances[i],
                    "Token must not be withdrawn imediately after purchase"
                );
            }
            await fund.deliverTokensInRatio(1, 2, {from: fundOwner});
            const finalBalances =
                await Promise.all(contributors.map(c => token.balanceOf(c)));
            assertNotEq(
                initialBalances[0],
                finalBalances[0],
                "No token was transferred"
            );
            assertNotEq(
                initialBalances[1],
                finalBalances[1],
                "No token was transferred"
            );
            const rate = await fund.rate();
            for (let i = 0; i < initialBalances.length; i++) {
                assertEq(
                    finalBalances[i].minus(initialBalances[i]),
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
            await fund.deliverTokensInRatioFromTo(
                1, 2, from, to,
                {from: fundOwner}
            );
            const finalBalances =
                await Promise.all(contributors.map(c => token.balanceOf(c)));
            const rate = await fund.rate();
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
    }
);
