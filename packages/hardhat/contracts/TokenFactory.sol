// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./SimpleERC20.sol";

contract TokenFactory {
    struct TokenInfo {
        address tokenAddress;
        string name;
        string symbol;
        uint256 totalSupply;
        address creator;
        uint256 createdAt;
    }

    mapping(address => TokenInfo) public tokens;
    address[] public allTokens;
    mapping(address => address[]) public userTokens;

    event TokenCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 totalSupply,
        address indexed creator
    );

    /**
     * @dev Creates a new ERC20 token
     * @param _name Name of the token
     * @param _symbol Symbol of the token
     * @param _totalSupply Total supply of the token (will be sent to creator)
     */
    function createToken(
        string memory _name,
        string memory _symbol,
        uint256 _totalSupply
    ) external returns (address) {
        require(bytes(_name).length > 0, "TokenFactory: Name cannot be empty");
        require(bytes(_symbol).length > 0, "TokenFactory: Symbol cannot be empty");
        require(_totalSupply > 0, "TokenFactory: Total supply must be greater than 0");

        // Deploy new token contract
        SimpleERC20 newToken = new SimpleERC20(_name, _symbol, _totalSupply, msg.sender);
        address tokenAddress = address(newToken);

        // Store token info
        tokens[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            name: _name,
            symbol: _symbol,
            totalSupply: _totalSupply,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        // Add to arrays for tracking
        allTokens.push(tokenAddress);
        userTokens[msg.sender].push(tokenAddress);

        emit TokenCreated(tokenAddress, _name, _symbol, _totalSupply, msg.sender);

        return tokenAddress;
    }

    /**
     * @dev Get all tokens created by a user
     */
    function getUserTokens(address _user) external view returns (address[] memory) {
        return userTokens[_user];
    }

    /**
     * @dev Get all tokens created through this factory
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }

    /**
     * @dev Get total number of tokens created
     */
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    /**
     * @dev Get token info by address
     */
    function getTokenInfo(address _tokenAddress) external view returns (TokenInfo memory) {
        return tokens[_tokenAddress];
    }

    /**
     * @dev Check if token was created by this factory
     */
    function isFactoryToken(address _tokenAddress) external view returns (bool) {
        return tokens[_tokenAddress].tokenAddress != address(0);
    }
} 