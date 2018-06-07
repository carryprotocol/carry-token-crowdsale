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
const CarryTokenPresale = artifacts.require("CarryTokenPresale");

const presale = {
    // See also <https://carryprotocol.io/#section-token-distribution>.
    //   1 ETH = 74,750 CRE
    //   1 wei = 7.475E-14 CRE
    // Note that both currencies have the same precision on
    // their minor units: 18 decimals.
    rate: 74750,

    // Max cap: 5000.41 ETH = 373,781,000 CRE
    cap: web3.toWei(5000410, "finney"),

    // Individual min and max purchases: from 0.1 ETH to 50 ETH
    // Due to gas fee, contributors tend to transfer incorrect amount of
    // ETH which doesn't satisfy the minimum purchase by a whisker,
    // e.g., 0.0999999... ETH.  In order to prevent such situations
    // we take 99 finney at least instead of 100 finney sharp.
    individualMinPurchaseWei: web3.toWei(99, "finney"),
    individualMaxCapWei: web3.toWei(50, "ether"),

    // The wallet address to receive ethers.  It should be a multisig wallet.
    wallet: "0x8D5F5f9a2621bE9d32896CF0172515Fb211E26bE",
};

module.exports = (deployer, network, accounts) => {
    let carryToken;
    deployer.deploy(CarryToken).then(() => {
        return CarryToken.deployed();
    }).then((_carryToken) => {
        carryToken = _carryToken;
        return deployer.deploy(
            CarryTokenPresale,
            presale.wallet,
            carryToken.address,
            presale.rate,
            presale.cap,
            presale.individualMinPurchaseWei,
            presale.individualMaxCapWei
        );
    }).then(() => {
        return CarryTokenPresale.deployed();
    }).then((carryTokenPresale) => {
        return carryToken.mint(
            carryTokenPresale.address,
            new web3.BigNumber(presale.cap).mul(presale.rate),
            {from: accounts[0]}
        );
    });
};
