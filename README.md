Carry token crowdsale
=====================

[![Build Status][ci-image]][ci]

[Carry] the protocol is a platform that connects offline merchants and consumers
using blockchain.

Carry the token, which has the ticker symbol **CRE**, is an ERC20-compliant
capped token.

This repository contains:

- `CarryToken` contract which declares the **CRE** token based on
  [OpenZeppelin]'s [`CappedToken`][CappedToken] contract,

- `CarryTokenPresaleBase` which declares the common base contract for token
  presale and is based on [OpenZeppelin]'s [`CappedCrowdsale`][CappedCrowdsale]
  & [`WhitelistedCrowdsale`][WhitelistedCrowdsale] contracts, to be used for
  the Carry token presale,

- `GradualDeliveryCrowdsale` which declares the base contract for token
  crowdsale that does not deliver tokens to a beneficiary immediately after
  they have just purchased, but instead partially delivers tokens through
  several times, and

- `CarryTokenPresale` which declares the contract for the Carry token presale
  and inherits above `CarryTokenCrowdsale` and `GradualDeliveryCrowdsale`.

[ci-image]: https://travis-ci.org/carryprotocol/carry-token-crowdsale.svg?branch=master
[ci]: https://travis-ci.org/carryprotocol/carry-token-crowdsale
[Carry]: https://carryprotocol.io/
[OpenZeppelin]: https://openzeppelin.org/
[CappedToken]: https://openzeppelin.org/api/docs/token_ERC20_CappedToken.html
[CappedCrowdsale]: https://openzeppelin.org/api/docs/crowdsale_validation_CappedCrowdsale.html
[WhitelistedCrowdsale]: https://openzeppelin.org/api/docs/crowdsale_validation_WhitelistedCrowdsale.html


Build
-----

This project is built on [Truffle] and [OpenZeppelin] frameworks.  In order to
install them:

    npm install

The following command compiles every contract in the repository:

    npx truffle compile

[Truffle]: http://truffleframework.com/


Test
----

The followoing command runs the whole test suite against every contract:

    npm test


Deploy to [Ropsten] (testnet) through [Infura]
----------------------------------------------

The following instructions deploy two contracts to the [Ropsten], a public
testnet, through Infura.

[Infura] is a kind of cloud service that hosts HTTP RPC compatible to [Geth]
HTTP RPC.  Although you could run a [Geth] node on your system, it takes
a lot of time to catch up the whole transactions on the public network.
Instead, Infura solves a lot of troublesome chores for you.

First of all, since you need to pay for creating contracts, you have an account
(which can be referred as an address) having a sufficient balance.  You could
get some ethers for free from several volunteered faucets: [here][1] and
[here][2].

If you've got an account of a sufficient balance with its mnemonic (secret key),
you need to sign up Infura.  They require only few fields such as name, it takes
only a minute.  After signing up, you would get your own access token which
follows <https://ropsten.infura.io/> base URL.

Last of all, with `MNEMONIC` and `ACCESS_TOKEN` environment variables
the following command deploys all contracts to the public testnet:

    MNEMONIC="..." ACCESS_TOKEN="..." npx truffle deploy --network ropsten

Alternatively, raw `PRIVATE_KEY` can be used instead of `MNEMONIC`:

    PRIVATE_KEY="..." ACCESS_TOKEN="..." npx truffle deploy --network ropsten

Note that `PRIVATE_KEY` can contain multiple private keys separated by
whitespace.

In order to deploy the `CarryToken` contract using a different owner account,
configure `TOKEN_OWNER` environment variable.  It has to be a public key of
the owner account, and either `MNEMONIC` or `PRIVATE_KEY` have to contain
its corresponding private part.

    TOKEN_OWNER="..." MNEMONIC="..." ACCESS_TOKEN="..." npx truffle deploy --network ropsten

[Since Infura has a load balancer in front of their nodes, the deployment
transactions can be intermittently falling out of sync.][3]  In order to
work around this problem, `DELAY_SECONDS` environment variable can configure
the interval to delay between transactions:

    DELAY_SECONDS=120 MNEMONIC="..." ACCESS_TOKEN="..." npx truffle deploy --network ropsten

You must be able to find transactions made by your account from
[Etherscan][Ropsten].

[Ropsten]: https://ropsten.etherscan.io/
[Infura]: https://infura.io/
[Geth]: https://github.com/ethereum/go-ethereum
[1]: http://faucet.ropsten.be:3001/
[2]: https://faucet.bitfwd.xyz/
[3]: https://github.com/trufflesuite/truffle-migrate/issues/29


Deploy to the public main network through [Infura]
--------------------------------------------------

It's almost the same to Ropsten, except that `--network ropsten` options in
all commands have to be replaced by `--network mainnet`, e.g.:

    MNEMONIC="..." ACCESS_TOKEN="..." npx truffle deploy --network mainnet


License
-------

Copyright © 2018 Carry Protocol.

Every source code in this repository is distributed under [GPLv3] or higher.

[GPLv3]: https://www.gnu.org/licenses/gpl-3.0.html
