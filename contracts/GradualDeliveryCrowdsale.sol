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
pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/**
 * @title GradualDeliveryCrowdsale
 * @dev Crowdsale that does not deliver tokens to a beneficiary immediately
 * after they has just purchased, but instead partially delivers tokens through
 * several times when the contract owner calls deliverTokenRatio() method.
 */
contract GradualDeliveryCrowdsale is Crowdsale, Ownable {
    using SafeMath for uint256;

    mapping(address => uint256) public balances;
    address[] beneficiaries;

    /**
     * @dev Deliver only the given ratio of tokens to the beneficiaries.
     * For example, where there are two beneficiaries of each balance 90 CRE and
     * 60 CRE, deliverTokensInRatio(1, 3) delivers each 30 CRE and 20 CRE to
     * them.  In the similar way, deliverTokensInRatio(1, 1) delivers
     * their entire tokens.
     */
    function deliverTokensInRatio(
        uint256 _numerator,
        uint256 _denominator
    ) external onlyOwner {
        require(_numerator <= _denominator);
        for (uint i = 0; i < beneficiaries.length; i = i.add(1)) {
            address beneficiary = beneficiaries[i];
            uint256 balance = balances[beneficiary];
            if (balance > 0) {
                uint256 amount = balance.mul(_numerator).div(_denominator);
                balances[beneficiary] = balance.sub(amount);
                _deliverTokens(beneficiary, amount);
            }
        }
    }

    function _processPurchase(
        address _beneficiary,
        uint256 _tokenAmount
    ) internal {
        beneficiaries.push(_beneficiary);
        balances[_beneficiary] = balances[_beneficiary].add(_tokenAmount);
    }
}
