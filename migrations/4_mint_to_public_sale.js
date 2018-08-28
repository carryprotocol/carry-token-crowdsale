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
    return CarryToken.deployed().then((_carryToken) => {
        carryToken = _carryToken;
        return CarryPublicTokenCrowdsale.deployed();
    }).then(c => {
        return new Promise(resolve => setTimeout(() => resolve(c), delay));
    }).then((publicSale) => {
        return carryToken.mint(
            publicSale.address,
            new web3.BigNumber(publicSale.cap()).mul(publicSale.rate()),
            {from: tokenOwner}
        );
    }).then(c => new Promise(resolve => setTimeout(() => resolve(c), delay)));
};
