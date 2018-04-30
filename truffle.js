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

// See <http://truffleframework.com/docs/advanced/configuration>
// to customize your Truffle configuration!
const deasync = require("deasync");
const http = require("http");

const networks = {};
const networkCandidates = {
    development: {
        host: "127.0.0.1",
        port: 7545,
        network_id: "*",
    },
};

// Insert only currently available networks into the configuration.
let _loaded = {};
for (let network of Object.entries(networkCandidates)) {
    _loaded[network[0]] = false;
    let request = http.request(
        {
            method: "POST",
            hostname: network[1].host,
            port: network[1].port,
            path: "/",
            agent: false,
            headers: {"Content-Type": "application/json"}
        },
        (response) => {
            _loaded[network[0]] = true
            if (response.statusCode === 200) {
                networks[network[0]] = network[1];
            }
        }
    )
    request.on("error", () => _loaded[network[0]] = true)
    request.write(
        JSON.stringify({
            jsonrpc: "2.0",
            method: "net_version",
            params: [],
        })
    );
    request.end();
}

deasync.loopWhile(() => Object.values(_loaded).some((l) => !l));

module.exports = {
    networks: networks,
};
