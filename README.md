Carry token crowdsale
=====================

[Carry] the protocol is a platform that connects offline merchants and consumers
using blockchain.

Carry the token, which has the ticker symbol **CRE**, is an ERC20-compliant
capped token.

This repository contains `CarryToken` contract which declares the **CRE** tokken
based on [OpenZeppelin]'s [`CappedToken`][CappedToken] contract.

[Carry]: https://carryprotocol.io/
[OpenZeppelin]: https://openzeppelin.org/
[CappedToken]: https://openzeppelin.org/api/docs/token_ERC20_CappedToken.html


Build
-----

This project is built on [Truffle] and [OpenZeppelin] frameworks.  In order to
install them:

    npm install

It is recommended to append *node_modules/.bin/* directory to `PATH` environment
variable:

    export PATH="$PATH:$(pwd)/node_modules/.bin/"

Or you should prepend the path to `truffle` command every time.

The following command compiles every contract in the repository:

    truffle compile

The followoing command runs the whole test suite against every contract:

    npm test

[Truffle]: http://truffleframework.com/


License
-------

Every source code in this repository is distributed under [GPLv3] or higher.

[GPLv3]: https://www.gnu.org/licenses/gpl-3.0.html
