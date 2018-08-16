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
const CarryToken = artifacts.require("CarryToken");
const CarryPublicTokenCrowdsale =
    artifacts.require("CarryPublicTokenCrowdsale");

function timestamp(iso8601) {
    return +new Date(iso8601) / 1000 >> 0;
}

const publicSale = {
    // See also <https://carryprotocol.io/#section-token-distribution>.
    //   1 ETH = 65,000 CRE
    //   1 wei = 6.5E-14 CRE
    // Note that both currencies have the same precision on
    // their minor units: 18 decimals.
    rate: 65000,

    // Max cap: 5000.41 ETH = 373,781,000 CRE
    cap: web3.toWei(5000410, "finney"),

    // Due date of token delivery
    tokenDeliveryDue: timestamp("2019-01-01T00:00:00+09:00"),

    // Whitelist grades and available time for each grades
    whitelistGrades: [
        // This must be zero; means a special state of "not whitelisted."
        0,

        // Everyone who passed KYC/AML
        timestamp("2018-08-26T20:00:00+00:00"),

        // KYC/AML, quiz passed & non-target region
        timestamp("2018-08-27T20:00:00+09:00"),

        // KYC/AML, quiz passed & target region
        timestamp("2018-08-28T20:00:00+09:00"),
    ],

    // Available time frame & individual caps
    individualMaxCaps: {
        [timestamp("2018-08-26T20:00:00+09:00")]: web3.toWei(5, "ether"),
        [timestamp("2018-08-28T20:00:00+09:00")]: web3.toWei(10, "ether"),
        [timestamp("2018-09-09T20:00:00+09:00")]: 0,  // closing time
    },
    // Due to gas fee, contributors tend to transfer incorrect amount of
    // ETH which doesn't satisfy the minimum purchase by a whisker,
    // e.g., 0.0999999... ETH.  In order to prevent such situations
    // we take 99 finney at least instead of 100 finney sharp.
    individualMinPurchaseWei: web3.toWei(99, "finney"),

    // The wallet address to receive ethers.  It should be a multisig wallet.
    wallet: "0x8D5F5f9a2621bE9d32896CF0172515Fb211E26bE",
};

module.exports = (deployer, network, accounts) => {
    let delay = 0;
    if ((process.env.DELAY_SECONDS || "").match(/^\d+$/)) {
        delay = process.env.DELAY_SECONDS * 1000;
    }
    const tokenOwner =
        process.env.TOKEN_OWNER
            ? process.env.TOKEN_OWNER.toLowerCase()
            : accounts[0];
    if (!accounts.includes(tokenOwner)) {
        throw new Error(
            "No private key is available for the account " + tokenOwner +
            "; available accounts are: " + accounts.join(", ")
        );
    }
    let carryToken;
    CarryToken.deployed().then(() => {
        return CarryToken.deployed();
    }).then((_carryToken) => {
        carryToken = _carryToken;
        const caps = Object.entries(publicSale.individualMaxCaps);
        return deployer.deploy(
            CarryPublicTokenCrowdsale,
            publicSale.wallet,
            carryToken.address,
            publicSale.rate,
            publicSale.cap,
            publicSale.tokenDeliveryDue,
            publicSale.whitelistGrades,
            publicSale.individualMinPurchaseWei,
            caps.map(pair => pair[0]),
            caps.map(pair => pair[1]),
        );
    }).then(c => {
        return new Promise(resolve => setTimeout(() => resolve(c), delay));
    }).then(() => {
        return CarryPublicTokenCrowdsale.deployed();
    }).then((carryPublicTokenCrowdsale) => {
        return carryToken.mint(
            carryPublicTokenCrowdsale.address,
            new web3.BigNumber(publicSale.cap).mul(publicSale.rate),
            {from: tokenOwner}
        );
    }).then(c => {
        return new Promise(resolve => setTimeout(() => resolve(c), delay));
    });
};
