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
const { assertEq, assertFail } = require("./utils");

const CarryToken = artifacts.require("CarryToken");
const CarryTokenCrowdsale = artifacts.require("CarryTokenCrowdsale");

contract('CarryTokenCrowdsale', async (accounts) => {
    const reservedAccounts = 1;
    let accountIndex = reservedAccounts;
    const getAccount = () => {
        const account = accounts[accountIndex++];
        if (accountIndex >= accounts.length) {
            accountIndex = reservedAccounts;
        }
        return account;
    }

    const fundWallet = accounts[0];
    const fundOwner = accounts[0];
    let token;
    let fund;
    before(async () => {
        token = await CarryToken.deployed();
        fund = await CarryTokenCrowdsale.deployed();
    });

    let withoutBalanceChangeIt = (label, fA, fB) => it(label, async () => {
        const pre = fB ? fA : async (_) => null;
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
            "Amount must not be taken from the contributor [" + contributor +
            "] (except of gas fee)"
        );
        assertEq(
            prevFundWalletBalance,
            web3.eth.getBalance(fundWallet),
            "Amount must not be sent to the fund [" + fundWallet + "]"
        );
    })

    withoutBalanceChangeIt(
        "should not receive ETH from address not whitelisted",
        async (contributor) => {
            await assertFail(
                fund.sendTransaction({
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
            await fund.addToWhitelist(contributor, {from: fundOwner});
            return await fund.individualMinPurchaseWei();
        },
        async (contributor, individualMinPurchaseWei) => {
            await assertFail(
                fund.sendTransaction({
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
            await fund.addToWhitelist(contributor, {from: fundOwner});
            return await fund.individualMaxCapWei();
        },
        async (contributor, individualMaxCapWei) => {
            await assertFail(
                fund.sendTransaction({
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
            await fund.addToWhitelist(contributor, {from: fundOwner});
            const amount = web3.toWei(1, "ether");
            await fund.sendTransaction({
                value: amount,
                from: contributor,
            });
            const individualMaxCapWei = await fund.individualMaxCapWei();
            return individualMaxCapWei.minus(amount)
        },
        async (contributor, remainingAllowedPurchase) => {
            await assertFail(
                fund.sendTransaction({
                    value: remainingAllowedPurchase.plus(1),
                    from: contributor,
                }),
                "Transfer should be failed"
            );
        }
    );

    it("should receive if all conditions are satisfied", async () => {
        const contributor = getAccount();
        await fund.addToWhitelist(contributor, {from: fundOwner});
        await fund.sendTransaction({
            value: web3.toWei(100, "finney"),
            from: contributor,
        });
    });
});
