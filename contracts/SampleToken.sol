// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Generic ERC20 token
contract AirdropToken is ERC20Capped, Ownable {

    /// @param name Token name
    /// @param symbol Token symbol
    /// @param cap Define a limit for the total supply
    constructor(string memory name, string memory symbol, uint256 cap) ERC20(name, symbol)
    ERC20Capped(cap) Ownable(msg.sender) {}

    /// @notice Mint new tokens.
    /// @dev Only owner can perform this transaction.
    /// @param account Account to which tokens will be minted
    /// @param amount Amount of tokens to be minted
    function mint(address account, uint256 amount) public onlyOwner {
        super._mint(account, amount);
    }

    /// @notice Burn tokens.
    /// @dev Only owner can perform this transaction.
    /// @param amount Amount of tokens to be burned
    function burn(uint256 amount) public onlyOwner {
        super._burn(msg.sender, amount);
    }
}