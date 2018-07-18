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
pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./CarryToken.sol";

/**
 * @title CarryTokenCrowdsale
 * @dev The common base contract for both sales: the Carry token presale,
 * and the Carry token public crowdsale.
 */
contract CarryPublicTokenCrowdsale is CappedCrowdsale, Pausable {
    using SafeMath for uint256;

    // Individual min purchases.
    uint256 public individualMinPurchaseWei;

    struct IndividualMaxCap {
        uint256 timestamp;
        uint256 maxWei;
    }

    // Individual max purchases differ by time.  The mapping keys are timestamps
    // and values are weis an individual can purchase at most
    // If the transaction is made later than a timestamp it can accept
    // the corresponding cap at most.
    //
    // Where individualMaxCaps = [
    //   IndividualMaxCap(1533081600000, 5 ether),
    //   IndividualMaxCap(1533686400000, 10 ehter)
    // ]
    // If a transaction is made before 1533081600000 (2018-08-01 sharp UTC)
    // it disallows any purchase.
    // If a transaction is made between 1533081600000 (2018-08-01 sharp UTC)
    // 1533686400000 (2018-08-15 sharp UTC) it takes 5 ethers at most.
    // If a transaction is made after 1533686400000 (2018-08-15 sharp UTC)
    // it takes 10 ethers at most.
    IndividualMaxCap[] public individualMaxCaps;

    mapping(address => uint256) public contributions;

    uint256 public closingTime;

    constructor(
        address _wallet,
        CarryToken _token,
        uint256 _rate,
        uint256 _cap,
        uint256 _closingTime,
        uint256 _individualMinPurchaseWei,

        // Since Solidity currently doesn't allows parameters to take array of
        // structs, we work around this by taking (timestamp, weis) pairs as
        // a 1d-array of [timestamp1, weis1, timestamp2, weis2, ...].
        // It fails if the length is not even but odd.
        uint256[] _individualMaxCaps
    ) public CappedCrowdsale(_cap) Crowdsale(_rate, _wallet, _token) {
        require(
            _individualMaxCaps.length % 2 == 0,
            "The length of _individualMaxCaps has to be even, not odd."
        );
        closingTime = _closingTime;
        individualMinPurchaseWei = _individualMinPurchaseWei;
        for (uint256 i = 0; i < _individualMaxCaps.length; i += 2) {
            individualMaxCaps.push(
                IndividualMaxCap(
                    _individualMaxCaps[i],
                    _individualMaxCaps[i + 1]
                )
            );
        }
    }

    function _preValidatePurchase(
        address _beneficiary,
        uint256 _weiAmount
    ) internal whenNotPaused {
        super._preValidatePurchase(_beneficiary, _weiAmount);

        // Tokensale is closed after closingTime.
        require(
            // solium-disable-next-line security/no-block-members
            block.timestamp <= closingTime,
            "Already closed; it's too late."
        );

        uint256 contribution = contributions[_beneficiary];
        uint256 contributionAfterPurchase = contribution.add(_weiAmount);

        // If a contributor already has purchased a minimum amount, say 0.1 ETH,
        // then they can purchase once again with less than a minimum amount,
        // say 0.01 ETH, because they have already satisfied the minimum
        // purchase.
        require(
            contributionAfterPurchase >= individualMinPurchaseWei,
            "Sent ethers is not enough."
        );

        // See also the comment on the individualMaxCaps above.
        uint256 latestTimestamp = 0;
        uint256 individualMaxWei = 0;
        for (uint256 i = 0; i < individualMaxCaps.length; i++) {
            // solium-disable-next-line security/no-block-members
            if (individualMaxCaps[i].timestamp <= block.timestamp &&
                individualMaxCaps[i].timestamp > latestTimestamp) {
                latestTimestamp = individualMaxCaps[i].timestamp;
                individualMaxWei = individualMaxCaps[i].maxWei;
            }
        }
        require(
            contributionAfterPurchase <= individualMaxWei,
            "Total ethers you've purchased is too much."
        );
    }

    function _updatePurchasingState(
        address _beneficiary,
        uint256 _weiAmount
    ) internal {
        super._updatePurchasingState(_beneficiary, _weiAmount);
        contributions[_beneficiary] = contributions[_beneficiary].add(
            _weiAmount
        );
    }
}
