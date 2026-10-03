// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
/// @notice A small caller-scoped example for typed contract interaction.
contract Observation {
    struct Sample { string label; int64 value; uint64[] readings; }
    mapping(address => Sample) private samples;
    error EmptyLabel(address caller);
    error NoSample(address caller);
    event Recorded(address indexed caller, string label, int64 value);
    function record(Sample calldata sample) external {
        if (bytes(sample.label).length == 0) revert EmptyLabel(msg.sender);
        samples[msg.sender] = sample;
        emit Recorded(msg.sender, sample.label, sample.value);
    }
    function latest() external view returns (Sample memory sample) {
        sample = samples[msg.sender];
        if (bytes(sample.label).length == 0) revert NoSample(msg.sender);
    }
    function describe(uint256 value) external pure returns (uint256) { return value; }
    function describe(string calldata value) external pure returns (string memory) { return value; }
}
