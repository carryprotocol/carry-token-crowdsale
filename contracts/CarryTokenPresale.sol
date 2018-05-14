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

import "./CarryTokenCrowdsale.sol";
import "./GradualDeliveryCrowdsale.sol";

/**
 * @title CarryTokenPresale
 * @dev The Carry token presale contract.
 */
contract CarryTokenPresale is CarryTokenCrowdsale, GradualDeliveryCrowdsale {
    // FIXME: Here we've wanted to use constructor() keyword instead,
    // but solium/solhint lint softwares don't parse it properly as of
    // April 2018.
    function CarryTokenPresale(
        address _wallet,
        CarryToken _token,
        uint256 _rate,
        uint256 _cap,
        uint256 _individualMinPurchaseWei,
        uint256 _individualMaxCapWei
    ) public CarryTokenCrowdsale(
        _wallet,
        _token,
        _rate,
        _cap,
        _individualMinPurchaseWei,
        _individualMaxCapWei
    ) GradualDeliveryCrowdsale (_rate, _wallet, _token) {
    }
}
