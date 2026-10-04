// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Original verification fixtures. These are not production DAO/NFT/DeFi products.
// Different function shapes exercise the same ABI pipeline without category routing.
contract GovernanceFixture {
    struct DAOInfo { string name; address admin; string logoUrl; string infoUrl; string description; string[] webLinks; }
    struct Proposal { address[] targets; uint256[] values; bytes[] calldatas; string description; }
    address public immutable admin = msg.sender;
    error InvalidVote(uint8 support);
    error NotMember(address caller);
    function getDaoInfo() external view returns (DAOInfo memory info) {
        info = DAOInfo("Workbench fixture", admin, "", "", "Original acceptance fixture", new string[](1));
        info.webLinks[0] = "https://example.com";
    }
    function propose(Proposal calldata proposal) external returns (uint256) {
        if (msg.sender != admin) revert NotMember(msg.sender);
        require(proposal.targets.length == proposal.values.length && proposal.targets.length == proposal.calldatas.length, "Length mismatch");
        return uint256(keccak256(abi.encode(proposal)));
    }
    function castVote(uint256, uint8 support) external returns (uint256) {
        if (msg.sender != admin) revert NotMember(msg.sender);
        if (support > 2) revert InvalidVote(support);
        return 9007199254740993;
    }
}
contract CollectibleFixture {
    address private holder = msg.sender;
    uint256 public constant tokenId = 9007199254740993;
    error NonexistentToken(uint256 id);
    error IncorrectOwner(address caller);
    function name() external pure returns (string memory) { return "Workbench collectible fixture"; }
    function ownerOf(uint256 id) public view returns (address) {
        if (id != tokenId) revert NonexistentToken(id);
        return holder;
    }
    function safeTransferFrom(address from, address to, uint256 id) external { transfer(from, to, id); }
    function safeTransferFrom(address from, address to, uint256 id, bytes calldata) external { transfer(from, to, id); }
    function transfer(address from, address to, uint256 id) private {
        ownerOf(id);
        if (from != holder || msg.sender != holder) revert IncorrectOwner(msg.sender);
        require(to != address(0), "Zero recipient");
        holder = to;
    }
}
contract RouteFixture {
    struct Leg { address asset; uint128 amount; bytes32 route; }
    struct Quote { uint256 output; bool ready; }
    mapping(address => uint256) public deposited;
    function quote(Leg[] calldata legs) external pure returns (Quote[] memory quotes) {
        quotes = new Quote[](legs.length);
        for (uint256 i; i < legs.length; ++i) quotes[i] = Quote(uint256(legs[i].amount) * 2, true);
    }
    function deposit(address receiver) external payable { deposited[receiver] += msg.value; }
}
