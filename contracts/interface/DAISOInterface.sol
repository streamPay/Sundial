pragma solidity >= 0.5;


interface DAISOInterface {
/* DAISO */
    event CreateProject(
        uint256 indexed projectId,
        address indexed sender,
        string hash
    );

    event CreateStream(uint256 indexed streamId, address indexed sender);

    event LaunchProposal(
        uint256 indexed streamId,
        address indexed sender
    );

    event VoteForInvest(
        uint256 indexed projectId,
        uint256 indexed streamId,
        uint256 voteResult
    );

    event WithdrawFromProject(
        uint256 indexed projectId,
        uint256 amount,
        uint256 pass,
        uint256 notPass,
        uint256 startTime
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
        string _metaEvidence,
        address indexed project,
        address indexed invest,
        uint256 arbitrationCost,
        uint256 reclaimedAt
    );
}