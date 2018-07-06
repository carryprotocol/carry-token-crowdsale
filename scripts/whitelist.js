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
const fs = require("fs");
const CarryTokenPresale = artifacts.require("CarryTokenPresale");

// Note that this script should be run through Truffle.  This requires
// the environment variable WHITELIST_FILE which refers to the text file of
// the line-separated addresses to be whitelisted.
// 
//     WHITELIST_FILE="..." \
//     MNEMONIC="..." \
//     npx truffle exec scripts/whitelist.js --network ropsten
//
// See also Truffle's docs:
//
//     https://truffleframework.com/docs/getting_started/scripts
module.exports = callback => CarryTokenPresale.deployed().then(contract => {
    const {
        WHITELIST_FILE: filePath,
        CHUNK: chunk = 260,
        GAS_PRICE_GWEI: gasPriceGwei = "80",
        OFFSET_ADDRESS: offsetAddress = null,
    } = process.env;
    if (!filePath) {
        callback(new Error("Missing environment variable: WHITELIST_FILE"));
        return;
    }
    if (typeof chunk != "number" && !chunk.match(/^\d+$/)) {
        callback(new Error("CHUNK should be integral"));
        return;
    }
    let delay = 0;
    if ((process.env.DELAY_SECONDS || "").match(/^\d+$/)) {
        delay = process.env.DELAY_SECONDS * 1000;
    }

    fs.readFile(filePath, "ascii", (err, data) => {
        if (err) {
            callback(err);
            return;
        }

        let addresses = data.trim().split(/[ \t\r]*\n[ \t\r]*/g);
        if (offsetAddress) {
            const offset = addresses.indexOf(offsetAddress);
            console.info("Skip " + offset + " addressed; start from " +
                         addresses[offset]);
            addresses = addresses.slice(offset);
        }

        return updateWhitelist(
            contract,
            addresses,
            chunk,
            gasPriceGwei,
            delay,
        ).catch(e => {
            console.error(e);
            callback(e);
        }).then(() => {
            callback("Done.");
        });
    });
});

async function updateWhitelist(
    contract,
    addresses,
    chunk,
    gasPriceGwei,
    delay,
) {
    for (const address of addresses) {
        if (!address.match(/^0x[0-9a-f]{40}$/i)) {
            throw new Error("Invalid address: " + address);
        }
    }

    const paused = await contract.paused();

    if (paused) {
        console.info("The contract is already paused.");
    } else {
        await contract.pause();
        console.info("The contract has just paused.");
        await sleep(delay);
    }

    const addressChunks = chunks(addresses, chunk);
    let remainingChunks = addressChunks.length;
    console.info("The estimated number to make calls: " + remainingChunks);
    console.info("(addresses: " + addresses.length + ", chunk size: " +
                 chunk + ", chunks: " + remainingChunks + ")");

    for (const addresses of addressChunks) {
        const gasLimit = 50000 + 30000 * addresses.length;
        console.info("\nThe remaining chunks: " + remainingChunks + " / " +
                     addressChunks.length);
        console.info("The first address of this chunk: " + addresses[0]);
        console.info("Gas limit: " + gasLimit);
        try {
            await contract.addManyToWhitelist(addresses, {
                gas: gasLimit,
                gasPrice: web3.toWei(gasPriceGwei, "gwei"),
            });
        } catch (e) {
            const timeout =
                e.toString().includes("wasn't processed in 240 seconds");
            if (timeout || e.toString().includes("nonce too low")) {
                let multiply = 1;
                if (timeout) {
                    multiply = 2;
                    console.info("Timed out; retry in raised gas price: " +
                                 (gasPriceGwei * multiply) + " gwei.");
                } else {
                    console.info("Failed due to nonce mismatch; retry...");
                }
                try {
                    await contract.addManyToWhitelist(addresses, {
                        gas: gasLimit,
                        gasPrice: web3.toWei(gasPriceGwei * multiply, "gwei"),
                    });
                } catch (e) {
                    console.error("Errored addresses: ", addresses);
                    console.error(e);
                    console.error("The first address of the errored chunk: " +
                                  addresses[0]);
                    throw e;
                }
            } else {
                console.error("Errored addresses: ", addresses);
                console.error(e);
                console.error("The first address of the errored chunk: " +
                              addresses[0]);
                throw e;
            }
        }
        await sleep(delay);
        remainingChunks--;
    }
    return;
}

function chunks(array, n) {
    const result = [];
    if (typeof n != "number") {
        n = parseInt(n);
    }
    for (let i = 0; i < array.length; i += n) {
        result.push(array.slice(i, i + n));
    }
    return result;
}

function sleep(seconds) {
    console.info("(Wait for " + seconds + " seconds...)");
    return new Promise(resolve => setTimeout(() => resolve(), seconds));
}

/* eslint no-console: ["error", { allow: ["info", "error"] }] */
