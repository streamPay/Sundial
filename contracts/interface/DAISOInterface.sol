// SPDX-License-Identifier: MIT


pragma solidity >= 0.8;


interface DAISOInterface {
/* DAISO */
    event CreateProject(
        uint256 indexed projectId,
        address indexed sender,
        string hash
    );

    event CreateStream(uint256 indexed streamId, address indexed sender);

    event WithdrawFromProject(
        uint256 indexed projectId,
        address indexed sender,
        uint256 withdrawTime,
        uint256 amount
    );

    event CancelProject(
        uint256 indexed projectId,
        uint256 indexed streamId,
        address sender,
        uint256 investSellBalance,
        uint256 investFundBalance,
        uint256 refunds,
        uint256 cancelTime
    );

    event CancelProjectForProject (
        uint256 indexed projectId,
        uint256 projectSellBalance
    );

/* DAISOForInvest */
    event WithdrawFromInvest(
        uint256 indexed streamId,
        uint256 indexed projectId,
        address indexed sender,
        uint256 withdrawTime,
        uint256 amount
    );

    event CancelStream(
        uint256 indexed projectId,
        uint256 indexed streamId,
        address indexed sender,
        uint256 investSellBalance,
        uint256 investFundBalance,
        uint256 cancelTime
    );

    event Arbitration(
        uint256 indexed projectId,
        uint256 indexed _metaEvidenceID,
        string _metaEvidence,
        address project,
        address indexed invest,
        uint256 arbitrationCost,
        uint256 reclaimedAt
    );
}